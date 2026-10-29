<script lang="ts">
	import _ from 'lodash';
	import type { ComponentProps } from 'svelte';
	import { ColorMatrixFilter, FillGradient } from 'pixi.js';
	import { Container, Graphics, SpriteSheet } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { LAYOUT_UNIT } from '../game/constants';
	import { FOX_EYES } from '../game/foxEyes';
	import { FOX_LOOK, lookMatrix } from '../game/look';

	const context = getContext();

	// the fox art (static/assets/sprites/fox, rendered from art-source/kettuO.blend and kettu.blend) is
	// an idle loop of 48 frames and a gust of wind of 72, each 501 x 402: the fox with a dark outline,
	// so it stands out from the orange scene, and a soft shadow under it; its paws are 378 down, its
	// head on the left so it faces the board from the right, and the frame leaves room on the right
	// for its tail to swing up in the gust
	const FOX_ART = { width: 501, height: 402, paws: 378 };
	const FOX_RATIO = FOX_ART.width / FOX_ART.height;
	// rendered at 24 frames a second; the speed is in frames a tick, at 60 ticks a second
	const FOX_ANIMATION_SPEED = 24 / 60;
	// how often a gust swings its tail, from one gust's start to the next; it waits for the idle to
	// finish its loop, as the gust starts and ends in the idle's first pose
	const GUST_EVERY = 10_000;
	// now and then it blinks (in seconds): its lids, drawn over its eyes in the fur's colours, close,
	// stay shut a moment and open again, and sometimes it blinks again straight after
	const BLINK = {
		every: { min: 2.5, max: 6 },
		close: 0.08,
		shut: 0.05,
		open: 0.12,
		twice: 0.2,
		gap: 0.1,
	};
	const BLINK_LENGTH = BLINK.close + BLINK.shut + BLINK.open;

	// the fox a little duller and greyer than its art (FOX_LOOK, see look.ts): a filter over the fox
	// and its lids, so the lids still match the fur; at the screen's resolution, so it stays sharp
	const lookFilter = new ColorMatrixFilter({ resolution: 'inherit' });
	lookFilter.matrix = lookMatrix(FOX_LOOK);

	let gusting = $state(false);
	let lastGust = performance.now();

	const onIdleLoop = () => {
		if (performance.now() - lastGust < GUST_EVERY) return;
		lastGust = performance.now();
		gusting = true;
	};
	const onGustComplete = () => (gusting = false);
	// sizes are of the whole art, shadow included
	const FOX = {
		maxHeight: LAYOUT_UNIT * 3.7,
		// smaller than this, it is left out (narrow screens have no room beside the board)
		minHeight: LAYOUT_UNIT * 1.65,
		// at least this from its nose to the board frame, and from the tip of its tail to the screen's edge
		gapToBoard: LAYOUT_UNIT * 0.15,
		screenMargin: LAYOUT_UNIT * 0.15,
		// right of the middle of the room, as far as the room allows
		nudgeRight: LAYOUT_UNIT * 0.3,
		// below the ground (or the frame's bottom), so it stands further forward on the path
		nudgeDown: LAYOUT_UNIT * 0.55,
	};

	// about the middle of the room right of the board frame, as big as the room allows, standing on the
	// background's ground (the dirt path in front of the rocks); on very wide screens, where the ground
	// is low behind the buttons, no lower than the frame's bottom
	const layout = $derived.by(() => {
		const frame = context.stateGameDerived.boardFrameLayout().visible;
		const main = context.stateLayoutDerived.mainLayout();
		const canvas = context.stateLayoutDerived.canvasSizes();
		// the room, in the board's coordinates
		const left = frame.right + FOX.gapToBoard;
		const right = main.width / 2 + canvas.width / 2 / main.scale - FOX.screenMargin;
		const height = Math.min(FOX.maxHeight, (right - left) / FOX_RATIO);
		const width = height * FOX_RATIO;

		return {
			x: Math.min((left + right) / 2 + FOX.nudgeRight, right - width / 2),
			y: Math.min(context.stateGameDerived.backgroundGround(), frame.bottom) + FOX.nudgeDown,
			width,
			height,
		};
	});

	// the frame shown, and how shut the lids are, from 0 (open) to 1 (shut)
	let frame = $state(0);
	let lids = $state(0);
	const onFrameChange = (index: number) => (frame = index);

	const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;
	const lidsAt = (time: number) => {
		if (time < BLINK.close) return ease(time / BLINK.close);
		if (time < BLINK.close + BLINK.shut) return 1;
		return 1 - ease(Math.min(1, (time - BLINK.close - BLINK.shut) / BLINK.open));
	};

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;

		const pause = () => _.random(BLINK.every.min, BLINK.every.max, true);
		let wait = pause();
		// into the blink going on, if one is
		let time: number | undefined;
		let twice = false;

		const tick = () => {
			const seconds = ticker.deltaMS / 1000;
			if (time === undefined) {
				wait -= seconds;
				if (wait > 0) return;
				time = 0;
			}
			time += seconds;
			lids = lidsAt(time);
			if (time < BLINK_LENGTH) return;
			time = undefined;
			twice = !twice && Math.random() < BLINK.twice;
			wait = twice ? BLINK.gap : pause();
		};

		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	// the lids are drawn in the frame's pixels, from where the sprite's anchor puts the frame
	const ORIGIN = { x: FOX_ART.width / 2, y: FOX_ART.paws };
	// each lid shaded from the fur above its eye to the fur below it
	const LID_FILLS = FOX_EYES.eyes.map(
		(eye) =>
			new FillGradient({
				type: 'linear',
				start: { x: 0, y: Math.min(...eye.outline.map(([, top]) => top)) - ORIGIN.y },
				end: { x: 0, y: Math.max(...eye.outline.map(([, , bottom]) => bottom)) - ORIGIN.y },
				colorStops: [
					{ offset: 0, color: eye.above },
					{ offset: 1, color: eye.below },
				],
				textureSpace: 'global',
			}),
	);

	// each lid comes down from the top of its eye's outline, its dark edge at the same share of the
	// way to the bottom across the eye, so shut it follows the bottom of the eye
	const drawLids: ComponentProps<typeof Graphics>['draw'] = (graphics) => {
		if (lids <= 0) return;
		const [dx, dy] = FOX_EYES.offsets[gusting ? 'gust' : 'idle'][frame] ?? [0, 0];
		FOX_EYES.eyes.forEach((eye, index) => {
			const top = eye.outline.map(([x, y]) => ({ x: x + dx - ORIGIN.x, y: y + dy - ORIGIN.y }));
			const edge = eye.outline.map(([x, y, bottom]) => ({
				x: x + dx - ORIGIN.x,
				y: y + lids * (bottom - y) + dy - ORIGIN.y,
			}));
			graphics.poly([...top, ...[...edge].reverse()]).fill(LID_FILLS[index]);
			graphics.poly(edge, false).stroke({
				width: FOX_EYES.lineWidth,
				color: FOX_EYES.line,
				alpha: Math.min(1, lids * 4),
				cap: 'round',
				join: 'round',
			});
		});
	};
</script>

<!-- only on wide screens: phones held sideways have the spin and bet buttons right of the board -->
{#if context.stateLayoutDerived.layoutType() === 'desktop' && layout.height >= FOX.minHeight}
	<Container
		x={layout.x}
		y={layout.y}
		scale={layout.height / FOX_ART.height}
		filters={[lookFilter]}
	>
		<SpriteSheet
			key={gusting ? 'foxGust' : 'foxIdle'}
			anchor={{ x: 0.5, y: FOX_ART.paws / FOX_ART.height }}
			animationSpeed={FOX_ANIMATION_SPEED}
			loop={!gusting}
			onLoop={onIdleLoop}
			onComplete={onGustComplete}
			{onFrameChange}
			play
		/>
		<Graphics draw={drawLids} />
	</Container>
{/if}
