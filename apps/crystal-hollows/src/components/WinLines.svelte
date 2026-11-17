<script lang="ts" module>
	import type { BookEventOfType } from '../game/typesBookEvent';

	export type WinLineWin = BookEventOfType<'winInfo'>['wins'][number];

	export type EmitterEventWinLines =
		| { type: 'winLineShow'; win: WinLineWin }
		| { type: 'winLineHide' };
</script>

<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Graphics } from 'pixi-svelte';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { REEL_WIDTH, SYMBOL_SIZE } from '../game/constants';
	import { getSymbolX, getSymbolY } from '../game/utils';
	import { LOGO_TEXT_COLORS } from '../game/textStyles';
	import { hurryScale } from '../game/winsHurry.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import LogoText from './LogoText.svelte';

	// A line win's connection (the user, 2026-11-16: "when u get a connection make a line go through to
	// show the lines and display the win with simple letters on top of the line"), drawn over its winning
	// symbols only, a little past the first and last ("not go end to end"), as a blue brush stroke ("add
	// some texture to it make it look like handrawn"): it wobbles, rounds its corners, swells and thins
	// and lifts off at its end, with lighter and darker bristle streaks in it that break up here and there,
	// and a hairline darker edge so it reads over the symbols. Then "make the line thinner and less
	// cartoony": half as thick, no black outline (a deep blue hairline), a softer blue, a gentler hand and
	// faint streaks. It sweeps in from the left, with what it won in plain letters on it, in the middle of
	// its winning symbols, and is up while those symbols play their win, one line after another
	// (bookEventHandlerMap's winInfo). Each one is drawn anew, so no two are quite alike. Its win is in the game's rock lettering, in gold, since every text over the game is
	// (LogoText; 2026-11-16).

	const LINE = {
		// in board units (a reel is REEL_WIDTH wide)
		width: 7,
		edge: 0.9,
		colour: 0x4f9de6,
		edgeColour: 0x1b3a6e,
		// how much thinner it starts (pressed on) and ends (lifted off)
		press: 0.8,
		lift: 0.55,
		// how far it goes past the first and last winning symbols' middles, of a reel
		overhang: 0.3,
		// corner rounding (Chaikin's cut, twice) and how far apart its points are
		cornerCut: 0.22,
		step: 4,
		// the hand's wobble across the line, and its width's swell (of the width)
		wobble: 1.4,
		swell: 0.15,
		strands: [
			{ offset: -0.2, width: 1.1, colour: 0xc4e4ff, alpha: 0.45, gaps: -0.2 },
			{ offset: 0.24, width: 1.1, colour: 0x2c62ad, alpha: 0.4, gaps: -0.3 },
		],
		sweepMs: 340,
		fontSize: SYMBOL_SIZE * 0.34,
	};

	type Point = { x: number; y: number };
	type Strand = { points: Point[]; on: boolean[]; width: number; colour: number; alpha: number };
	type Stroke = { points: Point[]; widths: number[]; strands: Strand[] };

	const context = getContext();

	let shown = $state.raw<{ stroke: Stroke; label: Point; amount: string }>();
	const sweep = new Tween(0, { duration: LINE.sweepMs, easing: cubicOut });

	const random = (min: number, max: number) => min + Math.random() * (max - min);
	const lerp = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
	const smoothstep = (from: number, to: number, x: number) => {
		const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
		return t * t * (3 - 2 * t);
	};

	// smooth noise along the line, about -1 to 1: a few sine waves of random phase, of wavelengths (board
	// units) about those given, longest the strongest
	const noise = (wavelengths: number[]) => {
		const waves = wavelengths.map((wavelength, i) => ({
			frequency: (Math.PI * 2) / (wavelength * random(0.8, 1.25)),
			phase: random(0, Math.PI * 2),
			amplitude: 1 / (i + 1.5),
		}));
		const sum = waves.reduce((total, wave) => total + wave.amplitude, 0);
		return (s: number) =>
			waves.reduce((total, wave) => total + wave.amplitude * Math.sin(s * wave.frequency + wave.phase), 0) / sum;
	};

	const chaikin = (points: Point[], cut: number) => [
		points[0],
		...points.slice(0, -1).flatMap((a, i) => [lerp(a, points[i + 1], cut), lerp(a, points[i + 1], 1 - cut)]),
		points[points.length - 1],
	];

	// the polyline as evenly spaced points, with how far along each is
	const resample = (points: Point[], step: number) => {
		const lengths = points.slice(1).map((b, i) => Math.hypot(b.x - points[i].x, b.y - points[i].y));
		const total = lengths.reduce((sum, length) => sum + length, 0);
		const count = Math.max(2, Math.ceil(total / step) + 1);
		const out: { point: Point; s: number }[] = [];
		let segment = 0;
		let start = 0;
		for (let k = 0; k < count; k++) {
			const s = (total * k) / (count - 1);
			while (segment < lengths.length - 1 && s > start + lengths[segment]) start += lengths[segment++];
			const t = lengths[segment] ? (s - start) / lengths[segment] : 0;
			out.push({ point: lerp(points[segment], points[segment + 1], Math.min(1, t)), s });
		}
		return { samples: out, total };
	};

	const brushStroke = (centres: Point[]): Stroke => {
		// past the first and last winning symbols' middles, along the line
		const away = (from: Point, to: Point) => {
			const length = Math.hypot(from.x - to.x, from.y - to.y) || 1;
			const reach = LINE.overhang * REEL_WIDTH;
			return { x: from.x + ((from.x - to.x) / length) * reach, y: from.y + ((from.y - to.y) / length) * reach };
		};
		const n = centres.length;
		const path = [away(centres[0], centres[1]), ...centres, away(centres[n - 1], centres[n - 2])];
		const { samples, total } = resample(chaikin(chaikin(path, LINE.cornerCut), LINE.cornerCut), LINE.step);

		const wobble = noise([220, 80, 26]);
		const swell = noise([140, 45]);
		const normals = samples.map((_, i) => {
			const a = samples[Math.max(0, i - 1)].point;
			const b = samples[Math.min(samples.length - 1, i + 1)].point;
			const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
			return { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
		});
		const points = samples.map(({ point, s }, i) => ({
			x: point.x + normals[i].x * LINE.wobble * wobble(s),
			y: point.y + normals[i].y * LINE.wobble * wobble(s),
		}));
		// pressed on at the start (a touch of a blob), lifted off thinner at the end
		const widths = samples.map(({ s }) => {
			const t = s / total;
			const press = LINE.press + (1 - LINE.press) * smoothstep(0, 0.05, t);
			const lift = 1 - (1 - LINE.lift) * smoothstep(0.84, 1, t);
			return LINE.width * press * lift * (1 + LINE.swell * swell(s));
		});
		const strands = LINE.strands.map((strand) => {
			const breaks = noise([55, 19, 8]);
			return {
				points: points.map((point, i) => ({
					x: point.x + normals[i].x * strand.offset * widths[i],
					y: point.y + normals[i].y * strand.offset * widths[i],
				})),
				// broken where the brush ran dry, and none where the line is thin
				on: samples.map(({ s }, i) => breaks(s) > strand.gaps && widths[i] > LINE.width * 0.6),
				width: strand.width,
				colour: strand.colour,
				alpha: strand.alpha,
			};
		});
		return { points, widths, strands };
	};

	// where on the line (through the winning symbols' middles) a given x is
	const yAt = (points: Point[], x: number) => {
		for (let i = 1; i < points.length; i++) {
			const a = points[i - 1];
			const b = points[i];
			if (x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
		}
		return points[points.length - 1].y;
	};

	const show = (win: WinLineWin) => {
		// the winning symbols' middles, left to right (the books' rows count the padding symbol above the
		// board, so less one)
		const centres = [...win.positions]
			.sort((a, b) => a.reel - b.reel)
			.map((position) => ({ x: getSymbolX(position.reel), y: getSymbolY(position.row - 1) }));
		if (centres.length < 2) return;
		const x = (centres[0].x + centres[centres.length - 1].x) / 2;
		shown = {
			stroke: brushStroke(centres),
			label: { x, y: yAt(centres, x) },
			amount: bookEventAmountToCurrencyString(win.win),
		};
		sweep.set(0, { duration: 0 });
		// (quicker once the wins are hurried: winsHurry)
		sweep.set(1, { duration: LINE.sweepMs / hurryScale() });
	};

	context.eventEmitter.subscribeOnMount({
		winLineShow: ({ win }) => show(win),
		winLineHide: () => (shown = undefined),
	});

	const draw = (graphics: PIXI.Graphics) => {
		if (!shown) return;
		const { points, widths, strands } = shown.stroke;
		// as far as the sweep has got
		const count = Math.round(sweep.current * (points.length - 1)) + 1;
		if (count < 2) return;
		// the edge, then the blue over it: short pieces, each its own width, round ends joining them
		for (const [extra, color] of [
			[LINE.edge * 2, LINE.edgeColour],
			[0, LINE.colour],
		]) {
			for (let i = 1; i < count; i++) {
				graphics
					.moveTo(points[i - 1].x, points[i - 1].y)
					.lineTo(points[i].x, points[i].y)
					.stroke({ width: (widths[i - 1] + widths[i]) / 2 + extra, color, cap: 'round' });
			}
		}
		// the bristle streaks, in runs
		for (const strand of strands) {
			let drawn = false;
			let running = false;
			for (let i = 0; i < count; i++) {
				const point = strand.points[i];
				if (!strand.on[i]) running = false;
				else if (running) {
					graphics.lineTo(point.x, point.y);
					drawn = true;
				} else {
					graphics.moveTo(point.x, point.y);
					running = true;
				}
			}
			if (drawn) {
				graphics.stroke({
					width: strand.width,
					color: strand.colour,
					alpha: strand.alpha,
					cap: 'round',
					join: 'round',
				});
			}
		}
	};
</script>

{#if shown}
	<BoardContainer>
		<Graphics {draw} />
		<LogoText
			x={shown.label.x}
			y={shown.label.y}
			alpha={sweep.current}
			text={shown.amount}
			fontSize={LINE.fontSize}
			maxWidth={REEL_WIDTH * 3}
			colors={LOGO_TEXT_COLORS.gold}
			look="logo"
		/>
	</BoardContainer>
{/if}
