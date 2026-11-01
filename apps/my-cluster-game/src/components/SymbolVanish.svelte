<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicIn } from 'svelte/easing';
	import { Container } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import type { RawSymbol } from '../game/types';
	import Symbol from './Symbol.svelte';

	type Props = {
		x?: number;
		y?: number;
		rawSymbol: RawSymbol;
		// how many frames on an idle loop is (see idleClock)
		phase?: number;
		// called when it has gone
		oncomplete?: () => void;
	};

	const props: Props = $props();

	// A winning symbol going as the board tumbles: as it is at rest (its 'static' state), it pops
	// over DURATION ms, swelling by SWELL over the first POP of it, then shrinking away by SHRINK as
	// it fades out.
	const DURATION = 300;
	const POP = 0.3;
	const SWELL = 0.08;
	const SHRINK = 0.6;
	const progress = new Tween(0);

	onMount(async () => {
		await progress.set(1, { duration: DURATION / stateBetDerived.timeScale() });
		props.oncomplete?.();
	});

	const swell = $derived(Math.sin((Math.PI / 2) * Math.min(1, progress.current / POP)));
	const gone = $derived(cubicIn(Math.max(0, (progress.current - POP) / (1 - POP))));
</script>

<Container
	x={props.x ?? 0}
	y={props.y ?? 0}
	alpha={1 - gone}
	scale={(1 + SWELL * swell) * (1 - SHRINK * gone)}
>
	<Symbol state="static" rawSymbol={props.rawSymbol} phase={props.phase} />
</Container>
