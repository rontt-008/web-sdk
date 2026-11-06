<script lang="ts" module>
	import type { BookEventOfType, KingThrow, Spot } from '../game/typesBookEvent';
	import type { Position } from '../game/types';

	export type EmitterEventPlayBoard =
		| { type: 'playBoardMove'; move: BookEventOfType<'move'> }
		| { type: 'playBoardCollect'; queen: Position; spots: Spot[] }
		// SUPER BONUS: the king's multipliers fly from him to their spots, one after another, each spot
		// taking its new value as one lands (done when all have)
		| { type: 'playBoardThrow'; king: Position; throws: KingThrow[] }
		// the pieces at these squares swell and settle `times` over (done when they have)
		| { type: 'playBoardPulse'; positions: Position[]; times: number }
		// the pieces drop off the bottom of the board, column by column (done when they have gone)
		| { type: 'playBoardDrop' }
		// the piece on this square is taken (bursts and goes): an en passant's pawn (done when it has gone)
		| { type: 'playBoardTake'; position: Position }
		// one piece slides to a square the way a move does (lifted, over the others), in `duration` ms;
		// a square off the board takes it away (done when it is there). It lands with its own move's
		// sound, or `sound` instead (castling's rook)
		| { type: 'playBoardSlide'; id: number; to: Position; duration: number; off?: boolean; sound?: 'castle' };
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
	import { badgeCell, spotCells } from '../game/spotShape';
	import { BOOSTER_MODE } from '../game/betModes';
	import type { PlayPiece } from '../game/stateGame.svelte';
	import { cameraDerived } from '../game/camera.svelte';
	import { chessSound } from '../game/chessSounds';
	import BoardContainer from './BoardContainer.svelte';
	import Piece from './Piece.svelte';

	// The pieces once landed, moved about by the spin's moves: the piece slides to its square (a little
	// bigger on the way, over the others), a taken piece swells and bursts as it arrives, a pawn that
	// promotes changes into a queen; a king in check pulses, with the line of the check drawn
	// (BoardSquares). The camera (camera.svelte.ts) glides in on the square the move lands on, nudges
	// as a piece is taken, and drifts back out. In DUMB MODE the other side's pieces
	// are greyed. In CHEATER MODE the multiplier spots fly into your queen one by one, each going into
	// the multiplier (a + adds, a x multiplies). The reels (Board) take over again for the next spin.
	const context = getContext();
	const timeScale = () => stateBetDerived.timeScale();

	// a spot on its way to the queen
	type Flying = { id: number; text: string; colour: number; x: Tween<number>; y: Tween<number>; scale: Tween<number> };

	let moving = $state<number | undefined>(undefined);
	let flying = $state<Flying[]>([]);
	let nextFlying = 1;

	// a king's multiplier on its way to a spot: along an arc from `from` to `to` as `progress` goes 0-1,
	// highest (THROW.arc) halfway, swelling there
	type Thrown = { id: number; text: string; from: { x: number; y: number }; to: { x: number; y: number }; progress: Tween<number> };
	let thrown = $state<Thrown[]>([]);
	const THROW = { flight: 620, gap: 140, arc: SYMBOL_SIZE * 1.4, swell: 0.6 };
	const thrownAt = (item: Thrown) => {
		const t = item.progress.current;
		return {
			x: item.from.x + (item.to.x - item.from.x) * t,
			y: item.from.y + (item.to.y - item.from.y) * t - Math.sin(Math.PI * t) * THROW.arc,
			scale: 1 + Math.sin(Math.PI * t) * THROW.swell,
		};
	};

	const dumbMode = $derived(stateBet.activeBetModeKey === BOOSTER_MODE);
	// no fading of the side not on the move: faded white pieces took the board's blue (the turn tag and
	// the side panel say whose move it is)
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
			// silent (the user's wish): the spin is heard in the next pieces landing
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
		playBoardTake: async ({ position }) => {
			const piece = context.stateGameDerived.pieceAt(position);
			if (piece) await burst(piece);
		},
		playBoardSlide: async ({ id, to, duration, off, sound }) => {
			const piece = context.stateGame.pieces.find((candidate) => candidate.id === id);
			if (!piece) return;
			const ms = duration / timeScale();
			moving = piece.id;
			// one going off is picked up and taken away; it never lands
			if (off) chessSound.pick();
			if (off) piece.gone = true;
			else {
				piece.reel = to.reel;
				piece.row = to.row;
			}
			const { x, y } = context.stateGameDerived.squareCentre(to);
			piece.scale
				.set(1.18, { duration: ms * 0.45, easing: cubicOut })
				.then(() => piece.scale.set(1, { duration: ms * 0.55, easing: cubicInOut }));
			await Promise.all([
				piece.x.set(x, { duration: ms, easing: cubicInOut }),
				piece.y.set(y, { duration: ms, easing: cubicInOut }),
			]);
			if (sound === 'castle') chessSound.castle();
			else if (!off) chessSound.move(piece.symbol);
			moving = undefined;
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
			context.stateGame.checkLines = [];
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
			// it lands: its own sound, the clack of the piece it takes over it
			chessSound.move(piece.symbol);
			if (target) chessSound.take(target.symbol, move.side);
			if (move.promotion) {
				piece.symbol = move.promotion;
				chessSound.promote();
				cameraDerived.nudge(SYMBOL_SIZE * 0.03, 0.02);
			}
			if (target) await burst(target);
			moving = undefined;
			// the camera stays on a mate for its label (the checkmate handler lets it go)
			if (!move.mate) cameraDerived.reset();
			if (move.check) {
				// a mate has its own sound, with its label (the checkmate event, or the start screen's)
				if (!move.mate) chessSound.check(move.side);
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
		// the king's multipliers arc out to their spots one after another (a beat apart), each spot taking
		// its new value as its multiplier lands (BoardSquares counts it up and its look climbs)
		playBoardThrow: async ({ king, throws }) => {
			const from = context.stateGameDerived.squareCentre(king);
			const kingPiece = context.stateGameDerived.pieceAt(king);
			const flights = throws.map(async (throwAt, index) => {
				await waitForTimeout((index * (THROW.flight * 0.5 + THROW.gap)) / timeScale());
				if (kingPiece) {
					kingPiece.scale.set(1.2, { duration: 90 / timeScale() }).then(() => kingPiece.scale.set(1, { duration: 200 / timeScale(), easing: cubicOut }));
				}
				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
				// at the square its value shows on (a merged spot's top right one)
				const target = context.stateGame.spots.find((spot) => spot.reel === throwAt.reel && spot.row === throwAt.row);
				const item: Thrown = {
					id: nextFlying++,
					text: `x${throwAt.mult}`,
					from,
					to: context.stateGameDerived.squareCentre(target ? badgeCell(spotCells(target)) : throwAt),
					progress: new Tween(0),
				};
				thrown = [...thrown, item];
				await item.progress.set(1, { duration: THROW.flight / timeScale(), easing: cubicInOut });
				thrown = thrown.filter((other) => other.id !== item.id);
				// the spot takes its new value (BoardSquares counts it up)
				context.stateGame.spots = context.stateGame.spots.map((spot) =>
					spot.reel === throwAt.reel && spot.row === throwAt.row ? { ...spot, value: throwAt.value } : spot,
				);
				context.eventEmitter.broadcast({ type: 'soundOnce', name: throwAt.max ? 'sfx_multiplier_win' : 'sfx_multiplier_up' });
				cameraDerived.nudge(SYMBOL_SIZE * (throwAt.max ? 0.06 : 0.025), 0.015);
			});
			await Promise.all(flights);
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
				alpha={piece.alpha.current}
				tint={tint(piece)}
				zIndex={piece.id === moving || piece.id === context.stateGame.dragging ? 10 : piece.gone ? 5 : 1}
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
		<!-- the king's multipliers in flight, in the gold of the x spots -->
		{#each thrown as item (item.id)}
			{@const at = thrownAt(item)}
			<Text
				text={item.text}
				anchor={0.5}
				x={at.x}
				y={at.y}
				scale={at.scale}
				zIndex={20}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: SYMBOL_SIZE * 0.42,
					fontWeight: '800',
					fill: BOARD_COLOURS.spot,
					stroke: { color: 0x1a1208, width: 6 },
				}}
			/>
		{/each}
	</BoardContainer>
{/if}
