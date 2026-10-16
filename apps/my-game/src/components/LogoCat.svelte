<script lang="ts">
	import { getContext } from '../game/context';
	import { SYMBOL_IMAGES, SYMBOL_SIZE } from '../game/constants';
	import type { SymbolPose } from '../game/motion';
	import { FREE_SPIN_COUNTER_SPACE } from './FreeSpinCounter.svelte';
	import StandingArt from './StandingArt.svelte';

	// A big rock in the bottom left corner of the screen, running past its edges and behind the UI
	// along the bottom, with a big cat sitting on it (only on wide screens, where the logo is beside
	// the board). The cat is as big as fits under where the free spin counter goes under the logo,
	// up to a limit (the logo sits high to leave it room). It breathes slowly; it doesn't react to
	// wins.
	const ROCK_WIDTH = SYMBOL_SIZE * 4.2;
	// how much of the rock runs past the screen's left and bottom edges
	const ROCK_BLEED = { left: 0.08, bottom: 0.2 };
	// the cat sits this far down the rock (from its top), in the middle of its flat top
	const ROCK_SEAT = 0.22;
	const CAT_HEIGHT = { min: SYMBOL_SIZE * 1.4, max: SYMBOL_SIZE * 2.6 };
	// below the free spin counter
	const CLEARANCE = SYMBOL_SIZE * 0.08;
	const BREATHE_PERIOD = 3.2;
	const BREATHE = 0.022;

	const ROCK_HEIGHT =
		(ROCK_WIDTH * SYMBOL_IMAGES.logoRock.image[1]) / SYMBOL_IMAGES.logoRock.image[0];

	const context = getContext();
	const screenEdges = $derived(context.stateGameDerived.screenEdges());
	const rockX = $derived(screenEdges.left + ROCK_WIDTH * (0.5 - ROCK_BLEED.left));
	const rockBottom = $derived(screenEdges.bottom + ROCK_HEIGHT * ROCK_BLEED.bottom);
	// where the cat sits on the rock
	const seatY = $derived(rockBottom - ROCK_HEIGHT * (1 - ROCK_SEAT));
	const catHeight = $derived.by(() => {
		const logo = context.stateGameDerived.logoLayout();
		const top = logo.y + logo.height * 0.5 + FREE_SPIN_COUNTER_SPACE + CLEARANCE;
		return Math.min(CAT_HEIGHT.max, Math.max(CAT_HEIGHT.min, seatY - top));
	});

	let time = $state(0);
	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => (time += ticker.deltaMS / 1000);
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	const pose = $derived.by((): SymbolPose => {
		// breathing in: a little taller and narrower, about its feet
		const scaleY = 1 + BREATHE * (0.5 - 0.5 * Math.cos((time * 2 * Math.PI) / BREATHE_PERIOD));
		return { y: 0, scaleX: 1 / Math.sqrt(scaleY), scaleY, rotation: 0 };
	});
</script>

<StandingArt key="logoRock" height={ROCK_HEIGHT} x={rockX} y={rockBottom} />
<StandingArt key="logoCat" height={catHeight} x={rockX} y={seatY} {pose} />
