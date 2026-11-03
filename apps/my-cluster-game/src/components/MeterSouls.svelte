<script lang="ts" module>
	// a winning leaf's soul, from the middle of its cell (in the main layout) to the bonus meter (or a
	// rune symbol's, to its rune's box); `onleave` is called as it sets off (the symbol goes with it),
	// `onland` as it lands
	export type MeterSoul = {
		x: number;
		y: number;
		symbol: string;
		onleave?: () => void;
		onland?: () => void;
	};
</script>

<script lang="ts">
	import _ from 'lodash';
	import { BlurFilter } from 'pixi.js';
	import { Container, Graphics } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { BLUR_RESOLUTION, SYMBOL_SIZE } from '../game/constants';
	import { RUNE_COLOURS, type RuneName } from '../game/runes';

	type Props = {
		// where the souls fly into, in the main layout: the end of the meter's filled part, or a rune's
		// box
		target: { x: number; y: number };
		// called as souls set off, with how many: what to call as each lands
		onlaunch?: (count: number) => () => void;
		// the rune whose box they fly into, for its symbols' souls (runeSouls); none: the bonus
		// meter's, the leaves' (bonusMeterSouls)
		rune?: RuneName;
	};

	const props: Props = $props();
	const context = getContext();

	// In the base game each winning leaf bursts into a soul, a glowing orb in the leaf's colour with a
	// near white core, that rises, swings over and dives into the bonus meter's bar, trailing a tail
	// and sparks, and flashes a ring as it lands (BonusMeter; see winInfo in bookEventHandlerMap). In
	// the free spins the rune symbols (Fehu's, Ingwaz's) do the same into their rune's box, in its
	// colours (RuneTablets; see fehuSymbols and ingwazSymbols). In seconds, and in a cell's size.
	const SOUL = {
		// the leaf bursting into it (a flash left where it was), and the flight, which starts at once
		burst: 0.2,
		flight: 0.9,
		// between one soul setting off and the next
		stagger: 0.05,
		burstSize: 0.55,
		size: 0.18,
		glowSize: 0.42,
		// how high it rises first, and how far to either side it may swing
		lift: 1.5,
		sway: 0.7,
		// its tail: through where it was this long ago, and how wide it is behind the soul (it tapers to
		// nothing)
		tail: 0.2,
		tailSize: 0.8,
		// sparks a second, how long they last, how fast they scatter and how big they are
		sparks: 70,
		sparkLife: 0.5,
		sparkSpeed: 0.9,
		sparkSize: 0.05,
		// the ring as it lands
		ring: 0.3,
		ringSize: 0.6,
	};
	const BLUR = 0.07;
	// each leaf's soul, and each rune symbol's: its glow and its core
	const COLOURS: Record<string, { glow: number; core: number }> = {
		L1: { glow: 0x8fe36b, core: 0xf2ffe8 },
		L2: { glow: 0xf0a04b, core: 0xfff2e0 },
		L3: { glow: 0xff5b45, core: 0xffece6 },
		L4: { glow: 0xffd94a, core: 0xfffbe6 },
		F: { glow: RUNE_COLOURS.fehu.glow, core: RUNE_COLOURS.fehu.core },
		I: { glow: RUNE_COLOURS.ingwaz.glow, core: RUNE_COLOURS.ingwaz.core },
	};
	const DEFAULT_COLOURS = COLOURS.L4;

	type Point = { x: number; y: number };
	type Soul = {
		from: Point;
		// the curve's handles: up out of its cell, and above the meter
		rise: Point;
		dive: Point;
		start: number;
		colours: { glow: number; core: number };
		// where it has been lately, newest first, and when
		tail: (Point & { time: number })[];
		at?: Point;
		// 0 bursting from its leaf to 1 a soul
		form: number;
		// called as it sets off, until then still to call
		onleave?: () => void;
		// called as it lands (props.onlaunch, and its source's own)
		onland: (() => void)[];
		landed: boolean;
	};
	type Spark = Point & { vx: number; vy: number; age: number; colour: number };
	type Ring = Point & { age: number; colour: number };

	const cell = SYMBOL_SIZE;
	let souls: Soul[] = [];
	let sparks: Spark[] = [];
	let rings: Ring[] = [];
	let clock = 0;
	// a soul landing for each of these, then they are done
	let waiting: { count: number; resolve: () => void }[] = [];
	// counts up each frame something moves, so the drawings redraw
	let frame = $state(0);

	// the outline of a soul's tail `width` wide: a ribbon through where it has been, from full width
	// at the soul to nothing at its end
	const tailOutline = (soul: Soul, width: number) => {
		const points = soul.tail;
		if (points.length < 2) return [];
		const left: number[] = [];
		const right: number[] = [];
		points.forEach((point, i) => {
			const before = points[Math.max(0, i - 1)];
			const after = points[Math.min(points.length - 1, i + 1)];
			const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
			const [nx, ny] = [-(after.y - before.y) / length, (after.x - before.x) / length];
			const half = (width / 2) * Math.max(0, 1 - (clock - point.time) / SOUL.tail);
			left.push(point.x + nx * half, point.y + ny * half);
			right.unshift(point.x - nx * half, point.y - ny * half);
		});
		return [...left, ...right];
	};

	// off at speed from the start, and a little faster still as it dives into the bar
	const speedUp = (t: number) => 0.75 * t + 0.25 * t * t;
	const curve = (soul: Soul, t: number): Point => {
		const end = props.target;
		const u = 1 - t;
		return {
			x:
				u ** 3 * soul.from.x +
				3 * u * u * t * soul.rise.x +
				3 * u * t * t * soul.dive.x +
				t ** 3 * end.x,
			y:
				u ** 3 * soul.from.y +
				3 * u * u * t * soul.rise.y +
				3 * u * t * t * soul.dive.y +
				t ** 3 * end.y,
		};
	};

	// a chime as they land, not more often than this (a big cluster's souls land close together)
	const CHIME_EVERY = 0.12;
	let lastChime = -Infinity;

	const land = (soul: Soul) => {
		soul.landed = true;
		soul.onland.forEach((onland) => onland());
		rings.push({ ...props.target, age: 0, colour: soul.colours.glow });
		if (clock - lastChime >= CHIME_EVERY) {
			lastChime = clock;
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
		}
		waiting.forEach((wait) => wait.count--);
		waiting.filter((wait) => wait.count <= 0).forEach((wait) => wait.resolve());
		waiting = waiting.filter((wait) => wait.count > 0);
	};

	const step = (seconds: number) => {
		clock += seconds;
		for (const soul of souls) {
			const time = clock - soul.start;
			if (time < 0 || soul.landed) continue;
			soul.onleave?.();
			soul.onleave = undefined;
			soul.form = Math.min(1, time / SOUL.burst);
			const t = Math.min(1, time / SOUL.flight);
			soul.at = curve(soul, speedUp(t));
			soul.tail = [{ ...soul.at, time: clock }, ...soul.tail].filter(
				(point) => clock - point.time < SOUL.tail,
			);
			if (t > 0 && Math.random() < SOUL.sparks * seconds) {
				const angle = Math.random() * Math.PI * 2;
				const speed = SOUL.sparkSpeed * cell * (0.4 + Math.random() * 0.6);
				sparks.push({
					...soul.at,
					vx: Math.cos(angle) * speed,
					vy: Math.sin(angle) * speed,
					age: 0,
					colour: soul.colours.glow,
				});
			}
			if (t >= 1) land(soul);
		}
		for (const spark of sparks) {
			spark.age += seconds;
			spark.x += spark.vx * seconds;
			spark.y += spark.vy * seconds;
			spark.vx *= 0.9;
			spark.vy = spark.vy * 0.9 + cell * 1.2 * seconds;
		}
		for (const ring of rings) ring.age += seconds;
		souls = souls.filter((soul) => !soul.landed);
		sparks = sparks.filter((spark) => spark.age < SOUL.sparkLife);
		rings = rings.filter((ring) => ring.age < SOUL.ring);
		frame++;
	};

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => {
			if (souls.length || sparks.length || rings.length) {
				step((ticker.deltaMS / 1000) * stateBetDerived.timeScale());
			}
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	// done when they have all landed (the meter counts each as it lands, props.onlaunch)
	const launch = (sources: MeterSoul[]) => {
		const onland = sources.length ? props.onlaunch?.(sources.length) : undefined;
		return new Promise<void>((resolve) => {
			if (!sources.length) return resolve();
			sources.forEach((source, index) => {
				const from = { x: source.x, y: source.y };
				const end = props.target;
				souls.push({
					from,
					rise: {
						x: from.x + _.random(-SOUL.sway, SOUL.sway, true) * cell,
						y: from.y - SOUL.lift * cell,
					},
					dive: { x: end.x - _.random(0.2, 0.8, true) * cell, y: end.y - SOUL.lift * 0.8 * cell },
					start: clock + index * SOUL.stagger,
					colours: COLOURS[source.symbol] ?? DEFAULT_COLOURS,
					tail: [],
					form: 0,
					onleave: source.onleave,
					onland: [onland, source.onland].filter((call) => call !== undefined),
					landed: false,
				});
			});
			waiting.push({ count: sources.length, resolve });
		});
	};
	context.eventEmitter.subscribeOnMount({
		bonusMeterSouls: ({ souls: sources }) => (props.rune ? undefined : launch(sources)),
		runeSouls: ({ rune, souls: sources }) => (rune === props.rune ? launch(sources) : undefined),
	});

	// the glow blurred as much on any screen: the filter's strength is in screen pixels (at
	// BLUR_RESOLUTION of the screen's)
	const blur = new BlurFilter({ strength: 8, quality: 3, resolution: BLUR_RESOLUTION });
	$effect(() => {
		blur.resolution =
			(context.stateApp.pixiApplication?.renderer.resolution ?? 1) * BLUR_RESOLUTION;
		blur.strength = cell * BLUR * context.stateLayoutDerived.mainLayout().scale * BLUR_RESOLUTION;
	});
</script>

<!-- the glow, blurred and added onto what is under it, then the cores and sparks over it -->
<Container blendMode="add">
	<Container filters={[blur]}>
		<Graphics
			draw={(graphics) => {
				frame;
				for (const soul of souls) {
					if (!soul.at) continue;
					const { glow } = soul.colours;
					// the flash where the leaf was, swelling a little as it fades behind the soul
					if (soul.form < 1) {
						graphics
							.circle(soul.from.x, soul.from.y, SOUL.burstSize * (1 + 0.3 * soul.form) * cell)
							.fill({ color: glow, alpha: 1 - soul.form });
					}
					const tail = tailOutline(soul, SOUL.glowSize * SOUL.tailSize * 2 * cell);
					if (tail.length) graphics.poly(tail).fill({ color: glow, alpha: 0.5 });
					graphics
						.circle(soul.at.x, soul.at.y, SOUL.glowSize * cell)
						.fill({ color: glow, alpha: 0.95 });
				}
				for (const ring of rings) {
					const share = ring.age / SOUL.ring;
					graphics
						.circle(ring.x, ring.y, SOUL.ringSize * share * cell)
						.stroke({ color: ring.colour, width: cell * 0.1, alpha: 1 - share });
				}
			}}
		/>
	</Container>
	<Graphics
		draw={(graphics) => {
			frame;
			for (const spark of sparks) {
				const share = 1 - spark.age / SOUL.sparkLife;
				graphics
					.circle(spark.x, spark.y, SOUL.sparkSize * share * cell)
					.fill({ color: spark.colour, alpha: share });
			}
			for (const soul of souls) {
				if (!soul.at) continue;
				const tail = tailOutline(soul, SOUL.size * 1.2 * cell);
				if (tail.length) graphics.poly(tail).fill({ color: soul.colours.core, alpha: 0.6 });
				graphics.circle(soul.at.x, soul.at.y, SOUL.size * cell).fill({ color: soul.colours.core });
				graphics.circle(soul.at.x, soul.at.y, SOUL.size * 0.5 * cell).fill({ color: 0xffffff });
			}
		}}
	/>
</Container>
