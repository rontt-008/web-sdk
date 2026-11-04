<script lang="ts">
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
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
	// a piece fills most of its square; drawn in your colour or the other side's (the toggle)
	const PIECE_SIZE = 0.92;
	const key = $derived(pieceAssetKey(props.symbol, context.stateGame.yourColour));
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
