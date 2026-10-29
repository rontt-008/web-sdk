<script lang="ts">
	import { untrack } from 'svelte';
	import { BaseSprite, getContextApp, type LoadedSpriteSheet } from 'pixi-svelte';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE, TILE_ALPHA } from '../game/constants';
	import { idleFrame } from '../game/idleClock.svelte';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		// how many frames on from the clock its loop is
		phase?: number;
		// called straight away: a looping idle has no end
		oncomplete?: () => void;
	};

	const props: Props = $props();
	const context = getContextApp();

	// done at once, like a still (SymbolSprite): when it gets a new state, and when it is handed a new
	// oncomplete (a tumbling symbol lands looking the same, with a new oncomplete to call)
	$effect(() => {
		props.symbolInfo;
		const oncomplete = props.oncomplete;
		untrack(() => oncomplete?.());
	});

	// a frame of its loop (art-source/symbol-idles.py), from the clock all of them play from
	const textures = $derived(
		context.stateApp.loadedAssets?.[props.symbolInfo.assetKey] as LoadedSpriteSheet | undefined,
	);
	const texture = $derived(
		textures?.length ? textures[(idleFrame() + (props.phase ?? 0)) % textures.length] : undefined,
	);
</script>

{#if texture}
	<BaseSprite
		{texture}
		x={props.x}
		y={props.y}
		anchor={0.5}
		alpha={TILE_ALPHA}
		width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width}
		height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
	/>
{/if}
