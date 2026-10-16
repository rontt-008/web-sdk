<script lang="ts">
	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolInfo, getSymbolMotion, getSymbolX } from '../game/utils';
	import { getContext } from '../game/context';
	import { BOARD_DIMENSIONS, SYMBOL_SIZE, CAT_SYMBOLS } from '../game/constants';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		rowIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();
	const context = getContext();
	const reel = $derived(context.stateGame.board[props.reelIndex]);
	// cats jiggle from the moment their reel hits the bottom of its stop (the reel then bounces back
	// and only marks its symbols as landed once it has settled)
	const jiggle = $derived(
		CAT_SYMBOLS.includes(props.reelSymbol.rawSymbol.name) && reel.reelState.motion === 'bouncing',
	);
	// scatters already down wiggle while a later reel is anticipated, waiting for the next one
	const excited = $derived(
		props.reelSymbol.rawSymbol.name === 'S' &&
			props.reelSymbol.symbolState === 'static' &&
			reel.reelState.motion === 'stopped' &&
			context.stateGame.board.some((otherReel) => otherReel.reelState.anticipating),
	);
	// while a win is shown, every symbol that isn't part of it is shaded
	const dimmed = $derived(
		!!context.stateGame.winHighlight &&
			!context.stateGame.winHighlight.some(
				(position) => position.reel === props.reelIndex && position.row === props.rowIndex,
			),
	);
	const symbolInfo = $derived(
		getSymbolInfo({ rawSymbol: props.reelSymbol.rawSymbol, state: props.reelSymbol.symbolState }),
	);
	const bigWild = $derived(props.reelSymbol.rawSymbol.bigWild);
	// the big wild is drawn by its top W, centred on the reel below it
	const rows = $derived(bigWild ? BOARD_DIMENSIONS.y : 1);
	// moving symbols are drawn over the others and outside the board's edges
	const animating = $derived(
		props.reelSymbol.symbolState === 'win' ||
			(props.reelSymbol.symbolState === 'land' &&
				(symbolInfo.type === 'spine' ||
					!!getSymbolMotion({ rawSymbol: props.reelSymbol.rawSymbol, state: 'land' }))),
	);
</script>

{#if !bigWild || bigWild.anchor}
	<SymbolWrap
		x={getSymbolX(props.reelIndex)}
		y={props.reelSymbol.symbolY() + ((rows - 1) / 2) * SYMBOL_SIZE}
		{rows}
		{animating}
	>
		<Symbol
			state={props.reelSymbol.symbolState}
			rawSymbol={props.reelSymbol.rawSymbol}
			{jiggle}
			{excited}
			{dimmed}
			oncomplete={() => {
				if (props.reelSymbol.symbolState === 'win') props.reelSymbol.oncomplete();
				if (props.reelSymbol.symbolState === 'land') props.reelSymbol.symbolState = 'static';
			}}
		/>
	</SymbolWrap>
{/if}
