import type { Position } from './types';

// The free spins' runes (see the rules in scripts/generate-5x5-books.mjs): one lies behind the
// symbols at a time, anywhere on the board it fits, a spot of it lights up when a winning cluster
// covers it, and with all its spots lit its power is collected for the power spins after the free
// spins.

export type RuneName = 'othala' | 'fehu' | 'hagall' | 'ingwaz';
export type RunePower = 'premiums' | 'multiplier' | 'wilds' | 'extraSpin';

// a point on the board in cells: x from the left, y from the top (0 to 5)
type Point = [x: number, y: number];

type Rune = {
	power: RunePower;
	// what the power does, in a few words
	powerText: string;
	// the spots that light up, [reel, row] with row 0 the top row (books count the rows from 1), as
	// it lies with no offset (see RuneOffset)
	spots: [reel: number, row: number][];
	// the rune's lines, drawn over its spots and only through them
	strokes: Point[][];
};

// x3 on every win in the power spins: the same as POWER_MULT in the book generator
export const POWER_MULT = 3;

export const RUNES: Record<RuneName, Rune> = {
	othala: {
		power: 'premiums',
		powerText: 'ONLY PREMIUMS',
		spots: [[2, 0], [1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
		strokes: [
			[
				[1.35, 3.65],
				[3.5, 1.5],
				[2.5, 0.5],
				[1.5, 1.5],
				[3.65, 3.65],
			],
		],
	},
	fehu: {
		power: 'multiplier',
		powerText: `${POWER_MULT}x MULTIPLIER`,
		spots: [[2, 0], [3, 0], [2, 1], [3, 1], [2, 2], [2, 3], [2, 4]],
		strokes: [
			[
				[2.5, 0.25],
				[2.5, 4.75],
			],
			[
				[2.5, 1.3],
				[3.7, 0.2],
			],
			[
				[2.5, 2.5],
				[3.7, 1.3],
			],
		],
	},
	hagall: {
		power: 'wilds',
		powerText: '3x3 WILD',
		spots: [[1, 1], [2, 1], [3, 1], [2, 2], [1, 3], [2, 3], [3, 3]],
		strokes: [
			[
				[2.5, 1.25],
				[2.5, 3.75],
			],
			[
				[1.35, 1.35],
				[3.65, 3.65],
			],
			[
				[3.65, 1.35],
				[1.35, 3.65],
			],
		],
	},
	ingwaz: {
		power: 'extraSpin',
		powerText: '+1 SPIN',
		spots: [[1, 0], [3, 0], [2, 1], [1, 2], [3, 2], [2, 3], [1, 4], [3, 4]],
		strokes: [
			[
				[1.3, 0.3],
				[3.5, 2.5],
				[1.3, 4.7],
			],
			[
				[3.7, 0.3],
				[1.5, 2.5],
				[3.7, 4.7],
			],
		],
	},
};

// the order of the boxes left of the board
export const RUNE_NAMES: RuneName[] = ['othala', 'fehu', 'hagall', 'ingwaz'];

// how far a rune lies from where RUNES has it, in cells: right and down (anywhere all its spots are
// on the board)
export type RuneOffset = { reel: number; row: number };
export const NO_OFFSET: RuneOffset = { reel: 0, row: 0 };

// which of a rune's spots a book's position (rows counted from 1) is, with the rune at `offset`,
// or -1
export const runeSpotIndex = (rune: RuneName, offset: RuneOffset, position: Position) =>
	RUNES[rune].spots.findIndex(
		([reel, row]) =>
			reel + offset.reel === position.reel && row + offset.row === position.row - 1,
	);


// --- the rune's lines as brush strokes ---------------------------------------------------------

// a point down the middle of a brush stroke, in cells: its sideways direction (nx, ny), its width
// (1 the brush's), and how far its left and right edges stray from that, as a share of half of it
export type BrushPoint = {
	x: number;
	y: number;
	nx: number;
	ny: number;
	width: number;
	left: number;
	right: number;
};

// a stroke, or the part of one inside one spot (it lights up with that spot); `start` and `end`
// are the stroke's own ends, drawn round, rather than where it crosses into the next spot, and
// `before` and `after` the spots of its parts on either side (-1 at its own ends)
export type BrushStroke = {
	spot: number;
	points: BrushPoint[];
	start: boolean;
	end: boolean;
	before: number;
	after: number;
};

// Hand drawn, in cells: a point every `step`, the line wandering sideways up to `wander`, its width
// swelling and thinning by up to `thickness` of it and its edges rough by up to `rough` of half of
// it, and thinner (to `tip` of it) over the last `taper` at each end.
const BRUSH = { step: 0.03, wander: 0.035, thickness: 0.3, rough: 0.2, taper: 0.16, tip: 0.5 };

// a random number generator from a seed, so a rune comes out the same each time it is drawn
const seeded = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// smooth noise along a stroke, about -1 to 1: waves of about these many per cell, at random phases
const waves = (random: () => number, perCell: number[]) => {
	const list = perCell.map((frequency) => ({
		frequency: frequency * (0.8 + random() * 0.4),
		phase: random() * Math.PI * 2,
	}));
	return (s: number) =>
		list.reduce((sum, w) => sum + Math.sin(s * w.frequency * Math.PI * 2 + w.phase), 0) / list.length;
};

// how far along a line (0 to 1) it is inside a cell, or undefined (Liang-Barsky)
const clip = (
	[x1, y1]: Point,
	[x2, y2]: Point,
	[reel, row]: [number, number],
): [number, number] | undefined => {
	const dx = x2 - x1;
	const dy = y2 - y1;
	let start = 0;
	let end = 1;
	const edges: [number, number][] = [
		[-dx, x1 - reel],
		[dx, reel + 1 - x1],
		[-dy, y1 - row],
		[dy, row + 1 - y1],
	];
	for (const [p, q] of edges) {
		if (p === 0) {
			if (q < 0) return undefined;
		} else if (p < 0) {
			start = Math.max(start, q / p);
		} else {
			end = Math.min(end, q / p);
		}
	}
	return end - start < 1e-6 ? undefined : [start, end];
};

const smoothstep = (t: number) => t * t * (3 - 2 * t);

// Each straight line of the rune is a stroke of its own, as if drawn with a brush (they overlap
// where they meet), cut where it crosses from one spot into the next.
const brushStrokes = (rune: RuneName): BrushStroke[] => {
	const { spots, strokes } = RUNES[rune];
	const random = seeded([...rune].reduce((sum, c) => sum * 31 + c.charCodeAt(0), 7));
	const lines = strokes.flatMap((points) => points.slice(1).map((end, i) => [points[i], end]));

	return lines.flatMap(([from, to]) => {
		const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
		const [tx, ty] = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
		const [nx, ny] = [-ty, tx];
		const wander = waves(random, [0.6, 1.4]);
		const thickness = waves(random, [1.1, 2.5]);
		const roughLeft = waves(random, [6, 11, 17]);
		const roughRight = waves(random, [7, 12, 19]);

		const point = (t: number): BrushPoint => {
			const s = t * length;
			const fromEnd = Math.min(s, length - s) / BRUSH.taper;
			const taper = BRUSH.tip + (1 - BRUSH.tip) * smoothstep(Math.min(1, fromEnd));
			const sideways = BRUSH.wander * wander(s);
			return {
				x: from[0] + tx * s + nx * sideways,
				y: from[1] + ty * s + ny * sideways,
				nx,
				ny,
				width: (1 + BRUSH.thickness * thickness(s)) * taper,
				left: BRUSH.rough * roughLeft(s),
				right: BRUSH.rough * roughRight(s),
			};
		};

		// its parts, from its start to its end
		const parts = spots
			.flatMap((spot, index) => {
				const range = clip(from, to, spot);
				return range && (range[1] - range[0]) * length >= 1e-3 ? [{ spot: index, range }] : [];
			})
			.sort((a, b) => a.range[0] - b.range[0]);

		return parts.map(({ spot, range }, i) => {
			const count = Math.max(2, Math.ceil(((range[1] - range[0]) * length) / BRUSH.step));
			const points = Array.from({ length: count + 1 }, (_, j) =>
				point(range[0] + ((range[1] - range[0]) * j) / count),
			);
			return {
				spot,
				points,
				start: range[0] < 1e-6,
				end: range[1] > 1 - 1e-6,
				before: parts[i - 1]?.spot ?? -1,
				after: parts[i + 1]?.spot ?? -1,
			};
		});
	});
};

const brushCache = new Map<RuneName, BrushStroke[]>();

// the rune's lines as brush strokes, cut into its spots
export const runeBrushStrokes = (rune: RuneName) => {
	if (!brushCache.has(rune)) brushCache.set(rune, brushStrokes(rune));
	return brushCache.get(rune)!;
};
