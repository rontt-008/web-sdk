<script lang="ts">
	import ReelSymbol from './ReelSymbol.svelte';
	import BigWild, { blockState } from './BigWild.svelte';
	import { getContext } from '../game/context';
	import { flownKey, type ReelSymbol as ReelSymbolType } from '../game/stateGame.svelte';
	import { BOARD_DIMENSIONS } from '../game/constants';
	import { findWildBlocks } from '../game/utils';

	const context = getContext();

	// square blocks of wilds (2x2, 3x3) are drawn as one big wild each (BigWild), not cell by cell
	const blocks = $derived(
		findWildBlocks(
			context.stateGame.board.map((reel) => reel.reelState.symbols),
			(reelSymbol) => reelSymbol.rawSymbol.name === 'W',
		),
	);
	const inBlocks = $derived(new Set(blocks.flatMap((block) => block.cells)));

	// only the board's rows: not the padding symbols above and below it, which a spin drops in with
	// the rest (the one below would fall through the board and stop half out of it), nor the symbols
	// that have flown to the bonus meter as souls (stateGame.flown), nor those in a big wild
	const shown = (reelSymbol: ReelSymbolType, reel: number, row: number) =>
		reelSymbol.symbolIndexOfBoard >= 0 &&
		reelSymbol.symbolIndexOfBoard < BOARD_DIMENSIONS.y &&
		!context.stateGame.flown.includes(flownKey({ reel, row })) &&
		!inBlocks.has(reelSymbol);

	// a big wild's land or hit done, for its cells, as ReelSymbol does for one
	const completeBlock = (cells: ReelSymbolType[]) => {
		for (const cell of cells) {
			if (cell.symbolState === 'win') cell.oncomplete();
			else if (cell.symbolState === 'land') cell.symbolState = 'static';
		}
	};
</script>

{#each context.stateGame.board as reel, reelIndex (reelIndex)}
	{#each reel.reelState.symbols as reelSymbol, row}
		{#if shown(reelSymbol, reelIndex, row)}
			<ReelSymbol {reelIndex} {reelSymbol} />
		{/if}
	{/each}
{/each}

{#each blocks as block}
	<BigWild
		size={block.size}
		x={block.x}
		y={block.lead.symbolY.current + block.leadOffset}
		reel={block.leadReel}
		state={blockState(block.cells, block.lead.symbolState)}
		oncomplete={() => completeBlock(block.cells)}
	/>
{/each}
