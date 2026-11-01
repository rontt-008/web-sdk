<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { BaseSprite, getContextApp, type LoadedSpriteSheet } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE, TILE_ALPHA } from '../game/constants';
	import { idleFrame } from '../game/idleClock.svelte';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		// how many frames on from the clock its idle loop is
		phase?: number;
		// called when it has played through once
		oncomplete?: () => void;
	};

	const props: Props = $props();
	const context = getContextApp();

	// the user's hit (art-source/symbol-animations.py), played once at the frame rate it was made at;
	// it starts and ends on the tile at rest, so over its first and last BLEND seconds it fades in
	// over the idle loop and back out to it: the swap doesn't jump wherever the loop is
	const HIT_FRAME_RATE = 60;
	const BLEND = 0.1;

	const sheet = (key: string) =>
		context.stateApp.loadedAssets?.[key] as LoadedSpriteSheet | undefined;
	const hitTextures = $derived(sheet(props.symbolInfo.assetKey));
	const idleTextures = $derived(
		'idleKey' in props.symbolInfo ? sheet(props.symbolInfo.idleKey) : undefined,
	);
	const length = $derived((hitTextures?.length ?? 0) / HIT_FRAME_RATE);

	// how far through the hit it is, 0 to 1
	const progress = new Tween(0);
	let runId = 0;

	$effect(() => {
		props.symbolInfo;
		const run = ++runId;

		untrack(async () => {
			await progress.set(0, { duration: 0 });
			await progress.set(1, {
				duration: (length * 1000) / stateBetDerived.timeScale(),
				easing: (t) => t,
			});
			if (run !== runId) return;
			props.oncomplete?.();
		});

		// not done when it is taken off the board part way
		return () => ++runId;
	});

	const hitTexture = $derived(
		hitTextures?.length
			? hitTextures[
					Math.min(Math.floor(progress.current * hitTextures.length), hitTextures.length - 1)
				]
			: undefined,
	);
	const idleTexture = $derived(
		idleTextures?.length
			? idleTextures[(idleFrame() + (props.phase ?? 0)) % idleTextures.length]
			: undefined,
	);
	// 0 (the idle) to 1 (the hit)
	const blend = $derived(
		length
			? Math.min(1, (progress.current * length) / BLEND, ((1 - progress.current) * length) / BLEND)
			: 0,
	);
	const width = $derived(SYMBOL_SIZE * props.symbolInfo.sizeRatios.width);
	const height = $derived(SYMBOL_SIZE * props.symbolInfo.sizeRatios.height);
</script>

<!-- the idle stays under the hit as it fades, so the tile's frame and panel never get thinner -->
{#if idleTexture}
	<BaseSprite
		texture={idleTexture}
		x={props.x}
		y={props.y}
		anchor={0.5}
		alpha={blend < 1 ? TILE_ALPHA : 0}
		{width}
		{height}
	/>
{/if}
{#if hitTexture}
	<BaseSprite
		texture={hitTexture}
		x={props.x}
		y={props.y}
		anchor={0.5}
		alpha={TILE_ALPHA * blend}
		{width}
		{height}
	/>
{/if}
