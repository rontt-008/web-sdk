import type * as PIXI from 'pixi.js';

import { SYMBOL_SIZE } from './constants';
import type { Position } from './types';

// the middle of a square in the board's own units
const centre = ({ reel, row }: Position) => ({
	x: (reel + 0.5) * SYMBOL_SIZE,
	y: (row - 0.5) * SYMBOL_SIZE,
});

// an arrow from the middle of one square to the middle of another: a shaft and a head. A knight's
// move (two squares one way, one the other: no other piece moves so) is drawn as its L, the long
// leg first and the head on the short one.
export const drawArrow = (graphics: PIXI.Graphics, from: Position, to: Position, color: number, alpha: number) => {
	const dReel = to.reel - from.reel;
	const dRow = to.row - from.row;
	const knight = (Math.abs(dReel) === 2 && Math.abs(dRow) === 1) || (Math.abs(dReel) === 1 && Math.abs(dRow) === 2);
	const corner = Math.abs(dReel) === 2 ? { reel: to.reel, row: from.row } : { reel: from.reel, row: to.row };
	const points = (knight ? [from, corner, to] : [from, to]).map(centre);
	const head = SYMBOL_SIZE * 0.32;
	const width = SYMBOL_SIZE * 0.13;
	// the shaft starts a little out of the first square's middle and stops short of the target
	// square's middle, where the head is
	const first = points[0];
	const second = points[1];
	const last = points[points.length - 1];
	const before = points[points.length - 2];
	const startLength = Math.hypot(second.x - first.x, second.y - first.y);
	const endLength = Math.hypot(last.x - before.x, last.y - before.y);
	if (startLength < 1 || endLength < 1) return;
	const sx = (second.x - first.x) / startLength;
	const sy = (second.y - first.y) / startLength;
	const ux = (last.x - before.x) / endLength;
	const uy = (last.y - before.y) / endLength;
	const start = { x: first.x + sx * SYMBOL_SIZE * 0.18, y: first.y + sy * SYMBOL_SIZE * 0.18 };
	const tipX = last.x - ux * SYMBOL_SIZE * 0.12;
	const tipY = last.y - uy * SYMBOL_SIZE * 0.12;
	const baseX = tipX - ux * head;
	const baseY = tipY - uy * head;
	graphics.moveTo(start.x, start.y);
	for (const point of points.slice(1, -1)) graphics.lineTo(point.x, point.y);
	graphics.lineTo(baseX, baseY).stroke({ color, width, alpha, cap: 'round', join: 'round' });
	graphics
		.poly([
			tipX,
			tipY,
			baseX - uy * head * 0.6,
			baseY + ux * head * 0.6,
			baseX + uy * head * 0.6,
			baseY - ux * head * 0.6,
		])
		.fill({ color, alpha });
};

