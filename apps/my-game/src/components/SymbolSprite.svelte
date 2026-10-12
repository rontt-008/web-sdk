<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Container, Sprite } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		// pulse the symbol before completing, used for wins
		animate?: boolean;
		// squash and spring back once when this turns true, like landing with a little bounce
		jiggle?: boolean;
		oncomplete?: () => void;
		// drawn over the symbol, pulsing with it
		children?: Snippet;
	};

	const props: Props = $props();

	const SHADOW_ALPHA = 0.6;
	const SHADOW_OFFSET = { x: SYMBOL_SIZE * 0.03, y: SYMBOL_SIZE * 0.05 };

	const WIN_PULSE_SCALE = 1.2;
	const WIN_PULSE_DURATION = 250;
	const WIN_PULSE_COUNT = 2;

	const scale = new Tween(1);

	const pulse = async () => {
		const duration = WIN_PULSE_DURATION / stateBetDerived.timeScale();
		const pulseScale =
			'winPulseScale' in props.symbolInfo ? props.symbolInfo.winPulseScale : WIN_PULSE_SCALE;
		for (let i = 0; i < WIN_PULSE_COUNT; i++) {
			await scale.set(pulseScale, { duration, easing: cubicOut });
			await scale.set(1, { duration, easing: cubicOut });
		}
	};

	$effect(() => {
		props.symbolInfo;

		if (!props.animate) {
			props.oncomplete?.();
			return;
		}

		untrack(pulse).then(() => props.oncomplete?.());
	});

	// The jiggle squashes the symbol flat, springs it up taller, and wobbles a couple of times as it
	// settles. Width changes the opposite way to height so it keeps its size, and it squashes onto
	// its bottom edge so it looks like it's sitting on something.
	const JIGGLE_DURATION = 450;
	// how much flatter it gets on impact, and how much taller as it first springs back up
	const JIGGLE_SQUASH = 0.1;
	const JIGGLE_STRETCH = 0.05;
	const JIGGLE_WOBBLES = 2.5;
	// the wave below has died down to this by its first stretch, so stretches are scaled to match
	const FIRST_STRETCH_WAVE = (1 - 1 / (2 * JIGGLE_WOBBLES)) ** 2;

	const jiggleProgress = new Tween(1);
	const jiggleScaleY = $derived.by(() => {
		const t = jiggleProgress.current;
		// 1 at the impact squash, negative while stretched, dying away to 0
		const wave = (1 - t) ** 2 * Math.cos(2 * Math.PI * JIGGLE_WOBBLES * t);
		if (wave > 0) return 1 - JIGGLE_SQUASH * wave;
		return 1 - (JIGGLE_STRETCH / FIRST_STRETCH_WAVE) * wave;
	});
	const spriteHeight = $derived(SYMBOL_SIZE * props.symbolInfo.sizeRatios.height);

	$effect(() => {
		if (!props.jiggle) return;
		untrack(() => {
			jiggleProgress.set(0, { duration: 0 });
			jiggleProgress.set(1, { duration: JIGGLE_DURATION / stateBetDerived.timeScale() });
		});
	});
</script>

<Container x={props.x} y={props.y} scale={scale.current}>
	<Container
		y={((1 - jiggleScaleY) * spriteHeight) / 2}
		scale={{ x: 1 / jiggleScaleY, y: jiggleScaleY }}
	>
		{#if 'shadow' in props.symbolInfo}
			<Sprite
				anchor={0.5}
				key={props.symbolInfo.shadow.assetKey}
				x={SHADOW_OFFSET.x}
				y={SHADOW_OFFSET.y}
				width={SYMBOL_SIZE * props.symbolInfo.shadow.sizeRatios.width}
				height={SYMBOL_SIZE * props.symbolInfo.shadow.sizeRatios.height}
				alpha={SHADOW_ALPHA}
			/>
		{/if}
		<Sprite
			anchor={0.5}
			key={props.symbolInfo.assetKey}
			width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width}
			height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
		/>
	</Container>
	{@render props.children?.()}
</Container>
