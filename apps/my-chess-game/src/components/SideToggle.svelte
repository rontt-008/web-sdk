<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { Graphics, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { setYourColour } from '../game/stateGame.svelte';
	import { sidePanelLayout } from '../game/sideLayout';

	// The toggle of the colour your pieces are drawn in, from the user's design: a starry night-blue pill
	// with a gold rim, a knob that slides from the white king (left) to the black king (right), the
	// king you play bright and the other faded. The maths is the same either way (you always move
	// first): it only changes the pictures, as the rules say.
	const context = getContext();
	const layout = $derived(sidePanelLayout());
	const isBlack = $derived(context.stateGame.yourColour === 'black');

	// the design's sizes, in the board's units
	const PILL = { width: 148, height: 70, pad: 6, radius: 35, border: 2 };
	const KNOB = { width: 68, height: 58, inset: 4, radius: 29, border: 1.5 };
	const KNOB_TRAVEL = PILL.width - KNOB.inset * 2 - KNOB.width;
	const STARS = [
		{ x: 0.22, y: 0.3, r: 1, alpha: 0.8 },
		{ x: 0.7, y: 0.72, r: 1, alpha: 0.6 },
		{ x: 0.48, y: 0.2, r: 1.5, alpha: 0.5 },
		{ x: 0.86, y: 0.34, r: 1, alpha: 0.7 },
		{ x: 0.12, y: 0.76, r: 1, alpha: 0.5 },
	];
	const COLOURS = {
		gold: 0xc9a352,
		goldLight: 0xd9b866,
		ring: 0x1d2230,
		ivory: 0xf6eedb,
		ink: 0x151a26,
	};
	const KING = '♚';
	const kingFont = "'Segoe UI Symbol', 'Apple Symbols', 'DejaVu Sans', serif";

	// the knob slides over with a little overshoot, as the design's easing does
	const knobX = new Tween(isBlack ? KNOB_TRAVEL : 0, { duration: 400, easing: backOut });
	const whiteFade = new Tween(isBlack ? 0.45 : 1, { duration: 300 });
	const blackFade = new Tween(isBlack ? 1 : 0.45, { duration: 300 });
	$effect(() => {
		knobX.set(isBlack ? KNOB_TRAVEL : 0);
		whiteFade.set(isBlack ? 0.45 : 1);
		blackFade.set(isBlack ? 1 : 0.45);
	});
	// the king you play at full size, the other a little smaller
	const scaleOf = (fade: number) => 0.85 + (fade - 0.45) / (1 - 0.45) * 0.15;

	const gradient = (from: string, to: string) =>
		new PIXI.FillGradient({
			type: 'linear',
			start: { x: 0, y: 0 },
			end: { x: 0, y: 1 },
			colorStops: [
				{ offset: 0, color: from },
				{ offset: 1, color: to },
			],
			textureSpace: 'local',
		});

	const drawPill = (graphics: PIXI.Graphics) => {
		const { width, height, radius, border } = PILL;
		// the soft shadow under it, then the two outer rings (dark, then faint gold), then the pill
		graphics.roundRect(0, 6, width, height, radius).fill({ color: 0x000000, alpha: 0.35 });
		graphics.roundRect(-4, -4, width + 8, height + 8, radius + 4).stroke({ color: COLOURS.gold, width: 1, alpha: 0.45 });
		graphics.roundRect(-3, -3, width + 6, height + 6, radius + 3).stroke({ color: COLOURS.ring, width: 3 });
		graphics.roundRect(0, 0, width, height, radius).fill(gradient('#0e1834', '#16244a'));
		graphics.roundRect(0, 0, width, height, radius).stroke({ color: COLOURS.gold, width: border });
		// the stars
		for (const star of STARS) {
			graphics.circle(star.x * width, star.y * height, star.r).fill({ color: 0xffffff, alpha: star.alpha });
		}
	};

	const drawKnob = (graphics: PIXI.Graphics) => {
		const { width, height, radius, border } = KNOB;
		graphics.roundRect(0, 3, width, height, radius).fill({ color: 0x000000, alpha: 0.5 });
		graphics
			.roundRect(0, 0, width, height, radius)
			.fill(isBlack ? gradient('#2b3246', '#151a26') : gradient('#fbf5e6', '#d9c9a0'));
		graphics.roundRect(0, 0, width, height, radius).stroke({ color: COLOURS.goldLight, width: border });
	};
</script>

<MainContainer>
	<Button
		x={layout.toggle.x}
		y={layout.toggle.y}
		anchor={0.5}
		sizes={{ width: PILL.width, height: PILL.height }}
		onpress={() => setYourColour(isBlack ? 'white' : 'black')}
	>
		{#snippet children()}
			<Graphics draw={drawPill} />
			<Graphics x={KNOB.inset + knobX.current} y={KNOB.inset} draw={drawKnob} />
			<Text
				text={KING}
				anchor={0.5}
				x={PILL.width * 0.25}
				y={PILL.height * 0.5}
				alpha={whiteFade.current}
				scale={scaleOf(whiteFade.current)}
				style={{
					fontFamily: kingFont,
					fontSize: 38,
					fill: COLOURS.ivory,
					dropShadow: { color: 0x000000, alpha: 0.6, blur: 2, distance: 1, angle: Math.PI / 2 },
				}}
			/>
			<Text
				text={KING}
				anchor={0.5}
				x={PILL.width * 0.75}
				y={PILL.height * 0.5}
				alpha={blackFade.current}
				scale={scaleOf(blackFade.current)}
				style={{
					fontFamily: kingFont,
					fontSize: 38,
					fill: COLOURS.ink,
					stroke: { color: 0xf6eedb, width: 1, alpha: 0.7 },
				}}
			/>
		{/snippet}
	</Button>
</MainContainer>
