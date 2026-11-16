<script lang="ts">
	import { untrack } from 'svelte';

	import TallWild from './TallWild.svelte';
	import { getContext } from '../game/context';
	import { stateTallWilds, releaseTallWild } from '../game/tallWilds.svelte';

	const context = getContext();

	// a reel's tall wild falls out of the board with its symbols as the next set drops in; once they
	// are out it is let go (tallWilds)
	$effect(() => {
		context.stateGame.board.forEach((reel, reelIndex) => {
			const motion = reel.reelState.motion;
			if (motion === 'hanging' || motion === 'fallingIn') untrack(() => releaseTallWild(reelIndex));
		});
	});
</script>

<!-- each reel's tall wild, if a ring turned into one (tallWilds) -->
{#each stateTallWilds.reels as tallWild, reelIndex (reelIndex)}
	{#if tallWild}
		<TallWild {tallWild} {reelIndex} />
	{/if}
{/each}
