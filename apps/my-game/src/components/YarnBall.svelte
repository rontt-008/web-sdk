<script lang="ts" module>
	// rolls a ball across now, if one isn't already rolling (for previewing it)
	export type EmitterEventYarnBall = { type: 'yarnBallRoll' };
</script>

<script lang="ts">
	import _ from 'lodash';
	import type { ComponentProps } from 'svelte';
	import { Container, Graphics, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	// Now and then the ball of yarn from the symbols (cropped to just the ball, without its loose end,
	// so nothing whirls round as it rolls) is tossed in from one side of the screen, left or right
	// at random, bounces a few times, lower each time, and rolls away to the other side, spinning. Where the UI is a bar along the bottom of the
	// screen, it bounces and rolls along the top of the bar and drops off the bar's far end, out of
	// the bottom of the screen; elsewhere it rolls along the ground under the board and off the far
	// side. Either way it passes in front of the board's frame, never over the symbols. It never
	// starts while a screen (a big win, the free spin intro, ...) is over the game.
	// seconds until it comes, at random: the first time after the game opens, then after each one
	const EVERY = { first: { min: 20, max: 45 }, then: { min: 45, max: 100 } };
	// how often it is tossed in from the left (otherwise from the right)
	const FROM_LEFT_CHANCE = 0.5;
	const RADIUS = SYMBOL_SIZE * 0.5;
	// yarn-ball.png is the ball (this radius, in its pixels) centred in a square, and its shadow image
	// the same with room round it
	const IMAGE = { size: 418, ballRadius: 207.6, shadowSize: 494 };
	const SHADOW_OFFSET = { x: RADIUS * 0.08, y: RADIUS * 0.12 };
	const SHADOW_ALPHA = 0.6;
	// in layout units and seconds
	const GRAVITY = SYMBOL_SIZE * 22;
	const SPEED = SYMBOL_SIZE * 4.6;
	// tossed in this far above the ground, going up at this speed
	const TOSS = { height: SYMBOL_SIZE * 3.2, up: SYMBOL_SIZE * 2 };
	// each bounce keeps this much of its speed; once it lands slower than MIN_BOUNCE it just rolls
	const BOUNCE = 0.55;
	const MIN_BOUNCE = SYMBOL_SIZE * 1.8;
	// rolling, it loses this much of its speed a second, down to MIN_ROLL_SPEED (slow enough that it
	// visibly tips over the end of the bar and falls, though the bar ends close to the screen's edge)
	const ROLL_SLOWING = 0.6;
	const MIN_ROLL_SPEED = SYMBOL_SIZE * 1.6;
	// it squashes flat as it hits the ground, more for harder landings
	const SQUASH = { amount: 0.22, time: 0.16, hardLanding: SYMBOL_SIZE * 8 };
	// a soft dark patch on the ground under it, smaller and fainter the higher it is
	const GROUND_SHADOW = { width: RADIUS * 1.7, height: RADIUS * 0.32, alpha: 0.22, color: 0x1e120c };
	// without the UI's bar: how far below the board the ground is, in rows (on phones held sideways
	// it is the bottom of the screen, as the buttons sit right under the board)
	const GROUND_BELOW_BOARD = { desktop: 0.9, portrait: 1.2, tablet: 1.2 };

	const SCALE = RADIUS / IMAGE.ballRadius;
	const SIZE = IMAGE.size * SCALE;
	const SHADOW_SIZE = IMAGE.shadowSize * SCALE;

	const context = getContext();

	// what it bounces and rolls on: the top of the UI's bar, between its ends, or a line right across
	const ground = $derived.by(() => {
		const bar = context.stateGameDerived.uiBarBounds();
		if (bar) return { y: bar.top, left: bar.left, right: bar.right };
		const layoutType = context.stateLayoutDerived.layoutType();
		const y =
			layoutType === 'landscape'
				? context.stateGameDerived.screenEdges().bottom - SYMBOL_SIZE * 0.15
				: context.stateGameDerived.boardLayout().y +
					context.stateGameDerived.boardLayout().height * 0.5 +
					SYMBOL_SIZE * GROUND_BELOW_BOARD[layoutType];
		return { y, left: -Infinity, right: Infinity };
	});
	const groundY = $derived(ground.y);

	type Ball = {
		x: number;
		// of its middle
		y: number;
		vx: number;
		vy: number;
		rotation: number;
		rolling: boolean;
		sinceLanding: number;
		landingSpeed: number;
	};

	let ball = $state<Ball>();
	let time = 0;
	let nextAt = _.random(EVERY.first.min, EVERY.first.max, true);

	const start = () => {
		const edges = context.stateGameDerived.screenEdges();
		const fromLeft = Math.random() < FROM_LEFT_CHANCE;
		ball = {
			x: fromLeft ? edges.left - RADIUS * 2 : edges.right + RADIUS * 2,
			y: groundY - RADIUS - TOSS.height,
			vx: fromLeft ? SPEED : -SPEED,
			vy: -TOSS.up,
			rotation: _.random(0, Math.PI * 2, true),
			rolling: false,
			sinceLanding: Infinity,
			landingSpeed: 0,
		};
	};

	// whether there is ground under its middle (past the bar's ends there is none)
	const overGround = (x: number) => x >= ground.left && x <= ground.right;

	const step = (current: Ball, seconds: number) => {
		const floor = groundY - RADIUS;
		const above = current.y <= floor + 1;
		current.vy += GRAVITY * seconds;
		current.x += current.vx * seconds;
		current.y += current.vy * seconds;
		current.sinceLanding += seconds;

		// rolled off the end: it tips over and falls
		if (!overGround(current.x)) current.rolling = false;

		// it only lands coming down onto the ground, not when it has already dropped past it
		if (overGround(current.x) && above && current.y >= floor) {
			current.y = floor;
			if (!current.rolling) {
				current.landingSpeed = current.vy;
				current.sinceLanding = 0;
				if (current.vy > MIN_BOUNCE) current.vy = -current.vy * BOUNCE;
				else current.rolling = true;
			}
			if (current.rolling) current.vy = 0;
		}
		if (current.rolling) {
			const speed = Math.max(MIN_ROLL_SPEED, Math.abs(current.vx) * (1 - ROLL_SLOWING * seconds));
			current.vx = Math.sign(current.vx) * speed;
		}
		// rolling: it turns as far round as it travels
		current.rotation += (current.vx * seconds) / RADIUS;

		// gone once all of it (and its shadow) is past the far edge, or has dropped out of the bottom
		const edges = context.stateGameDerived.screenEdges();
		const gone =
			(current.vx > 0 ? current.x - RADIUS * 2 > edges.right : current.x + RADIUS * 2 < edges.left) ||
			current.y - RADIUS * 2 > edges.bottom;
		if (gone) {
			ball = undefined;
			nextAt = time + _.random(EVERY.then.min, EVERY.then.max, true);
		}
	};

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => {
			// a long frame (a hidden tab) shouldn't throw it across the screen in one go
			const seconds = Math.min(ticker.deltaMS / 1000, 0.05);
			time += seconds;
			if (ball) step(ball, seconds);
			else if (time >= nextAt && !context.stateGame.blurScene) start();
			context.stateGame.yarnBall = ball ? { x: ball.x, y: ball.y } : undefined;
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	context.eventEmitter.subscribeOnMount({
		yarnBallRoll: () => {
			if (!ball) start();
		},
	});

	// squashed flat about the ground for a moment as it lands
	const squash = $derived.by(() => {
		if (!ball || ball.sinceLanding >= SQUASH.time) return 0;
		const hardness = Math.min(1, ball.landingSpeed / SQUASH.hardLanding);
		return SQUASH.amount * hardness * Math.sin((Math.PI * ball.sinceLanding) / SQUASH.time);
	});
	// 0 on the ground, 1 at the height it was tossed in from
	const height = $derived(
		ball ? Math.min(1, Math.max(0, (groundY - RADIUS - ball.y) / TOSS.height)) : 0,
	);

	const drawGroundShadow: ComponentProps<typeof Graphics>['draw'] = (graphics) => {
		// nothing under it to cast a shadow on once it is past the bar's end, or below it
		if (!ball || !overGround(ball.x) || ball.y > groundY - RADIUS + 1) return;
		const size = 1 - 0.5 * height;
		graphics
			.ellipse(ball.x, groundY, (GROUND_SHADOW.width / 2) * size, (GROUND_SHADOW.height / 2) * size)
			.fill({ color: GROUND_SHADOW.color, alpha: GROUND_SHADOW.alpha * (1 - 0.6 * height) });
	};
</script>

{#if ball}
	<Graphics draw={drawGroundShadow} />
	<!-- standing on the ground, so it squashes onto it -->
	<Container x={ball.x} y={ball.y + RADIUS} scale={{ x: 1 + squash * 0.6, y: 1 - squash }}>
		<!-- the art's soft shadow stays down and to the right however the ball turns -->
		<Container
			x={SHADOW_OFFSET.x}
			y={-RADIUS + SHADOW_OFFSET.y}
			rotation={ball.rotation}
			alpha={SHADOW_ALPHA}
		>
			<Sprite key="yarnBallShadow" anchor={0.5} width={SHADOW_SIZE} height={SHADOW_SIZE} />
		</Container>
		<Container y={-RADIUS} rotation={ball.rotation}>
			<Sprite key="yarnBall" anchor={0.5} width={SIZE} height={SIZE} />
		</Container>
	</Container>
{/if}
