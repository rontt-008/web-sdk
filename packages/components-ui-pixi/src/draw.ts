// what is drawn with: a pixi Graphics (this package has no pixi.js types of its own to name it by)
type Graphics = {
	moveTo(x: number, y: number): Graphics;
	lineTo(x: number, y: number): Graphics;
	arc(x: number, y: number, radius: number, start: number, end: number): Graphics;
	stroke(style: { width: number; color: number; alpha: number; cap: 'round' }): Graphics;
};

// A line along the top inside of a rounded box centred on (x, y): from where its top-left corner
// turns down to where its top-right one does, `inset` in from its edge. A faint light one is a
// highlight on a button or panel, a dark one the shadow inside a recessed well.
export const strokeTopInside = (
	graphics: Graphics,
	options: {
		x?: number;
		y?: number;
		width: number;
		height: number;
		radius: number;
		inset: number;
		lineWidth: number;
		color: number;
		alpha: number;
	},
) => {
	const { x = 0, y = 0, width, height, inset, lineWidth, color, alpha } = options;
	const radius = Math.min(options.radius, width * 0.5, height * 0.5);
	const inner = Math.max(0, radius - inset);
	const left = x - width * 0.5 + radius;
	const right = x + width * 0.5 - radius;
	const cornerY = y - height * 0.5 + radius;
	const start = Math.PI * 1.25;

	graphics
		.moveTo(left + Math.cos(start) * inner, cornerY + Math.sin(start) * inner)
		.arc(left, cornerY, inner, start, Math.PI * 1.5)
		.lineTo(right, cornerY - inner)
		.arc(right, cornerY, inner, Math.PI * 1.5, Math.PI * 1.75)
		.stroke({ width: lineWidth, color, alpha, cap: 'round' });
};
