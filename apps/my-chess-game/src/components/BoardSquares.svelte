<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { Graphics, Rectangle, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_COLOURS } from '../game/constants';
	import type { Position } from '../game/types';
	import BoardContainer from './BoardContainer.svelte';

	// Over the board's picture (Background), under the pieces: the multiplier spots on their
	// squares, the last move's two squares lit gold with an arrow between them (bright as the move is
	// made, then faded to a trail), a ring round the square a capture is about to land on, a king in
	// check lit red with the line of the check drawn to it.
	const context = getContext();
	const lit = $derived(
		[context.stateGame.lastMove?.from, context.stateGame.lastMove?.to].filter(
			(position) => position !== undefined,
		),
	);

	const centre = ({ reel, row }: Position) => ({
		x: (reel + 0.5) * SYMBOL_SIZE,
		y: (row - 0.5) * SYMBOL_SIZE,
	});

	// the arrow is bright for the move and fades to a trail over a second
	const arrowAlpha = new Tween(0);
	$effect(() => {
		if (!context.stateGame.lastMove) {
			arrowAlpha.set(0, { duration: 0 });
			return;
		}
		arrowAlpha.set(0.95, { duration: 0 });
		arrowAlpha.set(0.35, { duration: 1000 });
	});

	// an arrow from the middle of one square to the middle of another: a shaft and a head
	const drawArrow = (graphics: PIXI.Graphics, from: Position, to: Position, color: number, alpha: number) => {
		const a = centre(from);
		const b = centre(to);
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const length = Math.hypot(dx, dy);
		if (length < 1) return;
		const ux = dx / length;
		const uy = dy / length;
		const head = SYMBOL_SIZE * 0.32;
		const width = SYMBOL_SIZE * 0.13;
		// the shaft stops short of the target square's middle, where the head is
		const startX = a.x + ux * SYMBOL_SIZE * 0.18;
		const startY = a.y + uy * SYMBOL_SIZE * 0.18;
		const tipX = b.x - ux * SYMBOL_SIZE * 0.12;
		const tipY = b.y - uy * SYMBOL_SIZE * 0.12;
		const baseX = tipX - ux * head;
		const baseY = tipY - uy * head;
		graphics.moveTo(startX, startY).lineTo(baseX, baseY).stroke({ color, width, alpha, cap: 'round' });
		graphics
			.poly([
				tipX,
				tipY,
				baseX - uy * head * 0.6,
				baseY + ux * head * 0.6,
				baseX + uy * head * 0.6,
				baseY - ux * head * 0.6,
			])
			.fill({ color, alpha });
	};

	const drawMoveArrow = (graphics: PIXI.Graphics) => {
		const move = context.stateGame.lastMove;
		if (!move) return;
		drawArrow(graphics, move.from, move.to, BOARD_COLOURS.lastMove, arrowAlpha.current);
	};

	const drawCheckLine = (graphics: PIXI.Graphics) => {
		const line = context.stateGame.checkLine;
		if (!line) return;
		drawArrow(graphics, line.from, line.to, BOARD_COLOURS.check, 0.8);
	};
</script>

<BoardContainer>
	{#each lit as position}
		<Rectangle
			x={position.reel * SYMBOL_SIZE}
			y={(position.row - 1) * SYMBOL_SIZE}
			width={SYMBOL_SIZE}
			height={SYMBOL_SIZE}
			backgroundColor={BOARD_COLOURS.lastMove}
			backgroundAlpha={0.45}
		/>
	{/each}
	{#if context.stateGame.checkSquare}
		<Rectangle
			x={context.stateGame.checkSquare.reel * SYMBOL_SIZE}
			y={(context.stateGame.checkSquare.row - 1) * SYMBOL_SIZE}
			width={SYMBOL_SIZE}
			height={SYMBOL_SIZE}
			backgroundColor={BOARD_COLOURS.check}
			backgroundAlpha={0.6}
		/>
	{/if}
	<!-- a spot: a gold ring round its square with its multiplier in the top left corner, clear of the
	piece on it -->
	{#each context.stateGame.spots as spot (`${spot.reel}:${spot.row}`)}
		<Rectangle
			x={spot.reel * SYMBOL_SIZE + 3}
			y={(spot.row - 1) * SYMBOL_SIZE + 3}
			width={SYMBOL_SIZE - 6}
			height={SYMBOL_SIZE - 6}
			borderRadius={6}
			backgroundColor={BOARD_COLOURS.spot}
			backgroundAlpha={0.22}
			borderColor={BOARD_COLOURS.spot}
			borderWidth={3}
		/>
		<Text
			text={`x${spot.multiplier}`}
			anchor={{ x: 0, y: 0 }}
			x={spot.reel * SYMBOL_SIZE + 7}
			y={(spot.row - 1) * SYMBOL_SIZE + 4}
			style={{
				fontFamily: 'proxima-nova',
				fontSize: SYMBOL_SIZE * 0.26,
				fontWeight: '800',
				fill: BOARD_COLOURS.spot,
				stroke: { color: 0x1a1208, width: 4 },
			}}
		/>
	{/each}
	<!-- the square a capture is about to land on -->
	{#if context.stateGame.attackSquare}
		<Rectangle
			x={context.stateGame.attackSquare.reel * SYMBOL_SIZE + 4}
			y={(context.stateGame.attackSquare.row - 1) * SYMBOL_SIZE + 4}
			width={SYMBOL_SIZE - 8}
			height={SYMBOL_SIZE - 8}
			borderRadius={SYMBOL_SIZE * 0.5}
			backgroundAlpha={0}
			borderColor={BOARD_COLOURS.check}
			borderWidth={4}
			borderAlpha={0.9}
		/>
	{/if}
	<Graphics draw={drawMoveArrow} />
	<Graphics draw={drawCheckLine} />
</BoardContainer>
