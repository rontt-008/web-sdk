<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { Container, Sprite } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import { REST_POSE, SYMBOL_MOTIONS, type SymbolMotion } from '../game/motion';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		// called when its motion ends, or straight away when it has none
		oncomplete?: () => void;
	};

	const props: Props = $props();

	// leaves swing either way first, so a cluster of them doesn't move in step
	const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
	const progress = new Tween(1);
	let playing = $state<SymbolMotion>();
	let runId = 0;

	// a sprite without a motion is done at once: when it gets a new state, and when it is handed a
	// new oncomplete (a tumbling symbol lands showing the same image, with a new oncomplete to call)
	$effect(() => {
		const { symbolInfo, oncomplete } = props;
		if ('motion' in symbolInfo) return;
		++runId;
		untrack(() => {
			playing = undefined;
			oncomplete?.();
		});
	});

	// one with a motion is done when it has played it
	$effect(() => {
		const symbolInfo = props.symbolInfo;
		if (!('motion' in symbolInfo)) return;
		const motion = symbolInfo.motion;
		const run = ++runId;

		untrack(async () => {
			playing = motion;
			await progress.set(0, { duration: 0 });
			await progress.set(1, {
				duration: SYMBOL_MOTIONS[motion].duration / stateBetDerived.timeScale(),
				easing: (t) => t,
			});
			if (run !== runId) return;
			playing = undefined;
			props.oncomplete?.();
		});
	});

	const pose = $derived(
		playing ? SYMBOL_MOTIONS[playing].pose(progress.current, direction) : REST_POSE,
	);
</script>

<Container
	x={(props.x ?? 0) + pose.x}
	y={(props.y ?? 0) + pose.y}
	scale={{ x: pose.scaleX, y: pose.scaleY }}
	rotation={pose.rotation}
>
	<Sprite
		anchor={0.5}
		key={props.symbolInfo.assetKey}
		width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width}
		height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
	/>
</Container>
