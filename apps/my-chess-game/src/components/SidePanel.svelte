<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { backOut, cubicOut } from 'svelte/easing';
	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { stateBet, stateBetDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { sidePanelLayout } from '../game/sideLayout';
	import { BOOSTER_MODE } from '../game/betModes';
	import { moveNotation, pairMoves, pieceAssetKey } from '../game/chess';
	import type { SymbolName } from '../game/types';
	import { TABLE_EDGE } from '../game/tilt';
	import TiltedPlane from './TiltedPlane.svelte';

	// The side panel to the right of the board (desktop), in the board's own colours (its light and dark
	// squares, its frame, its coordinates' blue), flat:
	// - a dark-blue head with the spin's multiplier (pulsing as it grows) and the spin's win
	// - whose move it is
	// - the spin's moves in chess notation, a numbered turn a row, yours and the reply side by side, the
	//   rows striped like the board (the latest at the foot; older ones scroll off the top)
	// - what each side has taken this spin, the taken pieces' pictures in a row
	const context = getContext();
	const panel = $derived(sidePanelLayout().panel);

	// the board picture's colours (static/assets/board.webp)
	const COLOURS = {
		light: 0xdde9f1,
		dark: 0x6691ad,
		frame: 0x47504a,
		label: 0x628196,
		ink: 0x223646,
		reply: 0x4c7493,
		white: 0xffffff,
	};
	const SANS = ['Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'];
	const PAD = 16;
	const HEAD = 112;
	const TURN = 48;
	const MOVES_HEAD = 34;
	const ROW = 30;
	const TAKEN_ROW = 50;

	// the text is drawn at the size it's seen (the layout scales it up), so it's crisp
	const resolution = $derived(
		Math.max(1, context.stateLayoutDerived.mainLayout().scale * Math.min(window.devicePixelRatio || 1, 2)),
	);
	const text = (size: number, fill: number, more: Partial<PIXI.TextStyleOptions> = {}) => ({
		fontFamily: SANS,
		fontSize: size,
		fontWeight: '700' as const,
		fill,
		...more,
	});
	const label = (fill: number) => text(12, fill, { fontWeight: '800', letterSpacing: 2 });

	const pulse = new Tween(1);
	context.eventEmitter.subscribeOnMount({
		multiplierPulse: () => {
			pulse.set(1.2, { duration: 0 });
			pulse.set(1, { duration: 450 / stateBetDerived.timeScale(), easing: backOut });
		},
	});
	const spinWin = new Tween(0, { duration: 400, easing: cubicOut });
	$effect(() => {
		spinWin.set(context.stateGame.spinWin);
	});

	// whose move it is: the king of the side on the move (yours drawn in your colour), none between spins
	const turn = $derived(context.stateGame.turn);
	const turnKing = $derived(turn ? pieceAssetKey(turn === 'you' ? 'WK' : 'BK', context.stateGame.yourColour) : undefined);
	const turnText = $derived(
		turn === 'you'
			? 'YOUR MOVE'
			: turn === 'them'
				? stateBet.activeBetModeKey === BOOSTER_MODE
					? 'THEIR MOVE · BEGINNER'
					: 'THEIR MOVE'
				: 'PRESS SPIN TO PLAY',
	);

	// the moves: as many of the latest turns as there's room for
	const movesTop = HEAD + TURN;
	const takenTop = $derived(panel ? panel.height - TAKEN_ROW * 2 : 0);
	const rowsRoom = $derived(Math.max(1, Math.floor((takenTop - movesTop - MOVES_HEAD - 6) / ROW)));
	const turns = $derived(pairMoves(context.stateGame.moves).slice(-rowsRoom));

	// what each side has taken this spin
	const taken = (side: 'you' | 'them') =>
		context.stateGame.moves
			.filter((move) => move.side === side && move.captured)
			.map((move) => pieceAssetKey(move.captured as SymbolName, context.stateGame.yourColour))
			.filter((key): key is string => Boolean(key));
	const takenRows = $derived([
		{ label: 'YOU TOOK', pieces: taken('you') },
		{ label: 'THEY TOOK', pieces: taken('them') },
	]);
	const PIECES_LEFT = PAD + 104;
	const PIECE = 36;

	// over the marble (the sprites under it): the moves' rows striped, a faint wash of the dark squares'
	// blue so the marble shows through; the rules between the parts; and a thin frame in the board
	// edge's colour, square cornered like the board
	const drawPanel = (graphics: PIXI.Graphics) => {
		if (!panel) return;
		const { width, height } = panel;
		turns.forEach((_, index) => {
			if (index % 2 === 1) {
				graphics.rect(0, movesTop + MOVES_HEAD + index * ROW, width, ROW).fill({ color: COLOURS.dark, alpha: 0.12 });
			}
		});
		for (const y of [movesTop, takenTop, takenTop + TAKEN_ROW]) {
			graphics.moveTo(0, y).lineTo(width, y).stroke({ color: COLOURS.dark, width: 1.5, alpha: 0.5 });
		}
		graphics.rect(0, 0, width, height).stroke({ color: COLOURS.frame, width: 2, alignment: 0 });
	};
</script>

{#if panel}
	<MainContainer>
		<TiltedPlane
			size={{ width: panel.width, height: panel.height }}
			project={(x, y) => context.stateGameDerived.tablePoint(panel.x + x, panel.y + y)}
			pad={6}
			edge={{ depth: 5, colour: TABLE_EDGE }}
			shadow={0.4}
		>
			<Sprite key="panelLight" width={panel.width} height={panel.height} />
			<Sprite key="panelDark" width={panel.width} height={HEAD} />
			<Graphics draw={drawPanel} />

			<!-- the head: the multiplier and the spin's win -->
			<Text
				text={context.stateGame.gameType === 'freegame' ? 'BONUS MULTIPLIER' : 'MULTIPLIER'}
				x={PAD}
				y={PAD - 2}
				{resolution}
				style={label(COLOURS.light)}
			/>
			<Container x={PAD} y={HEAD / 2 + 12} scale={pulse.current}>
				<Text
					text={`x${context.stateGame.multiplier}`}
					anchor={{ x: 0, y: 0.5 }}
					resolution={resolution * 1.2}
					style={text(58, COLOURS.white, { fontWeight: '800' })}
				/>
			</Container>
			<Text text="SPIN WIN" anchor={{ x: 1, y: 0 }} x={panel.width - PAD} y={PAD - 2} {resolution} style={label(COLOURS.light)} />
			<Text
				text={bookEventAmountToCurrencyString(Math.round(spinWin.current))}
				anchor={{ x: 1, y: 0.5 }}
				x={panel.width - PAD}
				y={HEAD / 2 + 12}
				{resolution}
				style={text(28, COLOURS.white, { fontWeight: '800' })}
			/>

			<!-- whose move it is -->
			{#if turnKing}
				<Sprite key={turnKing} anchor={{ x: 0, y: 0.5 }} x={PAD - 2} y={HEAD + TURN / 2} width={32} height={32} />
			{/if}
			<Text
				text={turnText}
				anchor={{ x: 0, y: 0.5 }}
				x={turnKing ? PAD + 38 : PAD}
				y={HEAD + TURN / 2}
				{resolution}
				style={text(15, turn ? COLOURS.ink : COLOURS.label, { fontWeight: '800', letterSpacing: 1 })}
			/>

			<!-- the moves -->
			<Text text="#" anchor={{ x: 1, y: 0 }} x={PAD + 26} y={movesTop + 11} {resolution} style={label(COLOURS.label)} />
			<Text text="YOU" x={PAD + 40} y={movesTop + 11} {resolution} style={label(COLOURS.label)} />
			<Text text="THEM" x={panel.width / 2 + 22} y={movesTop + 11} {resolution} style={label(COLOURS.label)} />
			{#if turns.length}
				{#each turns as row, index}
					{@const y = movesTop + MOVES_HEAD + index * ROW + ROW / 2}
					<Text
						text={`${row.number}.`}
						anchor={{ x: 1, y: 0.5 }}
						x={PAD + 26}
						y={y}
						{resolution}
						style={text(15, COLOURS.label)}
					/>
					<Text
						text={row.you ? moveNotation(row.you) : '…'}
						anchor={{ x: 0, y: 0.5 }}
						x={PAD + 40}
						y={y}
						{resolution}
						style={text(17, COLOURS.ink)}
					/>
					{#if row.them}
						<Text
							text={moveNotation(row.them)}
							anchor={{ x: 0, y: 0.5 }}
							x={panel.width / 2 + 22}
							y={y}
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

			<!-- what each side has taken -->
			{#each takenRows as row, index}
				{@const y = takenTop + index * TAKEN_ROW + TAKEN_ROW / 2}
				{@const step = Math.min(PIECE, row.pieces.length ? (panel.width - PAD - PIECES_LEFT) / row.pieces.length : PIECE)}
				<Text text={row.label} anchor={{ x: 0, y: 0.5 }} x={PAD} y={y} {resolution} style={label(COLOURS.label)} />
				{#each row.pieces as key, pieceIndex}
					<Sprite {key} anchor={{ x: 0, y: 0.5 }} x={PIECES_LEFT + pieceIndex * step} y={y - 1} width={PIECE} height={PIECE} />
				{/each}
			{/each}
		</TiltedPlane>
	</MainContainer>
{/if}
