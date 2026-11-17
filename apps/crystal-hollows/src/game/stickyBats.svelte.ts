import _ from 'lodash';
import { Tween } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';

import { stateBetDerived } from 'state-shared';

import { BOARD_DIMENSIONS, TALL_WILD, WILD_SIZE } from './constants';
import { eventEmitter } from './eventEmitter';
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
	dip: number; // 0-1, settling onto a symbol it fakes a landing on (its size dips)
	size: Tween<number>; // cells
	alpha: Tween<number>;
	rise: Tween<number>; // cells, as it leaves at the bonus's end
	hovers: number; // counts the times it turns back into the ring (its idle starts over each time)
	// its WILD's multiplier, kept for the rest of the bonus: each WILD it makes starts with it and
	// doubles it with every winning line it is in (tallWilds)
	multiplier: number;
	landed: Promise<void>; // it is on its cell
	path: Point[]; // the wander's cells: where it took off, then each it fakes a landing on
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
		Object.assign(bat, { mode: 'hover', pos, tilt: 0, dip: 0, hovers: bat.hovers + 1, multiplier });
		bat.size.set(TALL_WILD.ringSize, { duration: 0 });
		return;
	}
	newStickyBat(reel, pos, multiplier, 1);
};

const newStickyBat = (reel: number, pos: Point, multiplier: number, alpha: number) => {
	const newBat: StickyBat = $state({
		reel,
		mode: 'hover',
		pos,
		tilt: 0,
		dip: 0,
		size: new Tween(TALL_WILD.ringSize),
		alpha: new Tween(alpha),
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
	// (the pushed one: the state's proxy of it)
	return stateStickyBats.bats[stateStickyBats.bats.length - 1];
};

// The math's moves for the next free spin (its stickyBats event, just before its reveal): each bat flies
// from its reel (-1: the bat the bonus starts with, flying in from above the board) to reel `to` (-1:
// no reel left for it, it flies away), coming down on board row `row`, carrying `multiplier`.
export type StickyBatMove = { from: number; to: number; row: number; multiplier: number };
let plannedMoves: StickyBatMove[] | undefined;
export const planStickyBats = (moves: StickyBatMove[]) => {
	plannedMoves = moves;
};
// where a bat flying in starts: above the board's middle
const ENTRY = { x: (BOARD_DIMENSIONS.x - 1) / 2, y: -1.5 };

// ---------------------------------------------------------------- the flight
// The wander: faking landings (TALL_WILD.sticky.fake). It hops from symbol to symbol (cells: x a reel, y
// a row), each hop easing out of the last cell and into the next along a little arc, and settles on each
// for a moment as if landing there, then takes off again, till its reel stops. The next cell: a different
// one, up to `reach` cells away, not where another bat is faking, on a reel showing its symbols (the
// ones it fakes landings on; anywhere while the board is empty, as the reels drop), picked at random, the
// ones nearer the cell it is really going to likelier (by `homing` per cell).
// (which reels show their symbols: stateGame tells, as it has the reels)
let reelsShowing: () => boolean[] = () => [];
export const watchReels = (showing: () => boolean[]) => {
	reelsShowing = showing;
};
const fakeCell = (bat: StickyBat, from: Point): Point => {
	const { reach, homing } = TALL_WILD.sticky.fake;
	const taken = stateStickyBats.bats
		.filter((other) => other !== bat && other.mode === 'wander')
		.map((other) => other.path[other.path.length - 1]);
	const cells = _.range(BOARD_DIMENSIONS.x).flatMap((x) =>
		_.range(BOARD_DIMENSIONS.y).map((y) => ({ x, y })),
	);
	const choices = cells.filter((cell) => {
		const distance = Math.hypot(cell.x - from.x, cell.y - from.y);
		return (
			distance >= 0.9 &&
			distance <= reach &&
			!taken.some((other) => other && other.x === cell.x && other.y === cell.y)
		);
	});
	if (!choices.length) return bat.to;
	const showing = reelsShowing();
	const onSymbols = choices.filter((cell) => showing[cell.x]);
	if (onSymbols.length) choices.splice(0, choices.length, ...onSymbols);
	const weights = choices.map((cell) =>
		Math.exp(-homing * Math.hypot(cell.x - bat.to.x, cell.y - bat.to.y)),
	);
	let roll = Math.random() * _.sum(weights);
	for (let i = 0; i < choices.length; i++) {
		roll -= weights[i];
		if (roll < 0) return choices[i];
	}
	return choices[choices.length - 1];
};

// where it is, how it is flying (cells per ms) and how far it has settled onto a symbol (0-1), `elapsed`
// ms into its wander
const wanderAt = (bat: StickyBat, elapsed: number) => {
	const { hopMs, holdMs, arc } = TALL_WILD.sticky.fake;
	const cycle = hopMs + holdMs;
	const k = Math.floor(elapsed / cycle);
	const t = elapsed - k * cycle;
	while (bat.path.length < k + 2) bat.path.push(fakeCell(bat, bat.path[bat.path.length - 1]));
	const a = bat.path[k];
	const b = bat.path[k + 1];
	if (t < hopMs) {
		// the hop: eased in and out (a half cosine), rising mid-way
		const u = t / hopMs;
		const eased = 0.5 - 0.5 * Math.cos(Math.PI * u);
		const slope = 0.5 * Math.PI * Math.sin(Math.PI * u);
		const lift = arc * Math.min(1, Math.hypot(b.x - a.x, b.y - a.y));
		return {
			pos: {
				x: a.x + (b.x - a.x) * eased,
				y: a.y + (b.y - a.y) * eased - lift * Math.sin(Math.PI * u),
			},
			velocity: {
				x: ((b.x - a.x) * slope) / hopMs,
				y: ((b.y - a.y) * slope - lift * Math.PI * Math.cos(Math.PI * u)) / hopMs,
			},
			dip: 0,
		};
	}
	// on the symbol, as if landing: settling onto it and lifting off again
	return { pos: b, velocity: { x: 0, y: 0 }, dip: Math.sin((Math.PI * (t - hopMs)) / holdMs) };
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
		let dip = 0;
		if (bat.mode === 'wander') ({ pos, dip } = wanderAt(bat, elapsed));
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
			bat.dip = dip;
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
// The math picks the reels and rows (planStickyBats); rounds without its moves (older story books) are
// picked here the same way at random.
export const flyStickyBats = (board: RawSymbol[][]) => {
	const moves = plannedMoves;
	plannedMoves = undefined;
	if (moves) {
		const waiting = [...stateStickyBats.bats];
		for (const move of moves) {
			const found = move.from >= 0 ? waiting.find((bat) => bat.reel === move.from) : undefined;
			const bat = found ?? newStickyBat(move.from >= 0 ? move.from : -1, ENTRY, move.multiplier, 0);
			if (found) waiting.splice(waiting.indexOf(found), 1);
			else bat.alpha.set(1, { duration: TALL_WILD.sticky.growMs / timeScale() });
			bat.multiplier = move.multiplier;
			if (move.to < 0) leave(bat);
			else takeOff(bat, move.to, move.row);
		}
		if (moves.length) flapping();
		moving();
		return;
	}
	const taken = new Set(_.range(board.length).filter((reel) => board[reel].some((symbol) => symbol.name === 'W')));
	for (const bat of _.shuffle(stateStickyBats.bats)) {
		const free = _.range(BOARD_DIMENSIONS.x).filter((reel) => !taken.has(reel));
		const to = _.sample(free.filter((reel) => reel !== bat.reel)) ?? free.find((reel) => reel === bat.reel);
		if (to === undefined) {
			leave(bat);
			continue;
		}
		taken.add(to);
		takeOff(bat, to, pickRow(board[to] ?? []));
	}
	if (stateStickyBats.bats.length) flapping();
	moving();
};

// the bats' wings as they take off (or fly away): one flutter for them all
const flapping = () => eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_bat_fly' });

// a bat takes off for reel `to`, to come down on row `row` once that reel stops
const takeOff = (bat: StickyBat, to: number, row: number) => {
	bat.reel = to;
	bat.to = { x: to, y: row };
	bat.mode = 'wander';
	bat.since = performance.now();
	bat.path = [bat.pos];
	bat.landed = new Promise((resolve) => (bat.land = resolve));
	bat.size.set(WILD_SIZE, { duration: TALL_WILD.sticky.growMs / timeScale(), easing: cubicOut });
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
export const stickyBatsLeave = () => {
	if (stateStickyBats.bats.length) flapping();
	return Promise.all(stateStickyBats.bats.map(leave));
};
