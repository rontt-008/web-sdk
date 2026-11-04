<script lang="ts">
	import Piece from './Piece.svelte';
	import { getSymbolX } from '../game/utils';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();

	// the pieces have no land or win animations: a landed piece is at rest at once
	$effect(() => {
		if (props.reelSymbol.symbolState === 'land') props.reelSymbol.symbolState = 'static';
		if (props.reelSymbol.symbolState === 'win') props.reelSymbol.oncomplete();
	});
</script>

<Piece
	x={getSymbolX(props.reelIndex)}
	y={props.reelSymbol.symbolY.current}
	symbol={props.reelSymbol.rawSymbol.name}
/>
