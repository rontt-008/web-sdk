import type { Howl } from 'howler';

import type { PlayOptions, GetSound, GetSoundMap } from './types';

export function createPlayOnce<TSoundName extends string>(options: {
	howl: Howl;
	newSound: (value: TSoundName) => GetSound<TSoundName>;
	getSoundMap: () => GetSoundMap<TSoundName>;
	initSoundVolume: (soundName: TSoundName) => void;
}) {
	type Sound = GetSound<TSoundName>;

	// One listener for all of this player's sounds, added once. A listener added with each play was
	// never removed, so they piled up for as long as the game ran, and every sound ending ran all of
	// them. The howl is shared with the music and loop players, whose sounds aren't in this map.
	options.howl.on('end', (soundIdOnEnd) => {
		const sound = (Object.values(options.getSoundMap()) as Sound[]).find(
			({ soundId }) => soundId === soundIdOnEnd,
		);
		if (!sound) return;
		options.howl.stop(soundIdOnEnd);
		delete options.getSoundMap()[sound.soundName];
	});

	const playOnce = (sound: Sound) => {
		const soundId = options.howl.play(sound.soundName);
		options.getSoundMap()[sound.soundName] = {
			...sound,
			soundId,
			soundState: 'playing',
		};

		options.initSoundVolume(sound.soundName);
	};

	const soundPlayMap = {
		new: (sound: Sound) => playOnce(sound),
		paused: (sound: Sound) => playOnce(sound),
		playing: (sound: Sound, options: { forcePlay?: boolean }) => {
			if (options.forcePlay) playOnce(sound);
		},
	};

	const play = (playOptions: PlayOptions<TSoundName> & { forcePlay?: boolean }) => {
		const existingSound = options.getSoundMap()[playOptions.name];
		const sound = existingSound ?? options.newSound(playOptions.name);
		soundPlayMap[sound.soundState](sound, { forcePlay: playOptions.forcePlay });
	};

	return {
		play,
	};
}
