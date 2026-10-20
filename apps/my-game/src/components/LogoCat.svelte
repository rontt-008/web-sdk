<script lang="ts">
	import _ from 'lodash';
	import type { ComponentProps } from 'svelte';
	import { Container, Graphics, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_IMAGES, SYMBOL_SIZE } from '../game/constants';
	import { hopPose, REST_POSE, type SymbolPose } from '../game/motion';
	import { FREE_SPIN_COUNTER_SPACE } from './FreeSpinCounter.svelte';
	import StandingArt from './StandingArt.svelte';

	// A big rock in the bottom left corner of the screen, running past its edges and behind the UI
	// along the bottom, with a big cat sitting on it (only on wide screens, where the logo is beside
	// the board). The cat is as big as fits under where the free spin counter goes under the logo,
	// up to a limit (the logo sits high to leave it room). It breathes slowly and blinks now and then;
	// it doesn't react to wins, but when free spins are won it is fed the scatters (see ScatterFeed):
	// it hops on its rock, watching them come, opens its mouth for each and gulps it down.
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

	// Blinking: the same cat with its eyes shut (logo-cat-blink.png) is shown over it through the
	// eyelids. In each eye an upper lid comes down and a lower lid a little way up, along the head's
	// tilt, their edges curved like the closed eye's line, until they meet on it; a dark line runs
	// along the upper lid's edge as it comes down. Measured in the image's pixels; the closed line
	// must match the one painted on logo-cat-blink.png.
	const LIDS = {
		tilt: (-18.08 * Math.PI) / 180,
		eyes: [
			{ cx: 230.77, cy: 212.78 },
			{ cx: 368.17, cy: 167.93 },
		],
		// the eye (about), and the circle round it the lids sweep over
		eyeRadius: 31,
		radius: 36,
		// the closed line: this far below the eye's middle at its ends, bowing down this much more in
		// the middle (a curve this wide), drawn this long either side of the middle
		below: 6,
		bow: 9,
		curveWidth: 32,
		halfLength: 27,
		lineWidth: 6,
	};
	const LID_COLOR = 0x281814;
	const LID_SAMPLES = 24;
	// seconds: the lids shut quickly, stay a moment and open a little slower
	const BLINK = { close: 0.11, hold: 0.08, open: 0.16 };
	const BLINK_LENGTH = BLINK.close + BLINK.hold + BLINK.open;
	// between blinks, at random; sometimes it blinks twice in a row
	const BLINK_EVERY = { min: 2, max: 6 };
	const DOUBLE_BLINK = { chance: 0.25, gap: 0.12 };

	// While the ball of yarn rolls across the screen the pupils turn to follow it, sliding inside
	// their eyes: one pupil (logo-cat-pupil.png, an upright oval tilted with the head) in each eye,
	// over the eyes with their painted pupils painted out (logo-cat-irises.png), within each eye's rim
	// (logo-cat-eye-mask.png). Image pixels: the most they move, and the point between the eyes they
	// look from.
	const LOOK = { x: 7, y: 5 };
	const EYES_MIDDLE = { x: 299.5, y: 190.4 };
	// Each eye's middle, where its pupil rests (as painted), and how far the pupil's middle may get
	// from the eye's middle, along the head's tilt (u) and across it (v), while the whole pupil stays
	// inside the eye: a pupil looking further stops at that edge, so it is never cut by the rim.
	const PUPILS = {
		// in the art's pixels (the image is drawn at twice that, so its highlights stay sharp)
		size: 52,
		eyes: [
			{ cx: 231.08, cy: 214.72, rest: { x: 237.35, y: 209.78 }, room: { u: 10.95, v: 4.55 } },
			{ cx: 368.51, cy: 169.97, rest: { x: 359.4, y: 170.33 }, room: { u: 10.32, v: 5.23 } },
		],
	};
	// how quickly they turn to the ball and back (a higher number is quicker)
	const LOOK_SPEED = 8;

	// Fed the scatters: hops on its rock over and over (a symbol's win hop, this much higher, each
	// taking this many seconds, leaning less), and squashes a little as it gulps one down.
	const FEED_HOP = { height: 1.4, length: 0.6, lean: 0.4 };
	const GULP = { length: 0.22, squash: 0.08 };
	// Its mouth, just under its nose (image pixels, along the head's tilt): opens down from its top
	// edge, dark with a pink tongue, as a scatter comes.
	const MOUTH = { x: 314, y: 229, halfWidth: 13, halfHeight: 10 };
	const MOUTH_COLOR = 0x3a1a18;
	const TONGUE_COLOR = 0xd9787a;

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

	// where the pupils are looking: towards the next scatter coming while it is fed, or the ball while
	// it rolls by, eased there and back
	const lookTarget = () => {
		const ball = context.stateGame.catFeed?.watch ?? context.stateGame.yarnBall;
		if (!ball) return { x: 0, y: 0 };
		const scale = catHeight / CAT_IMAGE[1];
		const dx = ball.x - (rockX + (EYES_MIDDLE.x - CAT_IMAGE[0] / 2) * scale);
		const dy = ball.y - (seatY + pose.y - catHeight + EYES_MIDDLE.y * scale);
		const distance = Math.hypot(dx, dy) || 1;
		return { x: (dx / distance) * LOOK.x, y: (dy / distance) * LOOK.y };
	};
	let look = $state({ x: 0, y: 0 });

	let time = $state(0);
	// when the current (or last) blink began, and when the next one comes
	let blinkStart = -Infinity;
	let nextBlink = _.random(BLINK_EVERY.min, BLINK_EVERY.max, true);
	// how far through its hop it is while fed (0 to 1; below 0 not hopping), and when it last gulped
	let hop = -1;
	let gulpStart = -Infinity;

	// its mouth in the game's layout, for the scatters to fly to: as it hops and breathes, about its
	// feet (see StandingArt)
	const mouthOnLayout = () => {
		const scale = catHeight / CAT_IMAGE[1];
		const mouth = toArt({ cx: MOUTH.x, cy: MOUTH.y }, 0, MOUTH.halfHeight, scale);
		return {
			x: rockX + pose.scaleX * mouth.x,
			y: seatY + pose.y + pose.scaleY * (mouth.y - catHeight / 2),
		};
	};

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => {
			const seconds = ticker.deltaMS / 1000;
			time += seconds;

			// hops over and over while fed, finishing the hop it is in once it isn't
			if (context.stateGame.catFeed || hop >= 0) {
				hop = Math.max(0, hop) + seconds / FEED_HOP.length;
				if (hop >= 1) hop = context.stateGame.catFeed ? hop - 1 : -1;
			}
			context.stateGame.catMouth = mouthOnLayout();

			const target = lookTarget();
			const ease = 1 - Math.exp(-seconds * LOOK_SPEED);
			if (Math.hypot(target.x - look.x, target.y - look.y) > 0.01) {
				look = { x: look.x + (target.x - look.x) * ease, y: look.y + (target.y - look.y) * ease };
			}

			if (time < nextBlink) return;
			blinkStart = time;
			const double = Math.random() < DOUBLE_BLINK.chance;
			nextBlink =
				time +
				BLINK_LENGTH +
				(double ? DOUBLE_BLINK.gap : _.random(BLINK_EVERY.min, BLINK_EVERY.max, true));
		};
		ticker.add(tick);
		return () => {
			ticker.remove(tick);
			context.stateGame.catMouth = undefined;
		};
	});

	context.eventEmitter.subscribeOnMount({
		catGulp: () => {
			gulpStart = time;
		},
	});

	const pose = $derived.by((): SymbolPose => {
		// breathing in: a little taller and narrower, about its feet
		const breathe = 1 + BREATHE * (0.5 - 0.5 * Math.cos((time * 2 * Math.PI) / BREATHE_PERIOD));
		const hopping = hop >= 0 ? hopPose(hop) : REST_POSE;
		const gulp = (time - gulpStart) / GULP.length;
		const gulpScale = gulp >= 0 && gulp < 1 ? 1 - GULP.squash * Math.sin(Math.PI * gulp) : 1;
		const scaleY = breathe * hopping.scaleY * gulpScale;
		return {
			y: hopping.y * FEED_HOP.height,
			scaleX: 1 / Math.sqrt(scaleY),
			scaleY,
			rotation: hopping.rotation * FEED_HOP.lean,
		};
	});

	// how wide its mouth is open (see ScatterFeed)
	const mouthOpen = $derived(context.stateGame.catFeed?.open ?? 0);

	// how far the lids are down: 0 open, 1 shut
	const lid = $derived.by(() => {
		const t = time - blinkStart;
		if (t < 0 || t >= BLINK_LENGTH) return 0;
		if (t < BLINK.close) return (t / BLINK.close) ** 2;
		if (t < BLINK.close + BLINK.hold) return 1;
		return 1 - (t - BLINK.close - BLINK.hold) / BLINK.open;
	});

	// The lids are worked out across each eye (u, along the head's tilt) and down it (v), from the
	// eye's middle, in image pixels. Both lid edges have the closed line's curve; the upper starts
	// above the eye and the lower below it, and they meet on the closed line.
	const curve = (u: number) => LIDS.bow * (1 - (u / LIDS.curveWidth) ** 2);
	const upperEdge = (u: number) =>
		-LIDS.radius - LIDS.bow + (LIDS.below + LIDS.radius + LIDS.bow) * lid + curve(u);
	const lowerEdge = (u: number) => LIDS.radius + (LIDS.below - LIDS.radius) * lid + curve(u);
	const across = _.range(LID_SAMPLES + 1).map(
		(k) => -LIDS.radius + (2 * LIDS.radius * k) / LID_SAMPLES,
	);

	// from an eye's (u, v) to the art's own size, about its middle
	const toArt = (eye: { cx: number; cy: number }, u: number, v: number, scale: number) => {
		const cos = Math.cos(LIDS.tilt);
		const sin = Math.sin(LIDS.tilt);
		return {
			x: (eye.cx + u * cos - v * sin - CAT_IMAGE[0] / 2) * scale,
			y: (eye.cy + u * sin + v * cos - CAT_IMAGE[1] / 2) * scale,
		};
	};

	// what the lids cover in each eye: above the upper lid's edge and below the lower one's, within
	// the circle they sweep over
	const drawLids =
		(scale: number): ComponentProps<typeof Graphics>['draw'] =>
		(graphics) => {
			for (const eye of LIDS.eyes) {
				const half = (u: number) => Math.sqrt(Math.max(0, LIDS.radius ** 2 - u * u));
				const clampV = (u: number, v: number) => Math.min(half(u), Math.max(-half(u), v));
				const upper = [
					...across.map((u) => toArt(eye, u, -half(u), scale)),
					...[...across].reverse().map((u) => toArt(eye, u, clampV(u, upperEdge(u)), scale)),
				];
				const lower = [
					...across.map((u) => toArt(eye, u, clampV(u, lowerEdge(u)), scale)),
					...[...across].reverse().map((u) => toArt(eye, u, half(u), scale)),
				];
				graphics.poly(upper).poly(lower);
			}
			graphics.fill({ color: 0xffffff });
		};

	// the dark line along the upper lid's edge, where it crosses the eye
	const drawLidLines =
		(scale: number): ComponentProps<typeof Graphics>['draw'] =>
		(graphics) => {
			for (const eye of LIDS.eyes) {
				const points = _.range(41)
					.map((k) => -LIDS.halfLength + (2 * LIDS.halfLength * k) / 40)
					.filter((u) => Math.hypot(u, upperEdge(u)) <= LIDS.eyeRadius)
					.map((u) => toArt(eye, u, upperEdge(u), scale));
				if (points.length < 2) continue;
				graphics.moveTo(points[0].x, points[0].y);
				for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
			}
			graphics.stroke({ color: LID_COLOR, width: LIDS.lineWidth * scale, cap: 'round', join: 'round' });
		};

	// the open mouth, drawn from its top edge down along the head's tilt: wider and deeper as it opens
	const drawMouth =
		(scale: number, open: number): ComponentProps<typeof Graphics>['draw'] =>
		(graphics) => {
			const halfWidth = MOUTH.halfWidth * scale * (0.7 + 0.3 * open);
			const halfHeight = MOUTH.halfHeight * scale * open;
			graphics.ellipse(0, halfHeight, halfWidth, halfHeight).fill({ color: MOUTH_COLOR });
			graphics
				.ellipse(0, halfHeight * 1.45, halfWidth * 0.6, halfHeight * 0.5)
				.fill({ color: TONGUE_COLOR });
		};

	// a pupil's place, looking: moved from where it rests, kept within its eye's room
	const pupilAt = (eye: (typeof PUPILS.eyes)[number], scale: number) => {
		const cos = Math.cos(LIDS.tilt);
		const sin = Math.sin(LIDS.tilt);
		const x = eye.rest.x + look.x - eye.cx;
		const y = eye.rest.y + look.y - eye.cy;
		const u = x * cos + y * sin;
		const v = -x * sin + y * cos;
		const reach = Math.sqrt((u / eye.room.u) ** 2 + (v / eye.room.v) ** 2);
		const fit = reach > 1 ? 1 / reach : 1;
		return toArt(eye, u * fit, v * fit, scale);
	};

	const artSize = (scale: number) => ({
		width: CAT_IMAGE[0] * scale,
		height: CAT_IMAGE[1] * scale,
	});
</script>

<StandingArt key="logoRock" height={ROCK_HEIGHT} x={rockX} y={rockBottom} />
<StandingArt key="logoCat" height={catHeight} x={rockX} y={seatY} {pose}>
	{#snippet children({ scale })}
		<!-- the eyes without their painted pupils, then a pupil in each, moved to look -->
		<Sprite key="logoCatIrises" anchor={0.5} {...artSize(scale)} />
		<Container>
			<Sprite key="logoCatEyeMask" isMask anchor={0.5} {...artSize(scale)} />
			{#each PUPILS.eyes as eye}
				<Sprite
					key="logoCatPupil"
					anchor={0.5}
					{...pupilAt(eye, scale)}
					width={PUPILS.size * scale}
					height={PUPILS.size * scale}
				/>
			{/each}
		</Container>
		{#if mouthOpen > 0.02}
			<Container {...toArt({ cx: MOUTH.x, cy: MOUTH.y }, 0, 0, scale)} rotation={LIDS.tilt}>
				<Graphics draw={drawMouth(scale, mouthOpen)} />
			</Container>
		{/if}
		{#if lid > 0}
			<Container>
				<Graphics isMask draw={drawLids(scale)} />
				<Sprite key="logoCatBlink" anchor={0.5} {...artSize(scale)} />
			</Container>
			{#if lid < 1}
				<Graphics draw={drawLidLines(scale)} />
			{/if}
		{/if}
	{/snippet}
</StandingArt>
