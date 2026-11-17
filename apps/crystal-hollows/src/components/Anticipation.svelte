<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { Container, Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import type { Reel } from '../game/stateGame.svelte';
	import { REEL_WIDTH } from '../game/constants';
	import { boardNudgeY } from '../game/boardNudge.svelte';
	import { ANTICIPATION_BEAT_MS, beatOf, stateAnticipation, throb } from '../game/anticipation.svelte';

	// A reel that could still give the free spins, waiting empty before its symbols drop (the user,
	// 2026-11-17: "rework the reel anticipation"; it was a flat, faint white column): its column fills
	// with the free spins rock's pink light rising from below, throbbing with the anticipation sound's
	// beat (anticipation.svelte), its sides glowing like crystal veins; a band of light rises up it every
	// other beat, sparks drift up it, and on each beat grit shaken loose from the roof falls down it. The
	// light is added to what is under it (blend 'add', so its dark parts are clear). It fades in, fades
	// out as the reel's symbols drop in, and goes once they have landed.

	type Props = {
		reel: Reel;
		oncomplete: () => void;
	};

	const props: Props = $props();
	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());

	const LOOK = {
		// the free spins rock's pink, and a pale core for the brightest parts
		colour: 0xff3fa8,
		core: 0xffc2ea,
		// the column's light, and its veins (`width` of the column each): alpha at rest, and more at a beat
		glow: { rest: 0.45, beat: 0.45 },
		veins: { width: 0.1, rest: 0.5, beat: 0.5 },
		// the rising band: its height (of the column's), rising once every `beats` beats
		band: { height: 0.45, beats: 2, alpha: 0.5 },
		// sparks drifting up: how many at once, their radius (units) and life (s)
		sparks: { count: 16, size: [2, 4.5], life: [0.9, 1.5] },
		// grit falling on each beat: how many specks, their size (units), gravity (units/s²), colours
		grit: { perBeat: 5, size: [1.5, 3.2], gravity: 1100, colours: [0x2a2540, 0x6e6890, 0xa49ec4] },
		// seconds to fade in, and out once the symbols start dropping
		fadeIn: 0.35,
		fadeOut: 0.25,
	};

	// the column, in the main layout's units (placed outside the board, at its scale; nudged with it as
	// a spin starts)
	const column = $derived({
		x: board.x + (props.reel.reelIndex * REEL_WIDTH - board.width * 0.5) * board.scale,
		y: board.y - board.height * 0.5 * board.scale + boardNudgeY(),
		width: REEL_WIDTH * board.scale,
		height: board.height * board.scale,
	});

	// a straight gradient from (x0, y0) to (x1, y1) in the column's own units (a Graphics fill's 'local'
	// space didn't take here: the shapes came out in their last colour)
	const gradient = (x0: number, y0: number, x1: number, y1: number, stops: [number, number][]) =>
		new PIXI.FillGradient({
			type: 'linear',
			start: { x: x0, y: y0 },
			end: { x: x1, y: y1 },
			textureSpace: 'global',
			colorStops: stops.map(([offset, color]) => ({ offset, color })),
		});
	// (black adds nothing: the clear end of each)
	// (from the board's size alone, so they aren't made anew as the column moves with the board's nudge)
	const fills = $derived.by(() => {
		const width = REEL_WIDTH * board.scale;
		const height = board.height * board.scale;
		const vein = width * LOOK.veins.width;
		const band = height * LOOK.band.height;
		return {
			rising: gradient(0, 0, 0, height, [
				[0, 0x000000],
				[0.45, 0x2a0620],
				[0.8, 0xb02a78],
				[1, LOOK.colour],
			]),
			veinLeft: gradient(0, 0, vein, 0, [
				[0, LOOK.core],
				[0.35, LOOK.colour],
				[1, 0x000000],
			]),
			veinRight: gradient(width - vein, 0, width, 0, [
				[0, 0x000000],
				[0.65, LOOK.colour],
				[1, LOOK.core],
			]),
			band: gradient(0, 0, 0, band, [
				[0, 0x000000],
				[0.5, LOOK.colour],
				[1, 0x000000],
			]),
		};
	});

	type Spark = { x: number; y: number; age: number; life: number; size: number; wobble: number; rate: number; core: boolean };
	type Speck = { x: number; y: number; vx: number; vy: number; size: number; colour: number };
	let sparks: Spark[] = [];
	let specks: Speck[] = [];
	let lastBeat = -1;
	let age = 0;
	let fadingSince: number | undefined;

	// what the frame shows (set each frame)
	let frame = $state({ intensity: 0, beat: 0, band: 0, count: 0 });

	const rr = (a: number, b: number) => a + (b - a) * Math.random();
	const newSpark = (fresh: boolean): Spark => ({
		x: rr(0.12, 0.88),
		// (the first ones are anywhere up the column, so it doesn't start empty)
		y: fresh ? rr(0.1, 1) : 1.02,
		age: 0,
		life: rr(LOOK.sparks.life[0], LOOK.sparks.life[1]),
		size: rr(LOOK.sparks.size[0], LOOK.sparks.size[1]),
		wobble: rr(2, 6),
		rate: rr(1.5, 3.5),
		core: Math.random() < 0.4,
	});

	const tick = (dt: number) => {
		age += dt;
		const motion = props.reel.reelState.motion;
		if (fadingSince === undefined && (motion === 'fallingIn' || motion === 'stopped')) fadingSince = age;
		const fadeIn = Math.min(1, age / LOOK.fadeIn);
		const fadeOut = fadingSince === undefined ? 1 : Math.max(0, 1 - (age - fadingSince) / LOOK.fadeOut);
		const intensity = fadeIn * fadeIn * (3 - 2 * fadeIn) * fadeOut;
		const time = stateAnticipation.time;

		// sparks: rising, a new one for each that has gone
		if (!sparks.length) sparks = Array.from({ length: LOOK.sparks.count }, () => newSpark(true));
		sparks = sparks.map((spark) => {
			const aged = { ...spark, age: spark.age + dt, y: spark.y - (dt / spark.life) * 1.05 };
			return aged.age >= aged.life || aged.y < -0.02 ? newSpark(false) : aged;
		});

		// grit: on each beat a few specks shaken loose at the top, falling
		const beat = beatOf(time);
		if (beat !== lastBeat && fadingSince === undefined) {
			lastBeat = beat;
			for (let k = 0; k < LOOK.grit.perBeat; k++) {
				specks.push({
					x: rr(0.08, 0.92) * column.width,
					y: rr(-4, 4),
					vx: rr(-15, 15),
					vy: rr(0, 60),
					size: rr(LOOK.grit.size[0], LOOK.grit.size[1]),
					colour: LOOK.grit.colours[Math.floor(Math.random() * LOOK.grit.colours.length)],
				});
			}
		}
		specks = specks
			.map((speck) => ({
				...speck,
				x: speck.x + speck.vx * dt,
				y: speck.y + speck.vy * dt,
				vy: speck.vy + LOOK.grit.gravity * dt,
			}))
			.filter((speck) => speck.y < column.height);

		const bandBeats = (time * 1000) / (ANTICIPATION_BEAT_MS * LOOK.band.beats);
		frame = { intensity, beat: throb(time), band: bandBeats - Math.floor(bandBeats), count: frame.count + 1 };
	};

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const step = () => tick(Math.min(0.05, ticker.deltaMS / 1000));
		ticker.add(step);
		return () => ticker.remove(step);
	});

	$effect(() => {
		if (props.reel.reelState.motion === 'stopped') props.oncomplete();
	});

	const drawGlow = (graphics: PIXI.Graphics) => {
		graphics.rect(0, 0, column.width, column.height).fill(fills.rising);
	};
	const drawVeins = (graphics: PIXI.Graphics) => {
		const width = column.width * LOOK.veins.width;
		graphics.rect(0, 0, width, column.height).fill(fills.veinLeft);
		graphics.rect(column.width - width, 0, width, column.height).fill(fills.veinRight);
	};
	const drawBand = (graphics: PIXI.Graphics) => {
		graphics.rect(0, 0, column.width, column.height * LOOK.band.height).fill(fills.band);
	};
	const drawMask = (graphics: PIXI.Graphics) => {
		graphics.rect(0, 0, column.width, column.height).fill(0xffffff);
	};
	const drawSparks = (graphics: PIXI.Graphics) => {
		if (!frame.count) return;
		for (const spark of sparks) {
			const life = spark.age / spark.life;
			const alpha = Math.sin(Math.PI * Math.min(1, life)) * frame.intensity;
			if (alpha <= 0.01) continue;
			const x = spark.x * column.width + spark.wobble * Math.sin(spark.rate * 2 * Math.PI * spark.age);
			graphics
				.circle(x, spark.y * column.height, spark.size)
				.fill({ color: spark.core ? LOOK.core : LOOK.colour, alpha });
		}
	};
	const drawGrit = (graphics: PIXI.Graphics) => {
		if (!frame.count) return;
		for (const speck of specks) {
			graphics.circle(speck.x, speck.y, speck.size).fill({ color: speck.colour, alpha: frame.intensity });
		}
	};

	// the band's top, from just below the column to just above it
	const bandY = $derived(
		column.height * (1 - frame.band * (1 + LOOK.band.height)),
	);
</script>

<Container x={column.x} y={column.y}>
	<Graphics
		draw={drawGlow}
		blendMode="add"
		alpha={frame.intensity * (LOOK.glow.rest + LOOK.glow.beat * frame.beat)}
	/>
	<Container>
		<Graphics draw={drawMask} isMask />
		<Container y={bandY}>
			<Graphics draw={drawBand} blendMode="add" alpha={frame.intensity * LOOK.band.alpha} />
		</Container>
	</Container>
	<Graphics
		draw={drawVeins}
		blendMode="add"
		alpha={frame.intensity * (LOOK.veins.rest + LOOK.veins.beat * frame.beat)}
	/>
	<Graphics draw={drawSparks} blendMode="add" />
	<Graphics draw={drawGrit} />
</Container>
