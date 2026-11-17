<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut, cubicInOut } from 'svelte/easing';

	import { Container } from 'pixi-svelte';

	import { playAt } from '../game/winsHurry.svelte';

	// A winning symbol, then the win is done:
	// - pulse: it swells a little and settles back, twice (a plain stand-in for the sample's Mining
	//   Mayhem win animations, which were removed): the letters, the wild, the scatter
	// - otherwise it plays its own win animation (the premiums' hits) and calls `done` when that ends

	type Props = {
		x?: number;
		y?: number;
		pulse: boolean;
		oncomplete: () => void;
		children: Snippet<[() => void]>;
	};

	const props: Props = $props();

	const PULSES = 2;
	const GROW = 1.14;
	const UP = 170;
	const DOWN = 230;

	const scale = new Tween(1);

	let done = false;
	const finish = () => {
		if (done) return;
		done = true;
		props.oncomplete();
	};

	onMount(() => {
		if (props.pulse) {
			(async () => {
				// (at the wins' speed, which goes up as it plays if they are hurried: winsHurry)
				for (let i = 0; i < PULSES && !done; i++) {
					await playAt(scale, GROW, UP, { easing: cubicOut });
					await playAt(scale, 1, DOWN, { easing: cubicInOut });
				}
				finish();
			})();
		}
		// taken off the board before it ends (e.g. the board hidden): the win is done anyway
		return finish;
	});
</script>

<Container x={props.x} y={props.y} scale={scale.current}>
	{@render props.children(finish)}
</Container>
