<script lang="ts">
	import TumbleSymbol from './TumbleSymbol.svelte';
	import BigWild, { blockState } from './BigWild.svelte';
	import { getContext } from '../game/context';

	const context = getContext();

	// square blocks of wilds (2x2, 3x3) are drawn as one big wild each (BigWild), not cell by cell: the
	// blocks TumbleBoard found as the tumble started, while their cells move together (it lets a block
	// go, its wilds tumbling one by one, when some of it goes or its columns fall unevenly)
	const blocks = $derived(context.stateGame.tumbleBlocks);
	const inBlocks = $derived(new Set(blocks.flatMap((block) => block.cells)));
</script>

{#each context.stateGameDerived.tumbleBoardCombined() as tumbleSymbols, reelIndex (reelIndex)}
	{#each tumbleSymbols as tumbleSymbol}
		{#if !inBlocks.has(tumbleSymbol)}
			<TumbleSymbol {reelIndex} {tumbleSymbol} />
		{/if}
	{/each}
{/each}

<!-- a big wild's going (or landing) done, for its cells, as TumbleSymbol does for one -->
{#each blocks as block}
	<BigWild
		size={block.size}
		x={block.x}
		y={block.lead.symbolY.current + block.leadOffset}
		reel={block.leadReel}
		state={blockState(block.cells, block.lead.symbolState)}
		oncomplete={() => block.cells.forEach((cell) => cell.oncomplete())}
	/>
{/each}
