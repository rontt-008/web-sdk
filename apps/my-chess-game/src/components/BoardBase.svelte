<script lang="ts">
	import ReelSymbol from './ReelSymbol.svelte';
	import { getContext } from '../game/context';
	import { BOARD_DIMENSIONS } from '../game/constants';
	import type { ReelSymbol as ReelSymbolType } from '../game/stateGame.svelte';

	const context = getContext();

	// only the board's rows (not the padding symbols above and below it, which a spin drops in with
	// the rest), and only the squares with a piece on them
	const shown = (reelSymbol: ReelSymbolType) =>
		reelSymbol.symbolIndexOfBoard >= 0 &&
		reelSymbol.symbolIndexOfBoard < BOARD_DIMENSIONS.y &&
		reelSymbol.rawSymbol.name !== 'E';
</script>

{#each context.stateGame.board as reel, reelIndex (reelIndex)}
	{#each reel.reelState.symbols as reelSymbol}
		{#if shown(reelSymbol)}
			<ReelSymbol {reelIndex} {reelSymbol} />
		{/if}
	{/each}
{/each}
