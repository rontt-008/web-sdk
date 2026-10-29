<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventWildThrow = {
		type: 'wildThrow';
		// the big wild's reel; the fish fly out of the cat's mouth on it
		reel: number;
		positions: Position[];
	};
</script>

<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicIn, cubicOut, linear, quadOut } from 'svelte/easing';
	import { Container, Graphics, Sprite } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import _ from 'lodash';

	import { getContext } from '../game/context';
	import { getSymbolX, FIRST_VISIBLE_ROW } from '../game/utils';
	import {
		BOARD_DIMENSIONS,
		BOARD_SIZES,
		REEL_WIDTH,
		SYMBOL_INFO_MAP,
		SYMBOL_SIZE,
	} from '../game/constants';
	import type { RawSymbol } from '../game/types';
	import BoardContainer from './BoardContainer.svelte';

	// A big wild throws its wilds as fish: each flies straight out of the fish in the cat's mouth on
	// the big wild, head first, wriggling with a watery trail behind it, and pours a waterfall over
	// the place it lands before turning into a wild.
	const FLIGHT_DURATION = 600;
	// the fish leave one after another
	const FLIGHT_STAGGER = 200;
	// how long a landed wild's pop lasts (a wild landing's motion, see SymbolSprite)
	const LANDING_HOLD = 480;
	// the fish in the cat's mouth: its middle, across and down the big wild's art (which covers the
	// whole reel), and its width, of the reel's
	const MOUTH_FISH = { x: 0.404, y: 0.508, width: 0.456 };
	// a thrown fish grows from that to this wide on the way, a little bigger still mid-air
	const LANDING_WIDTH = SYMBOL_SIZE * 0.85;
	const MID_AIR_SWELL = 0.12;
	// the fish image's height over its width
	const FISH_RATIO = 286 / 400;
	// it wriggles its way there, less as it lands (radians, wriggles per flight)
	const WRIGGLE = { angle: 0.14, count: 3 };
	// Now and then a fish teases: it heads for another place near its own (up to 2 places away, one
	// that isn't getting a wild), slows as if to land there, then darts off to its own. How often,
	// how close it gets to the decoy, when (in the flight) it darts, and how long the flight takes.
	const BAIT = { chance: 0.35, reach: 2, approach: 0.8, switchAt: 0.55, duration: 950 };
	const WILD: RawSymbol = { name: 'W', wild: true };

	// Watery trail behind the flying fish: a tapering ribbon along the recent slice of its path plus
	// splashed droplets kicking out to the sides and falling.
	const WATER_COLORS = [0x38b6ff, 0x6ce0ff, 0xb8f3ff, 0xffffff];
	const TRAIL = {
		span: 0.26,
		steps: 14,
		width: SYMBOL_SIZE * 0.24,
		sway: SYMBOL_SIZE * 0.045,
		drops: 24,
		dropGravity: SYMBOL_SIZE * 0.32,
	};

	// Waterfall where the fish lands: the exact width and height of the wild symbol it reveals,
	// pouring from its top edge to its bottom edge before the wild pops in, then draining away.
	const WILD_WIDTH = SYMBOL_SIZE * SYMBOL_INFO_MAP.W.static.sizeRatios.width;
	const WILD_HEIGHT = SYMBOL_SIZE * SYMBOL_INFO_MAP.W.static.sizeRatios.height;
	const WATERFALL = {
		duration: 540,
		// the waterfall pours down over the cell until this point, when the wild appears
		wildAt: 0.62,
		reachBottomAt: 0.22,
		width: WILD_WIDTH,
		height: WILD_HEIGHT,
		topOffset: -WILD_HEIGHT / 2,
		bottomOffset: WILD_HEIGHT / 2,
		streams: 7,
		streaks: 14,
		splashes: 14,
	};

	type Point = { x: number; y: number };
	type TrailDrop = {
		at: number;
		life: number;
		origin: Point;
		vx: number;
		vy: number;
		radius: number;
		color: number;
	};
	type Flight = {
		id: number;
		from: Point;
		to: Point;
		// a teasing fish's turning point, near its decoy
		via?: Point;
		drops: TrailDrop[];
		progress: Tween<number>;
	};
	type WaterfallStream = {
		offsetX: number;
		width: number;
		lag: number;
		color: number;
	};
	type WaterfallStreak = {
		x: number;
		phase: number;
		speed: number;
		length: number;
		width: number;
	};
	type WaterfallSplash = {
		vx: number;
		vy: number;
		radius: number;
		delay: number;
		color: number;
	};
	type Waterfall = {
		id: number;
		x: number;
		y: number;
		streams: WaterfallStream[];
		streaks: WaterfallStreak[];
		splashes: WaterfallSplash[];
		progress: Tween<number>;
	};

	const lerp = (a: Point, b: Point, t: number): Point => ({
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t,
	});

	// for some fish (BAIT.chance), a place to tease with near its own: on the board, not under a big
	// wild, not on the throwing big wild's reel and not getting a wild itself (none if none fits)
	const pickDecoy = (reel: number, target: Position, targets: Position[]) => {
		if (Math.random() >= BAIT.chance) return undefined;
		const visibleRows = _.range(FIRST_VISIBLE_ROW, FIRST_VISIBLE_ROW + BOARD_DIMENSIONS.y);
		const places = _.range(BOARD_DIMENSIONS.x).flatMap((r) =>
			visibleRows.map((row) => ({ reel: r, row })),
		);
		const decoys = places.filter((place) => {
			const distance = Math.max(
				Math.abs(place.reel - target.reel),
				Math.abs(place.row - target.row),
			);
			return (
				distance >= 1 &&
				distance <= BAIT.reach &&
				place.reel !== reel &&
				!targets.some((t) => t.reel === place.reel && t.row === place.row) &&
				!context.stateGame.board[place.reel].reelState.symbols[place.row]?.rawSymbol.bigWild
			);
		});
		return _.sample(decoys);
	};

	// where a flight is at t, and which way it is heading: straight there, slowing as it lands; or,
	// teasing, slowing towards its decoy, then darting on to its own place
	const flightPath = (flight: Pick<Flight, 'from' | 'to' | 'via'>, t: number) => {
		if (!flight.via) {
			return { at: lerp(flight.from, flight.to, quadOut(t)), from: flight.from, to: flight.to };
		}
		if (t < BAIT.switchAt) {
			return {
				at: lerp(flight.from, flight.via, quadOut(t / BAIT.switchAt)),
				from: flight.from,
				to: flight.via,
			};
		}
		const p = (t - BAIT.switchAt) / (1 - BAIT.switchAt);
		return { at: lerp(flight.via, flight.to, quadOut(p)), from: flight.via, to: flight.to };
	};

	const context = getContext();

	let flights = $state<Flight[]>([]);
	let waterfalls = $state<Waterfall[]>([]);
	let nextFlightId = 0;
	let nextWaterfallId = 0;

	// where a flight is at t, how big and which way it faces: head first along the way it is heading
	// (the image faces left, so it is mirrored to fly right)
	const flightLook = (flight: Flight, t: number) => {
		const path = flightPath(flight, t);
		const dx = path.to.x - path.from.x;
		const dy = path.to.y - path.from.y;
		const startWidth = REEL_WIDTH * MOUTH_FISH.width;
		const width =
			(startWidth + (LANDING_WIDTH - startWidth) * t) * (1 + MID_AIR_SWELL * Math.sin(Math.PI * t));
		const wriggle = WRIGGLE.angle * (1 - t) * Math.sin(2 * Math.PI * WRIGGLE.count * t);
		const right = dx > 0;
		return {
			...path.at,
			width,
			mirror: right ? -1 : 1,
			rotation: (right ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx)) + wriggle,
		};
	};

	// a point along the fish's wake at progress s, swaying slightly with its wriggle
	const wakePoint = (flight: Flight, s: number) => {
		const path = flightPath(flight, s);
		const dx = path.to.x - path.from.x;
		const dy = path.to.y - path.from.y;
		const len = Math.hypot(dx, dy) || 1;
		const nx = -dy / len;
		const ny = dx / len;
		const sway =
			TRAIL.sway * (1 - 0.5 * s) * Math.sin(2 * Math.PI * WRIGGLE.count * s + flight.id);
		return {
			x: path.at.x + nx * sway,
			y: path.at.y + ny * sway,
			nx,
			ny,
		};
	};

	const createTrailDrops = (flight: Pick<Flight, 'from' | 'to' | 'via'>): TrailDrop[] =>
		_.range(TRAIL.drops).map((index) => {
			const at = 0.04 + (index / TRAIL.drops) * 0.86 + _.random(-0.015, 0.015, true);
			const path = flightPath(flight, at);
			const dx = path.to.x - path.from.x;
			const dy = path.to.y - path.from.y;
			const len = Math.hypot(dx, dy) || 1;
			const ux = dx / len;
			const uy = dy / len;
			const nx = -uy;
			const ny = ux;
			const side = index % 2 === 0 ? 1 : -1;
			const spread = _.random(SYMBOL_SIZE * 0.14, SYMBOL_SIZE * 0.42, true) * side;
			const back = _.random(SYMBOL_SIZE * 0.06, SYMBOL_SIZE * 0.22, true);
			return {
				at,
				life: _.random(0.22, 0.34, true),
				origin: {
					x: path.at.x - ux * SYMBOL_SIZE * 0.12 + nx * side * SYMBOL_SIZE * 0.05,
					y: path.at.y - uy * SYMBOL_SIZE * 0.12 + ny * side * SYMBOL_SIZE * 0.05,
				},
				vx: nx * spread - ux * back,
				vy: ny * spread - uy * back,
				radius: _.random(SYMBOL_SIZE * 0.024, SYMBOL_SIZE * 0.052, true),
				color: WATER_COLORS[index % WATER_COLORS.length],
			};
		});

	const drawTrail =
		(flight: Flight, t: number): ComponentProps<typeof Graphics>['draw'] =>
		(graphics) => {
			if (t <= 0.01) return;
			const start = Math.max(0, t - TRAIL.span);
			const span = t - start;
			if (span > 0.005) {
				const count = TRAIL.steps + 1;
				const endFade = t > 0.85 ? (1 - t) / 0.15 : 1;
				const polyCoords = new Array<number>(count * 4);
				const ribbon = (scaleWidth: number, color: number, alpha: number) => {
					for (let i = 0; i < count; i++) {
						const along = i / TRAIL.steps;
						const s = start + span * along;
						const pt = wakePoint(flight, s);
						const half =
							TRAIL.width *
							scaleWidth *
							Math.sin(along * Math.PI * 0.85) *
							along *
							endFade;
						const leftIdx = i * 2;
						const rightIdx = (count * 2 - 1 - i) * 2;
						polyCoords[leftIdx] = pt.x + pt.nx * half;
						polyCoords[leftIdx + 1] = pt.y + pt.ny * half;
						polyCoords[rightIdx] = pt.x - pt.nx * half;
						polyCoords[rightIdx + 1] = pt.y - pt.ny * half;
					}
					graphics.poly(polyCoords).fill({ color, alpha: alpha * endFade });
				};
				ribbon(1, 0x38b6ff, 0.45);
				ribbon(0.62, 0x7ee4ff, 0.72);
				ribbon(0.28, 0xffffff, 0.88);
			}

			for (const drop of flight.drops) {
				if (t <= drop.at || t >= drop.at + drop.life) continue;
				const p = (t - drop.at) / drop.life;
				const travel = cubicOut(p);
				const x = drop.origin.x + drop.vx * travel;
				const y = drop.origin.y + drop.vy * travel + TRAIL.dropGravity * p * p;
				const radius = drop.radius * (1 - 0.65 * p);
				if (radius <= 0.5) continue;
				graphics.circle(x, y, radius).fill({ color: drop.color, alpha: (1 - p) * 0.9 });
			}
		};

	const createWaterfall = (point: Point): Waterfall => {
		const streamColors = [0x2294e3, 0x4cc9ff, 0x8be8ff, 0x56d0ff, 0x92ecff, 0x42c2ff, 0x2294e3];
		const streams: WaterfallStream[] = _.range(WATERFALL.streams).map((index) => {
			const norm = index / (WATERFALL.streams - 1) - 0.5;
			const width =
				WATERFALL.width *
				(index === 0 || index === WATERFALL.streams - 1 ? 0.2 : _.random(0.23, 0.28, true));
			return {
				offsetX: norm * (WATERFALL.width - width),
				width,
				lag: Math.abs(norm) * 0.08 + _.random(0, 0.04, true),
				color: streamColors[index % streamColors.length],
			};
		});
		const streaks: WaterfallStreak[] = _.range(WATERFALL.streaks).map((index) => {
			const width = _.random(WATERFALL.width * 0.025, WATERFALL.width * 0.042, true);
			return {
				x: ((index + 0.5) / WATERFALL.streaks - 0.5) * (WATERFALL.width - width * 2),
				phase: _.random(0, 1, true),
				speed: _.random(2.2, 3.2, true),
				length: _.random(WATERFALL.height * 0.16, WATERFALL.height * 0.28, true),
				width,
			};
		});
		const splashes: WaterfallSplash[] = _.range(WATERFALL.splashes).map((index) => {
			const side = index % 2 === 0 ? 1 : -1;
			const radius = _.random(WATERFALL.width * 0.028, WATERFALL.width * 0.052, true);
			return {
				vx: side * _.random(WATERFALL.width * 0.12, WATERFALL.width / 2 - radius, true),
				vy: _.random(WATERFALL.height * 0.14, WATERFALL.height * 0.34, true),
				radius,
				delay: _.random(0.12, 0.38, true),
				color: WATER_COLORS[index % WATER_COLORS.length],
			};
		});
		return {
			id: nextWaterfallId++,
			x: point.x,
			y: point.y,
			streams,
			streaks,
			splashes,
			progress: new Tween(0),
		};
	};

	const drawWaterfall =
		(waterfall: Waterfall, t: number): ComponentProps<typeof Graphics>['draw'] =>
		(graphics) => {
			if (t <= 0 || t >= 1) return;
			const topEdge = WATERFALL.topOffset;
			const bottomEdge = WATERFALL.bottomOffset;
			const fullHeight = WATERFALL.height;
			// after the wild appears, the top of the waterfall curtain drains down to the base
			const drain =
				t > WATERFALL.wildAt
					? cubicIn((t - WATERFALL.wildAt) / (1 - WATERFALL.wildAt))
					: 0;
			const alpha = t > 0.82 ? (1 - t) / 0.18 : 1;

			// vertical cascading water streams
			for (const stream of waterfall.streams) {
				const pour = cubicOut(
					_.clamp((t - stream.lag) / WATERFALL.reachBottomAt, 0, 1),
				);
				const yTop = topEdge + fullHeight * drain;
				const yBottom = topEdge + fullHeight * pour;
				const h = yBottom - yTop;
				if (h <= 2) continue;
				const w = stream.width * (1 - 0.2 * drain);
				graphics
					.roundRect(stream.offsetX - w / 2, yTop, w, h, w / 2)
					.fill({ color: stream.color, alpha: 0.78 * alpha });
			}

			// falling white and ice-blue foam streaks rushing downward inside the waterfall
			const mainPour = cubicOut(_.clamp(t / WATERFALL.reachBottomAt, 0, 1));
			const curtainTop = topEdge + fullHeight * drain;
			const curtainBottom = topEdge + fullHeight * mainPour;
			const curtainHeight = curtainBottom - curtainTop;
			if (curtainHeight > WATERFALL.height * 0.12) {
				for (const streak of waterfall.streaks) {
					const fall = (streak.phase + t * streak.speed) % 1;
					const sy = curtainTop + fall * curtainHeight;
					const sh = Math.min(
						streak.length * Math.sin(fall * Math.PI),
						curtainBottom - sy,
					);
					if (sh <= 2) continue;
					graphics
						.roundRect(streak.x - streak.width / 2, sy, streak.width, sh, streak.width / 2)
						.fill({ color: 0xeafaff, alpha: 0.85 * alpha });
				}
			}

			// bubbling foam crest along the top edge while water is still pouring in
			if (drain < 0.75) {
				const crestAlpha = (1 - drain / 0.75) * alpha;
				const crestCount = 6;
				for (let i = 0; i < crestCount; i++) {
					const norm = i / (crestCount - 1) - 0.5;
					const pulse = 1 + 0.15 * Math.sin(t * Math.PI * 6 + i * 1.4);
					const r = WATERFALL.width * 0.068 * pulse * (1 - 0.3 * drain);
					const cx = norm * (WATERFALL.width - r * 2);
					graphics
						.circle(cx, curtainTop + r, r)
						.fill({ color: i % 2 === 0 ? 0xffffff : 0xcaf4ff, alpha: 0.9 * crestAlpha });
				}
			}

			// frothy plunge pool along the bottom edge and outward spray once the water reaches down
			if (t > 0.1) {
				const poolIn = cubicOut(_.clamp((t - 0.1) / 0.2, 0, 1));
				const poolWidth = WATERFALL.width * (0.6 + 0.4 * poolIn);
				const poolY = curtainBottom;
				const foamCount = 7;
				for (let i = 0; i < foamCount; i++) {
					const norm = i / (foamCount - 1) - 0.5;
					const wave = 1 + 0.16 * Math.sin(t * Math.PI * 8 + i * 1.2);
					const r = WATERFALL.width * (0.082 - Math.abs(norm) * 0.032) * poolIn * wave;
					if (r <= 1) continue;
					const fx = norm * (poolWidth - r * 2);
					graphics
						.circle(fx, poolY - r, r)
						.fill({ color: i % 2 === 0 ? 0xffffff : 0xb8f3ff, alpha: 0.92 * alpha });
				}

				for (const splash of waterfall.splashes) {
					if (t <= splash.delay) continue;
					const sp = _.clamp((t - splash.delay) / (1 - splash.delay), 0, 1);
					const sr = splash.radius * (1 - 0.7 * sp);
					if (sr <= 0.5) continue;
					const sx = splash.vx * cubicOut(sp);
					const sy = bottomEdge - sr - splash.vy * 4 * sp * (1 - sp);
					graphics
						.circle(sx, sy, sr)
						.fill({ color: splash.color, alpha: (1 - sp) * 0.95 });
				}
			}
		};

	// the big wild's last fish has gone: its mouth is empty now
	const emptyMouth = (reel: number) => {
		const anchor = context.stateGame.board[reel].reelState.symbols.find(
			(reelSymbol) => reelSymbol.rawSymbol.bigWild?.anchor,
		);
		const bigWild = anchor?.rawSymbol.bigWild;
		if (!anchor || !bigWild?.fish) return;
		anchor.rawSymbol = { ...anchor.rawSymbol, bigWild: { ...bigWild, fish: false, fade: true } };
	};

	const throwFish = async ({
		reel,
		position,
		targets,
		last,
	}: {
		reel: number;
		position: Position;
		targets: Position[];
		// the last fish: as it leaves, the big wild's mouth is left empty
		last: boolean;
	}) => {
		const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
		const from = {
			x: getSymbolX(reel) + (MOUTH_FISH.x - 0.5) * REEL_WIDTH,
			y: BOARD_SIZES.height * MOUTH_FISH.y,
		};
		const to = { x: getSymbolX(position.reel), y: reelSymbol.symbolY() };
		const decoy = pickDecoy(reel, position, targets);
		const decoySymbol = decoy && context.stateGame.board[decoy.reel].reelState.symbols[decoy.row];
		const via =
			decoy &&
			decoySymbol &&
			lerp(from, { x: getSymbolX(decoy.reel), y: decoySymbol.symbolY() }, BAIT.approach);
		const flight: Flight = {
			id: nextFlightId++,
			from,
			to,
			via,
			drops: createTrailDrops({ from, to, via }),
			progress: new Tween(0),
		};
		flights.push(flight);
		// forced, so each fish has its own: they go closer together than the sounds last, and a sound
		// still playing is otherwise skipped
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fish_throw', forcePlay: true });
		if (last) emptyMouth(reel);
		await flight.progress.set(1, {
			duration: (flight.via ? BAIT.duration : FLIGHT_DURATION) / stateBetDerived.timeScale(),
		});
		flights = flights.filter(({ id }) => id !== flight.id);

		// A waterfall pours over the landing cell before the wild pops into place, then drains away
		// as the wild lands.
		const waterfall = createWaterfall(to);
		waterfalls.push(waterfall);
		const waterfallDuration = WATERFALL.duration / stateBetDerived.timeScale();
		const waterfallDone = waterfall.progress
			.set(1, { duration: waterfallDuration, easing: linear })
			.then(() => {
				waterfalls = waterfalls.filter(({ id }) => id !== waterfall.id);
			});

		await waitForTimeout(waterfallDuration * WATERFALL.wildAt);

		reelSymbol.rawSymbol = WILD;
		// pops into place as a wild with a puff of sparkles, as a wild landing from the reels does,
		// with a watery bloop of its own (forced, as the throws are)
		reelSymbol.symbolState = 'land';
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fish_land', forcePlay: true });
		await waterfallDone;
	};

	context.eventEmitter.subscribeOnMount({
		wildThrow: async ({ reel, positions }) => {
			// a wild thrown onto a big wild would vanish under it, so there is nothing to show
			const targets = positions.filter(
				(position) =>
					!context.stateGame.board[position.reel].reelState.symbols[position.row].rawSymbol
						.bigWild,
			);
			// with nothing to show, the fish are gone all the same
			if (targets.length === 0) emptyMouth(reel);
			await Promise.all(
				targets.map(async (position, index) => {
					await waitForTimeout((index * FLIGHT_STAGGER) / stateBetDerived.timeScale());
					await throwFish({ reel, position, targets, last: index === targets.length - 1 });
				}),
			);
			// the last wild pops into place before the round goes on: in turbo, with autoplay or the
			// space bar held, the next spin starts straight away and would take it off with its reel
			if (targets.length > 0) {
				await waitForTimeout(LANDING_HOLD / stateBetDerived.timeScale());
			}
		},
	});
</script>

<BoardContainer>
	{#each waterfalls as waterfall (waterfall.id)}
		<Graphics
			x={waterfall.x}
			y={waterfall.y}
			draw={drawWaterfall(waterfall, waterfall.progress.current)}
		/>
	{/each}
	{#each flights as flight (flight.id)}
		{@const t = flight.progress.current}
		{@const look = flightLook(flight, t)}
		<Graphics draw={drawTrail(flight, t)} />
		<Container x={look.x} y={look.y} rotation={look.rotation} scale={{ x: look.mirror, y: 1 }}>
			<Sprite key="wildFish" anchor={0.5} width={look.width} height={look.width * FISH_RATIO} />
		</Container>
	{/each}
</BoardContainer>
