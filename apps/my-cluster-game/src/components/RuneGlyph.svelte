<script lang="ts" module>
	import type { BrushStroke } from '../game/runes';

	// a colour between two (0xrrggbb), `share` of the way to the second
	const mix = (from: number, to: number, share: number) =>
		[16, 8, 0].reduce((out, shift) => {
			const a = (from >> shift) & 0xff;
			const b = (to >> shift) & 0xff;
			return out | (Math.round(a + (b - a) * share) << shift);
		}, 0);

	// whole numbers to 0 to 1, the same each time for the same ones: the crackle's randomness
	const noise = (a: number, b: number, c: number) => {
		let h = Math.imul(a, 374761393) ^ Math.imul(b + 1, 668265263) ^ Math.imul(c + 7, 1274126177);
		h = Math.imul(h ^ (h >>> 13), 1274126177);
		return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
	};

	// A lightning zigzag sideways along a stroke, up to `amplitude` cells: sharp bends 2 to 5 points
	// apart, some wide and some small, still at the stroke's ends so its pieces stay joined.
	const zigzag = (stroke: BrushStroke, seed: number, salt: number, amplitude: number) => {
		const last = stroke.points.length - 1;
		const bends = [0];
		while (bends[bends.length - 1] <= last) {
			bends.push(bends[bends.length - 1] + 2 + Math.floor(noise(seed, salt, bends.length + 50) * 4));
		}
		const offset = (k: number) => {
			const size = 0.3 + 0.7 * noise(seed, salt, k + 500) ** 2;
			return (noise(seed, salt, k) * 2 - 1) * size;
		};
		return (i: number) => {
			const k = bends.findIndex((bend) => bend > i) - 1;
			const along = (i - bends[k]) / (bends[k + 1] - bends[k]);
			const settle = Math.min(1, i / 3, (last - i) / 3);
			return (offset(k) + (offset(k + 1) - offset(k)) * along) * amplitude * settle;
		};
	};

	// The outline of a brush stroke `width` cells wide, in px (`cell` px a cell): its rough edges, and
	// round at the stroke's own ends. `shift` moves each point sideways, in cells.
	const outline = (
		stroke: BrushStroke,
		width: number,
		cell: number,
		shift: (i: number) => number = () => 0,
	) => {
		const left: number[] = [];
		const right: number[] = [];
		stroke.points.forEach((p, i) => {
			const half = (width * p.width) / 2;
			const x = p.x + p.nx * shift(i);
			const y = p.y + p.ny * shift(i);
			left.push((x + p.nx * half * (1 + p.left)) * cell, (y + p.ny * half * (1 + p.left)) * cell);
			right.push((x - p.nx * half * (1 + p.right)) * cell, (y - p.ny * half * (1 + p.right)) * cell);
		});
		// half circles from one edge round the end to the other: `ahead` 1 past the last point, -1
		// before the first
		const cap = (i: number, ahead: 1 | -1) => {
			const p = stroke.points[i];
			const half = (width * p.width) / 2;
			const [tx, ty] = [p.ny, -p.nx];
			const x = p.x + p.nx * shift(i);
			const y = p.y + p.ny * shift(i);
			return [1, 2, 3, 4, 5].flatMap((k) => {
				const angle = (ahead * Math.PI) / 2 - (ahead * k * Math.PI) / 6;
				const [sin, cos] = [Math.sin(angle), Math.cos(angle)];
				return [
					(x + (p.nx * sin + tx * cos * ahead) * half) * cell,
					(y + (p.ny * sin + ty * cos * ahead) * half) * cell,
				];
			});
		};
		const last = stroke.points.length - 1;
		const rightBack = right.flatMap((_, j) => (j % 2 ? [] : [right[right.length - 2 - j], right[right.length - 1 - j]]));
		return [
			...left,
			...(stroke.end ? cap(last, 1) : []),
			...rightBack,
			...(stroke.start ? cap(0, -1) : []),
		];
	};
</script>

<script lang="ts">
	import { onDestroy } from 'svelte';
	import { BlurFilter, FillGradient } from 'pixi.js';
	import { Container, Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		NO_OFFSET,
		RUNES,
		runeBrushStrokes,
		type RuneName,
		type RuneOffset,
	} from '../game/runes';

	type Props = {
		rune: RuneName;
		// the side of its 5 x 5 cells
		size: number;
		// where in them it lies (the grid stays put)
		offset?: RuneOffset;
		x?: number;
		y?: number;
		alpha?: number;
		// how lit each of its spots is, 0 to 1
		glows: number[];
		// all of it lit, 0 to 1 (a collected rune)
		flash?: number;
		// its spots as squares under the lines (off: only the lines)
		spots?: boolean;
		// the cells' outlines too, as in a picture of it
		grid?: boolean;
		// with a time (a count that goes up a few times a second), its lit lines crackle, and a spot
		// lighting up zaps
		time?: number;
	};

	const props: Props = $props();
	const context = getContext();

	// in a cell's size: the brush, the neon's soft glow around a lit line and its hot core, and the
	// zap's bolts; the crackle of a lit line and the zap's, sideways
	const LINE_WIDTH = 0.16;
	const GLOW_WIDTH = 0.5;
	const GLOW_BLUR = 0.16;
	const CORE_WIDTH = 0.055;
	const BOLT_WIDTH = 0.025;
	const CRACKLE = 0.012;
	const ZAP = 0.11;
	const SPOT_INSET = 0.03;
	const SPOT_RADIUS = 0.12;
	const GRID_WIDTH = 0.04;
	// a lit part next to a dimmer one fades out over this much of its end, in cells
	const FADE = 0.3;

	// unlit a dull green, darker at the edges than down the middle (the gradient reaches this far out
	// each side, in the line's width: its swells reach a little past half of it); lit a vivid neon
	// green with a near white core
	const LINE_EDGE = 0x2a4d36;
	const LINE_MIDDLE = 0x84c497;
	const LINE_GRADIENT_REACH = 0.6;
	const LINE_ALPHA = 0.75;
	const NEON = 0x39ff6e;
	const GLOW = 0x1cff5a;
	const GLOW_ALPHA = 0.6;
	const CORE = 0xeaffef;
	const SPOT = 0x34503f;
	const SPOT_ALPHA = 0.85;
	const SPOT_LIT = 0x2f8f4e;
	const GRID = 0x4a4950;

	const strokes = $derived(runeBrushStrokes(props.rune));
	// the unlit strokes' gradients (each one a texture): new ones each time the rune is drawn, the
	// old ones freed
	let lineGradients: FillGradient[] = [];
	onDestroy(() => lineGradients.forEach((gradient) => gradient.destroy()));
	const cell = $derived(props.size / 5);
	const glowOf = (spot: number) => Math.max(props.glows[spot] ?? 0, props.flash ?? 0);

	// the glow blurred as much on any screen: the filter's strength is in screen pixels
	const blur = new BlurFilter({ strength: 8, quality: 3, resolution: 'inherit' });
	$effect(() => {
		blur.strength = cell * GLOW_BLUR * context.stateLayoutDerived.mainLayout().scale;
	});

	// lit strokes, with how lit, which of their ends meet a dimmer part (they fade out there), and
	// with a time how much they flicker (0.85 to 1) and how far into the zap a spot lighting up is
	// (1 just hit, 0 lit)
	const lit = $derived(
		strokes.flatMap((stroke, index) => {
			const glow = glowOf(stroke.spot);
			if (glow <= 0) return [];
			const fadeStart = stroke.before >= 0 && glowOf(stroke.before) < glow;
			const fadeEnd = stroke.after >= 0 && glowOf(stroke.after) < glow;
			const flicker = props.time === undefined ? 1 : 0.85 + 0.15 * noise(props.time, stroke.spot, 3);
			const zap = props.time === undefined || glow >= 1 ? 0 : 1 - glow;
			return [{ stroke, index, glow, fadeStart, fadeEnd, flicker, zap }];
		}),
	);

	// A lit part's colour fading out at the ends that meet a dimmer part: a gradient down it, in
	// cells (the lit parts are drawn in cells and scaled up, so one does for any size), made once.
	const fades = new Map<string, FillGradient>();
	onDestroy(() => fades.forEach((gradient) => gradient.destroy()));
	const fadeFill = (
		stroke: BrushStroke,
		index: number,
		ends: { fadeStart: boolean; fadeEnd: boolean },
		color: number,
		alpha: number,
	) => {
		if (!ends.fadeStart && !ends.fadeEnd) return { color, alpha };
		const key = `${props.rune} ${index} ${ends.fadeStart} ${ends.fadeEnd} ${color}`;
		if (!fades.has(key)) {
			const first = stroke.points[0];
			const last = stroke.points[stroke.points.length - 1];
			const length = Math.hypot(last.x - first.x, last.y - first.y);
			const fade = Math.min(FADE / length, ends.fadeStart && ends.fadeEnd ? 0.45 : 0.9);
			const clear = [((color >> 16) & 0xff) / 255, ((color >> 8) & 0xff) / 255, (color & 0xff) / 255, 0];
			fades.set(
				key,
				new FillGradient({
					type: 'linear',
					start: { x: first.x, y: first.y },
					end: { x: last.x, y: last.y },
					colorStops: [
						...(ends.fadeStart
							? [
									{ offset: 0, color: clear },
									{ offset: fade, color },
								]
							: [{ offset: 0, color }]),
						...(ends.fadeEnd
							? [
									{ offset: 1 - fade, color },
									{ offset: 1, color: clear },
								]
							: [{ offset: 1, color }]),
					],
					textureSpace: 'global',
				}),
			);
		}
		return { fill: fades.get(key)!, alpha };
	};
	const offset = $derived(props.offset ?? NO_OFFSET);
	const crackle = (stroke: BrushStroke, index: number, zap: number, salt = 0) =>
		props.time === undefined
			? undefined
			: zigzag(stroke, props.time, index * 10 + salt, CRACKLE + ZAP * zap);
</script>

<Container x={props.x ?? 0} y={props.y ?? 0} alpha={props.alpha ?? 1}>
	{#if props.grid}
		<Graphics
			draw={(graphics) => {
				for (let i = 0; i <= 5; i++) {
					graphics.moveTo(i * cell, 0).lineTo(i * cell, props.size);
					graphics.moveTo(0, i * cell).lineTo(props.size, i * cell);
				}
				graphics.stroke({ width: cell * GRID_WIDTH, color: GRID });
			}}
		/>
	{/if}

	<!-- the rune, where it lies -->
	<Container x={offset.reel * cell} y={offset.row * cell}>
		{#if props.spots !== false}
			<Graphics
				draw={(graphics) => {
					RUNES[props.rune].spots.forEach(([reel, row], spot) => {
						const inset = cell * SPOT_INSET;
						graphics
							.roundRect(
								reel * cell + inset,
								row * cell + inset,
								cell - inset * 2,
								cell - inset * 2,
								cell * SPOT_RADIUS,
							)
							.fill({ color: mix(SPOT, SPOT_LIT, glowOf(spot)), alpha: SPOT_ALPHA });
					});
				}}
			/>
		{/if}

		<!-- all of it unlit, each stroke lighter down its middle -->
		<Graphics
			draw={(graphics) => {
				const old = lineGradients;
				lineGradients = strokes.map((stroke) => {
					const middle = stroke.points[Math.floor(stroke.points.length / 2)];
					const across = LINE_WIDTH * LINE_GRADIENT_REACH;
					return new FillGradient({
						type: 'linear',
						start: {
							x: (middle.x - middle.nx * across) * cell,
							y: (middle.y - middle.ny * across) * cell,
						},
						end: {
							x: (middle.x + middle.nx * across) * cell,
							y: (middle.y + middle.ny * across) * cell,
						},
						colorStops: [
							{ offset: 0, color: LINE_EDGE },
							{ offset: 0.5, color: LINE_MIDDLE },
							{ offset: 1, color: LINE_EDGE },
						],
						textureSpace: 'global',
					});
				});
				strokes.forEach((stroke, i) => {
					graphics
						.poly(outline(stroke, LINE_WIDTH, cell))
						.fill({ fill: lineGradients[i], alpha: LINE_ALPHA });
				});
				old.forEach((gradient) => gradient.destroy());
			}}
		/>

		<!-- the lit parts' neon glow, blurred, then the lines and their cores over it, in cells -->
		<Container filters={[blur]}>
			<Graphics
				scale={cell}
				draw={(graphics) => {
					for (const { stroke, index, glow, flicker, zap, ...ends } of lit) {
						graphics
							.poly(outline(stroke, GLOW_WIDTH, 1, crackle(stroke, index, zap)))
							.fill(fadeFill(stroke, index, ends, GLOW, GLOW_ALPHA * glow * flicker));
					}
				}}
			/>
		</Container>
		<Graphics
			scale={cell}
			draw={(graphics) => {
				for (const { stroke, index, glow, flicker, zap, ...ends } of lit) {
					const shift = crackle(stroke, index, zap);
					graphics
						.poly(outline(stroke, LINE_WIDTH, 1, shift))
						.fill(fadeFill(stroke, index, ends, NEON, glow * flicker));
					graphics
						.poly(outline(stroke, CORE_WIDTH, 1, shift))
						.fill(fadeFill(stroke, index, ends, CORE, glow * flicker));
					// as it lights up, bolts of lightning flash along it
					if (zap > 0) {
						for (const salt of [1, 2]) {
							graphics
								.poly(outline(stroke, BOLT_WIDTH, 1, crackle(stroke, index, zap * 1.6, salt)))
								.fill({ color: CORE, alpha: zap });
						}
					}
				}
			}}
		/>
	</Container>
</Container>
