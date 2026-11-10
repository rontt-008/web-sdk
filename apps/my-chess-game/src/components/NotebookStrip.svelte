<script lang="ts" module>
	// the strip's binding band, its head, a move's row, the row of what was taken, the room under them
	// and its padding, in the main layout's units (big enough to be read on a phone held upright)
	const BIND = 14;
	const HEAD = 66;
	const ROW = 32;
	const TAKEN = 40;
	const FOOT = 6;
	const PAD = 18;
	// the head's middle line (the multiplier, whose move it is, the spin's win), from the strip's top
	const LINE = BIND + HEAD / 2 + 13;

	// where the spin's multiplier (its "x5") is on the strip, from its top left corner: where a capture's
	// multiplier is thrown from (MoveWinAmounts)
	export const STRIP_MULTIPLIER = { x: PAD + 30, y: LINE };
</script>

<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { backOut, cubicOut } from 'svelte/easing';
	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { stateBetDerived, stateUi } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { lampShade, LAMP_SHADOW } from '../game/tilt';
	import { moveNotation, pairMoves } from '../game/chess';
	import { sidePanelLayout } from '../game/sideLayout';
	import { uiFold } from '../game/stateGame.svelte';
	import {
		NOTEBOOK_COLOURS as COLOURS,
		fitTaken,
		notebook,
		notebookLabel as label,
		notebookText as text,
		spinsLeftText,
		takenKeys,
		turnKing,
		turnText,
		whyLines,
	} from '../game/notebook.svelte';

	// The notebook (NotebookPad) as a strip under the board on tall and almost square screens, between
	// the board's frame and the UI, flat (not through the camera, so it stays put as the board zooms):
	// - the head, dark blue: the spin's multiplier (pulsing as it grows) on the left, the spin's win on
	//   the right, whose move it is between them, and above that in the bonus the free spins left
	// - the latest moves, as many rows as there's room for (three at most), yours and the reply side by
	//   side; for a spin that ended before any, the engine's reason in their place
	// - what each side has taken, side by side
	// It comes down with the portrait bar's panel (uiFold). On a short screen just the head, then the head
	// and what was taken. Its bottom right corner is turned
	// up like a page: a press opens the whole notebook over the board (NotebookOverlay).
	const context = getContext();
	const strip = $derived(sidePanelLayout().strip);

	const resolution = $derived(
		Math.max(1, context.stateLayoutDerived.mainLayout().scale * Math.min(window.devicePixelRatio || 1, 2)),
	);

	const pulse = new Tween(1);
	// it comes down with the portrait bar's panel as its drawer folds, and goes back up with it
	onMount(() => uiFold.set(stateUi.drawerFold ? 1 : 0, { duration: 0 }));
	context.eventEmitter.subscribeOnMount({
		drawerFold: () => {
			uiFold.set(1);
		},
		drawerUnfold: () => {
			uiFold.set(0);
		},
		multiplierPulse: () => {
			pulse.set(1.2, { duration: 0 });
			pulse.set(1, { duration: 450 / stateBetDerived.timeScale(), easing: backOut });
		},
	});
	const spinWin = new Tween(context.stateGame.spinWin, { duration: 400, easing: cubicOut });
	$effect(() => {
		spinWin.set(context.stateGame.spinWin);
	});

	// what fits in its room, and how tall it is with that
	const width = $derived(strip?.width ?? 0);
	const room = $derived((strip?.height ?? 0) - BIND - HEAD - FOOT);
	const showTaken = $derived(room >= TAKEN);
	const rows = $derived(Math.max(0, Math.min(3, Math.floor((room - (showTaken ? TAKEN : 0)) / ROW))));
	const height = $derived(BIND + HEAD + rows * ROW + (showTaken ? TAKEN : 0) + FOOT);
	const rowsTop = BIND + HEAD;
	const takenTop = $derived(rowsTop + rows * ROW);

	const turns = $derived(rows ? pairMoves(context.stateGame.moves).slice(-rows) : []);
	const why = $derived(whyLines()[0]);
	const king = $derived(turnKing());
	// on the practice board there's nothing to spin for yet: it's played by moving the pieces
	const turn = $derived(
		context.stateGame.sandbox && !context.stateGame.turn ? 'MOVE A PIECE TO PLAY' : turnText(),
	);
	const spinsLeft = $derived(spinsLeftText());
	// whose move it is, centred with its king: the text's width as near as can be told without measuring
	const TURN_SIZE = 17;
	const KING = 28;
	const turnWidth = $derived((king ? KING + 8 : 0) + turn.length * TURN_SIZE * 0.66);

	const PIECE = 30;
	const TAKEN_LABEL = 100;
	const takenRoom = $derived(Math.floor((width / 2 - PAD * 2 - TAKEN_LABEL) / PIECE));
	const takenHalves = $derived([
		{ x: PAD, label: 'YOU TOOK', ...fitTaken(takenKeys('you'), takenRoom) },
		{ x: width / 2 + PAD, label: 'THEY TOOK', ...fitTaken(takenKeys('them'), takenRoom) },
	]);

	// the sheets under the top one peeking out below it, its moves' rows striped and the rules between
	// its parts, and its binding: pairs of wire loops up over its top edge
	const SHEETS = [
		{ dy: 5, colour: 0xb7c8d4 },
		{ dy: 2.5, colour: 0xcbd9e3 },
	];
	const WIRE = { pair: 18, gap: 5, hole: 7, rise: 9, colour: 0x1d1f22, shine: 0x8c9096 };
	const CORNER = 22;
	const SHADE = lampShade(0.32);

	const drawUnder = (graphics: PIXI.Graphics) => {
		graphics.rect(LAMP_SHADOW.offset.x, LAMP_SHADOW.offset.y + 4, width, height).fill({ color: 0x000000, alpha: 0.35 });
		for (const sheet of SHEETS) {
			graphics.rect(0, sheet.dy, width, height).fill(sheet.colour).stroke({ color: COLOURS.frame, width: 1.2, alpha: 0.75, alignment: 0 });
		}
	};

	const drawSheet = (graphics: PIXI.Graphics) => {
		turns.forEach((_, index) => {
			if (index % 2 === 1) graphics.rect(0, rowsTop + index * ROW, width, ROW).fill({ color: COLOURS.dark, alpha: 0.12 });
		});
		if (showTaken && rows) graphics.moveTo(0, takenTop).lineTo(width, takenTop).stroke({ color: COLOURS.dark, width: 1.5, alpha: 0.5 });
		if (showTaken) {
			graphics.moveTo(width / 2, takenTop + 8).lineTo(width / 2, takenTop + TAKEN - 6).stroke({ color: COLOURS.dark, width: 1.5, alpha: 0.5 });
		}
	};

	const drawOver = (graphics: PIXI.Graphics) => {
		graphics.rect(0, 0, width, height).fill(SHADE);
		// the turned-up corner: the sheet under it shows, and the back of the page folds over
		graphics.poly([width - CORNER, height, width, height - CORNER, width, height]).fill(0x9fb3c2);
		graphics
			.poly([width - CORNER, height, width, height - CORNER, width - CORNER - 2, height - CORNER - 2])
			.fill(0xeef4f8)
			.stroke({ color: COLOURS.frame, width: 1.2, alpha: 0.8 });
		graphics.rect(0, 0, width, height).stroke({ color: COLOURS.frame, width: 2, alignment: 0 });
		const pairs = Math.floor((width - 24) / WIRE.pair) + 1;
		const first = (width - (pairs - 1) * WIRE.pair - WIRE.gap) / 2;
		for (let pair = 0; pair < pairs; pair++) {
			for (const offset of [0, WIRE.gap]) {
				const x = first + pair * WIRE.pair + offset;
				graphics.roundRect(x - 1.6, WIRE.hole - 2.5, 3.2, 5, 1.6).fill(COLOURS.frame);
				const loop = () =>
					graphics
						.moveTo(x, WIRE.hole)
						.lineTo(x, -2)
						.bezierCurveTo(x, -WIRE.rise, x + 3.2, -WIRE.rise, x + 3.2, -2)
						.lineTo(x + 3.2, 0.5);
				loop().stroke({ color: WIRE.colour, width: 2.4, cap: 'round', join: 'round' });
				loop().stroke({ color: WIRE.shine, width: 0.8, cap: 'round', join: 'round', alpha: 0.8 });
			}
		}
	};
</script>

{#if strip}
	<MainContainer>
		<Button x={strip.x} y={strip.y} sizes={{ width, height }} onpress={() => (notebook.open = !notebook.open)}>
			{#snippet children()}
				<Graphics draw={drawUnder} />
				<Sprite key="panelLight" {width} {height} />
				<Sprite key="panelDark" {width} height={BIND + HEAD} />
				<Graphics draw={drawSheet} />

				<!-- the head -->
				{#if context.stateGame.sandbox}
					<Text text="PRACTICE BOARD" x={PAD} y={BIND + 10} {resolution} style={text(18, COLOURS.white, { fontWeight: '800', letterSpacing: 1 })} />
					<Text text={'FREE PLAY · NO WINS'} x={PAD} y={BIND + 38} {resolution} style={label(14, COLOURS.light)} />
				{:else}
					<Text text="MULTIPLIER" x={PAD} y={BIND + 7} {resolution} style={label(14, COLOURS.light)} />
					<Container x={PAD} y={LINE} scale={pulse.current}>
						<Text
							text={`x${context.stateGame.multiplier}`}
							anchor={{ x: 0, y: 0.5 }}
							resolution={resolution * 1.2}
							style={text(36, COLOURS.white, { fontWeight: '800' })}
						/>
					</Container>
					<Text text="SPIN WIN" anchor={{ x: 1, y: 0 }} x={width - PAD} y={BIND + 7} {resolution} style={label(14, COLOURS.light)} />
					<Text
						text={bookEventAmountToCurrencyString(Math.round(spinWin.current))}
						anchor={{ x: 1, y: 0.5 }}
						x={width - PAD}
						y={LINE}
						{resolution}
						style={text(28, COLOURS.white, { fontWeight: '800' })}
					/>
				{/if}
				{#if spinsLeft}
					<Text text={spinsLeft} anchor={{ x: 0.5, y: 0 }} x={width / 2} y={BIND + 7} {resolution} style={label(14, COLOURS.light)} />
				{/if}
				<Container x={width / 2 - turnWidth / 2} y={LINE}>
					{#if king}
						<Sprite key={king} anchor={{ x: 0, y: 0.5 }} width={KING} height={KING} />
					{/if}
					<Text
						text={turn}
						anchor={{ x: 0, y: 0.5 }}
						x={king ? KING + 8 : 0}
						{resolution}
						style={text(TURN_SIZE, context.stateGame.turn ? COLOURS.white : COLOURS.light, { fontWeight: '800', letterSpacing: 1 })}
					/>
				</Container>

				<!-- the latest moves, or the engine's reason the spin ended before any -->
				{#if rows}
					{#if why && !turns.length}
						<Text
							text={why}
							x={PAD}
							y={rowsTop + 6}
							{resolution}
							style={text(19, COLOURS.ink, { fontWeight: '600', wordWrap: true, wordWrapWidth: width - PAD * 2, lineHeight: 24 })}
						/>
					{:else if turns.length}
						{#each turns as row, index}
							{@const y = rowsTop + index * ROW + ROW / 2}
							<Text text={`${row.number}.`} anchor={{ x: 1, y: 0.5 }} x={PAD + 30} {y} {resolution} style={text(18, COLOURS.label)} />
							<Text text={row.you ? moveNotation(row.you) : '…'} anchor={{ x: 0, y: 0.5 }} x={PAD + 42} {y} {resolution} style={text(22, COLOURS.ink)} />
							{#if row.them}
								<Text text={moveNotation(row.them)} anchor={{ x: 0, y: 0.5 }} x={width / 2 + PAD} {y} {resolution} style={text(22, COLOURS.reply)} />
							{/if}
						{/each}
					{:else}
						<Text
							text="No moves yet"
							anchor={{ x: 0, y: 0.5 }}
							x={PAD + 42}
							y={rowsTop + ROW / 2}
							{resolution}
							style={text(18, COLOURS.label, { fontWeight: '600', fontStyle: 'italic' })}
						/>
					{/if}
				{/if}

				<!-- what each side has taken -->
				{#if showTaken}
					{#each takenHalves as half}
						{@const y = takenTop + TAKEN / 2}
						{@const first = half.x + TAKEN_LABEL + (half.more ? PIECE : 0)}
						<Text text={half.label} anchor={{ x: 0, y: 0.5 }} x={half.x} {y} {resolution} style={label(13, COLOURS.label)} />
						{#if half.more}
							<Text
								text={`+${half.more}`}
								anchor={{ x: 0.5, y: 0.5 }}
								x={half.x + TAKEN_LABEL + PIECE / 2}
								{y}
								{resolution}
								style={text(15, COLOURS.label, { fontWeight: '800' })}
							/>
						{/if}
						{#each half.pieces as key, index}
							<Sprite {key} anchor={{ x: 0, y: 0.5 }} x={first + index * PIECE} y={y - 1} width={PIECE} height={PIECE} />
						{/each}
					{/each}
				{/if}
				<Graphics draw={drawOver} />
				<!-- what takes the press: the whole strip -->
				<Rectangle {width} {height} backgroundColor={0x000000} backgroundAlpha={0.001} />
			{/snippet}
		</Button>
	</MainContainer>
{/if}
