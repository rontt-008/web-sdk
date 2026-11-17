import { FillPattern, Texture } from 'pixi.js';

// The rock the logo's lettering is cut from (textStyles logoTextLayers; the user, 2026-11-16: "can u make
// every font like this look like its made of rock (except the ui fonts)", of the free spins sign), in the
// game's cartoon stone (the logo's, the frames', the stone letters'): flat chiselled facets, a little
// lighter or darker each, with thin seams between them, and crisp dark cracks along some of the seams,
// each with a lit lip below it. Made here, once, in a canvas, as two greyscale tiles over the lettering's
// own colours (so they stay as bright as they were): `shade`, multiplied over it (white leaves it, the
// darker facets, seams and cracks darken it), and `light`, screened over it (black leaves it, the lips
// and the facets' lit top edges lighten it). (A first go, a mottled grey-tinted stone, came out dull:
// "plaster".)
// Each is a FillPattern for a Text, which canvas text draws at one of its pixels to one of the text's
// units from the text's top left; so the tiles are drawn at a size that follows the font size (TILE: the
// facets stay the same against the letters), in steps so a counting-up amount doesn't make new ones for
// every font size. Seeded, so it is the same rock every time.

const SIZE = 256;
// about 0.4 of the font size across each
const FACETS = 40;
// the drawn tile, of the font size, rounded to TILE.step, within min and max
const TILE = { perFontSize: 2.6, step: 32, min: 64, max: 384 };
const LOOK = {
	// the facets' shade: from 1 - facet (darkest) to 1
	facet: 0.2,
	// the seams between all the facets, and the cracks (and how wide, in base pixels, of F2 - F1)
	seam: 0.22,
	seamWidth: 1.4,
	crack: 0.62,
	crackWidth: [0.9, 3] as const,
	// the light: below the cracks, and along the facets' top edges
	lip: 0.5,
	edge: 0.16,
	grain: 0.05,
};

const seeded = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const smoothstep = (from: number, to: number, x: number) =>
	smooth(Math.min(1, Math.max(0, (x - from) / (to - from))));

type Maps = { shade: Float32Array; light: Float32Array };
let maps: Maps | undefined;

const makeMaps = (): Maps => {
	const random = seeded(20261116);
	const wrap = (i: number) => ((i % SIZE) + SIZE) % SIZE;

	// value noise on a grid of `cells` across the tile, wrapping, about 0 to 1
	const valueNoise = (cells: number) => {
		const grid = Float32Array.from({ length: cells * cells }, () => random());
		const at = (gx: number, gy: number) => grid[(gy % cells) * cells + (gx % cells)];
		return (x: number, y: number) => {
			const fx = (x / SIZE) * cells;
			const fy = (y / SIZE) * cells;
			const x0 = Math.floor(fx);
			const y0 = Math.floor(fy);
			const tx = smooth(fx - x0);
			const ty = smooth(fy - y0);
			const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
			const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
			return top + (bottom - top) * ty;
		};
	};
	const crackLets = valueNoise(5);
	const grain = valueNoise(40);

	const facets = Array.from({ length: FACETS }, () => ({
		x: random() * SIZE,
		y: random() * SIZE,
		tone: random(),
	}));

	// each pixel's facet (its tone) and how far it is from that facet's edge (F2 - F1: 0 on the edge)
	const tone = new Float32Array(SIZE * SIZE);
	const border = new Float32Array(SIZE * SIZE);
	const cracked = new Float32Array(SIZE * SIZE);
	for (let y = 0; y < SIZE; y++) {
		for (let x = 0; x < SIZE; x++) {
			let first = Infinity;
			let second = Infinity;
			let nearest = 0;
			for (const facet of facets) {
				// to the facet's nearest copy, the tile wrapping (the facets are far smaller than it)
				let dx = x - facet.x;
				let dy = y - facet.y;
				dx -= SIZE * Math.round(dx / SIZE);
				dy -= SIZE * Math.round(dy / SIZE);
				// (squared, till the two nearest are known)
				const d = dx * dx + dy * dy;
				if (d < first) {
					second = first;
					first = d;
					nearest = facet.tone;
				} else if (d < second) second = d;
			}
			const i = y * SIZE + x;
			tone[i] = nearest;
			border[i] = Math.sqrt(second) - Math.sqrt(first);
			const [from, to] = LOOK.crackWidth;
			cracked[i] = (1 - smoothstep(from, to, border[i])) * smoothstep(0.45, 0.6, crackLets(x, y));
		}
	}

	const shade = new Float32Array(SIZE * SIZE);
	const light = new Float32Array(SIZE * SIZE);
	for (let y = 0; y < SIZE; y++) {
		for (let x = 0; x < SIZE; x++) {
			const i = y * SIZE + x;
			const seam = 1 - smoothstep(0, LOOK.seamWidth, border[i]);
			shade[i] =
				(1 - LOOK.facet * (1 - tone[i])) *
				(1 - LOOK.seam * seam) *
				(1 - LOOK.crack * cracked[i]) *
				(1 + (grain(x, y) - 0.5) * LOOK.grain);
			// lit where the pixel up and to the left is in a crack (or on a seam) and this one isn't
			const above = wrap(y - 2) * SIZE + wrap(x - 1);
			const lip = Math.max(0, cracked[above] - cracked[i]);
			const aboveSeam = 1 - smoothstep(0, LOOK.seamWidth, border[above]);
			const edge = Math.max(0, aboveSeam - seam) * (1 - cracked[i]);
			light[i] = Math.min(1, lip * LOOK.lip + edge * LOOK.edge);
		}
	}
	return { shade, light };
};

// a greyscale canvas of `values` (0 to 1), SIZE square
const greyCanvas = (values: Float32Array) => {
	const canvas = document.createElement('canvas');
	canvas.width = SIZE;
	canvas.height = SIZE;
	const context = canvas.getContext('2d')!;
	const image = context.createImageData(SIZE, SIZE);
	for (let i = 0; i < SIZE * SIZE; i++) {
		const v = Math.round(Math.max(0, Math.min(1, values[i])) * 255);
		image.data.set([v, v, v, 255], i * 4);
	}
	context.putImageData(image, 0, 0);
	return canvas;
};

let bases: { shade: HTMLCanvasElement; light: HTMLCanvasElement } | undefined;
const patterns = new Map<string, FillPattern>();

const pattern = (which: 'shade' | 'light', tile: number) => {
	const key = `${which}/${tile}`;
	let fill = patterns.get(key);
	if (!fill) {
		maps ??= makeMaps();
		bases ??= { shade: greyCanvas(maps.shade), light: greyCanvas(maps.light) };
		const canvas = document.createElement('canvas');
		canvas.width = tile;
		canvas.height = tile;
		const context = canvas.getContext('2d')!;
		context.imageSmoothingQuality = 'high';
		context.drawImage(bases[which], 0, 0, tile, tile);
		fill = new FillPattern(Texture.from(canvas), 'repeat');
		patterns.set(key, fill);
	}
	return fill;
};

// the fills for a Text face of fontSize: `shade` to multiply over it, `light` to screen over it
// (undefined where there is no document)
export const rockFills = (fontSize: number) => {
	if (typeof document === 'undefined') return undefined;
	const tile = Math.min(
		TILE.max,
		Math.max(TILE.min, Math.round((fontSize * TILE.perFontSize) / TILE.step) * TILE.step),
	);
	return { shade: pattern('shade', tile), light: pattern('light', tile) };
};
