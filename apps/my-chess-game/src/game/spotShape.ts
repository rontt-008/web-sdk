import type { Position } from './types';
import type { Spot } from './typesBookEvent';

// The shape of a multiplier spot: one square, or (the SUPER BONUS's spots side by side, merged) several
// squares sharing edges, in any connected shape. Squares here are board squares, {reel, row}, row 1 the
// top; points are in board pixels, a square `size` across, (0, 0) the board's top left corner.

const cellKey = (reel: number, row: number) => `${reel}:${row}`;

// every square the spot covers (the spot's own square, its anchor, among them)
export const spotCells = (spot: Spot): Position[] =>
	spot.cells?.length ? spot.cells : [{ reel: spot.reel, row: spot.row }];

// whether the spot covers the square
export const spotCovers = (spot: Spot, position: Position) =>
	spotCells(spot).some((cell) => cell.reel === position.reel && cell.row === position.row);

// the square its value badge goes on: its top right one (the top row first, then the rightmost)
export const badgeCell = (cells: Position[]) =>
	cells.reduce((best, cell) => (cell.row < best.row || (cell.row === best.row && cell.reel > best.reel) ? cell : best));

// the square nearest the middle of the spot's bounds (on the spot itself, whatever its shape)
export const middleCell = (cells: Position[]) => {
	const reel = (Math.min(...cells.map((cell) => cell.reel)) + Math.max(...cells.map((cell) => cell.reel))) / 2;
	const row = (Math.min(...cells.map((cell) => cell.row)) + Math.max(...cells.map((cell) => cell.row))) / 2;
	const distance = (cell: Position) => (cell.reel - reel) ** 2 + (cell.row - row) ** 2;
	return cells.reduce((best, cell) => (distance(cell) < distance(best) ? cell : best));
};

type Point = [number, number];

// The spot's outline: its squares' outer edges, joined into loops (one, or more with a hole in it), each
// going clockwise round the squares (counter-clockwise round a hole), every corner moved `inset` pixels in
// towards the squares, so a frame drawn along it sits just inside them like a single square's. Each loop
// a flat list x0, y0, x1, y1, ... with `clockwise` false for a hole's.
export const spotOutline = (cells: Position[], size: number, inset: number) => {
	const inside = new Set(cells.map((cell) => cellKey(cell.reel, cell.row)));
	const has = (reel: number, row: number) => inside.has(cellKey(reel, row));
	// the outer edges, in grid points (x the reel, y the row's top: row - 1), the inside on their right
	const edges = new Map<string, Point[]>();
	const add = (from: Point, to: Point) => {
		const key = `${from[0]},${from[1]}`;
		edges.set(key, [...(edges.get(key) ?? []), to]);
	};
	for (const { reel, row } of cells) {
		const x = reel;
		const y = row - 1;
		if (!has(reel, row - 1)) add([x, y], [x + 1, y]);
		if (!has(reel + 1, row)) add([x + 1, y], [x + 1, y + 1]);
		if (!has(reel, row + 1)) add([x + 1, y + 1], [x, y + 1]);
		if (!has(reel - 1, row)) add([x, y + 1], [x, y]);
	}

	const loops: { points: number[]; clockwise: boolean }[] = [];
	while (edges.size) {
		const [startKey] = edges.keys();
		const start = startKey.split(',').map(Number) as Point;
		const corners: Point[] = [start];
		let at = start;
		for (;;) {
			const key = `${at[0]},${at[1]}`;
			const next = edges.get(key);
			if (!next?.length) break;
			const to = next.shift() as Point;
			if (!next.length) edges.delete(key);
			if (to[0] === start[0] && to[1] === start[1]) break;
			corners.push(to);
			at = to;
		}
		// only the corners where the outline turns
		const turns = corners.filter((point, index) => {
			const before = corners[(index - 1 + corners.length) % corners.length];
			const after = corners[(index + 1) % corners.length];
			return (point[0] - before[0]) * (after[1] - point[1]) !== (point[1] - before[1]) * (after[0] - point[0]);
		});
		// each corner moved in: along the inward sides of the two edges meeting there
		const points: number[] = [];
		let area = 0;
		turns.forEach((point, index) => {
			const before = turns[(index - 1 + turns.length) % turns.length];
			const after = turns[(index + 1) % turns.length];
			const inward = (from: Point, to: Point): Point => {
				const dx = Math.sign(to[0] - from[0]);
				const dy = Math.sign(to[1] - from[1]);
				return [-dy, dx];
			};
			const a = inward(before, point);
			const b = inward(point, after);
			points.push(point[0] * size + (a[0] + b[0]) * inset, point[1] * size + (a[1] + b[1]) * inset);
			area += point[0] * after[1] - after[0] * point[1];
		});
		loops.push({ points, clockwise: area > 0 });
	}
	return loops;
};
