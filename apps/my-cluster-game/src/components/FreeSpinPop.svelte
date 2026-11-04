<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { Container } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { PANEL_DROP } from './FreeSpinAnimation.svelte';

	type Props = {
		y?: number;
		children: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	// The number on the free spins' screens (FreeSpinAnimation), in place of the sample's number
	// spines: it pops in as the panel lands (a little after), then breathes gently while it shows.
	// In milliseconds, game time.
	const POP = { after: 80, ms: 450 };
	const BREATHE = { size: 0.05, period: 2800 };

	const pop = new Tween(0);
	let clock = $state(0);

	onMount(async () => {
		const timeScale = stateBetDerived.timeScale();
		await waitForTimeout((PANEL_DROP.fall * 1000 + POP.after) / timeScale);
		pop.set(1, { duration: POP.ms / timeScale, easing: backOut });
	});

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => (clock += ticker.deltaMS * stateBetDerived.timeScale());
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	const breathe = $derived(
		1 + (BREATHE.size * (1 - Math.cos((clock / BREATHE.period) * Math.PI * 2))) / 2,
	);
</script>

<Container y={props.y ?? 0} scale={pop.current * breathe}>
	{@render props.children()}
</Container>
