<script lang="ts">
	import { Sprite } from 'pixi-svelte';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { SUPER_MODE } from '../game/betModes';
	import { SYMBOL_SIZE } from '../game/constants';
	import { pieceAssetKey } from '../game/chess';
	import type { SymbolName } from '../game/types';

	type Props = {
		x: number;
		y: number;
		symbol: SymbolName;
		scale?: number;
		alpha?: number;
		tint?: number;
		zIndex?: number;
	};

	const props: Props = $props();
	const context = getContext();
	// a piece fills most of its square; drawn in your colour or the other side's (the toggle). In the SUPER
	// BONUS the other side's king is gold (gK, art-source/gold-king.py), whichever colour you play; not on
	// the practice board.
	const PIECE_SIZE = 0.92;
	const goldKing = $derived(
		props.symbol === 'BK' && stateBet.activeBetModeKey === SUPER_MODE && !context.stateGame.sandbox,
	);
	const key = $derived(goldKing ? 'gK' : pieceAssetKey(props.symbol, context.stateGame.yourColour));
	const size = $derived(SYMBOL_SIZE * PIECE_SIZE * (props.scale ?? 1));
</script>

{#if key}
	<Sprite
		{key}
		anchor={0.5}
		x={props.x}
		y={props.y}
		width={size}
		height={size}
		alpha={props.alpha ?? 1}
		tint={props.tint ?? 0xffffff}
		zIndex={props.zIndex ?? 0}
	/>
{/if}
