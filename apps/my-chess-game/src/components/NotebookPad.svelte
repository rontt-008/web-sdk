<script lang="ts" module>
	// the spin's multiplier grew: it pulses (here and on the strip, NotebookStrip)
	export type EmitterEventNotebook = { type: 'multiplierPulse' };

	// the sheet's padding, its head's height, its binding's band and how far its top sheet is in from
	// the left (see the pad, below)
	const PAD = 16;
	const HEAD = 112;
	const BIND = 24;
	const STACK = 6;

	// where the spin's multiplier (its "x5") is on the pad, from its top left corner, in its own units:
	// where a capture's multiplier is thrown from (MoveWinAmounts)
	export const NOTEBOOK_MULTIPLIER = { x: STACK + PAD + 34, y: BIND + HEAD / 2 + 12 };
</script>

<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { backOut, cubicOut } from 'svelte/easing';
	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { lampShade } from '../game/tilt';
	import { moveNotation, pairMoves } from '../game/chess';
	import {
		NOTEBOOK_COLOURS as COLOURS,
		fitTaken,
		multiplierLabel,
		notebookLabel,
		notebookText as text,
		spinsLeftText,
		takenKeys,
		turnKing,
		turnText,
		whyHeading,
		whyLines,
	} from '../game/notebook.svelte';

	// The notebook, a pad of paper in the board's own colours (its light and dark squares, its frame, its
	// coordinates' blue), drawn from its top left corner, `width` by `height` in its own units:
	// - a dark-blue head with the spin's multiplier (pulsing as it grows) and the spin's win
	// - whose move it is (and in the bonus, with `spinsLeft`, the free spins left)
	// - the spin's moves in chess notation, a numbered turn a row, yours and the reply side by side, the
	//   rows striped like the board (the latest at the foot; older ones scroll off the top)
	// - what each side has taken this spin, the taken pieces' pictures in a row (left out on a pad too
	//   short for them and a move)
	// - when a spin ends before any move, the engine's reasons in the moves' place, as they come: the
	//   capture or check it passed over, with the reply that answers it, and the move it played instead
	// Lying on the table beside the board (SidePanel), or opened flat over it on phones (NotebookOverlay).
	type Props = {
		width: number;
		height: number;
		// how many times its own units it's drawn at on the main layout (for crisp text)
		zoom?: number;
		// the free spins left on the turn's row, in the bonus (where there's no free spin sign by the board)
		spinsLeft?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	const TURN = 48;
	const MOVES_HEAD = 34;
	const ROW = 30;
	const TAKEN_ROW = 50;

	// the text is drawn at the size it's seen (the layout scales it up), so it's crisp
	const resolution = $derived(
		Math.max(
			1,
			context.stateLayoutDerived.mainLayout().scale * (props.zoom ?? 1) * Math.min(window.devicePixelRatio || 1, 2),
		),
	);
	const label = (fill: number) => notebookLabel(12, fill);

	const pulse = new Tween(1);
	context.eventEmitter.subscribeOnMount({
		multiplierPulse: () => {
			pulse.set(1.2, { duration: 0 });
			pulse.set(1, { duration: 450 / stateBetDerived.timeScale(), easing: backOut });
		},
	});
	const spinWin = new Tween(context.stateGame.spinWin, { duration: 400, easing: cubicOut });
	$effect(() => {
		spinWin.set(context.stateGame.spinWin);
	});

	const king = $derived(turnKing());
	const spinsLeft = $derived(props.spinsLeft ? spinsLeftText() : undefined);

	// The pad it is: the top sheet, its top band (BIND, blue like the head under it) punched for the wire
	// binding that comes up through it and over its top edge, in pairs of loops; and the sheets under
	// it, each peeking out a little further to the left and lower (STACK in all both ways; the top sheet
	// sits STACK in from the left), so it reads as a pad of paper. What's written on the sheet starts
	// under the band (in a container at BIND), so the positions below are from there.
	const SHEETS = [
		{ dx: 6, dy: 6, colour: 0xb7c8d4 },
		{ dx: 3, dy: 3, colour: 0xcbd9e3 },
	];
	const WIRE = { pair: 21, gap: 5.5, hole: 12, rise: 12, colour: 0x1d1f22, shine: 0x8c9096 };
	const sheetWidth = $derived(props.width - STACK);
	const sheetHeight = $derived(props.height - STACK);

	// the moves: as many of the latest turns as there's room for, over what each side has taken (left
	// out when there'd be no room for a move with it)
	const movesTop = HEAD + TURN;
	const roomFor = (bottom: number) => Math.floor((bottom - movesTop - MOVES_HEAD - 6) / ROW);
	const showTaken = $derived(roomFor(sheetHeight - BIND - TAKEN_ROW * 2) >= 1);
	const takenTop = $derived(showTaken ? sheetHeight - BIND - TAKEN_ROW * 2 : sheetHeight - BIND);
	const rowsRoom = $derived(Math.max(1, roomFor(takenTop)));
	const turns = $derived(pairMoves(context.stateGame.moves).slice(-rowsRoom));

	const why = $derived(whyLines());

	const PIECES_LEFT = PAD + 104;
	const PIECE = 36;
	const takenRoom = $derived(Math.floor((sheetWidth - PAD - PIECES_LEFT) / PIECE));
	const takenRows = $derived([
		{ label: 'YOU TOOK', ...fitTaken(takenKeys('you'), takenRoom) },
		{ label: 'THEY TOOK', ...fitTaken(takenKeys('them'), takenRoom) },
	]);

	// over the marble (the sprites under it): the moves' rows striped, a faint wash of the dark squares'
	// blue so the marble shows through; and the rules between the parts
	const drawPanel = (graphics: PIXI.Graphics) => {
		const width = sheetWidth;
		turns.forEach((_, index) => {
			if (index % 2 === 1) {
				graphics.rect(0, movesTop + MOVES_HEAD + index * ROW, width, ROW).fill({ color: COLOURS.dark, alpha: 0.12 });
			}
		});
		const rules = showTaken ? [movesTop, takenTop, takenTop + TAKEN_ROW] : [movesTop];
		for (const y of rules) {
			graphics.moveTo(0, y).lineTo(width, y).stroke({ color: COLOURS.dark, width: 1.5, alpha: 0.5 });
		}
	};

	// the sheets under the top one, the furthest first
	const drawSheetsUnder = (graphics: PIXI.Graphics) => {
		for (const sheet of SHEETS) {
			graphics
				.rect(STACK - sheet.dx, sheet.dy, sheetWidth, sheetHeight)
				.fill(sheet.colour)
				.stroke({ color: COLOURS.frame, width: 1.2, alpha: 0.75, alignment: 0 });
		}
	};

	// Shade where the lamp's light reaches less (lampShade, tilt.ts), laid over the whole pad, the top
	// sheet and the sheets under it, along their stepped outline so none falls on the table.
	const SHADE = lampShade(0.32);

	// the pad's outline: the top sheet and the sheets under it, stepping down to the left
	const padOutline = () => {
		const corners = [{ x: STACK, y: 0 }, ...[...SHEETS].reverse().map((sheet) => ({ x: STACK - sheet.dx, y: sheet.dy }))];
		const points: number[] = [corners[0].x, corners[0].y, corners[0].x + sheetWidth, corners[0].y];
		corners.forEach((corner, index) => {
			points.push(corner.x + sheetWidth, corner.y + sheetHeight);
			const next = corners[index + 1];
			if (next) points.push(next.x + sheetWidth, corner.y + sheetHeight);
		});
		const last = corners[corners.length - 1];
		points.push(last.x, last.y + sheetHeight);
		for (let index = corners.length - 1; index > 0; index--) {
			points.push(corners[index].x, corners[index].y, corners[index - 1].x, corners[index].y);
		}
		return points;
	};

	const drawShade = (graphics: PIXI.Graphics) => {
		graphics.poly(padOutline()).fill(SHADE);
	};

	// the top sheet's thin frame, and the wire binding: through each hole a loop comes up over the
	// sheet's top edge and down behind it, two loops a pair, the pairs spread evenly across the top
	const drawBinding = (graphics: PIXI.Graphics) => {
		const width = sheetWidth;
		graphics.rect(0, 0, width, sheetHeight).stroke({ color: COLOURS.frame, width: 2, alignment: 0 });
		const pairs = Math.floor((width - 24) / WIRE.pair) + 1;
		const first = (width - (pairs - 1) * WIRE.pair - WIRE.gap) / 2;
		for (let pair = 0; pair < pairs; pair++) {
			for (const offset of [0, WIRE.gap]) {
				const x = first + pair * WIRE.pair + offset;
				graphics.roundRect(x - 1.8, WIRE.hole - 3, 3.6, 6, 1.8).fill(COLOURS.frame);
				const loop = () =>
					graphics
						.moveTo(x, WIRE.hole)
						.lineTo(x, -2)
						.bezierCurveTo(x, -WIRE.rise, x + 3.6, -WIRE.rise, x + 3.6, -2)
						.lineTo(x + 3.6, 0.5);
				loop().stroke({ color: WIRE.colour, width: 2.6, cap: 'round', join: 'round' });
				loop().stroke({ color: WIRE.shine, width: 0.8, cap: 'round', join: 'round', alpha: 0.8 });
			}
		}
	};
</script>

<Graphics draw={drawSheetsUnder} />
<!-- the top sheet, in from the left so the sheets under it show there -->
<Container x={STACK}>
	<Sprite key="panelLight" width={sheetWidth} height={sheetHeight} />
	<!-- the blue head, from the very top (the binding's band too) -->
	<Sprite key="panelDark" width={sheetWidth} height={BIND + HEAD} />
	<Container y={BIND}>
		<Graphics draw={drawPanel} />

		<!-- the head: the multiplier and the spin's win; while the start screen's game is on, what it is -->
		{#if context.stateGame.sandbox}
			<Text
				text="PRACTICE BOARD"
				x={PAD}
				y={PAD - 2}
				{resolution}
				style={text(22, COLOURS.white, { fontWeight: '800', letterSpacing: 1 })}
			/>
			<Text
				text={'FREE PLAY · NO BETS, NO WINS\nPLAY BY MOVING YOUR PIECES'}
				x={PAD}
				y={PAD + 30}
				{resolution}
				style={text(13, COLOURS.light, {
					fontWeight: '800',
					letterSpacing: 1,
					lineHeight: 20,
					wordWrap: true,
					wordWrapWidth: sheetWidth - PAD * 2,
				})}
			/>
		{:else}
			<Text text={multiplierLabel()} x={PAD} y={PAD - 2} {resolution} style={label(COLOURS.light)} />
			<Container x={PAD} y={HEAD / 2 + 12} scale={pulse.current}>
				<Text
					text={`x${context.stateGame.multiplier}`}
					anchor={{ x: 0, y: 0.5 }}
					resolution={resolution * 1.2}
					style={text(58, COLOURS.white, { fontWeight: '800' })}
				/>
			</Container>
			<Text text="SPIN WIN" anchor={{ x: 1, y: 0 }} x={sheetWidth - PAD} y={PAD - 2} {resolution} style={label(COLOURS.light)} />
			<Text
				text={bookEventAmountToCurrencyString(Math.round(spinWin.current))}
				anchor={{ x: 1, y: 0.5 }}
				x={sheetWidth - PAD}
				y={HEAD / 2 + 12}
				{resolution}
				style={text(28, COLOURS.white, { fontWeight: '800' })}
			/>
		{/if}
		<!-- whose move it is; in the bonus, the free spins left at the row's other end -->
		{#if king}
			<Sprite key={king} anchor={{ x: 0, y: 0.5 }} x={PAD - 2} y={HEAD + TURN / 2} width={32} height={32} />
		{/if}
		<Text
			text={turnText()}
			anchor={{ x: 0, y: 0.5 }}
			x={king ? PAD + 38 : PAD}
			y={HEAD + TURN / 2}
			{resolution}
			style={text(15, context.stateGame.turn ? COLOURS.ink : COLOURS.label, { fontWeight: '800', letterSpacing: 1 })}
		/>
		{#if spinsLeft}
			<Text
				text={spinsLeft}
				anchor={{ x: 1, y: 0.5 }}
				x={sheetWidth - PAD}
				y={HEAD + TURN / 2}
				{resolution}
				style={label(COLOURS.reply)}
			/>
		{/if}

		<!-- the moves, or, for a spin that ended before any, the engine's reasons in their place -->
		{#if why.length}
			<Text text={whyHeading()} x={PAD} y={movesTop + 11} {resolution} style={label(COLOURS.label)} />
			<Text
				text={why.join('\n\n')}
				x={PAD}
				y={movesTop + MOVES_HEAD + 4}
				{resolution}
				style={text(14, COLOURS.ink, { fontWeight: '600', wordWrap: true, wordWrapWidth: sheetWidth - PAD * 2, lineHeight: 19 })}
			/>
		{:else}
			<Text text="#" anchor={{ x: 1, y: 0 }} x={PAD + 26} y={movesTop + 11} {resolution} style={label(COLOURS.label)} />
			<Text text="YOU" x={PAD + 40} y={movesTop + 11} {resolution} style={label(COLOURS.label)} />
			<Text text="THEM" x={sheetWidth / 2 + 22} y={movesTop + 11} {resolution} style={label(COLOURS.label)} />
			{#if turns.length}
				{#each turns as row, index}
					{@const y = movesTop + MOVES_HEAD + index * ROW + ROW / 2}
					<Text text={`${row.number}.`} anchor={{ x: 1, y: 0.5 }} x={PAD + 26} {y} {resolution} style={text(15, COLOURS.label)} />
					<Text
						text={row.you ? moveNotation(row.you) : '…'}
						anchor={{ x: 0, y: 0.5 }}
						x={PAD + 40}
						{y}
						{resolution}
						style={text(17, COLOURS.ink)}
					/>
					{#if row.them}
						<Text
							text={moveNotation(row.them)}
							anchor={{ x: 0, y: 0.5 }}
							x={sheetWidth / 2 + 22}
							{y}
							{resolution}
							style={text(17, COLOURS.reply)}
						/>
					{/if}
				{/each}
			{:else}
				<Text
					text="No moves yet"
					anchor={{ x: 0, y: 0.5 }}
					x={PAD + 40}
					y={movesTop + MOVES_HEAD + ROW / 2}
					{resolution}
					style={text(15, COLOURS.label, { fontWeight: '600', fontStyle: 'italic' })}
				/>
			{/if}
		{/if}

		<!-- what each side has taken -->
		{#if showTaken}
			{#each takenRows as row, index}
				{@const y = takenTop + index * TAKEN_ROW + TAKEN_ROW / 2}
				{@const first = row.more ? PIECES_LEFT + PIECE : PIECES_LEFT}
				<Text text={row.label} anchor={{ x: 0, y: 0.5 }} x={PAD} {y} {resolution} style={label(COLOURS.label)} />
				{#if row.more}
					<Text
						text={`+${row.more}`}
						anchor={{ x: 0.5, y: 0.5 }}
						x={PIECES_LEFT + PIECE / 2}
						{y}
						{resolution}
						style={text(15, COLOURS.label, { fontWeight: '800' })}
					/>
				{/if}
				{#each row.pieces as key, pieceIndex}
					<Sprite {key} anchor={{ x: 0, y: 0.5 }} x={first + pieceIndex * PIECE} y={y - 1} width={PIECE} height={PIECE} />
				{/each}
			{/each}
		{/if}
	</Container>
	<Graphics draw={drawBinding} />
</Container>
<Graphics draw={drawShade} />
