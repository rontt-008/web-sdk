<script lang="ts" module>
	import type { BookEventOfType, Spot } from '../game/typesBookEvent';
	import type { Position } from '../game/types';

	export type EmitterEventPlayBoard =
		| { type: 'playBoardMove'; move: BookEventOfType<'move'> }
		| { type: 'playBoardCollect'; queen: Position; spots: Spot[] }
		// the pieces at these squares swell and settle `times` over (done when they have)
		| { type: 'playBoardPulse'; positions: Position[]; times: number }
		// the pieces drop off the bottom of the board, column by column (done when they have gone)
		| { type: 'playBoardDrop' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicIn, cubicInOut, cubicOut } from 'svelte/easing';
	import { Text } from 'pixi-svelte';
	import { stateBet, stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { MOVE_TIMING, SYMBOL_SIZE, BOARD_COLOURS, BOARD_SIZES } from '../game/constants';
	import { attackers, isMine } from '../game/chess';
	import { BOOSTER_MODE } from '../game/betModes';
	import type { PlayPiece } from '../game/stateGame.svelte';
	import { cameraDerived } from '../game/camera.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import Piece from './Piece.svelte';

	// The pieces once landed, moved about by the spin's moves: the piece slides to its square (a little
	// bigger on the way, over the others), a taken piece swells and bursts as it arrives, a pawn that
	// promotes changes into a queen; a king in check pulses, with the line of the check drawn
	// (BoardSquares). The camera (camera.svelte.ts) glides in on the square the move lands on, nudges
	// as a piece is taken, and drifts back out. The side not on the move is a little dimmed; in DUMB MODE the other side's pieces
	// are greyed. In CHEATER MODE the multiplier spots fly into your queen one by one, each going into
	// the multiplier (a + adds, a x multiplies). The reels (Board) take over again for the next spin.
	const context = getContext();
	const timeScale = () => stateBetDerived.timeScale();

	// a spot on its way to the queen
	type Flying = { id: number; text: string; colour: number; x: Tween<number>; y: Tween<number>; scale: Tween<number> };

	let moving = $state<number | undefined>(undefined);
	let flying = $state<Flying[]>([]);
	let nextFlying = 1;

	const dumbMode = $derived(stateBet.activeBetModeKey === BOOSTER_MODE);
	// the side whose move it isn't fades a little, the mover never
	const dim = (piece: PlayPiece) => {
		const turn = context.stateGame.turn;
		if (!turn || piece.id === moving) return 1;
		return (turn === 'you') === isMine(piece.symbol) ? 1 : 0.72;
	};
	const tint = (piece: PlayPiece) => (dumbMode && !isMine(piece.symbol) ? 0xb9bccc : 0xffffff);

	const pulse = async (piece: PlayPiece, times: number, size = 1.2) => {
		for (let i = 0; i < times; i++) {
			await piece.scale.set(size, { duration: 140 / timeScale(), easing: cubicOut });
			await piece.scale.set(1, { duration: 180 / timeScale(), easing: cubicInOut });
		}
	};

	const burst = async (piece: PlayPiece) => {
		piece.gone = true;
		cameraDerived.nudge(SYMBOL_SIZE * 0.06);
		const duration = MOVE_TIMING.burst / timeScale();
		piece.scale.set(1.6, { duration, easing: cubicOut });
		await piece.alpha.set(0, { duration, easing: cubicOut });
		context.stateGame.pieces = context.stateGame.pieces.filter((other) => other.id !== piece.id);
	};

	context.eventEmitter.subscribeOnMount({
		// as the next spin starts, the last spin's pieces fall off the bottom of the board, the columns
		// one after another from the left, each piece gathering speed; then the reels drop the new ones in
		playBoardDrop: async () => {
			const pieces = context.stateGame.pieces.filter((piece) => !piece.gone);
			if (!pieces.length) return;
			const scale = timeScale();
			await Promise.all(
				pieces.map((piece) =>
					piece.y.set(BOARD_SIZES.height + SYMBOL_SIZE * 1.5, {
						duration: MOVE_TIMING.drop / scale,
						delay: (piece.reel * MOVE_TIMING.dropStagger + (8 - piece.row) * 12) / scale,
						easing: cubicIn,
					}),
				),
			);
			context.stateGame.pieces = [];
		},
		playBoardPulse: async ({ positions, times }) => {
			const pieces = positions
				.map((position) => context.stateGameDerived.pieceAt(position))
				.filter((piece) => piece !== undefined);
			if (!pieces.length) {
				await waitForTimeout(MOVE_TIMING.firstBeat / timeScale());
				return;
			}
			await Promise.all(pieces.map((piece) => pulse(piece, times)));
		},
		playBoardMove: async ({ move }) => {
			const piece = context.stateGameDerived.pieceAt(move.from);
			const target = move.captured ? context.stateGameDerived.pieceAt(move.to) : undefined;
			context.stateGame.lastMove = { from: move.from, to: move.to };
			context.stateGame.checkSquare = undefined;
			if (!piece) return;

			piece.reel = move.to.reel;
			piece.row = move.to.row;
			moving = piece.id;
			const { x, y } = context.stateGameDerived.squareCentre(move.to);
			const duration = MOVE_TIMING.slide / timeScale();
			cameraDerived.zoomTo(move.to, move.captured ? cameraDerived.ZOOM.capture : cameraDerived.ZOOM.move);
			piece.scale
				.set(1.18, { duration: duration * 0.45, easing: cubicOut })
				.then(() => piece.scale.set(1, { duration: duration * 0.55, easing: cubicInOut }));
			// the taken piece swells as the mover comes for it
			if (target) target.scale.set(1.15, { duration: duration * 0.8, easing: cubicIn });
			await Promise.all([
				piece.x.set(x, { duration, easing: cubicInOut }),
				piece.y.set(y, { duration, easing: cubicInOut }),
			]);
			if (move.promotion) {
				piece.symbol = move.promotion;
				cameraDerived.nudge(SYMBOL_SIZE * 0.03, 0.02);
			}
			if (target) await burst(target);
			moving = undefined;
			// the camera stays on a mate for its label (the checkmate handler lets it go)
			if (!move.mate) cameraDerived.reset();
			if (move.check) {
				const king = context.stateGameDerived.kingSquare(move.side === 'you' ? 'BK' : 'WK');
				context.stateGame.checkSquare = king;
				if (king) {
					// the line from each piece giving the check: the mover, or the piece it uncovered
					const from = attackers(context.stateGame.pieces.filter((piece) => !piece.gone), king, move.side);
					context.stateGame.checkLines = (from.length ? from : [move.to]).map((square) => ({ from: square, to: king }));
					const kingPiece = context.stateGameDerived.pieceAt(king);
					if (kingPiece) pulse(kingPiece, move.mate ? 3 : 2, move.mate ? 1.3 : 1.2);
				}
			}
		},
		// the spots fly into the queen one after another, each adding to the multiplier as it arrives
		playBoardCollect: async ({ queen, spots }) => {
			const target = context.stateGameDerived.squareCentre(queen);
			const queenPiece = context.stateGameDerived.pieceAt(queen);
			let total = 1;
			context.stateGame.multiplier = 1;
			cameraDerived.zoomTo(queen, cameraDerived.ZOOM.collect);
			for (const spot of spots) {
				const from = context.stateGameDerived.squareCentre(spot);
				const item: Flying = {
					id: nextFlying++,
					text: `${spot.op}${spot.value}`,
					colour: spot.op === '+' ? BOARD_COLOURS.spotAdd : BOARD_COLOURS.spot,
					x: new Tween(from.x),
					y: new Tween(from.y),
					scale: new Tween(1),
				};
				flying = [...flying, item];
				context.stateGame.spots = context.stateGame.spots.filter(
					(other) => other.reel !== spot.reel || other.row !== spot.row,
				);
				const duration = MOVE_TIMING.slide / timeScale();
				item.scale.set(1.5, { duration: duration * 0.4 }).then(() => item.scale.set(0.5, { duration: duration * 0.6, easing: cubicIn }));
				await Promise.all([
					item.x.set(target.x, { duration, easing: cubicIn }),
					item.y.set(target.y, { duration, easing: cubicIn }),
				]);
				// by id: the array is state, so its items are proxies and never the item itself
				flying = flying.filter((other) => other.id !== item.id);
				total = spot.op === '+' ? total + spot.value : total * spot.value;
				context.stateGame.multiplier = total;
				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
				context.eventEmitter.broadcast({ type: 'multiplierPulse' });
				cameraDerived.nudge(SYMBOL_SIZE * 0.025, 0.015);
				if (queenPiece) {
					queenPiece.scale.set(1.25, { duration: 90 / timeScale() }).then(() => queenPiece.scale.set(1, { duration: 220 / timeScale(), easing: cubicOut }));
				}
			}
			cameraDerived.reset();
		},
	});
</script>

{#if context.stateGame.playBoardShown}
	<BoardContainer sortableChildren>
		{#each context.stateGame.pieces as piece (piece.id)}
			<Piece
				x={piece.x.current}
				y={piece.y.current}
				symbol={piece.symbol}
				scale={piece.scale.current}
				alpha={piece.alpha.current * dim(piece)}
				tint={tint(piece)}
				zIndex={piece.id === moving ? 10 : piece.gone ? 5 : 1}
			/>
		{/each}
		{#each flying as item (item.id)}
			<Text
				text={item.text}
				anchor={0.5}
				x={item.x.current}
				y={item.y.current}
				scale={item.scale.current}
				zIndex={20}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: SYMBOL_SIZE * 0.4,
					fontWeight: '800',
					fill: item.colour,
					stroke: { color: 0x1a1208, width: 5 },
				}}
			/>
		{/each}
	</BoardContainer>
{/if}
