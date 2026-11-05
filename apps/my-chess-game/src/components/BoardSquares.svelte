<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { backOut, cubicOut } from 'svelte/easing';
	import { Container, Graphics, Rectangle, Text } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_COLOURS } from '../game/constants';
	import type { Position } from '../game/types';
	import type { Spot } from '../game/typesBookEvent';
	import { positionKey } from '../game/chess';
	import { drawArrow } from '../game/drawArrow';
	import BoardContainer from './BoardContainer.svelte';

	// Over the board's picture (Background), under the pieces: the multiplier spots on their
	// squares, the last move's two squares lit gold with an arrow between them (bright as the move is
	// made, then faded to a trail), a ring round the square a capture is about to land on, a king in
	// check lit red with the line of the check drawn to it from each piece giving it.
	const context = getContext();
	const lit = $derived(
		[context.stateGame.lastMove?.from, context.stateGame.lastMove?.to].filter(
			(position) => position !== undefined,
		),
	);
	// on the practice board the last move's squares go red once the engine has judged it a blunder
	// (BLUNDER); the gold otherwise
	const blundered = $derived(
		context.stateGame.blunder !== undefined &&
			context.stateGame.lastMove !== undefined &&
			positionKey(context.stateGame.blunder) === positionKey(context.stateGame.lastMove.to),
	);
	const litColour = $derived(blundered ? BOARD_COLOURS.check : BOARD_COLOURS.lastMove);

	// The spots as drawn: each pops in as it comes (from small and clear to its size) and fades out as it
	// goes (taken, collected, or the spin over), so none just appears or vanishes. Kept apart from the
	// game's list, which changes at once; matched to it by square.
	type ShownSpot = { key: string; spot: Spot; alpha: Tween<number>; scale: Tween<number>; leaving: boolean };
	let shownSpots = $state<ShownSpot[]>([]);
	$effect(() => {
		const wanted = new Map(context.stateGame.spots.map((spot) => [positionKey(spot), spot]));
		const timeScale = stateBetDerived.timeScale();
		for (const [key, spot] of wanted) {
			const shown = shownSpots.find((item) => item.key === key);
			if (shown && !shown.leaving) continue;
			if (shown) shownSpots = shownSpots.filter((item) => item.key !== key);
			const item: ShownSpot = { key, spot, alpha: new Tween(0), scale: new Tween(0.4), leaving: false };
			shownSpots = [...shownSpots, item];
			item.alpha.set(1, { duration: 260 / timeScale, easing: cubicOut });
			item.scale.set(1, { duration: 420 / timeScale, easing: backOut });
		}
		for (const shown of shownSpots) {
			if (wanted.has(shown.key) || shown.leaving) continue;
			shown.leaving = true;
			shown.scale.set(0.7, { duration: 300 / timeScale, easing: cubicOut });
			shown.alpha.set(0, { duration: 300 / timeScale, easing: cubicOut }).then(() => {
				shownSpots = shownSpots.filter((item) => item.key !== shown.key);
			});
		}
	});

	// the spots' colours: the frame and badge, the badge's shadow under it, the ink on it
	const SPOT_LOOK = {
		mult: { colour: 0xf2c14e, shadow: 0xa8811f, ink: 0x2a1d00 },
		add: { colour: BOARD_COLOURS.spotAdd, shadow: 0x2a7fb0, ink: 0x062033 },
	};
	const BADGE = { height: SYMBOL_SIZE * 0.26, fontSize: SYMBOL_SIZE * 0.19, pad: 6 };

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

	const drawMoveArrow = (graphics: PIXI.Graphics) => {
		const move = context.stateGame.lastMove;
		if (!move) return;
		drawArrow(graphics, move.from, move.to, BOARD_COLOURS.lastMove, arrowAlpha.current);
	};

	const drawCheckLines = (graphics: PIXI.Graphics) => {
		for (const line of context.stateGame.checkLines) {
			drawArrow(graphics, line.from, line.to, BOARD_COLOURS.check, 0.8);
		}
	};
</script>

<BoardContainer>
	{#each lit as position}
		<Rectangle
			x={position.reel * SYMBOL_SIZE}
			y={(position.row - 1) * SYMBOL_SIZE}
			width={SYMBOL_SIZE}
			height={SYMBOL_SIZE}
			backgroundColor={litColour}
			backgroundAlpha={blundered ? 0.6 : 0.45}
		/>
	{/each}
	<!-- the start screen's game (Sandbox): the piece picked up and where it can go -->
	{#if context.stateGame.selected}
		<Rectangle
			x={context.stateGame.selected.reel * SYMBOL_SIZE}
			y={(context.stateGame.selected.row - 1) * SYMBOL_SIZE}
			width={SYMBOL_SIZE}
			height={SYMBOL_SIZE}
			backgroundColor={BOARD_COLOURS.lastMove}
			backgroundAlpha={0.5}
		/>
	{/if}
	{#each context.stateGame.targets as target (`${target.reel}:${target.row}`)}
		{@const taking = context.stateGameDerived.pieceAt(target) !== undefined}
		<Rectangle
			x={target.reel * SYMBOL_SIZE + (taking ? 4 : SYMBOL_SIZE * 0.36)}
			y={(target.row - 1) * SYMBOL_SIZE + (taking ? 4 : SYMBOL_SIZE * 0.36)}
			width={taking ? SYMBOL_SIZE - 8 : SYMBOL_SIZE * 0.28}
			height={taking ? SYMBOL_SIZE - 8 : SYMBOL_SIZE * 0.28}
			borderRadius={taking ? SYMBOL_SIZE * 0.5 : SYMBOL_SIZE * 0.14}
			backgroundColor={BOARD_COLOURS.lastMove}
			backgroundAlpha={taking ? 0 : 0.55}
			borderColor={BOARD_COLOURS.lastMove}
			borderWidth={taking ? 4 : 0}
			borderAlpha={0.7}
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
	<!-- a spot: a frame just inside its square (gold for a x, blue for a +) over a faint dark wash, and
	its value on a little badge in the top right corner, raised on a darker shadow; popping in as it
	comes and fading as it goes, about its square's middle -->
	{#each shownSpots as shown (shown.key)}
		{@const spot = shown.spot}
		{@const look = spot.op === '+' ? SPOT_LOOK.add : SPOT_LOOK.mult}
		{@const middle = centre(spot)}
		{@const text = `${spot.op === 'x' ? '×' : '+'}${spot.value}`}
		{@const badgeWidth = BADGE.pad * 2 + text.length * BADGE.fontSize * 0.5}
		<Container x={middle.x} y={middle.y} scale={shown.scale.current} alpha={shown.alpha.current}>
			<Rectangle
				x={-SYMBOL_SIZE / 2 + 3}
				y={-SYMBOL_SIZE / 2 + 3}
				width={SYMBOL_SIZE - 6}
				height={SYMBOL_SIZE - 6}
				borderRadius={6}
				backgroundColor={0x1e322d}
				backgroundAlpha={0.35}
				borderColor={look.colour}
				borderWidth={3}
			/>
			<Container x={SYMBOL_SIZE / 2 - 7 - badgeWidth} y={-SYMBOL_SIZE / 2 + 7}>
				<Rectangle y={2} width={badgeWidth} height={BADGE.height} borderRadius={5} backgroundColor={look.shadow} />
				<Rectangle width={badgeWidth} height={BADGE.height} borderRadius={5} backgroundColor={look.colour} />
				<Text
					{text}
					anchor={0.5}
					x={badgeWidth / 2}
					y={BADGE.height / 2}
					style={{
						fontFamily: ['Barlow Condensed', 'proxima-nova', 'sans-serif'],
						fontSize: BADGE.fontSize,
						fontWeight: '800',
						fill: look.ink,
					}}
				/>
			</Container>
		</Container>
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
	<Graphics draw={drawCheckLines} />
</BoardContainer>
