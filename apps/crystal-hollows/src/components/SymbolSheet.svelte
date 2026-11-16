<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { BaseSprite, type LoadedSpriteSheet } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	// A symbol state drawn from a sprite sheet (the free spins symbol's drop and activation,
	// art-source/free-spins.py): its frames played once at their fps (at the game's speed, so faster in
	// turbo), each fading into the next as its time comes (they are 30 fps), centred on the symbol's place
	// (each frame's box is centred on the artwork's middle) at sizeRatios cells; done when it reaches its
	// last frame (the still).

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: {
			assetKey: string;
			sizeRatios: { width: number; height: number };
			fps: number;
		};
		oncomplete?: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	const sheet = $derived(
		context.stateApp.loadedAssets?.[props.symbolInfo.assetKey] as LoadedSpriteSheet | undefined,
	);
	const frame = new Tween(0);

	onMount(() => {
		const count = sheet?.length ?? 0;
		if (count < 2) {
			props.oncomplete?.();
			return;
		}
		const timeScale = stateBetDerived.timeScale() || 1;
		frame
			.set(count - 1, { duration: ((count - 1) / props.symbolInfo.fps) * 1000 / timeScale })
			.then(() => props.oncomplete?.());
	});

	const at = (k: number) =>
		sheet?.length ? sheet[Math.min(sheet.length - 1, Math.max(0, k))] : undefined;
	const texture = $derived(at(Math.floor(frame.current)));
	const next = $derived(at(Math.floor(frame.current) + 1));
	const blend = $derived(frame.current - Math.floor(frame.current));
	const width = $derived(SYMBOL_SIZE * props.symbolInfo.sizeRatios.width);
	const height = $derived(SYMBOL_SIZE * props.symbolInfo.sizeRatios.height);
</script>

{#if texture}
	<BaseSprite {texture} x={props.x} y={props.y} anchor={0.5} {width} {height} />
	{#if next && next !== texture && blend > 0}
		<BaseSprite
			texture={next}
			x={props.x}
			y={props.y}
			anchor={0.5}
			{width}
			{height}
			alpha={blend}
		/>
	{/if}
{/if}
