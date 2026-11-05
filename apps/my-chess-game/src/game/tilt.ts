import * as PIXI from 'pixi.js';

// The board lies on the table tipped away from you: its far edge narrower than its near one, and its
// depth shortened, as a flat board seen from in front and above. TiltedPlane draws it so; the squares'
// places on screen come through the same projection (stateGameDerived.boardPoint).
// - near, far: the near and far edges' widths, of the board's width
// - depth: how tall it looks, of its width; the near edge stays where the flat board's bottom was
export const TILT = { near: 1.005, far: 0.94, depth: 0.96 };

// The lamp is up at the table's top left. What lies on the table casts its shadow away from it (down
// and to the right; TiltedPlane's shadowOffset), and is shaded where its light reaches less: a fill laid
// over it, none on its top left, deepening across it to its far corner (bottom right), `darkest` there.
export const LAMP_SHADOW = { alpha: 0.55, offset: { x: 9, y: 8 } };
export const lampShade = (darkest: number) =>
	new PIXI.FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 1, y: 1 },
		colorStops: [
			{ offset: 0, color: 'rgba(24, 14, 8, 0)' },
			{ offset: 0.35, color: 'rgba(24, 14, 8, 0)' },
			{ offset: 0.7, color: `rgba(24, 14, 8, ${darkest * 0.375})` },
			{ offset: 1, color: `rgba(24, 14, 8, ${darkest})` },
		],
		textureSpace: 'local',
	});
export type Quad = [number, number, number, number, number, number, number, number];

// The projective map of the unit square onto a quad (corners top left, top right, bottom right, bottom
// left; Heckbert's square-to-quad), as a function of (u, v) in 0..1 (outside it too, along the same plane)
export const squareToQuad = ([x0, y0, x1, y1, x2, y2, x3, y3]: Quad) => {
	const dx1 = x1 - x2;
	const dx2 = x3 - x2;
	const dx3 = x0 - x1 + x2 - x3;
	const dy1 = y1 - y2;
	const dy2 = y3 - y2;
	const dy3 = y0 - y1 + y2 - y3;
	const det = dx1 * dy2 - dx2 * dy1;
	const g = det ? (dx3 * dy2 - dx2 * dy3) / det : 0;
	const h = det ? (dx1 * dy3 - dx3 * dy1) / det : 0;
	const a = x1 - x0 + g * x1;
	const b = x3 - x0 + h * x3;
	const d = y1 - y0 + g * y1;
	const e = y3 - y0 + h * y3;
	return (u: number, v: number) => {
		const w = g * u + h * v + 1;
		return { x: (a * u + b * v + x0) / w, y: (d * u + e * v + y0) / w };
	};
};
