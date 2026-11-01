<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventWind =
		| {
				type: 'windGust';
				// the cells it blows wilds onto (the books' rows, counted from 1), and what to call as
				// each wild lands on its cell (the cell turns wild); done when the last has landed
				positions: Position[];
				onland: (position: Position) => void;
		  }
		| {
				type: 'windSweep';
				// the cells whose symbols it takes off the board, and what to call as each is lifted off
				// its cell (the board no longer draws it); done once the last is on its way
				positions: Position[];
				onleave: (position: Position) => void;
		  };
</script>

<script lang="ts">
	import _ from 'lodash';
	import { Container, Graphics, Sprite } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import Symbol from './Symbol.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { IDLE_REEL_PHASE } from '../game/idleClock.svelte';
	import type { RawSymbol } from '../game/types';

	const context = getContext();

	// A gust of wind (now and then in any spin, after the board lands) blowing left to right, the way
	// the fox's tail streams in its gust (the fox gusts too, see Fox): pale streaks of wind and a
	// flurry of leaves sweep across the screen over the board. In one (windWilds) wilds ride in on it
	// from the left edge, tumbling, and settle softly onto their cells, each blowing the symbol it
	// lands on away to the right; in a rarer, stronger one (windSweep) every symbol of one kind
	// shivers as the gust reaches it and is carried off the board. In seconds, and in a cell's size.
	const STREAKS = {
		count: 16,
		// they set off over this long, their heads running this fast along a wavy line this high and
		// long, each this long and wide (thickest in its middle)
		over: 1.3,
		speed: { min: 18, max: 24 },
		wave: { min: 0.1, max: 0.28 },
		waveLength: { min: 3, max: 5 },
		length: { min: 2.5, max: 4.5 },
		width: { min: 0.07, max: 0.13 },
		colour: 0xfff3dc,
		alpha: 0.6,
	};
	const LEAVES = {
		count: 22,
		over: 1.2,
		speed: { min: 11, max: 16 },
		// bobbing up and down this far, this many times a second, spinning this fast (radians a second)
		// and turning over this many times a second
		bob: { min: 0.3, max: 0.7 },
		bobRate: { min: 1.5, max: 3 },
		spin: { min: 4, max: 9 },
		flipRate: { min: 2, max: 4 },
		size: { min: 0.3, max: 0.48 },
		keys: ['leafGreen', 'leafBrown', 'leafRed', 'leafYellow'],
	};
	// the leaves and streaks cross the board's height and this much more above and below it
	const BAND = 1.2;
	const WILDS = {
		// the first sets off this long after the gust starts, the others this long apart
		first: 0.25,
		stagger: 0.2,
		flight: 1,
		// from off the screen's left edge, this far above or below its cell's height, swooping up
		// this far over the higher of the two, and into the cell from up and left of it
		start: 0.8,
		height: { min: -1.5, max: 0.5 },
		swoop: { min: 0.8, max: 1.6 },
		into: { x: 1, y: 0.8 },
		// small on the wind, full size as it settles; turning over this many times on the way
		scale: 0.72,
		turns: { min: 0.8, max: 1.2 },
	};
	// the symbol a wild lands on, blown off to the right, rising a little, falling and fading
	const BLOWN = {
		life: 0.5,
		speed: { x: 7, y: -3 },
		fall: 9,
		spin: 7,
		scale: 0.8,
	};
	const SWEEP = {
		// this many times a gust's streaks and leaves
		strength: 1.6,
		// its front crosses the board from its left edge this long after the gust starts, this fast,
		// reaching each symbol give or take the jitter
		first: 0.2,
		front: 8,
		jitter: 0.08,
		// each shivers this long, rocking this far (radians) this many times, more and more, and ends
		// upright
		shiver: 0.3,
		rock: 0.12,
		shakes: 3,
		// then it is carried off to the right ever faster (cells a second, a second), rising and
		// swaying, spinning faster and faster (radians a second, a second), shrinking a little
		push: 26,
		lift: 1.6,
		sway: { size: 0.3, rate: 1.5 },
		spin: { min: 4, max: 8 },
		scale: 0.8,
		shrink: 0.6,
		// the gust is done this long after the last has set off (the board then tumbles to fill
		// their cells)
		after: 0.35,
	};

	type Point = { x: number; y: number };
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
	type Leaf = Point & {
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
		rotation: number;
		flip: number;
	};
	type Flier = Point & {
		position: Position;
		start: number;
		from: Point;
		rise: Point;
		into: Point;
		to: Point;
		turns: number;
		rotation: number;
		scale: number;
		flying: boolean;
		landed: boolean;
	};
	// a symbol off the board: blown off its cell by a wild landing there, or swept off by the gust
	type Blown = Point & {
		rawSymbol: RawSymbol;
		reel: number;
		from: Point;
		start: number;
		rotation: number;
		scale: number;
		alpha: number;
	};
	type Swept = Blown & {
		position: Position;
		spin: number;
		// lifted off its cell (the board no longer draws it), and far enough on its way that the gust
		// is done with it
		lifted: boolean;
		gone: boolean;
	};

	const cell = SYMBOL_SIZE;
	const TAU = Math.PI * 2;
	const between = ({ min, max }: { min: number; max: number }) => _.random(min, max, true);

	// the time, in seconds, from when the game started
	let clock = 0;
	let streaks: Streak[] = [];
	const leaves = $state<Leaf[]>([]);
	const fliers = $state<Flier[]>([]);
	const blown = $state<Blown[]>([]);
	const swept = $state<Swept[]>([]);
	// the gust's wilds still to land, or symbols still to set off, then it is done
	let waiting: { count: number; resolve: () => void } | undefined;
	let onland: (position: Position) => void = () => {};
	let onleave: (position: Position) => void = () => {};
	// counts up each frame something moves, so the streaks redraw
	let frame = $state(0);

	// the screen's left and right edges and the board's edges, in the main layout
	const area = $derived.by(() => {
		const main = context.stateLayoutDerived.mainLayout();
		const canvas = context.stateLayoutDerived.canvasSizes();
		const board = context.stateGameDerived.boardLayout();
		return {
			left: main.width / 2 - canvas.width / 2 / main.scale,
			right: main.width / 2 + canvas.width / 2 / main.scale,
			boardLeft: board.x - board.width / 2,
			top: board.y - board.height / 2,
			bottom: board.y + board.height / 2,
		};
	});
	const inBand = () => _.random(area.top - BAND * cell, area.bottom + BAND * cell, true);

	const waitFor = (count: number) =>
		new Promise<void>((resolve) => {
			if (count <= 0) return resolve();
			waiting = { count, resolve };
		});
	const doneWith = () => {
		if (!waiting || --waiting.count > 0) return;
		waiting.resolve();
		waiting = undefined;
	};

	// the gust's streaks and leaves, `strength` times as many as a gust's
	const blow = (strength: number) => {
		streaks.push(
			..._.times(Math.round(STREAKS.count * strength), () => ({
				start: clock + Math.random() * STREAKS.over,
				y: inBand(),
				speed: between(STREAKS.speed),
				wave: between(STREAKS.wave),
				waveLength: between(STREAKS.waveLength),
				phase: Math.random() * TAU,
				length: between(STREAKS.length),
				width: between(STREAKS.width),
			})),
		);
		leaves.push(
			..._.times(Math.round(LEAVES.count * strength), () => ({
				key: _.sample(LEAVES.keys)!,
				start: clock + Math.random() * LEAVES.over,
				x: area.left - cell,
				y: 0,
				top: inBand(),
				speed: between(LEAVES.speed),
				bob: between(LEAVES.bob),
				bobRate: between(LEAVES.bobRate),
				spin: between(LEAVES.spin) * _.sample([-1, 1])!,
				flipRate: between(LEAVES.flipRate),
				phase: Math.random() * TAU,
				size: between(LEAVES.size),
				rotation: Math.random() * TAU,
				flip: 1,
			})),
		);
	};

	const bezier = (flier: Flier, t: number): Point => {
		const u = 1 - t;
		const [a, b, c, d] = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
		return {
			x: a * flier.from.x + b * flier.rise.x + c * flier.into.x + d * flier.to.x,
			y: a * flier.from.y + b * flier.rise.y + c * flier.into.y + d * flier.to.y,
		};
	};
	// fast on the wind, slowing softly to a stop on its cell
	const settle = (t: number) => 1 - (1 - t) ** 3;

	const reelSymbolAt = ({ reel, row }: Position) =>
		context.stateGame.board[reel].reelState.symbols[row];

	const land = (flier: Flier) => {
		flier.landed = true;
		blown.push({
			rawSymbol: { ...reelSymbolAt(flier.position).rawSymbol },
			reel: flier.position.reel,
			from: { ...flier.to },
			...flier.to,
			start: clock,
			rotation: 0,
			scale: 1,
			alpha: 1,
		});
		onland(flier.position);
		doneWith();
	};

	const stepSwept = (symbol: Swept) => {
		const age = clock - symbol.start;
		if (age < 0) return;
		if (!symbol.lifted) {
			symbol.lifted = true;
			onleave(symbol.position);
		}
		if (age < SWEEP.shiver) {
			const share = age / SWEEP.shiver;
			symbol.rotation = SWEEP.rock * share * Math.sin(share * SWEEP.shakes * TAU);
			return;
		}
		const t = age - SWEEP.shiver;
		symbol.x = symbol.from.x + (SWEEP.push * t * t * cell) / 2;
		symbol.y =
			symbol.from.y -
			SWEEP.lift * t * cell +
			SWEEP.sway.size * cell * Math.sin(t * SWEEP.sway.rate * TAU);
		symbol.rotation = (symbol.spin * t * t) / 2;
		symbol.scale = 1 - (1 - SWEEP.scale) * Math.min(1, t / SWEEP.shrink);
		if (!symbol.gone && t >= SWEEP.after) {
			symbol.gone = true;
			doneWith();
		}
	};

	const step = (seconds: number) => {
		clock += seconds;
		for (const leaf of leaves) {
			const age = clock - leaf.start;
			if (age < 0) continue;
			leaf.x = area.left - leaf.size * cell + age * leaf.speed * cell;
			leaf.y = leaf.top + leaf.bob * cell * Math.sin(age * leaf.bobRate * TAU + leaf.phase);
			leaf.rotation += leaf.spin * seconds;
			leaf.flip = Math.cos(age * leaf.flipRate * TAU + leaf.phase);
		}
		for (const flier of fliers) {
			const t = (clock - flier.start) / WILDS.flight;
			if (t < 0 || flier.landed) continue;
			if (t >= 1) {
				land(flier);
				continue;
			}
			const eased = settle(t);
			Object.assign(flier, bezier(flier, eased));
			flier.flying = true;
			flier.rotation = -flier.turns * TAU * (1 - eased);
			flier.scale = WILDS.scale + (1 - WILDS.scale) * eased;
		}
		for (const symbol of blown) {
			const age = clock - symbol.start;
			const share = age / BLOWN.life;
			symbol.x = symbol.from.x + BLOWN.speed.x * cell * age;
			symbol.y = symbol.from.y + (BLOWN.speed.y * age + (BLOWN.fall * age * age) / 2) * cell;
			symbol.rotation = BLOWN.spin * age;
			symbol.scale = 1 - (1 - BLOWN.scale) * share;
			symbol.alpha = 1 - share * share;
		}
		swept.forEach(stepSwept);

		// gone once past the screen's right edge, landed or faded
		streaks = streaks.filter(
			(streak) =>
				clock < streak.start ||
				area.left + ((clock - streak.start) * streak.speed - streak.length) * cell < area.right,
		);
		_.remove(leaves, (leaf) => leaf.x > area.right + leaf.size * cell);
		_.remove(fliers, (flier) => flier.landed);
		_.remove(blown, (symbol) => clock - symbol.start >= BLOWN.life);
		_.remove(swept, (symbol) => symbol.gone && symbol.x > area.right + cell);
		frame++;
	};

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => {
			if (streaks.length || leaves.length || fliers.length || blown.length || swept.length) {
				step((ticker.deltaMS / 1000) * stateBetDerived.timeScale());
			}
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	context.eventEmitter.subscribeOnMount({
		windGust: ({ positions, onland: onWildLand }) => {
			onland = onWildLand;
			blow(1);
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wind_gust' });
			fliers.push(
				..._.shuffle(positions).map((position, index) => {
					const to = context.stateGameDerived.cellCentre(position);
					const from = {
						x: area.left - WILDS.start * cell,
						y: to.y + between(WILDS.height) * cell,
					};
					return {
						position,
						start: clock + WILDS.first + index * WILDS.stagger,
						from,
						rise: {
							x: (from.x + to.x) / 2,
							y: Math.min(from.y, to.y) - between(WILDS.swoop) * cell,
						},
						into: { x: to.x - WILDS.into.x * cell, y: to.y - WILDS.into.y * cell },
						to,
						...from,
						turns: between(WILDS.turns),
						rotation: 0,
						scale: WILDS.scale,
						flying: false,
						landed: false,
					};
				}),
			);
			return waitFor(positions.length);
		},
		windSweep: ({ positions, onleave: onSymbolLeave }) => {
			onleave = onSymbolLeave;
			blow(SWEEP.strength);
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wind_sweep' });
			swept.push(
				...positions.map((position) => {
					const from = context.stateGameDerived.cellCentre(position);
					const reached = (from.x - area.boardLeft) / cell / SWEEP.front;
					return {
						position,
						rawSymbol: { ...reelSymbolAt(position).rawSymbol },
						reel: position.reel,
						from,
						...from,
						start: clock + SWEEP.first + reached + Math.random() * SWEEP.jitter,
						spin: between(SWEEP.spin),
						rotation: 0,
						scale: 1,
						alpha: 1,
						lifted: false,
						gone: false,
					};
				}),
			);
			return waitFor(positions.length);
		},
	});

	// a streak: a ribbon along its wavy line from its tail to its head, thickest in its middle
	const STREAK_POINTS = 16;
	const streakOutline = (streak: Streak) => {
		const head = area.left + (clock - streak.start) * streak.speed * cell;
		const upper: number[] = [];
		const lower: number[] = [];
		for (let i = 0; i <= STREAK_POINTS; i++) {
			const along = i / STREAK_POINTS;
			const x = head - (1 - along) * streak.length * cell;
			const y =
				streak.y +
				streak.wave * cell * Math.sin((x / (streak.waveLength * cell)) * TAU + streak.phase);
			const half = (streak.width * cell * Math.sin(Math.PI * along)) / 2;
			upper.push(x, y - half);
			lower.unshift(x, y + half);
		}
		return [...upper, ...lower];
	};
</script>

<Graphics
	draw={(graphics) => {
		frame;
		for (const streak of streaks) {
			if (clock < streak.start) continue;
			graphics.poly(streakOutline(streak)).fill({ color: STREAKS.colour, alpha: STREAKS.alpha });
		}
	}}
/>

<!-- in their idle loop's step with the board's (the reel's phase), so they don't jump as they leave
it; the swept ones drawn once lifted off their cells -->
{#each [...blown, ...swept.filter((symbol) => symbol.lifted)] as symbol}
	<Container
		x={symbol.x}
		y={symbol.y}
		rotation={symbol.rotation}
		scale={symbol.scale}
		alpha={symbol.alpha}
	>
		<Symbol rawSymbol={symbol.rawSymbol} state="static" phase={symbol.reel * IDLE_REEL_PHASE} />
	</Container>
{/each}

{#each fliers as flier}
	{#if flier.flying}
		<Container x={flier.x} y={flier.y} rotation={flier.rotation} scale={flier.scale}>
			<Symbol rawSymbol={{ name: 'W', wild: true }} state="static" />
		</Container>
	{/if}
{/each}

<!-- off the screen's left edge until they set off -->
{#each leaves as leaf}
	<Sprite
		key={leaf.key}
		x={leaf.x}
		y={leaf.y}
		anchor={0.5}
		rotation={leaf.rotation}
		width={leaf.size * cell * Math.max(0.15, Math.abs(leaf.flip))}
		height={leaf.size * cell}
	/>
{/each}
