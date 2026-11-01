# Encodes the sound sprite (the 16-bit WAV generate-sounds.mjs writes) into the formats the game
# loads, with the FFmpeg inside Blender (ffmpeg itself isn't installed): ogg, mp3 and ac3 through
# Blender's audio library, and m4a (AAC in MP4) by rendering the WAV as the only strip of an
# audio-only video, the one way Blender writes MP4. Each lines up with the WAV to the sample, which
# a sprite needs (checked with a click at a known time): MP4 carries the AAC encoder's start-up
# delay for the player to skip, and AC3's encoder starts 256 samples late, so it is given the WAV
# that much early.
#
#   blender -b --factory-startup --python scripts/encode-sounds.py -- <sprite.wav> <out dir>

import math
import os
import shutil
import sys
import tempfile

import aud
import bpy

wav_path, out_dir = sys.argv[sys.argv.index('--') + 1 :][:2]
RATE = 44100
BITRATE = 128000
AC3_DELAY = 256

sound = aud.Sound(wav_path)
duration = sound.length / RATE

for ext, container, codec, start in [
	('ogg', aud.CONTAINER_OGG, aud.CODEC_VORBIS, 0),
	('mp3', aud.CONTAINER_MP3, aud.CODEC_MP3, 0),
	('ac3', aud.CONTAINER_AC3, aud.CODEC_AC3, AC3_DELAY),
]:
	source = sound.limit(start / RATE, duration) if start else sound
	source.write(
		os.path.join(out_dir, f'sounds.{ext}'),
		rate=RATE,
		channels=aud.CHANNELS_STEREO,
		format=aud.FORMAT_FLOAT32,
		container=container,
		codec=codec,
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
strips.new_sound('sprite', wav_path, 2, 1)
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
shutil.move(os.path.join(render_dir, rendered), os.path.join(out_dir, 'sounds.m4a'))
shutil.rmtree(render_dir)
