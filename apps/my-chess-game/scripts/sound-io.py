# Audio in and out for generate-sounds.mjs, with the FFmpeg inside Blender (ffmpeg itself isn't
# installed). Two jobs:
#
#   decode: the sample game's sprite (art-source/audio-sample/sounds.ogg) to a 16-bit WAV, which
#           the generator puts the chess sounds after
#   encode: the finished sprite WAV to the formats the game loads: ogg through Blender's audio
#           library, and m4a (AAC in MP4) by rendering the WAV as the only strip of an audio-only
#           video, the one way Blender writes MP4. Both line up with the WAV to the sample, which a
#           sprite needs (MP4 carries the AAC encoder's start-up delay for the player to skip).
#
#   blender -b --factory-startup --python scripts/sound-io.py -- decode <in.ogg> <out.wav>
#   blender -b --factory-startup --python scripts/sound-io.py -- encode <sprite.wav> <out dir>

import math
import os
import shutil
import sys
import tempfile

import aud
import bpy

job, src, dst = sys.argv[sys.argv.index('--') + 1 :][:3]
RATE = 44100
BITRATE = 128000

sound = aud.Sound(src)

if job == 'decode':
	sound.write(
		dst,
		rate=RATE,
		channels=aud.CHANNELS_STEREO,
		format=aud.FORMAT_S16,
		container=aud.CONTAINER_WAV,
		codec=aud.CODEC_PCM,
	)
	sys.exit(0)

duration = sound.length / RATE
sound.write(
	os.path.join(dst, 'sounds.ogg'),
	rate=RATE,
	channels=aud.CHANNELS_STEREO,
	format=aud.FORMAT_FLOAT32,
	container=aud.CONTAINER_OGG,
	codec=aud.CODEC_VORBIS,
	bitrate=BITRATE,
)

# m4a: an audio-only MP4 render, a frame a second so it is quick
scene = bpy.context.scene
scene.render.fps = 1
scene.frame_start = 1
scene.frame_end = 1 + math.ceil(duration)
scene.render.resolution_x = 16
scene.render.resolution_y = 16
strips = scene.sequence_editor_create().strips
strips.new_sound('sprite', src, 2, 1)
strips.new_effect('blank', 'COLOR', 1, frame_start=1, length=scene.frame_end)
scene.render.use_sequencer = True
scene.render.image_settings.media_type = 'VIDEO'
scene.render.image_settings.file_format = 'FFMPEG'
ffmpeg = scene.render.ffmpeg
ffmpeg.format = 'MPEG4'
ffmpeg.codec = 'NONE'
ffmpeg.audio_codec = 'AAC'
ffmpeg.audio_bitrate = BITRATE // 1000
ffmpeg.audio_channels = 'STEREO'
ffmpeg.audio_mixrate = RATE
render_dir = tempfile.mkdtemp()
scene.render.filepath = os.path.join(render_dir, 'sprite_')
bpy.ops.render.render(animation=True)
[rendered] = [f for f in os.listdir(render_dir) if f.endswith('.mp4')]
shutil.move(os.path.join(render_dir, rendered), os.path.join(dst, 'sounds.m4a'))
shutil.rmtree(render_dir)
