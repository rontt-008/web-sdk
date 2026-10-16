<script lang="ts" module>
	// sound effects volume to go back to when unmuting
	let unmutedVolume = 75;
</script>

<script lang="ts">
	import { stateSound } from 'state-shared';

	import UiButton from './UiButton.svelte';
	import { UI_BASE_SIZE } from '../constants';
	import { getContext } from '../context';
	import type { UiButtonOptions } from '../types';

	const props: UiButtonOptions = $props();
	const context = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const muted = $derived(stateSound.volumeValueSoundEffect === 0);

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });

		if (muted) {
			stateSound.volumeValueSoundEffect = unmutedVolume;
		} else {
			unmutedVolume = stateSound.volumeValueSoundEffect;
			stateSound.volumeValueSoundEffect = 0;
		}
	};
</script>

<UiButton {...props} {sizes} {onpress} icon={muted ? 'soundOff' : 'soundOn'} />
