<script lang="ts" module>
	// fistSlam: the fist slams the board (awaited, as a bonus starts); tableSlam: the moment it lands,
	// for what stands on the table to jump (TablePieces)
	export type EmitterEventFistSlam = { type: 'fistSlam' } | { type: 'tableSlam' };
</script>

<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { cubicIn, cubicOut, sineInOut } from 'svelte/easing';
	import { AnimatedSprite, Container, Graphics, Sprite } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { BOARD_SIZES } from '../game/constants';
	import { cameraDerived } from '../game/camera.svelte';
	import { ARM_SLAM } from '../game/armSlamAssets';
	import CameraContainer from './CameraContainer.svelte';

	// As a bonus starts, an arm slams its fist on the board. Where the screen is wide enough (desktop, phones
	// held sideways) it's the user's Blender animation (ANIMATED, below); elsewhere it's drawn here from the
	// user's drawing (static/assets/fist.webp, art-source/fist.py): the arm comes down from above the screen (its shoulder, the middle of the
	// sleeve's cut, kept off the top), raised (drawn back up towards you, so bigger), winds up a little
	// higher, drives straight down onto the board, and goes back up. As it comes down its shadow on the
	// table darkens and gathers under it. As it lands, the camera jolts, a thud, and the pieces standing
	// on the table jump (tableSlam).
	//
	// The drawing's points, in its own px: its size, the middle of the sleeve's cut (the pivot) and the
	// middle of the fist; the arm's length between them, its angle, and the cut's half width.
	const ARM = { width: 1774, height: 887, pivot: { x: 1457, y: 887 }, fist: { x: 728, y: 233 }, fistWidth: 402 };
	const LENGTH = Math.hypot(ARM.pivot.x - ARM.fist.x, ARM.pivot.y - ARM.fist.y);
	// It's drawn mirrored (left to right): hanging down from above, the sleeve's cut then lies nearer level,
	// so less of the arm is needed to keep it off the screen. The angle from fist to shoulder, mirrored.
	const IMAGE_ANGLE = Math.atan2(ARM.pivot.y - ARM.fist.y, -(ARM.pivot.x - ARM.fist.x));
	const CUT_HALF = 297;
	// where on the board it lands (of its width and height), the arm's sizes to try (of the drawing's),
	// and the angles its shoulder may be at from there (degrees from level: -90 straight up)
	const IMPACT = { x: 0.6, y: 0.45 };
	const SIZES = { min: 0.38, max: 0.8 };
	const ANGLES = [-75, -70, -80, -65, -85, -60, -90, -55, -95];
	// raised: how far back up along itself it's drawn (beyond what being bigger takes up) and how much
	// bigger, then a little more for the wind-up; and how far up it's pulled out of sight
	const POSE = { raised: 150, windUp: 190, zoom: 1.22, windZoom: 1.28, out: 900 };

	const context = getContext();

	// The animation (art-source/arm-slam.py, armSlamAssets.ts): in the drawing's frame, 30 a second, the
	// arm coming down past the frame's top right corner, the fist hitting the table on frame 9 where it is
	// in the drawing, resting, and lifting away. The arm crosses the frame's top edge (right of x 763), its
	// right edge and its bottom edge (right of x 1145, where the sleeve is cut), so they're kept off the
	// screen: the frame as tall as the screen (and MARGIN more each way, for the camera's shake: it's seen
	// through the camera, so the fist stays planted on the board as it jolts), its right edge past the
	// screen's. Where that would make the arm more than MAX_SCALE of the drawing (tall screens), the drawn
	// slam plays instead. The fist lands IMPACT_X across the board if the frame's right edge allows,
	// further right if not.
	// - frames: the table pieces start their jump (their fist lands 0.1 s after they start, their frame 4
	//   at 30 a second; at SPEED this arm takes about that from its first frame to its hit on frame 9), the
	//   hit (the thud and the camera's jolt), and the fist's shadow on the table coming and going
	// - shadow: under the fist, a little towards the bottom right (away from the lamp), in the frame's px
	// Both slams play SPEED times as fast as made (the animation at 45 frames a second, not 30).
	const SPEED = 1.5;
	const ANIMATED = {
		margin: 24,
		maxScale: 1.1,
		impactX: 0.6,
		frames: { pieces: 5, hit: 9, shadowIn: 6, liftOff: 40, shadowOut: 46 },
		shadow: { x: 770, y: 425, rx: 210, ry: 52, alpha: 0.4 },
	};
	const animatedLayout = $derived.by(() => {
		const main = context.stateLayoutDerived.mainLayout();
		const canvas = context.stateLayoutDerived.canvasSizes();
		const halfWidth = canvas.width / main.scale / 2;
		const halfHeight = canvas.height / main.scale / 2;
		const right = main.width / 2 + halfWidth;
		const top = main.height / 2 - halfHeight;
		const scale = (halfHeight * 2 + ANIMATED.margin * 2) / ARM_SLAM.size.height;
		const boardLeft = context.stateGameDerived.boardPoint(0, BOARD_SIZES.height / 2).x;
		const boardRight = context.stateGameDerived.boardPoint(BOARD_SIZES.width, BOARD_SIZES.height / 2).x;
		const target = boardLeft + (boardRight - boardLeft) * ANIMATED.impactX;
		const x = Math.max(target - ARM.fist.x * scale, right + ANIMATED.margin - ARM_SLAM.size.width * scale);
		const fistX = x + ARM.fist.x * scale;
		const wide = ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType());
		return { x, y: top - ANIMATED.margin, scale, fits: wide && scale <= ANIMATED.maxScale && fistX < boardRight };
	});

	// its sheets, loaded where it's played; their textures in the order they're shown
	$effect(() => {
		if (animatedLayout.fits) context.stateApp.loadLazyAssets(ARM_SLAM.keys);
	});
	const textures = $derived.by(() => {
		const sheets = ARM_SLAM.keys.map((key) => context.stateApp.loadedAssets?.[key] as unknown as PIXI.Texture[] | undefined);
		if (sheets.some((sheet) => !sheet)) return [];
		const all = sheets.flat() as PIXI.Texture[];
		const byFrame = new Map(ARM_SLAM.textureFrames.map((frame, index) => [frame, all[index]]));
		return ARM_SLAM.sequence.map((frame) => byFrame.get(frame) as PIXI.Texture);
	});

	// playing it: the frame shown, what's been set off, and the slam's promise
	let animating = $state(false);
	let slamFrame = $state(0);
	let fired = { pieces: false, hit: false };
	let finish: (() => void) | undefined;
	const animatedSlam = () =>
		new Promise<void>((resolve) => {
			fired = { pieces: false, hit: false };
			slamFrame = ARM_SLAM.sequence[0];
			finish = resolve;
			animating = true;
			// what its first frame sets off (it gets no frame change of its own)
			onSlamFrame(0);
			// should the ticker stall (a hidden tab), it doesn't hold the bonus up
			setTimeout(onSlamComplete, 4000);
		});
	const onSlamFrame = (index: number) => {
		slamFrame = ARM_SLAM.sequence[index];
		if (!fired.pieces && slamFrame >= ANIMATED.frames.pieces) {
			fired.pieces = true;
			context.eventEmitter.broadcast({ type: 'tableSlam' });
		}
		if (!fired.hit && slamFrame >= ANIMATED.frames.hit) {
			fired.hit = true;
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_stop_5' });
			cameraDerived.nudge(18, 0.05);
		}
	};
	function onSlamComplete() {
		if (!finish) return;
		animating = false;
		finish();
		finish = undefined;
	}
	const drawSlamShadow = (graphics: PIXI.Graphics) => {
		// in as the fist comes down, full while it's on the table, out as it lifts away
		const { shadowIn, hit, liftOff, shadowOut } = ANIMATED.frames;
		const f = slamFrame;
		const strength =
			f < hit
				? Math.max(0, (f - shadowIn) / (hit - shadowIn))
				: f <= liftOff
					? 1
					: Math.max(0, 1 - (f - liftOff) / (shadowOut - liftOff));
		if (strength <= 0) return;
		const { x, y, scale } = animatedLayout;
		const { shadow } = ANIMATED;
		graphics
			.ellipse(x + shadow.x * scale, y + shadow.y * scale, shadow.rx * scale, shadow.ry * scale)
			.fill({ color: 0x000000, alpha: shadow.alpha * strength });
	};

	// The arm's size and angle for this screen: the smallest that keeps the sleeve's cut off the top of
	// the screen, the fist landing on the board
	const layout = $derived.by(() => {
		const main = context.stateLayoutDerived.mainLayout();
		const canvas = context.stateLayoutDerived.canvasSizes();
		const top = main.height / 2 - canvas.height / main.scale / 2;
		const impact = context.stateGameDerived.boardPoint(BOARD_SIZES.width * IMPACT.x, BOARD_SIZES.height * IMPACT.y);
		const fits = (angle: number, size: number) => {
			const pivotY = impact.y + LENGTH * size * Math.sin(angle);
			const cutY = CUT_HALF * size * POSE.windZoom * Math.abs(Math.sin(angle - IMAGE_ANGLE));
			return pivotY + cutY < top - 4;
		};
		let found = { angle: (ANGLES[0] * Math.PI) / 180, size: SIZES.max };
		search: for (let size = SIZES.min; size <= SIZES.max + 1e-6; size += 0.01) {
			for (const degrees of ANGLES) {
				const angle = (degrees * Math.PI) / 180;
				if (fits(angle, size)) {
					found = { angle, size };
					break search;
				}
			}
		}
		const { angle, size } = found;
		const direction = { x: Math.cos(angle), y: Math.sin(angle) };
		return {
			impact,
			direction,
			angle,
			size,
			pivot: { x: impact.x + LENGTH * size * direction.x, y: impact.y + LENGTH * size * direction.y },
			// being bigger moves the fist away from the shoulder, so raised it's drawn back by that too
			raised: POSE.raised + LENGTH * size * (POSE.zoom - 1),
			windUp: POSE.windUp + LENGTH * size * (POSE.windZoom - 1),
		};
	});

	// the swing: how far it's drawn back up along itself, and how much bigger
	const push = new Tween(POSE.out);
	const zoom = new Tween(POSE.zoom);
	let showing = $state(false);

	const ms = (duration: number) => duration / stateBetDerived.timeScale() / SPEED;
	const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, ms(duration)));

	context.eventEmitter.subscribeOnMount({
		fistSlam: async () => {
			if (animatedLayout.fits && textures.length) await animatedSlam();
			else await drawnSlam();
		},
	});

	// the drawn slam
	const drawnSlam = async () => {
		push.set(POSE.out, { duration: 0 });
		zoom.set(POSE.zoom, { duration: 0 });
		showing = true;
		// down into sight, raised; a wind-up; the slam
		await push.set(layout.raised, { duration: ms(380), easing: cubicOut });
		await Promise.all([
			push.set(layout.windUp, { duration: ms(170), easing: sineInOut }),
			zoom.set(POSE.windZoom, { duration: ms(170), easing: sineInOut }),
		]);
		await Promise.all([
			push.set(0, { duration: ms(130), easing: cubicIn }),
			zoom.set(1, { duration: ms(130), easing: cubicIn }),
		]);
		// the hit
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_stop_5' });
		context.eventEmitter.broadcast({ type: 'tableSlam' });
		cameraDerived.nudge(18, 0.05);
		await push.set(14, { duration: ms(70), easing: cubicOut });
		await push.set(0, { duration: ms(110), easing: cubicIn });
		await wait(300);
		// and back up out of sight
		await Promise.all([
			push.set(POSE.out, { duration: ms(420), easing: cubicIn }),
			zoom.set(POSE.zoom, { duration: ms(420), easing: cubicIn }),
		]);
		showing = false;
	};

	// the arm: hung from its shoulder, pointing at the board, drawn back along itself by the swing
	const arm = $derived.by(() => {
		const { pivot, direction, angle, size } = layout;
		const scale = size * zoom.current;
		return {
			x: pivot.x + push.current * direction.x,
			y: pivot.y + push.current * direction.y,
			rotation: angle - IMAGE_ANGLE,
			width: ARM.width * scale,
			height: ARM.height * scale,
		};
	});

	// its shadow on the table: under where the fist lands, away from the lamp (down and to the right),
	// darker and tighter the nearer the fist is to the board
	const shadowBlur = new PIXI.BlurFilter({ strength: 10, quality: 3 });
	const drawShadow = (graphics: PIXI.Graphics) => {
		// how far the fist is from the board, along the arm (being bigger brings it nearer)
		const height = push.current - LENGTH * layout.size * (zoom.current - 1);
		const raised = Math.min(1, Math.max(0, height / POSE.windUp));
		const near = Math.max(0, 1 - height / 500);
		if (near <= 0) return;
		const radius = ARM.fistWidth * layout.size * 0.42 * (1 + 0.6 * raised);
		graphics
			.ellipse(layout.impact.x + 14 + 50 * raised, layout.impact.y + 10 + 30 * raised, radius, radius * 0.5)
			.fill({ color: 0x000000, alpha: 0.45 * (1 - 0.7 * raised) * near });
	};
</script>

{#if animating}
	<MainContainer>
		<CameraContainer>
			<Graphics draw={drawSlamShadow} filters={[shadowBlur]} />
			<AnimatedSprite
				{textures}
				play
				loop={false}
				animationSpeed={0.5 * SPEED}
				x={animatedLayout.x}
				y={animatedLayout.y}
				scale={animatedLayout.scale}
				onFrameChange={onSlamFrame}
				onComplete={onSlamComplete}
			/>
		</CameraContainer>
	</MainContainer>
{/if}

{#if showing}
	<MainContainer>
		<Graphics draw={drawShadow} filters={[shadowBlur]} />
		<Container x={arm.x} y={arm.y} rotation={arm.rotation} scale={{ x: -1, y: 1 }}>
			<Sprite
				key="fist"
				anchor={{ x: ARM.pivot.x / ARM.width, y: ARM.pivot.y / ARM.height }}
				width={arm.width}
				height={arm.height}
			/>
		</Container>
	</MainContainer>
{/if}
