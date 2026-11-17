<script lang="ts">
	import { OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';

	import { getContext } from '../game/context';
	import { stateWinsHurry, hurryWins } from '../game/winsHurry.svelte';

	// While the line wins are showing: a click or tap anywhere on the game (under the UI, whose buttons
	// still work), Space, or Spin (its stop) plays the rest of them fast (winsHurry)
	const context = getContext();

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => hurryWins(),
	});
</script>

{#if stateWinsHurry.showing && !stateWinsHurry.hurried}
	<OnHotkey hotkey="Space" onpress={hurryWins} />
	<OnPressFullScreen onpress={hurryWins} />
{/if}
