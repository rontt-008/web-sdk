<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { backOut, cubicOut } from 'svelte/easing';
	import { Container, Graphics, Rectangle, Text } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_COLOURS, SUPER_SPOT_MAX } from '../game/constants';
	import type { Position } from '../game/types';
	import type { Spot } from '../game/typesBookEvent';
	import { positionKey } from '../game/chess';
	import { badgeCell, middleCell, spotCells, spotOutline } from '../game/spotShape';
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
	// game's list, which changes at once; matched to it by square. A spot that stays on its square with a
	// new value (the SUPER BONUS's sticky spots growing, or a + landing on one) counts up to it on its
	// badge (`value`) while the spot pops (`pop`), so the growth is seen.
	type ShownSpot = {
		key: string;
		spot: Spot;
		alpha: Tween<number>;
		scale: Tween<number>;
		pop: Tween<number>;
		value: Tween<number>;
		leaving: boolean;
	};
	let shownSpots = $state<ShownSpot[]>([]);
	// a grown spot swells smoothly to `pop` (`swell` ms) and settles back (`settle` ms) while its value
	// counts up (`count` ms): no jump, so the spots don't blink as the next spin comes
	const GROW = { count: 650, pop: 1.15, swell: 260, settle: 420 };
	$effect(() => {
		const wanted = new Map(context.stateGame.spots.map((spot) => [positionKey(spot), spot]));
		const timeScale = stateBetDerived.timeScale();
		for (const [key, spot] of wanted) {
			const shown = shownSpots.find((item) => item.key === key);
			if (shown && !shown.leaving) {
				// the same spot, grown: count up to its new value, with a pop
				// (a merge grows its squares as well as its value)
				const reshaped = (shown.spot.cells?.length ?? 1) !== (spot.cells?.length ?? 1);
				if (shown.spot.value !== spot.value || shown.spot.op !== spot.op || reshaped) {
					shown.spot = spot;
					shown.value.set(spot.value, { duration: GROW.count / timeScale, easing: cubicOut });
					const pop = shown.pop;
					pop
						.set(GROW.pop, { duration: GROW.swell / timeScale, easing: cubicOut })
						.then(() => pop.set(1, { duration: GROW.settle / timeScale, easing: cubicOut }));
				}
				continue;
			}
			if (shown) shownSpots = shownSpots.filter((item) => item.key !== key);
			const item: ShownSpot = {
				key,
				spot,
				alpha: new Tween(0),
				scale: new Tween(0.4),
				pop: new Tween(1),
				value: new Tween(spot.value),
				leaving: false,
			};
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

	// A spot's look climbs with its value, so a big one reads from across the board without its number:
	// the frame and badge colour (`colour`), the badge's shadow and ink, the frame's width, and the wash
	// inside the square (`wash`, `washAlpha`). A + goes blue, cyan, violet, magenta, blazing orange, and at
	// SUPER_SPOT_MAX a gold MAX square; a x gold, molten orange, white-hot. Each look from the value `from`.
	// No glow round them (taken off).
	type SpotLook = {
		from: number;
		colour: number;
		shadow: number;
		ink: number;
		width: number;
		wash: number;
		washAlpha: number;
	};
	const PLUS_LOOKS: SpotLook[] = [
		{ from: 0, colour: BOARD_COLOURS.spotAdd, shadow: 0x2a7fb0, ink: 0x062033, width: 3, wash: 0x1e322d, washAlpha: 0.35 },
		{ from: 10, colour: 0x1fd0ff, shadow: 0x0b7fa3, ink: 0x02202b, width: 4, wash: 0x154a63, washAlpha: 0.42 },
		{ from: 50, colour: 0xb88cff, shadow: 0x6a45b8, ink: 0x170833, width: 4, wash: 0x35215f, washAlpha: 0.5 },
		{ from: 200, colour: 0xff6bd5, shadow: 0xa8287f, ink: 0x2e0623, width: 5, wash: 0x58163f, washAlpha: 0.55 },
		{ from: 1000, colour: 0xff7a2f, shadow: 0xa83c0c, ink: 0x2b0e00, width: 6, wash: 0x6b2808, washAlpha: 0.6 },
	];
	const MULT_LOOKS: SpotLook[] = [
		{ from: 0, colour: 0xf2c14e, shadow: 0xa8811f, ink: 0x2a1d00, width: 3, wash: 0x1e322d, washAlpha: 0.35 },
		{ from: 4, colour: 0xff9a2f, shadow: 0xa8551a, ink: 0x2b1200, width: 4, wash: 0x5a2a0a, washAlpha: 0.48 },
		{ from: 8, colour: 0xfff2c4, shadow: 0xc9a35a, ink: 0x2b1d00, width: 5, wash: 0x6b4a12, washAlpha: 0.55 },
	];
	// the MAX square: the frame and wash like the others, in gold, the frame the thickest; no badge, MAX in
	// the middle in the frame's gold
	const MAX_LOOK: SpotLook = { from: SUPER_SPOT_MAX, colour: 0xffd34d, shadow: 0xa8811f, ink: 0x2a1d00, width: 6, wash: 0x6b4a12, washAlpha: 0.6 };
	const lookOf = (op: Spot['op'], value: number): SpotLook => {
		if (op === '+' && value >= SUPER_SPOT_MAX) return MAX_LOOK;
		const looks = op === '+' ? PLUS_LOOKS : MULT_LOOKS;
		return looks.findLast((look) => value >= look.from) ?? looks[0];
	};
	const BADGE = { height: SYMBOL_SIZE * 0.26, fontSize: SYMBOL_SIZE * 0.19, pad: 6 };

	const centre = ({ reel, row }: Position) => ({
		x: (reel + 0.5) * SYMBOL_SIZE,
		y: (row - 0.5) * SYMBOL_SIZE,
	});
	// the middle of the squares' bounds: what a merged spot pops and fades about
	const boundsCentre = (cells: Position[]) => {
		const xs = cells.map((cell) => centre(cell).x);
		const ys = cells.map((cell) => centre(cell).y);
		return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
	};
	// a merged spot (the SUPER BONUS's spots side by side): the wash inside its outline, a hole cut out if
	// it rings one, and the frame along the outline, as far in as a single square's (3 px and half the
	// frame's width), its corners rounded
	const drawMerged = (graphics: PIXI.Graphics, cells: Position[], look: SpotLook) => {
		graphics.clear();
		const loops = spotOutline(cells, SYMBOL_SIZE, 3 + look.width / 2);
		for (const loop of loops.filter((loop) => loop.clockwise)) {
			graphics.poly(loop.points).fill({ color: look.wash, alpha: look.washAlpha });
		}
		for (const loop of loops.filter((loop) => !loop.clockwise)) {
			graphics.poly(loop.points).cut();
		}
		for (const loop of loops) {
			graphics.poly(loop.points).stroke({ color: look.colour, width: look.width, join: 'round' });
		}
	};

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
	<!-- a spot: a frame just inside its square over a wash, and its value on a little badge in the top
	right corner, raised on a darker shadow; its colours climbing with its value (lookOf); popping in as
	it comes and fading as it goes, about its square's middle. A MAX square has the same frame and wash,
	in gold, and no badge: MAX in the middle, hollow, outlined in the frame's gold. -->
	{#each shownSpots as shown (shown.key)}
		{@const spot = shown.spot}
		{@const value = Math.round(shown.value.current)}
		{@const look = lookOf(spot.op, value)}
		{@const isMax = look === MAX_LOOK}
		{@const cells = spotCells(spot)}
		{@const middle = boundsCentre(cells)}
		{@const badgeAt = centre(badgeCell(cells))}
		{@const maxAt = centre(middleCell(cells))}
		{@const text = isMax ? 'MAX' : `${spot.op === 'x' ? '×' : '+'}${value}`}
		{@const badgeWidth = BADGE.pad * 2 + text.length * BADGE.fontSize * 0.5}
		<Container x={middle.x} y={middle.y} scale={shown.scale.current * shown.pop.current} alpha={shown.alpha.current}>
			{#if cells.length === 1}
				<Rectangle
					x={-SYMBOL_SIZE / 2 + 3}
					y={-SYMBOL_SIZE / 2 + 3}
					width={SYMBOL_SIZE - 6}
					height={SYMBOL_SIZE - 6}
					borderRadius={6}
					backgroundColor={look.wash}
					backgroundAlpha={look.washAlpha}
					borderColor={look.colour}
					borderWidth={look.width}
				/>
			{:else}
				<!-- merged: one frame round all its squares (spotOutline), the wash inside it -->
				<Graphics x={-middle.x} y={-middle.y} draw={(graphics) => drawMerged(graphics, cells, look)} />
			{/if}
			{#if isMax}
				<!-- MAX in the middle of the square, hollow: only its outline, in the frame's gold, on nothing -->
				<Text
					text="MAX"
					anchor={0.5}
					x={maxAt.x - middle.x}
					y={maxAt.y - middle.y}
					style={{
						fontFamily: ['Barlow Condensed', 'proxima-nova', 'sans-serif'],
						fontSize: SYMBOL_SIZE * 0.3,
						fontWeight: '800',
						letterSpacing: 1,
						fill: { color: look.colour, alpha: 0 },
						stroke: { color: look.colour, width: 1.5, join: 'round' },
					}}
				/>
			{:else}
			<Container
				x={badgeAt.x - middle.x + SYMBOL_SIZE / 2 - 7 - badgeWidth}
				y={badgeAt.y - middle.y - SYMBOL_SIZE / 2 + 7}
			>
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
			{/if}
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
