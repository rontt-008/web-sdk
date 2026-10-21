<script lang="ts">
	import { getContextBoard } from 'components-shared';

	import ReelBlur from './ReelBlur.svelte';
	import ReelStrip from './ReelStrip.svelte';
	import ReelSymbol from './ReelSymbol.svelte';
	import { getContext } from '../game/context';

	const context = getContext();
	// the board's layer of resting and spinning symbols, or the one of animating symbols over it
	const boardContext = getContextBoard();
</script>

{#each context.stateGame.board as reel, reelIndex (reelIndex)}
	<!-- each reel blurs with its own speed (see ReelBlur) -->
	<ReelBlur {reel}>
		<!-- while a reel spins its symbols scroll by at rest, drawn by its strip (see ReelStrip); once
		     it stops, each has its own ReelSymbol again, to land, win and animate -->
		{#if !boardContext.animate}
			<ReelStrip {reel} {reelIndex} />
		{/if}
		{#if !reel.reelState.scrolling}
			{#each reel.reelState.symbols as reelSymbol, rowIndex}
				<ReelSymbol {reelIndex} {rowIndex} {reelSymbol} />
			{/each}
		{/if}
	</ReelBlur>
{/each}
