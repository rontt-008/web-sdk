<script lang="ts" module>
	export type EmitterEventWindTransition = {
		type: 'windTransition';
		// called once the wind covers the whole screen, to change what is under it (waited for before
		// it clears); the transition is done when the screen is clear again
		oncovered?: () => void | Promise<void>;
	};
</script>

<script lang="ts">
	import _ from 'lodash';
	import type * as PIXI from 'pixi.js';
	import { BlurFilter, FillGradient } from 'pixi.js';
	import { Container, Graphics, Sprite } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';

	const context = getContext();

	// A gale sweeping the screen as the bonus starts and as it ends (freeSpinTrigger, freeSpinEnd),
	// left to right like the spins' gusts (Wind) and the fox's tail: a wall of dusk mist with a pale
	// hazy front blows in, soft puffs racing through it, carrying streaks of wind and a storm of
	// leaves, until it covers the screen; what is under it changes (oncovered); then its back edge
	// blows on off the right side, uncovering the new screen, the last leaves tumbling after it.
	// Times in seconds; places in screen widths (x) and heights (y); sizes in screen heights on a wide
	// screen, no more than 1.2 widths on a tall one (unit), so a phone held upright gets smaller leaves.
	const TIMING = { in: 0.75, hold: 0.25, out: 0.9 };
	const MIST = {
		// the front starts this far left of the screen and blows this far past its right edge; the
		// back edge waits this far left, then follows it off
		from: -0.45,
		to: 1.45,
		wait: -0.75,
		// the edges ripple, as two waves running down the screen and drifting as it blows
		ripples: [
			{ size: 0.05, waves: 1.2, speed: 2.6 },
			{ size: 0.022, waves: 3.4, speed: -4.4 },
		],
		// dusk, top to bottom: plum to almost black
		body: [0x3d2b52, 0x231a30, 0x110c17],
		// a pale haze this far ahead of the front and behind the back edge
		haze: { colour: 0x9b8db0, alpha: 0.42, reach: 0.15 },
		// a warm glow along the moving edge, as if the low sun caught the wind: this far into the mist
		// and out of it
		glow: { colour: 0xf0a35a, alpha: 0.22, inside: 0.03, outside: 0.07 },
		// soft puffs of paler mist, lavender and amber, racing through it
		puffs: {
			count: 22,
			speed: { min: 1.1, max: 1.8 },
			size: { min: 0.2, max: 0.45 },
			colours: [
				{ colour: 0xb3a3c9, alpha: 0.15 },
				{ colour: 0xe0904f, alpha: 0.1 },
			],
		},
		// how soft its edges are, in screen heights
		blur: 0.035,
	};
	// spread over the whole gale, a little ahead of the mist and trailing it as it clears
	const OVER = TIMING.in + TIMING.hold + TIMING.out * 0.7;
	const STREAKS = {
		count: 60,
		// their heads running this fast along a wavy line this high and long, each this long and
		// wide (thickest in its middle)
		speed: { min: 1.8, max: 2.8 },
		wave: { min: 0.01, max: 0.03 },
		waveLength: { min: 0.22, max: 0.42 },
		length: { min: 0.2, max: 0.45 },
		width: { min: 0.006, max: 0.014 },
		colour: 0xfff3dc,
		alpha: 0.75,
		// and a soft glowing trail under each, this many times as wide (in the mist's blur)
		glow: { width: 3.5, alpha: 0.28 },
	};
	const LEAVES = {
		count: 110,
		speed: { min: 0.95, max: 1.6 },
		// bobbing this far, this many times a second; spinning (radians a second) and turning over
		// (times a second)
		bob: { min: 0.02, max: 0.06 },
		bobRate: { min: 1.2, max: 2.6 },
		spin: { min: 4, max: 10 },
		flipRate: { min: 1.5, max: 3.5 },
		size: { min: 0.065, max: 0.13 },
		// some loop the loop on the gusts, slower, round circles this big this fast (radians a second)
		loops: {
			share: 0.35,
			speed: { min: 0.45, max: 0.7 },
			radius: { min: 0.06, max: 0.12 },
			rate: { min: 8, max: 11 },
		},
		// some further off: smaller, dimmed toward the mist, under the streaks
		far: { share: 0.4, size: 0.6, tint: 0x8c82a0 },
		keys: ['leafGreen', 'leafBrown', 'leafRed', 'leafYellow'],
	};

	type Streak = {
		start: number;
		y: number;
		speed: number;
		wave: number;
		waveLength: number;
		phase: number;
		length: number;
		width: number;
	};
	type Puff = { start: number; y: number; speed: number; size: number; colour: number; alpha: number };
	type Leaf = {
		key: string;
		start: number;
		top: number;
		speed: number;
		bob: number;
		bobRate: number;
		spin: number;
		flipRate: number;
		phase: number;
		size: number;
		loop?: { radius: number; rate: number };
		far: boolean;
		x: number;
		y: number;
		rotation: number;
		flip: number;
	};

	const TAU = Math.PI * 2;
	const between = ({ min, max }: { min: number; max: number }) => _.random(min, max, true);
	const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

	// the time, in seconds, from when the game started
	let clock = 0;
	// when the gale started (its in, hold and out timed from then), and what it waits for
	let gale = $state<{ start: number; clearing: number | undefined } | undefined>();
	let streaks: Streak[] = [];
	let puffs: Puff[] = [];
	const leaves = $state<Leaf[]>([]);
	// counts up each frame something moves, so the mist and streaks redraw
	let frame = $state(0);

	const screen = $derived(context.stateLayoutDerived.canvasSizes());
	const unit = $derived(Math.min(screen.height, screen.width * 1.2));

	// the front and back edges, in screen widths, before they ripple
	const edges = () => {
		if (!gale) return undefined;
		const age = clock - gale.start;
		const front = MIST.from + (MIST.to - MIST.from) * easeInOut(Math.min(1, age / TIMING.in));
		const back =
			gale.clearing === undefined
				? MIST.wait
				: MIST.wait +
					(MIST.to - MIST.wait) * easeInOut(Math.min(1, (clock - gale.clearing) / TIMING.out));
		return { front, back };
	};

	// an edge's x at this height, in px: its place, rippling
	const rippled = (place: number, y: number, offset: number) =>
		screen.width *
		(place +
			MIST.ripples.reduce(
				(sum, ripple, i) =>
					sum +
					ripple.size *
						Math.sin((y / screen.height) * ripple.waves * TAU + clock * ripple.speed + offset * (i + 1)),
				0,
			));

	const EDGE_STEPS = 36;
	const band = (back: number, front: number) => {
		const points: number[] = [];
		const pad = screen.height * 0.1;
		for (let i = 0; i <= EDGE_STEPS; i++) {
			const y = -pad + ((screen.height + 2 * pad) * i) / EDGE_STEPS;
			points.push(rippled(front, y, 0), y);
		}
		for (let i = EDGE_STEPS; i >= 0; i--) {
			const y = -pad + ((screen.height + 2 * pad) * i) / EDGE_STEPS;
			points.push(rippled(back, y, 1.7), y);
		}
		return points;
	};

	const blow = () => {
		streaks = _.times(STREAKS.count, () => ({
			start: clock + Math.random() * OVER,
			y: Math.random(),
			speed: between(STREAKS.speed),
			wave: between(STREAKS.wave),
			waveLength: between(STREAKS.waveLength),
			phase: Math.random() * TAU,
			length: between(STREAKS.length),
			width: between(STREAKS.width),
		}));
		puffs = _.times(MIST.puffs.count, () => ({
			start: clock + Math.random() * (TIMING.in + TIMING.hold),
			y: Math.random(),
			speed: between(MIST.puffs.speed),
			size: between(MIST.puffs.size),
			..._.sample(MIST.puffs.colours)!,
		}));
		leaves.push(
			..._.times(LEAVES.count, () => {
				const far = Math.random() < LEAVES.far.share;
				const loops = Math.random() < LEAVES.loops.share;
				return {
					key: _.sample(LEAVES.keys)!,
					start: clock + Math.random() * OVER,
					top: _.random(-0.05, 1.05, true),
					speed: loops ? between(LEAVES.loops.speed) : between(LEAVES.speed) * (far ? 0.8 : 1),
					bob: between(LEAVES.bob),
					bobRate: between(LEAVES.bobRate),
					spin: between(LEAVES.spin) * _.sample([-1, 1])!,
					flipRate: between(LEAVES.flipRate),
					phase: Math.random() * TAU,
					size: between(LEAVES.size) * (far ? LEAVES.far.size : 1),
					loop: loops
						? { radius: between(LEAVES.loops.radius), rate: between(LEAVES.loops.rate) }
						: undefined,
					far,
					x: -screen.width,
					y: 0,
					rotation: Math.random() * TAU,
					flip: 1,
				};
			}),
		);
	};

	const step = (seconds: number) => {
		clock += seconds;
		const { width, height } = screen;
		for (const leaf of leaves) {
			const age = clock - leaf.start;
			if (age < 0) continue;
			const size = leaf.size * unit;
			leaf.x = -size + age * leaf.speed * width;
			leaf.y = leaf.top * height + leaf.bob * unit * Math.sin(age * leaf.bobRate * TAU + leaf.phase);
			if (leaf.loop) {
				// round and round as it goes, a cycloid: backwards over the top of each loop
				const angle = age * leaf.loop.rate + leaf.phase;
				leaf.x -= leaf.loop.radius * unit * Math.sin(angle);
				leaf.y -= leaf.loop.radius * unit * (1 - Math.cos(angle));
			}
			leaf.rotation += leaf.spin * seconds;
			leaf.flip = Math.cos(age * leaf.flipRate * TAU + leaf.phase);
		}
		streaks = streaks.filter(
			(streak) =>
				clock < streak.start || ((clock - streak.start) * streak.speed - streak.length) * width < width,
		);
		puffs = puffs.filter((puff) => clock < puff.start || (clock - puff.start) * puff.speed < 1 + puff.size);
		_.remove(leaves, (leaf) => leaf.x > width + leaf.size * unit * 2);
		// gone once its back edge is past the screen's right edge
		if (gale?.clearing !== undefined && clock - gale.clearing >= TIMING.out) gale = undefined;
		frame++;
	};

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => {
			if (gale || streaks.length || leaves.length) {
				step((ticker.deltaMS / 1000) * stateBetDerived.timeScale());
			}
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	// until the gale's clock reaches this far on (in game time, so quicker in turbo)
	const until = (time: number) =>
		new Promise<void>((resolve) => {
			const check = () => (clock >= time || !gale ? resolve() : requestAnimationFrame(check));
			check();
		});

	context.eventEmitter.subscribeOnMount({
		windTransition: async ({ oncovered }) => {
			gale = { start: clock, clearing: undefined };
			const current = gale;
			blow();
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wind_sweep' });
			await until(current.start + TIMING.in);
			await oncovered?.();
			await until(current.start + TIMING.in + TIMING.hold);
			current.clearing = clock;
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wind_gust' });
			await until(current.clearing + TIMING.out);
		},
	});

	// a streak: a ribbon along its wavy line from its tail to its head, thickest in its middle,
	// `widen` times as wide (its glow)
	const STREAK_POINTS = 16;
	const streakOutline = (streak: Streak, widen = 1) => {
		const { width, height } = screen;
		const head = (clock - streak.start) * streak.speed * width;
		const upper: number[] = [];
		const lower: number[] = [];
		for (let i = 0; i <= STREAK_POINTS; i++) {
			const along = i / STREAK_POINTS;
			const x = head - (1 - along) * streak.length * width;
			const y =
				streak.y * height +
				streak.wave * unit * Math.sin((x / (streak.waveLength * width)) * TAU + streak.phase);
			const half = (widen * streak.width * unit * Math.sin(Math.PI * along)) / 2;
			upper.push(x, y - half);
			lower.unshift(x, y + half);
		}
		return [...upper, ...lower];
	};

	const mistBlur = new BlurFilter({ quality: 4, resolution: 'inherit' });
	$effect(() => {
		mistBlur.strength = MIST.blur * unit;
	});
	const bodyFill = $derived(
		new FillGradient({
			type: 'linear',
			start: { x: 0, y: 0 },
			end: { x: 0, y: screen.height },
			colorStops: MIST.body.map((color, i) => ({ offset: i / (MIST.body.length - 1), color })),
			textureSpace: 'global',
		}),
	);

	const drawMist = (graphics: PIXI.Graphics) => {
		frame;
		const at = edges();
		if (!at) return;
		const { haze, glow } = MIST;
		graphics
			.poly(band(at.back - haze.reach, at.front + haze.reach))
			.fill({ color: haze.colour, alpha: haze.alpha });
		graphics.poly(band(at.back, at.front)).fill(bodyFill);
		// the puffs only inside the mist
		for (const puff of puffs) {
			const x = (clock - puff.start) * puff.speed;
			if (clock < puff.start || x < at.back || x > at.front) continue;
			graphics
				.ellipse(
					x * screen.width,
					puff.y * screen.height,
					puff.size * screen.width,
					puff.size * screen.height * 0.35,
				)
				.fill({ color: puff.colour, alpha: puff.alpha });
		}
		// the sunlit edges: the front blowing in, and the back once it blows on
		graphics
			.poly(band(at.front - glow.inside, at.front + glow.outside))
			.fill({ color: glow.colour, alpha: glow.alpha });
		if (gale?.clearing !== undefined) {
			graphics
				.poly(band(at.back - glow.outside, at.back + glow.inside))
				.fill({ color: glow.colour, alpha: glow.alpha });
		}
		// the streaks' glowing trails, softened with the mist
		for (const streak of streaks) {
			if (clock < streak.start) continue;
			graphics
				.poly(streakOutline(streak, STREAKS.glow.width))
				.fill({ color: STREAKS.colour, alpha: STREAKS.glow.alpha });
		}
	};
</script>

{#snippet leafSprite(leaf: Leaf)}
	<Sprite
		key={leaf.key}
		x={leaf.x}
		y={leaf.y}
		anchor={0.5}
		rotation={leaf.rotation}
		width={leaf.size * unit * Math.max(0.15, Math.abs(leaf.flip))}
		height={leaf.size * unit}
		tint={leaf.far ? LEAVES.far.tint : 0xffffff}
	/>
{/snippet}

<!-- over everything, also what shows up under it while it covers the screen (a screen added later
would otherwise be drawn over it) -->
<Container zIndex={100}>
	<!-- the mist, its edges and the streaks' trails softened -->
	<Container filters={[mistBlur]}>
		<Graphics draw={drawMist} />
	</Container>

	<!-- off the screen's left edge until they set off -->
	{#each leaves.filter((leaf) => leaf.far) as leaf}
		{@render leafSprite(leaf)}
	{/each}

	<Graphics
		draw={(graphics) => {
			frame;
			for (const streak of streaks) {
				if (clock < streak.start) continue;
				graphics.poly(streakOutline(streak)).fill({ color: STREAKS.colour, alpha: STREAKS.alpha });
			}
		}}
	/>

	{#each leaves.filter((leaf) => !leaf.far) as leaf}
		{@render leafSprite(leaf)}
	{/each}
</Container>
