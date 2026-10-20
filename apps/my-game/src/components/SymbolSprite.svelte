<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { Container, Sprite } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getSymbolInfo, type SymbolMotion } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import {
		BIG_WILD_LANDING,
		REST_POSE,
		excitedPose,
		flipPose,
		hopPose,
		popPose,
		punchPose,
		slamBeatOnGround,
		slamBeatPose,
		type SymbolPose,
	} from '../game/motion';
	import { getContext } from '../game/context';
	import Burst from './Burst.svelte';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		// another image over it, of the same size (the big wild's empty mouth); changing it doesn't
		// restart the motion, as a new symbolInfo does
		assetKey?: string;
		// fade that image in (or out) as it changes, rather than swap it at once
		fadeAssetKey?: boolean;
		// played once, then oncomplete is called (straight away when there is none)
		motion?: SymbolMotion;
		// squash and spring back once when this turns true, like landing with a little bounce
		jiggle?: boolean;
		// wiggles on a loop while true (scatters while a reel is anticipated)
		excited?: boolean;
		// darkened, so the symbols of a win stand out
		dimmed?: boolean;
		oncomplete?: () => void;
		// drawn over the symbol, moving with it
		children?: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	const SHADOW_ALPHA = 0.6;
	const SHADOW_OFFSET = { x: SYMBOL_SIZE * 0.03, y: SYMBOL_SIZE * 0.05 };

	// each motion's length (shorter in turbo), its curve and whether it squashes onto the symbol's
	// bottom edge (things that jump and land) or about its middle (things that swell), or which
	// when, through the motion (the big wild's landing: a slam, then a heartbeat)
	const MOTIONS: Record<
		SymbolMotion,
		{
			duration: number;
			pose: (t: number, direction: 1 | -1) => SymbolPose;
			onGround: boolean | ((t: number) => boolean);
		}
	> = {
		hop: { duration: 650, pose: hopPose, onGround: true },
		flip: { duration: 750, pose: flipPose, onGround: true },
		punch: { duration: 700, pose: punchPose, onGround: false },
		pop: { duration: 480, pose: popPose, onGround: false },
		slam: {
			duration: BIG_WILD_LANDING.slam + BIG_WILD_LANDING.beat,
			pose: slamBeatPose,
			onGround: slamBeatOnGround,
		},
	};

	// symbols lean either way as they jump, so a line of them doesn't move in step
	const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
	const progress = new Tween(1);
	let playing = $state<SymbolMotion>();
	let runId = $state(0);

	$effect(() => {
		props.symbolInfo;
		const motion = props.motion;
		const run = untrack(() => ++runId);

		if (!motion) {
			playing = undefined;
			props.oncomplete?.();
			return;
		}

		untrack(async () => {
			playing = motion;
			await progress.set(0, { duration: 0 });
			await progress.set(1, {
				duration: MOTIONS[motion].duration / stateBetDerived.timeScale(),
				easing: (t) => t,
			});
			if (run !== runId) return;
			playing = undefined;
			props.oncomplete?.();
		});
	});

	// the image over it (see assetKey), faded or at once (see fadeAssetKey); the last one set is
	// kept while it fades out
	const OVER_FADE_DURATION = 400;
	const overFade = new Tween(props.assetKey ? 1 : 0);
	let overKey = $state(props.assetKey);
	$effect(() => {
		const key = props.assetKey;
		const fade = props.fadeAssetKey;
		if (key) overKey = key;
		untrack(() =>
			overFade.set(key ? 1 : 0, {
				duration: fade ? OVER_FADE_DURATION / stateBetDerived.timeScale() : 0,
			}),
		);
	});

	// seconds since it got excited, for its loop
	let excitedTime = $state(0);
	$effect(() => {
		if (!props.excited) return;
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		excitedTime = 0;
		const tick = () => (excitedTime += ticker.deltaMS / 1000);
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	const pose = $derived.by((): SymbolPose => {
		if (playing) return MOTIONS[playing].pose(progress.current, direction);
		if (props.excited) return excitedPose(excitedTime);
		return REST_POSE;
	});
	const onGround = $derived.by(() => {
		if (!playing) return false;
		const onGround = MOTIONS[playing].onGround;
		return typeof onGround === 'function' ? onGround(progress.current) : onGround;
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

	// dimmed symbols are shaded a warm dark brown, like the wood they sit on, rather than faded
	const DIM_COLOR = { r: 0x5c, g: 0x4a, b: 0x40 };
	const DIM_DURATION = 180;
	const dim = new Tween(props.dimmed ? 1 : 0);
	$effect(() => {
		dim.set(props.dimmed ? 1 : 0, { duration: DIM_DURATION / stateBetDerived.timeScale() });
	});
	const tint = $derived.by(() => {
		const channel = (target: number) => Math.round(255 - (255 - target) * dim.current);
		return (channel(DIM_COLOR.r) << 16) | (channel(DIM_COLOR.g) << 8) | channel(DIM_COLOR.b);
	});

	// sparkles fly out from behind scatters and wilds as they land and as a scatter wins; the big
	// wild kicks up a puff along its bottom instead
	const BURSTS: Partial<Record<SymbolMotion, 'sparkle' | 'dust'>> = {
		pop: 'sparkle',
		flip: 'sparkle',
		slam: 'dust',
	};
	const burst = $derived(playing ? BURSTS[playing] : undefined);
</script>

<Container x={props.x} y={props.y} {tint}>
	{#key runId}
		{#if burst === 'sparkle'}
			<Burst distance={SYMBOL_SIZE * 0.85} size={SYMBOL_SIZE * 0.12} count={12} />
		{:else if burst === 'dust'}
			<Burst
				y={spriteHeight * 0.48}
				distance={SYMBOL_SIZE * 0.9}
				size={SYMBOL_SIZE * 0.08}
				count={12}
				squashY={0.45}
				upwards
			/>
		{/if}
	{/key}
	<Container
		y={pose.y + (onGround ? ((1 - pose.scaleY) * spriteHeight) / 2 : 0)}
		scale={{ x: pose.scaleX, y: pose.scaleY }}
		rotation={pose.rotation}
	>
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
			{#if overKey && overFade.current > 0}
				<Sprite
					anchor={0.5}
					key={overKey}
					alpha={overFade.current}
					width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width}
					height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
				/>
			{/if}
		</Container>
		{@render props.children?.()}
	</Container>
</Container>
