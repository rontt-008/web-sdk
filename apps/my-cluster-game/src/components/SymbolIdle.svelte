<script lang="ts">
	import { BaseSprite, getContextApp, type LoadedSpriteSheet } from 'pixi-svelte';

	import SymbolPose from './SymbolPose.svelte';
	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE, TILE_ALPHA } from '../game/constants';
	import { idleFrame } from '../game/idleClock.svelte';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		// how many frames on from the clock its loop is
		phase?: number;
		// called when its motion ends (its landing), or straight away: a looping idle has no end
		oncomplete?: () => void;
	};

	const props: Props = $props();
	const context = getContextApp();

	// a frame of its loop (art-source/symbol-animations.py), from the clock all of them play from, so
	// its motion (SymbolPose) moves the tile without restarting the loop
	const textures = $derived(
		context.stateApp.loadedAssets?.[props.symbolInfo.assetKey] as LoadedSpriteSheet | undefined,
	);
	const texture = $derived(
		textures?.length ? textures[(idleFrame() + (props.phase ?? 0)) % textures.length] : undefined,
	);
</script>

<SymbolPose x={props.x} y={props.y} symbolInfo={props.symbolInfo} oncomplete={props.oncomplete}>
	{#if texture}
		<BaseSprite
			{texture}
			anchor={0.5}
			alpha={TILE_ALPHA}
			width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width}
			height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
		/>
	{/if}
</SymbolPose>
