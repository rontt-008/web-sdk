<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { Graphics, Sprite } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { setYourColour } from '../game/stateGame.svelte';
	import { sidePanelLayout } from '../game/sideLayout';

	// The toggle of the colour your pieces are drawn in, in the board's own materials, flat: a walnut
	// track with the frame's gold trim, the white king (left) and the black king (right) in the pieces'
	// own pictures, and a knob, one of the board's light squares, that slides under the king you play
	// (with a little overshoot); that king bright and full size, the other faded. The maths is the same
	// either way (you always move first): it only changes the pictures, as the rules say.
	const context = getContext();
	const layout = $derived(sidePanelLayout());
	const isBlack = $derived(context.stateGame.yourColour === 'black');

	// its sizes, in the main layout's units
	const PILL = { width: 148, height: 70, radius: 35 };
	const KNOB = { width: 70, height: 58, inset: 6, radius: 29 };
	const KNOB_TRAVEL = PILL.width - KNOB.inset * 2 - KNOB.width;
	const KING = 46;
	const COLOURS = {
		outline: 0x1e0f07,
		walnut: 0x4e2814,
		gold: 0xd4a24a,
		square: 0xdde9f1,
		squareEdge: 0x6691ad,
	};

	const knobX = new Tween(isBlack ? KNOB_TRAVEL : 0, { duration: 400, easing: backOut });
	const whiteFade = new Tween(isBlack ? 0.6 : 1, { duration: 300 });
	const blackFade = new Tween(isBlack ? 1 : 0.6, { duration: 300 });
	$effect(() => {
		knobX.set(isBlack ? KNOB_TRAVEL : 0);
		whiteFade.set(isBlack ? 0.6 : 1);
		blackFade.set(isBlack ? 1 : 0.6);
	});
	// the king you play at full size, the other a little smaller
	const sizeOf = (fade: number) => KING * (0.82 + ((fade - 0.6) / 0.4) * 0.18);

	const drawTrack = (graphics: PIXI.Graphics) => {
		const { width, height, radius } = PILL;
		graphics.roundRect(0, 5, width, height, radius).fill({ color: 0x000000, alpha: 0.35 });
		graphics.roundRect(0, 0, width, height, radius).fill(COLOURS.walnut);
		graphics.roundRect(1.5, 1.5, width - 3, height - 3, radius - 1.5).stroke({ color: COLOURS.gold, width: 2.5 });
		graphics.roundRect(0, 0, width, height, radius).stroke({ color: COLOURS.outline, width: 2, alignment: 1 });
	};

	const drawKnob = (graphics: PIXI.Graphics) => {
		const { width, height, radius } = KNOB;
		graphics.roundRect(0, 0, width, height, radius).fill(COLOURS.square).stroke({ color: COLOURS.squareEdge, width: 2 });
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
			<Graphics draw={drawTrack} />
			<Graphics x={KNOB.inset + knobX.current} y={(PILL.height - KNOB.height) / 2} draw={drawKnob} />
			<Sprite
				key="wK"
				anchor={0.5}
				x={KNOB.inset + KNOB.width / 2}
				y={PILL.height / 2}
				width={sizeOf(whiteFade.current)}
				height={sizeOf(whiteFade.current)}
				alpha={whiteFade.current}
			/>
			<Sprite
				key="bK"
				anchor={0.5}
				x={PILL.width - KNOB.inset - KNOB.width / 2}
				y={PILL.height / 2}
				width={sizeOf(blackFade.current)}
				height={sizeOf(blackFade.current)}
				alpha={blackFade.current}
			/>
		{/snippet}
	</Button>
</MainContainer>
