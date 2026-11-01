<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { Container } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getSymbolInfo } from '../game/utils';
	import { REST_POSE, SYMBOL_MOTIONS, type SymbolMotion } from '../game/motion';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		// called when its motion ends, or straight away when it has none
		oncomplete?: () => void;
		children: Snippet;
	};

	const props: Props = $props();

	// A symbol drawn without Spine (a still, an idle loop), moved by its state's motion when it has
	// one (motion.ts): its pose over the motion's length.

	// leaves swing either way first, so a cluster of them doesn't move in step
	const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
	const progress = new Tween(1);
	let playing = $state<SymbolMotion>();
	let runId = 0;

	// one without a motion is done at once: when it gets a new state, and when it is handed a new
	// oncomplete (a tumbling symbol lands looking the same, with a new oncomplete to call)
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
	{@render props.children()}
</Container>
