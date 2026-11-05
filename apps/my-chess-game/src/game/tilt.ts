// The board lies on the table tipped away from you: its far edge narrower than its near one, and its
// depth shortened, as a flat board seen from in front and above. TiltedPlane draws it so; the squares'
// places on screen come through the same projection (stateGameDerived.boardPoint).
// - near, far: the near and far edges' widths, of the board's width
// - depth: how tall it looks, of its width; the near edge stays where the flat board's bottom was
export const TILT = { near: 1.01, far: 0.91, depth: 0.94 };
// the colour of the front edge of what lies tilted on the table (TiltedPlane: the board, the side panel)
export const TABLE_EDGE = 0x2e3b44;

export type Quad = [number, number, number, number, number, number, number, number];

// the same map the other way: a point in the parent's units to (u, v) on the unit square (outside it,
// too, along the same plane), for finding the square under the pointer
export const quadToSquare = ([x0, y0, x1, y1, x2, y2, x3, y3]: Quad) => {
	const dx1 = x1 - x2;
	const dx2 = x3 - x2;
	const dx3 = x0 - x1 + x2 - x3;
	const dy1 = y1 - y2;
	const dy2 = y3 - y2;
	const dy3 = y0 - y1 + y2 - y3;
	const det = dx1 * dy2 - dx2 * dy1;
	const g = det ? (dx3 * dy2 - dx2 * dy3) / det : 0;
	const h = det ? (dx1 * dy3 - dx3 * dy1) / det : 0;
	// the forward map as a matrix [[a, b, x0], [d, e, y0], [g, h, 1]], inverted by its adjugate
	const a = x1 - x0 + g * x1;
	const b = x3 - x0 + h * x3;
	const d = y1 - y0 + g * y1;
	const e = y3 - y0 + h * y3;
	const A = e - y0 * h;
	const B = x0 * h - b;
	const C = b * y0 - x0 * e;
	const D = y0 * g - d;
	const E = a - x0 * g;
	const F = x0 * d - a * y0;
	const G = d * h - e * g;
	const H = b * g - a * h;
	const I = a * e - b * d;
	return (x: number, y: number) => {
		const w = G * x + H * y + I;
		return { u: (A * x + B * y + C) / w, v: (D * x + E * y + F) / w };
	};
};

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
