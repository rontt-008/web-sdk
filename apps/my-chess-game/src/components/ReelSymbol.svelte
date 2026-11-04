<script lang="ts">
	import { stateBet } from 'state-shared';

	import Piece from './Piece.svelte';
	import { getSymbolX } from '../game/utils';
	import { isMine } from '../game/chess';
	import { BOOSTER_MODE } from '../game/betModes';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();
	// in DUMB MODE the other side's pieces are greyed
	const tint = $derived(
		stateBet.activeBetModeKey === BOOSTER_MODE && !isMine(props.reelSymbol.rawSymbol.name) ? 0xb9bccc : 0xffffff,
	);

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
	{tint}
/>
