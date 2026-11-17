<script lang="ts" module>
	import { sound, type MusicName, type SoundEffectName, type SoundName } from '../game/sound';

	export type EmitterEventSound =
		| { type: 'soundMusic'; name: MusicName }
		| { type: 'soundOnce'; name: SoundEffectName; forcePlay?: boolean }
		| { type: 'soundLoop'; name: SoundEffectName }
		| { type: 'soundStop'; name: SoundName }
		| { type: 'soundFade'; name: SoundName; from: number; to: number; duration: number }
		| { type: 'soundScatterCounterIncrease' }
		| { type: 'soundScatterCounterClear' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	import { waitForTimeout } from 'utils-shared/wait';
	import { SECOND } from 'constants-shared/time';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';

	const context = getContext();

	// the music playing (as asked for here)
	let music: MusicName | undefined;
	const playMusic = (name: MusicName) => {
		music = name;
		sound.players.music.play({ name });
	};

	// When the game opens, the cave's sound eases in rather than starting full on (the user, 2026-11-17:
	// "make the wind ease in to it instead of just fully blasting when opening the game"): its volume
	// rising along a curve (squared: quiet for a while, then up to full) over EASE_IN.seconds, in steps of
	// Howler's (straight) fades. If other music takes over meanwhile, this one is put back to full volume
	// for when it comes back.
	const EASE_IN = { seconds: 5, steps: 10 };
	const easeIn = async (name: MusicName) => {
		const stepMs = (EASE_IN.seconds * 1000) / EASE_IN.steps;
		for (let k = 0; k < EASE_IN.steps; k++) {
			if (music !== name) {
				// (paused, so unheard; a real ramp, as a Howler fade from a volume to the same never ends)
				sound.players.music.fade({ name, from: 0, to: 1, duration: 50 });
				return;
			}
			const from = Math.pow(k / EASE_IN.steps, 2);
			const to = Math.pow((k + 1) / EASE_IN.steps, 2);
			sound.players.music.fade({ name, from, to, duration: stepMs });
			await waitForTimeout(stepMs);
		}
	};

	context.eventEmitter.subscribeOnMount({
		// ui
		soundBetMode: async ({ betModeKey }) => {
			if (betModeKey === 'SUPERSPIN') {
				// check if SUPERSPIN, when changing the bet mode.
				sound.players.once.play({ name: 'sfx_winlevel_end' });
				await waitForTimeout(SECOND);
				playMusic('bgm_freespin');
			} else {
				playMusic('bgm_main');
			}
		},
		soundPressGeneral: () => sound.players.once.play({ name: 'sfx_btn_general' }),
		soundPressBet: () => sound.players.once.play({ name: 'sfx_btn_spin' }),
		// scatterCounter
		soundScatterCounterIncrease: () => (context.stateGame.scatterCounter = context.stateGame.scatterCounter + 1), // prettier-ignore
		soundScatterCounterClear: () => (context.stateGame.scatterCounter = 0),
		// game
		soundMusic: ({ name }) => playMusic(name),
		soundLoop: ({ name }) => sound.players.loop.play({ name }),
		soundOnce: ({ name, forcePlay }) => sound.players.once.play({ name, forcePlay }),
		soundStop: ({ name }) => sound.stop({ name }),
		soundFade: async ({ name, duration, from, to }) => await sound.fade({ name, duration, from, to }), // prettier-ignore
	});

	onMount(() => {
		// (when resuming a bet that is a super spin, its music)
		const name = stateBet.activeBetModeKey === 'SUPERSPIN' ? 'bgm_freespin' : 'bgm_main';
		playMusic(name);
		easeIn(name);
	});
</script>
