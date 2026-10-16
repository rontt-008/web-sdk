<script lang="ts">
	import _ from 'lodash';
	import type { ComponentProps } from 'svelte';
	import { Container, Graphics, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_IMAGES, SYMBOL_SIZE } from '../game/constants';
	import type { SymbolPose } from '../game/motion';
	import { FREE_SPIN_COUNTER_SPACE } from './FreeSpinCounter.svelte';
	import StandingArt from './StandingArt.svelte';

	// A big rock in the bottom left corner of the screen, running past its edges and behind the UI
	// along the bottom, with a big cat sitting on it (only on wide screens, where the logo is beside
	// the board). The cat is as big as fits under where the free spin counter goes under the logo,
	// up to a limit (the logo sits high to leave it room). It breathes slowly and blinks now and then;
	// it doesn't react to wins.
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

	// Blinking: the same cat with its eyes shut (logo-cat-blink.png) is shown over it through two
	// eyelids that slide down over the eyes and back up. The eyes (in the image's pixels, as painted
	// over in the shut-eyed image) are covered from their top down.
	const EYES = [
		{ cx: 232.5, cy: 215.5, rx: 44.5, ry: 40.5 },
		{ cx: 370.5, cy: 170.5, rx: 42.5, ry: 42.5 },
	];
	// seconds: the lids shut quickly, stay a moment and open a little slower
	const BLINK = { close: 0.11, hold: 0.08, open: 0.16 };
	const BLINK_LENGTH = BLINK.close + BLINK.hold + BLINK.open;
	// between blinks, at random; sometimes it blinks twice in a row
	const BLINK_EVERY = { min: 2, max: 6 };
	const DOUBLE_BLINK = { chance: 0.25, gap: 0.12 };

	const ROCK_HEIGHT =
		(ROCK_WIDTH * SYMBOL_IMAGES.logoRock.image[1]) / SYMBOL_IMAGES.logoRock.image[0];
	const CAT_IMAGE = SYMBOL_IMAGES.logoCat.image;

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
	// when the current (or last) blink began, and when the next one comes
	let blinkStart = -Infinity;
	let nextBlink = _.random(BLINK_EVERY.min, BLINK_EVERY.max, true);
	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => {
			time += ticker.deltaMS / 1000;
			if (time < nextBlink) return;
			blinkStart = time;
			const double = Math.random() < DOUBLE_BLINK.chance;
			nextBlink =
				time +
				BLINK_LENGTH +
				(double ? DOUBLE_BLINK.gap : _.random(BLINK_EVERY.min, BLINK_EVERY.max, true));
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	const pose = $derived.by((): SymbolPose => {
		// breathing in: a little taller and narrower, about its feet
		const scaleY = 1 + BREATHE * (0.5 - 0.5 * Math.cos((time * 2 * Math.PI) / BREATHE_PERIOD));
		return { y: 0, scaleX: 1 / Math.sqrt(scaleY), scaleY, rotation: 0 };
	});

	// how far the lids are down: 0 open, 1 shut
	const lid = $derived.by(() => {
		const t = time - blinkStart;
		if (t < 0 || t >= BLINK_LENGTH) return 0;
		if (t < BLINK.close) return (t / BLINK.close) ** 2;
		if (t < BLINK.close + BLINK.hold) return 1;
		return 1 - (t - BLINK.close - BLINK.hold) / BLINK.open;
	});

	// each eye covered from its top down to how far the lid has come, in the art's own size
	const drawLids =
		(scale: number): ComponentProps<typeof Graphics>['draw'] =>
		(graphics) => {
			for (const eye of EYES) {
				const left = (eye.cx - eye.rx - CAT_IMAGE[0] / 2) * scale;
				const top = (eye.cy - eye.ry - CAT_IMAGE[1] / 2) * scale;
				graphics.rect(left, top, eye.rx * 2 * scale, eye.ry * 2 * lid * scale);
			}
			graphics.fill({ color: 0xffffff });
		};
</script>

<StandingArt key="logoRock" height={ROCK_HEIGHT} x={rockX} y={rockBottom} />
<StandingArt key="logoCat" height={catHeight} x={rockX} y={seatY} {pose}>
	{#snippet children({ scale })}
		{#if lid > 0}
			<Container>
				<Graphics isMask draw={drawLids(scale)} />
				<Sprite
					key="logoCatBlink"
					anchor={0.5}
					width={CAT_IMAGE[0] * scale}
					height={CAT_IMAGE[1] * scale}
				/>
			</Container>
		{/if}
	{/snippet}
</StandingArt>
