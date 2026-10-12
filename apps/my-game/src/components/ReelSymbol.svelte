<script lang="ts">
	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolInfo, getSymbolX } from '../game/utils';
	import { getContext } from '../game/context';
	import { BOARD_DIMENSIONS, SYMBOL_SIZE, CAT_SYMBOLS } from '../game/constants';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();
	const context = getContext();
	// cats jiggle from the moment their reel hits the bottom of its stop (the reel then bounces back
	// and only marks its symbols as landed once it has settled)
	const jiggle = $derived(
		CAT_SYMBOLS.includes(props.reelSymbol.rawSymbol.name) &&
			context.stateGame.board[props.reelIndex].reelState.motion === 'bouncing',
	);
	const symbolInfo = $derived(
		getSymbolInfo({ rawSymbol: props.reelSymbol.rawSymbol, state: props.reelSymbol.symbolState }),
	);
	const bigWild = $derived(props.reelSymbol.rawSymbol.bigWild);
	// the big wild is drawn by its top W, centred on the reel below it
	const rows = $derived(bigWild ? BOARD_DIMENSIONS.y : 1);
</script>

{#if !bigWild || bigWild.anchor}
	<SymbolWrap
		x={getSymbolX(props.reelIndex)}
		y={props.reelSymbol.symbolY() + ((rows - 1) / 2) * SYMBOL_SIZE}
		{rows}
		animating={props.reelSymbol.symbolState === 'win' ||
			(symbolInfo.type === 'spine' && props.reelSymbol.symbolState === 'land')}
	>
		<Symbol
			state={props.reelSymbol.symbolState}
			rawSymbol={props.reelSymbol.rawSymbol}
			{jiggle}
			oncomplete={() => {
				if (props.reelSymbol.symbolState === 'win') props.reelSymbol.oncomplete();
				if (props.reelSymbol.symbolState === 'land') props.reelSymbol.symbolState = 'static';
			}}
		/>
	</SymbolWrap>
{/if}
