<script lang="ts">
	import ReelSymbol from './ReelSymbol.svelte';
	import { getContext } from '../game/context';
	import { BOARD_DIMENSIONS } from '../game/constants';

	const context = getContext();

	// Only the board's rows: not each reel's padding symbols above and below it. A spin drops them in and
	// out with the rest, and they fall all the way through the board: the one below is the first of the new
	// set to drop in, through the empty reel to its place under the board, and the one above the last to
	// fall out, through the emptied reel. Reel after reel, that showed as a line of symbols clipping through
	// (the user, 2026-11-13: "it makes the game look cheap or laggy"; RuneFall had the same, 2026-11-01).
	const onBoard = (row: number) => row >= 0 && row < BOARD_DIMENSIONS.y;
</script>

{#each context.stateGame.board as reel, reelIndex (reelIndex)}
	{#each reel.reelState.symbols as reelSymbol}
		{#if onBoard(reelSymbol.symbolIndexOfBoard)}
			<ReelSymbol {reelIndex} {reelSymbol} />
		{/if}
	{/each}
{/each}
