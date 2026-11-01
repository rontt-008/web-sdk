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
			bends.push(
				bends[bends.length - 1] + 2 + Math.floor(noise(seed, salt, bends.length + 50) * 4),
			);
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
			right.push(
				(x - p.nx * half * (1 + p.right)) * cell,
				(y - p.ny * half * (1 + p.right)) * cell,
			);
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
		const rightBack = right.flatMap((_, j) =>
			j % 2 ? [] : [right[right.length - 2 - j], right[right.length - 1 - j]],
		);
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
	import { AlphaFilter, BlurFilter, FillGradient } from 'pixi.js';
	import { Container, Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { IDLE_FRAME_RATE, idleFrame } from '../game/idleClock.svelte';
	import {
		NO_OFFSET,
		RUNES,
		RUNE_COLOURS,
		joinBrushStrokes,
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
		// unlit, its ember breathes and sparks run along its lines (the rune on the board; the boxes'
		// keep still)
		idle?: boolean;
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

	// in the rune's own colours (RUNE_COLOURS): unlit carved in (the user found the old dull, pale
	// lines didn't look good), a groove the brush's width in a dark shade of its colour, a lip of
	// warm light along its lower edge (LIP: how far down and right of the groove, in cells, its
	// colour the frame's wood, see-through) as on a cut, and down its middle a dim ember of its
	// colour (EMBER_WIDTH), waiting to be lit; lit a vivid neon with a near white core
	const colours = $derived(RUNE_COLOURS[props.rune]);
	const LIP = { offset: 0.028, colour: 0xe2b27c, alpha: 0.4 };
	const EMBER_WIDTH = 0.06;

	// Idle (props.idle), unlit, it stirs as if waiting to catch, by the shared idle clock: the ember
	// breathes, turning BREATH of the way to its neon and back every BREATH_PERIOD s; and a spark, a
	// bright dot with a fading tail (SPARK: its radius and its tail's dots and their spacing, in
	// cells), runs along each line at SPARK_SPEED cells a second, a line's every SPARK_EVERY s, the
	// lines SPARK_STAGGER s apart.
	const BREATH = 0.45;
	const BREATH_PERIOD = 3.2;
	const SPARK = { radius: 0.045, tail: 7, spacing: 0.05 };
	const SPARK_SPEED = 2.5;
	const SPARK_EVERY = 4;
	const SPARK_STAGGER = 1.3;
	const seconds = $derived(props.idle ? idleFrame() / IDLE_FRAME_RATE : 0);
	const breath = $derived(
		props.idle ? (1 - Math.cos((2 * Math.PI * seconds) / BREATH_PERIOD)) / 2 : 0,
	);
	// a point along a line, `along` cells from its start
	const pointAlong = (stroke: BrushStroke, along: number) => {
		let left = along;
		for (let i = 1; i < stroke.points.length; i++) {
			const [a, b] = [stroke.points[i - 1], stroke.points[i]];
			const length = Math.hypot(b.x - a.x, b.y - a.y);
			if (left <= length)
				return { x: a.x + ((b.x - a.x) * left) / length, y: a.y + ((b.y - a.y) * left) / length };
			left -= length;
		}
		return stroke.points[stroke.points.length - 1];
	};
	const lengthOf = (stroke: BrushStroke) =>
		stroke.points.reduce(
			(sum, p, i) =>
				i ? sum + Math.hypot(p.x - stroke.points[i - 1].x, p.y - stroke.points[i - 1].y) : 0,
			0,
		);
	const GLOW_ALPHA = 0.6;
	const SPOT_ALPHA = 0.85;
	const GRID = 0x4a4950;

	const strokes = $derived(runeBrushStrokes(props.rune));
	// unlit, each straight line in one piece, so it has no seams where it crosses from spot to spot
	const lines = $derived(joinBrushStrokes(strokes).map(({ stroke }) => stroke));
	// each line's spark now (idle): how far along it its head is, while it runs
	const sparks = $derived(
		props.idle
			? lines.flatMap((stroke, i) => {
					const length = lengthOf(stroke);
					const along = ((seconds + i * SPARK_STAGGER) % SPARK_EVERY) * SPARK_SPEED;
					return along <= length + SPARK.tail * SPARK.spacing ? [{ stroke, along, length }] : [];
				})
			: [],
	);
	// the lips see-through all together, so they don't show lighter where they overlap
	const lipAlpha = new AlphaFilter({ alpha: LIP.alpha, resolution: 'inherit' });
	const cell = $derived(props.size / 5);
	const glowOf = (spot: number) => Math.max(props.glows[spot] ?? 0, props.flash ?? 0);

	// the glow blurred as much on any screen: the filter's strength is in screen pixels
	const blur = new BlurFilter({ strength: 8, quality: 3, resolution: 'inherit' });
	$effect(() => {
		blur.strength = cell * GLOW_BLUR * context.stateLayoutDerived.mainLayout().scale;
	});

	// lit strokes, the parts of a line lit as much as each other in one piece (no seams between
	// them), with how lit, which of their ends meet a dimmer part (they fade out there), and with a
	// time how much they flicker (0.85 to 1) and how far into the zap a spot lighting up is (1 just
	// hit, 0 lit); `index` is their first part's and `key` all of theirs
	const lit = $derived(
		joinBrushStrokes(strokes, (a, b) => glowOf(a.spot) === glowOf(b.spot)).flatMap(
			({ stroke, parts }) => {
				const glow = glowOf(stroke.spot);
				if (glow <= 0) return [];
				const fadeStart = stroke.before >= 0 && glowOf(stroke.before) < glow;
				const fadeEnd = stroke.after >= 0 && glowOf(stroke.after) < glow;
				const flicker =
					props.time === undefined ? 1 : 0.85 + 0.15 * noise(props.time, stroke.spot, 3);
				const zap = props.time === undefined || glow >= 1 ? 0 : 1 - glow;
				const [index, key] = [parts[0], parts.join('-')];
				return [{ stroke, index, key, glow, fadeStart, fadeEnd, flicker, zap }];
			},
		),
	);

	// A lit part's colour fading out at the ends that meet a dimmer part: a gradient down it, in
	// cells (the lit parts are drawn in cells and scaled up, so one does for any size), made once.
	const fades = new Map<string, FillGradient>();
	onDestroy(() => fades.forEach((gradient) => gradient.destroy()));
	const fadeFill = (
		stroke: BrushStroke,
		parts: string,
		ends: { fadeStart: boolean; fadeEnd: boolean },
		color: number,
		alpha: number,
	) => {
		if (!ends.fadeStart && !ends.fadeEnd) return { color, alpha };
		const key = `${props.rune} ${parts} ${ends.fadeStart} ${ends.fadeEnd} ${color}`;
		if (!fades.has(key)) {
			const first = stroke.points[0];
			const last = stroke.points[stroke.points.length - 1];
			const length = Math.hypot(last.x - first.x, last.y - first.y);
			const fade = Math.min(FADE / length, ends.fadeStart && ends.fadeEnd ? 0.45 : 0.9);
			const clear = [
				((color >> 16) & 0xff) / 255,
				((color >> 8) & 0xff) / 255,
				(color & 0xff) / 255,
				0,
			];
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
							.fill({ color: mix(colours.spot, colours.spotLit, glowOf(spot)), alpha: SPOT_ALPHA });
					});
				}}
			/>
		{/if}

		<!-- all of it unlit, carved in: the lips, then the grooves over them and the embers in them,
		each all at once, so lines crossing look cut through each other -->
		<Container filters={[lipAlpha]}>
			<Graphics
				x={cell * LIP.offset}
				y={cell * LIP.offset}
				draw={(graphics) => {
					for (const stroke of lines) {
						graphics.poly(outline(stroke, LINE_WIDTH, cell)).fill({ color: LIP.colour });
					}
				}}
			/>
		</Container>
		<Graphics
			draw={(graphics) => {
				for (const stroke of lines) {
					graphics.poly(outline(stroke, LINE_WIDTH, cell)).fill({ color: colours.groove });
				}
			}}
		/>
		<Graphics
			draw={(graphics) => {
				const ember = mix(colours.ember, colours.neon, BREATH * breath);
				for (const stroke of lines) {
					graphics.poly(outline(stroke, EMBER_WIDTH, cell)).fill({ color: ember });
				}
			}}
		/>
		<!-- the sparks running along it, idle: a bright head and a tail fading behind it, in cells -->
		{#if sparks.length}
			<Graphics
				scale={cell}
				draw={(graphics) => {
					for (const { stroke, along, length } of sparks) {
						for (let k = 0; k < SPARK.tail; k++) {
							const at = along - k * SPARK.spacing;
							if (at < 0 || at > length) continue;
							const { x, y } = pointAlong(stroke, at);
							const fade = 1 - k / SPARK.tail;
							graphics
								.circle(x, y, SPARK.radius * (0.4 + 0.6 * fade))
								.fill({ color: k === 0 ? colours.core : colours.neon, alpha: fade });
						}
					}
				}}
			/>
		{/if}

		<!-- the lit parts' neon glow, blurred, then the lines and their cores over it, in cells -->
		<Container filters={[blur]}>
			<Graphics
				scale={cell}
				draw={(graphics) => {
					for (const { stroke, index, key, glow, flicker, zap, ...ends } of lit) {
						graphics
							.poly(outline(stroke, GLOW_WIDTH, 1, crackle(stroke, index, zap)))
							.fill(fadeFill(stroke, key, ends, colours.glow, GLOW_ALPHA * glow * flicker));
					}
				}}
			/>
		</Container>
		<Graphics
			scale={cell}
			draw={(graphics) => {
				for (const { stroke, index, key, glow, flicker, zap, ...ends } of lit) {
					const shift = crackle(stroke, index, zap);
					graphics
						.poly(outline(stroke, LINE_WIDTH, 1, shift))
						.fill(fadeFill(stroke, key, ends, colours.neon, glow * flicker));
					graphics
						.poly(outline(stroke, CORE_WIDTH, 1, shift))
						.fill(fadeFill(stroke, key, ends, colours.core, glow * flicker));
					// as it lights up, bolts of lightning flash along it
					if (zap > 0) {
						for (const salt of [1, 2]) {
							graphics
								.poly(outline(stroke, BOLT_WIDTH, 1, crackle(stroke, index, zap * 1.6, salt)))
								.fill({ color: colours.core, alpha: zap });
						}
					}
				}
			}}
		/>
	</Container>
</Container>
