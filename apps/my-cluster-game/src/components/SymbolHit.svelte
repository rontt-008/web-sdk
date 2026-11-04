<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { getContextApp, type LoadedSpine } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import SymbolSkeleton from './SymbolSkeleton.svelte';
	import { getSymbolInfo } from '../game/utils';
	import { TILE_ALPHA } from '../game/constants';
	import { IDLE_FRAME_RATE, idleTime } from '../game/idleClock.svelte';

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

	// the user's hit (art-source/symbol-spines.py), played once, `speed` times as fast as it was
	// made. A tile's (one with an idle) starts and ends on the tile at rest, so over its first and
	// last BLEND seconds it fades in over the idle loop and back out to it: the swap doesn't jump
	// wherever the loop is. A leaf's has no idle: it is drawn whole all the way through.
	const BLEND = 0.1;

	const idleKey = $derived('idleKey' in props.symbolInfo ? props.symbolInfo.idleKey : undefined);
	const speed = $derived('speed' in props.symbolInfo ? props.symbolInfo.speed : 1);
	// the idle under it as fast as the tile's idle plays (SymbolIdle), so it carries on where it was
	const idleSpeed = $derived(
		'idleSpeed' in props.symbolInfo ? (props.symbolInfo.idleSpeed as number) : 1,
	);
	const alpha = $derived(idleKey ? TILE_ALPHA : 1);
	const spineData = $derived(
		context.stateApp.loadedAssets?.[props.symbolInfo.assetKey] as LoadedSpine | undefined,
	);
	// its length as made, and as played
	const made = $derived(spineData?.findAnimation('hit')?.duration ?? 0);
	const length = $derived(made / speed);
	const phase = $derived((props.phase ?? 0) / IDLE_FRAME_RATE);

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

	// 0 (the idle) to 1 (the hit)
	const blend = $derived(
		!idleKey
			? 1
			: length
				? Math.min(1, (progress.current * length) / BLEND, ((1 - progress.current) * length) / BLEND)
				: 0,
	);
</script>

<!-- the idle stays under the hit as it fades, so the tile's frame and panel never get thinner -->
{#if idleKey}
	<SymbolSkeleton
		assetKey={idleKey}
		animation="idle"
		loop
		time={() => idleTime() * idleSpeed + phase}
		x={props.x}
		y={props.y}
		sizeRatios={props.symbolInfo.sizeRatios}
		alpha={blend < 1 ? alpha : 0}
	/>
{/if}
<SymbolSkeleton
	assetKey={props.symbolInfo.assetKey}
	animation="hit"
	time={() => progress.current * made}
	x={props.x}
	y={props.y}
	sizeRatios={props.symbolInfo.sizeRatios}
	alpha={alpha * blend}
/>
