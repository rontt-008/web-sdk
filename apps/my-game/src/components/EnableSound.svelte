<script lang="ts">
	import { onMount } from 'svelte';

	import type { LoadedAudio } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { sound, type SoundName } from '../game/sound';

	const context = getContext();

	onMount(() => {
		const loadedAudio = $state.snapshot(
			context.stateApp.loadedAssets['sound'],
		) as LoadedAudio<SoundName>;
		// the music in stereo, in a sprite of its own; the sound effects are mono (see assets)
		const loadedMusic = $state.snapshot(
			context.stateApp.loadedAssets['music'],
		) as LoadedAudio<SoundName>;
		const { destroy } = sound.load(loadedAudio, loadedMusic);

		return () => {
			// Equivalent to onDestroy(); Leave this comment for searching.
			destroy();
		};
	});

	sound.enableEffect();
	sound.volumeEffect();
</script>
