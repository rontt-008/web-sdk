import _ from 'lodash';
import { Tween } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';

import { stateBetDerived } from 'state-shared';

import { BOARD_DIMENSIONS, TALL_WILD, WILD_SIZE } from './constants';
import type { ReelSymbol } from './stateGame.svelte';
import type { RawSymbol } from './types';

// The bonus's sticky bats. In the bonus, a bat ring that lands does the whole tall wild (tallWilds),
// and once its free spin is done and the WILD has turned back into the ring, the bat stays: it hovers
// in the reel's middle as the ring (StickyBats draws it). For the rest of the bonus, as each free spin's
// reels spin, it takes off, growing to the wild's size, and flutters round the board at random, drifting
// towards its new cell (a reel picked at random among those the spin doesn't land a ring on itself, and
// one of its symbols, not a scatter); once that reel stops, it eases down onto the cell from the way it
// is flying (no dash: 2026-11-13, the user: "they fly randomly and then goes 120kmh to the spot"),
// covering it as a ring that landed there would, and does the whole tall wild from there. When the
// bonus ends the bats rise and fade away.
// For now the game picks the reels and cells: the wins are the books' (sample math), which know nothing
// of the sticky bats. With real math, the books will say where each bat lands.

type Point = { x: number; y: number }; // in cells: x a reel (its middle), y a row (its middle)

export type StickyBat = {
	reel: number; // the reel it is on, or going to
	// hover: in its reel's middle (after the way back); wander: fluttering round as the reels spin;
	// approach: easing down onto its cell; perch: on it (its tall wild takes it from there)
	mode: 'hover' | 'wander' | 'approach' | 'perch';
	pos: Point;
	tilt: number; // radians, leaning into its flight
	size: Tween<number>; // cells
	alpha: Tween<number>;
	rise: Tween<number>; // cells, as it leaves at the bonus's end
	hovers: number; // counts the times it turns back into the ring (its idle starts over each time)
	// its WILD's multiplier, kept for the rest of the bonus: each WILD it makes starts with it and
	// doubles it with every winning line it is in (tallWilds)
	multiplier: number;
	landed: Promise<void>; // it is on its cell
	path: Point[]; // the wander's waypoints
	since: number; // ms (performance.now) its wander or approach started
	from: Point; // where its approach started
	velocity: Point; // cells per ms (at the game's speed), how it was flying as its approach started
	approachMs: number; // how long its approach takes (at the game's speed)
	to: Point; // its cell
	land: () => void;
};

export const stateStickyBats = $state({ bats: [] as StickyBat[] });

const timeScale = () => stateBetDerived.timeScale() || 1;
const MIDDLE = (BOARD_DIMENSIONS.y - 1) / 2;

// A tall wild in the bonus has turned back into the ring: its bat hovers there (a new sticky bat, or
// the one that came down there), as small as the way back leaves it, keeping the WILD's multiplier.
export const hoverStickyBat = (reel: number, bat: StickyBat | undefined, multiplier: number) => {
	const pos = { x: reel, y: MIDDLE };
	if (bat) {
		Object.assign(bat, { mode: 'hover', pos, tilt: 0, hovers: bat.hovers + 1, multiplier });
		bat.size.set(TALL_WILD.ringSize, { duration: 0 });
		return;
	}
	const newBat: StickyBat = $state({
		reel,
		mode: 'hover',
		pos,
		tilt: 0,
		size: new Tween(TALL_WILD.ringSize),
		alpha: new Tween(1),
		rise: new Tween(0),
		hovers: 0,
		multiplier,
		landed: Promise.resolve(),
		path: [],
		since: 0,
		from: pos,
		velocity: { x: 0, y: 0 },
		approachMs: 0,
		to: pos,
		land: () => {},
	});
	stateStickyBats.bats.push(newBat);
};

// ---------------------------------------------------------------- the flight
// The wander: a smooth curve (Catmull-Rom) through random waypoints, one every segmentMs, each a little
// way from the last (TALL_WILD.sticky.reach cells) and then pulled `homing` of the way to its cell, so it
// flutters over towards it and round it till its reel stops. It takes off from rest (the first segment
// eases in).
const nextWaypoint = (p: Point, to: Point): Point => {
	const { reach, homing } = TALL_WILD.sticky;
	const x = p.x + _.random(-reach.x, reach.x, true);
	const y = p.y + _.random(-reach.y, reach.y, true);
	return {
		x: _.clamp(x + (to.x - x) * homing, -0.2, BOARD_DIMENSIONS.x - 0.8),
		y: _.clamp(y + (to.y - y) * homing, 0, BOARD_DIMENSIONS.y - 1),
	};
};
const catmullRom = (a: number, b: number, c: number, d: number, u: number) =>
	0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
// its slope (per u)
const catmullRomSlope = (a: number, b: number, c: number, d: number, u: number) =>
	0.5 * (c - a + 2 * (2 * a - 5 * b + 4 * c - d) * u + 3 * (3 * b - a - 3 * c + d) * u * u);

// where it is and how it is flying (cells per ms), `elapsed` ms into its wander
const wanderAt = (bat: StickyBat, elapsed: number) => {
	const segment = TALL_WILD.sticky.segmentMs;
	// the take-off: the first segment's time eased in (2u² - u³: from rest, at full speed by its end)
	let time = elapsed;
	let pace = 1;
	if (elapsed < segment) {
		const u = elapsed / segment;
		time = segment * (2 * u * u - u * u * u);
		pace = 4 * u - 3 * u * u;
	}
	const i = Math.floor(time / segment);
	while (bat.path.length < i + 4) bat.path.push(nextWaypoint(bat.path[bat.path.length - 1], bat.to));
	const [a, b, c, d] = bat.path.slice(i, i + 4);
	const u = time / segment - i;
	return {
		pos: { x: catmullRom(a.x, b.x, c.x, d.x, u), y: catmullRom(a.y, b.y, c.y, d.y, u) },
		velocity: {
			x: (catmullRomSlope(a.x, b.x, c.x, d.x, u) * pace) / segment,
			y: (catmullRomSlope(a.y, b.y, c.y, d.y, u) * pace) / segment,
		},
	};
};

// The approach: from where it is, flying on as it was (its velocity), curving round onto its cell and
// slowing to a stop there (a cubic Hermite curve: no jump in its speed at either end).
const approachAt = (bat: StickyBat, u: number): Point => {
	const u2 = u * u;
	const u3 = u2 * u;
	const from = 2 * u3 - 3 * u2 + 1;
	const on = (u3 - 2 * u2 + u) * bat.approachMs;
	const to = 3 * u2 - 2 * u3;
	return {
		x: bat.from.x * from + bat.velocity.x * on + bat.to.x * to,
		y: bat.from.y * from + bat.velocity.y * on + bat.to.y * to,
	};
};

// moving the bats, a frame at a time, while any is wandering or swooping down
let frame = 0;
const step = (now: number) => {
	frame = 0;
	for (const bat of stateStickyBats.bats) {
		// (the frame's time can be a little before the moment it took off)
		const elapsed = Math.max(0, now - bat.since) * timeScale();
		let pos = bat.pos;
		if (bat.mode === 'wander') pos = wanderAt(bat, elapsed).pos;
		if (bat.mode === 'approach') {
			const u = Math.min(1, elapsed / bat.approachMs);
			pos = approachAt(bat, u);
			if (u >= 1) {
				bat.mode = 'perch';
				bat.land();
			}
		}
		if (bat.mode === 'wander' || bat.mode === 'approach' || bat.mode === 'perch') {
			// leaning into its flight, a little behind it
			const lean = _.clamp((pos.x - bat.pos.x) * 6, -1, 1) * TALL_WILD.sticky.tilt;
			bat.tilt += (bat.mode === 'perch' ? -bat.tilt : lean - bat.tilt) * 0.2;
			bat.pos = pos;
		}
	}
	if (stateStickyBats.bats.some((bat) => bat.mode !== 'hover')) frame = requestAnimationFrame(step);
};
const moving = () => {
	if (!frame) frame = requestAnimationFrame(step);
};

// a row of the reel to come down on: not a scatter
const pickRow = (rows: RawSymbol[]) => {
	const choices = _.range(rows.length).filter((row) => !rows[row].scatter && rows[row].name !== 'S');
	return _.sample(choices.length ? choices : _.range(rows.length)) ?? 0;
};

// A free spin starts (`board`: each reel's rows this spin will land): each bat takes off and flutters
// round, going to a new reel, one the spin doesn't land a ring on and no other bat goes to (if there is
// none, it stays on its own, or if that's taken too it leaves), and to one of its symbols.
export const flyStickyBats = (board: RawSymbol[][]) => {
	const taken = new Set(_.range(board.length).filter((reel) => board[reel].some((symbol) => symbol.name === 'W')));
	for (const bat of _.shuffle(stateStickyBats.bats)) {
		const free = _.range(BOARD_DIMENSIONS.x).filter((reel) => !taken.has(reel));
		const to = _.sample(free.filter((reel) => reel !== bat.reel)) ?? free.find((reel) => reel === bat.reel);
		if (to === undefined) {
			leave(bat);
			continue;
		}
		taken.add(to);
		bat.reel = to;
		bat.to = { x: to, y: pickRow(board[to] ?? []) };
		bat.mode = 'wander';
		bat.since = performance.now();
		bat.path = [bat.pos, bat.pos];
		bat.landed = new Promise((resolve) => (bat.land = resolve));
		bat.size.set(WILD_SIZE, { duration: TALL_WILD.sticky.growMs / timeScale(), easing: cubicOut });
	}
	moving();
};

// the bat going to a reel this spin
export const stickyBatOn = (reel: number) =>
	stateStickyBats.bats.find((bat) => bat.reel === reel && bat.mode === 'wander');

// Its reel has stopped (its 4 rows): it eases down onto its cell (picked as it took off; picked again if
// the reel didn't land what the board said). Its row.
export const landStickyBat = (bat: StickyBat, rows: ReelSymbol[]) => {
	const symbols = rows.map((reelSymbol) => reelSymbol.rawSymbol);
	const ok = symbols[bat.to.y] && !symbols[bat.to.y].scatter && symbols[bat.to.y].name !== 'S';
	const row = bat.to.x === bat.reel && ok ? bat.to.y : pickRow(symbols);
	const now = performance.now();
	// where it is and how it's flying right now (it is wandering)
	const { pos, velocity } =
		bat.mode === 'wander'
			? wanderAt(bat, Math.max(0, now - bat.since) * timeScale())
			: { pos: bat.pos, velocity: { x: 0, y: 0 } };
	bat.mode = 'approach';
	bat.since = now;
	bat.from = pos;
	bat.velocity = velocity;
	bat.to = { x: bat.reel, y: row };
	// as long as slowing to a stop from about its wander's speed takes over the distance
	const { approachMs, approachMaxMs, cruise } = TALL_WILD.sticky;
	const distance = Math.hypot(bat.to.x - pos.x, bat.to.y - pos.y);
	bat.approachMs = _.clamp(((2 * distance) / cruise) * 1000, approachMs, approachMaxMs);
	moving();
	return row;
};

const leave = async (bat: StickyBat) => {
	const duration = TALL_WILD.sticky.leaveMs / timeScale();
	await Promise.all([
		bat.rise.set(1, { duration, easing: cubicOut }),
		bat.alpha.set(0, { duration }),
	]);
	stateStickyBats.bats = stateStickyBats.bats.filter((other) => other !== bat);
};

// The bonus is over: the bats rise and fade away.
export const stickyBatsLeave = () => Promise.all(stateStickyBats.bats.map(leave));
