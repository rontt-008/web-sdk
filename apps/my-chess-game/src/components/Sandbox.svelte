<script lang="ts" module>
	// the start screen's buttons (SandboxControls): the game begun again; the engine's best moves for the
	// player shown on the board (BoardHints)
	export type EmitterEventSandbox = { type: 'sandboxRestart' } | { type: 'sandboxHint' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import type * as PIXI from 'pixi.js';
	import { Container, Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { INITIAL_BOARD, MOVE_TIMING, SYMBOL_SIZE, BOARD_SIZES, BOARD_DIMENSIONS, SANDBOX_LEVELS, SANDBOX_DEFAULT_ELO, SANDBOX_HINTS, BLUNDER } from '../game/constants';
	import type { SymbolName } from '../game/types';
	import { waitForTimeout } from 'utils-shared/wait';
	import { stateBetDerived } from 'state-shared';

	import { castlingRook, freshRules, fromUci, inCheck, isMine, legalMoves, makeMove, positionKey, rulesAfter, toFen, type BoardPiece, type MoveRules } from '../game/chess';
	import { engineMove } from '../game/engine';
	import { lozzaAnalyse, lozzaBestMove, lozzaPrepare, lozzaTopMoves } from '../game/lozza';
	import { bookMoves } from '../game/openings';
	import { chessSound } from '../game/chessSounds';
	import type { Position } from '../game/types';
	import type { PlayPiece } from '../game/stateGame.svelte';
	import type { BookEventOfType } from '../game/typesBookEvent';

	// The start screen is a game of chess against Lozza (lozza.ts, a UCI engine in a worker; the game's
	// own engine, engine.ts, stands in if it can't be had): the starting
	// position stands on the play board until the first spin, the player moves a piece of their side,
	// any legal move, and the engine answers for the other side after a beat. Click a piece (its squares
	// light up), then the square to go to; a taken piece bursts, a pawn on the last row becomes a queen,
	// check and checkmate are called. Castling and en passant are played too (the math's spins have
	// neither: their positions have no history), the rules kept here (MoveRules). A piece can be dragged too, held and dropped on its square, as on
	// chess sites; dropped anywhere else it goes back and stays picked up. The board is a texture on a tilted mesh, which takes no presses, so the
	// clicks land on a clear, flat area over it, each point mapped back through the tilt to its square
	// (stateGameDerived.squareAt). A spin drops the pieces off and ends the game. Once a round is over
	// and nothing happens for a while (MOVE_TIMING.sandboxReturn), the pieces on the board slide back to
	// their starting squares, any extra ones slide off, the missing ones come in from the sides (yours
	// from the left, the other side's from the right), and the game is on again.
	const context = getContext();

	const quad = $derived(context.stateGameDerived.boardQuad());
	const left = $derived(Math.min(quad[0], quad[6]));
	const right = $derived(Math.max(quad[2], quad[4]));
	const top = $derived(Math.min(quad[1], quad[3]));
	const bottom = $derived(Math.max(quad[5], quad[7]));
	const active = $derived(context.stateGame.sandbox && context.stateXstateDerived.isIdle());

	let busy = false;
	// castling rights and the en passant square, from the start of each game
	let rules: MoveRules = freshRules();
	// which game this is: an engine answer that arrives for an earlier one is dropped
	let game = 0;

	const boardPieces = (): BoardPiece[] =>
		context.stateGame.pieces.filter((piece) => !piece.gone).map(({ symbol, reel, row }) => ({ symbol, reel, row }));

	// the starting position, once the game is shown
	onMount(() => {
		context.stateGameDerived.initPlayBoard(INITIAL_BOARD);
		context.stateGame.playBoardShown = true;
		context.eventEmitter.broadcast({ type: 'boardHide' });
		lozzaPrepare();
	});

	// the other side's move at the strength picked (SANDBOX_LEVELS): Lozza's, or the game's own engine's
	// without it; the weaker levels play any legal move now and then
	const opponentMove = async (pieces: BoardPiece[]) => {
		// in the opening book (openings.ts): one of its lines, at random
		const book = bookMoves(pieces, 'them', rules);
		if (book.length) return book[Math.floor(Math.random() * book.length)];
		const level = SANDBOX_LEVELS.find((candidate) => candidate.elo === context.stateGame.sandboxElo) ?? SANDBOX_LEVELS.find((candidate) => candidate.elo === SANDBOX_DEFAULT_ELO)!;
		if (level.blunder && Math.random() < level.blunder) {
			const moves = legalMoves(pieces, 'them', rules);
			if (moves.length) return moves[Math.floor(Math.random() * moves.length)];
		}
		const uci = await lozzaBestMove(toFen(pieces, 'them', rules), level.depth);
		const squares = uci && fromUci(uci);
		if (squares) {
			const move = legalMoves(pieces, 'them', rules).find(
				(candidate) => positionKey(candidate.from) === positionKey(squares.from) && positionKey(candidate.to) === positionKey(squares.to),
			);
			if (move) return move;
		}
		return engineMove(pieces, 'them', rules);
	};

	// the starting squares of each kind of piece: WP: the eight of row 7, and so on
	const STARTS = new Map<SymbolName, Position[]>();
	INITIAL_BOARD.forEach((reel, reelIndex) =>
		reel.forEach((raw, row) => {
			if (row < 1 || row > BOARD_DIMENSIONS.y || raw.name === 'E') return;
			STARTS.set(raw.name, [...(STARTS.get(raw.name) ?? []), { reel: reelIndex, row }]);
		}),
	);

	// after a round, with nothing happening for a while, the pieces go back to the start and the game is on
	const idle = $derived(context.stateXstateDerived.isIdle());
	let returning = false;
	$effect(() => {
		if (!idle || context.stateGame.sandbox || !context.stateGame.playBoardShown) return;
		const timer = setTimeout(restore, MOVE_TIMING.sandboxReturn);
		return () => clearTimeout(timer);
	});

	// RESTART (SandboxControls): the game in play is dropped and the pieces go back to the start.
	// HINT: the engine's best moves for the player go on the board, until the player moves.
	let hinting = false;
	context.eventEmitter.subscribeOnMount({
		sandboxRestart: async () => {
			if (!context.stateGame.sandbox || returning) return;
			game++;
			busy = false;
			context.stateGame.hints = [];
			context.stateGame.blunder = undefined;
			context.stateGame.sandbox = false;
			context.stateGame.selected = undefined;
			context.stateGame.targets = [];
			context.stateGame.dragging = undefined;
			drag = undefined;
			await restore();
		},
		sandboxHint: async () => {
			if (!active || busy || hinting || context.stateGame.sandboxTurn !== 'you') return;
			hinting = true;
			const thisGame = game;
			const pieces = boardPieces();
			const legal = legalMoves(pieces, 'you', rules);
			// in the opening book: its main line's move
			const book = bookMoves(pieces, 'you', rules);
			if (book.length) {
				hinting = false;
				context.stateGame.hints = [{ rank: 1, from: book[0].from, to: book[0].to }];
				return;
			}
			const top = await lozzaTopMoves(toFen(pieces, 'you', rules), SANDBOX_HINTS.depth, SANDBOX_HINTS.count);
			hinting = false;
			if (thisGame !== game || !context.stateGame.sandbox || context.stateGame.sandboxTurn !== 'you') return;
			const hints: { rank: number; from: Position; to: Position }[] = [];
			for (const { move: uci } of top) {
				const squares = fromUci(uci);
				const move = squares && legal.find((candidate) => positionKey(candidate.from) === positionKey(squares.from) && positionKey(candidate.to) === positionKey(squares.to));
				if (move) hints.push({ rank: hints.length + 1, from: move.from, to: move.to });
			}
			// without the engine, the game's own engine's one best move
			if (!hints.length) {
				const own = engineMove(pieces, 'you', rules);
				if (own) hints.push({ rank: 1, from: own.from, to: own.to });
			}
			context.stateGame.hints = hints;
		},
	});

	const restore = async () => {
		if (returning || context.stateGame.sandbox || !context.stateXstateDerived.isIdle()) return;
		returning = true;
		const game = context.stateGame;
		game.lastMove = undefined;
		game.checkSquare = undefined;
		game.checkLines = [];
		game.attackSquare = undefined;
		game.spots = [];
		game.analysis = undefined;
		game.moves = [];
		game.turn = undefined;
		const distance = (a: Position, b: Position) => Math.hypot(a.reel - b.reel, a.row - b.row);
		const free = new Map([...STARTS].map(([symbol, squares]) => [symbol, [...squares]]));
		const onBoard = game.pieces.filter((candidate) => !candidate.gone);
		// a piece already on a starting square of its kind stays; the rest go to the nearest free one,
		// one with none left (a promoted queen) off its own side
		for (const piece of onBoard) {
			const squares = free.get(piece.symbol) ?? [];
			const home = squares.findIndex((square) => square.reel === piece.reel && square.row === piece.row);
			if (home >= 0) squares.splice(home, 1);
		}
		const moves: { piece: (typeof onBoard)[number]; to: Position; off: boolean }[] = [];
		for (const piece of onBoard) {
			const here = { reel: piece.reel, row: piece.row };
			const squares = free.get(piece.symbol) ?? [];
			if ((STARTS.get(piece.symbol) ?? []).some((square) => square.reel === here.reel && square.row === here.row)) continue;
			if (squares.length) {
				squares.sort((a, b) => distance(a, here) - distance(b, here));
				moves.push({ piece, to: squares.shift()!, off: false });
			} else {
				const reel = isMine(piece.symbol) ? -2 : BOARD_DIMENSIONS.x + 1;
				moves.push({ piece, to: { reel, row: piece.row }, off: true });
			}
		}
		// Each piece goes home the way it moves: a knight in its jumps, a bishop along diagonals, a rook
		// and a queen along lines, a king a square at a time (a pawn too, straight or diagonally: it can't
		// go back in chess, so this is the nearest thing), the other pieces in the way blocking it, one
		// move at a time. A piece whose way is blocked waits for the others; one that never gets a way
		// slides straight there in the end.
		const occupied = new Set(onBoard.map((piece) => `${piece.reel}:${piece.row}`));
		const key = (square: Position) => `${square.reel}:${square.row}`;
		const inside = (square: Position) => square.reel >= 0 && square.reel < BOARD_DIMENSIONS.x && square.row >= 1 && square.row <= BOARD_DIMENSIONS.y;
		const STEPS: Record<string, number[][]> = {
			N: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
			K: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
			P: [[-1, -1], [-1, 1], [1, -1], [1, 1], [0, -1], [0, 1]],
		};
		const DIRS: Record<string, number[][]> = {
			B: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
			R: [[-1, 0], [1, 0], [0, -1], [0, 1]],
			Q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]],
		};
		const reach = (kind: string, from: Position, taken: Set<string>): Position[] => {
			const squares: Position[] = [];
			if (STEPS[kind]) {
				for (const [dReel, dRow] of STEPS[kind]) {
					const to = { reel: from.reel + dReel, row: from.row + dRow };
					if (inside(to) && !taken.has(key(to))) squares.push(to);
				}
			} else {
				for (const [dReel, dRow] of DIRS[kind] ?? []) {
					let to = { reel: from.reel + dReel, row: from.row + dRow };
					while (inside(to) && !taken.has(key(to))) {
						squares.push(to);
						to = { reel: to.reel + dReel, row: to.row + dRow };
					}
				}
			}
			return squares;
		};
		// the fewest moves from one square to another, or none
		const path = (kind: string, from: Position, to: Position, taken: Set<string>): Position[] | undefined => {
			const before = new Map<string, Position | undefined>([[key(from), undefined]]);
			const queue = [from];
			while (queue.length) {
				const here = queue.shift()!;
				if (key(here) === key(to)) {
					const steps: Position[] = [];
					for (let at: Position | undefined = here; at && key(at) !== key(from); at = before.get(key(at))) steps.unshift(at);
					return steps;
				}
				for (const next of reach(kind, here, taken)) {
					if (before.has(key(next))) continue;
					before.set(key(next), here);
					queue.push(next);
				}
			}
			return undefined;
		};
		// each step lands with the piece's own sound (the play board's)
		const slide = async (piece: (typeof onBoard)[number], to: Position, off = false) => {
			await context.eventEmitter.broadcastAsync({ type: 'playBoardSlide', id: piece.id, to, duration: MOVE_TIMING.returnMove, off });
		};
		let waiting = moves;
		let forced = false;
		while (waiting.length) {
			const later: typeof waiting = [];
			let progress = false;
			for (const move of waiting) {
				if (!context.stateXstateDerived.isIdle()) {
					returning = false;
					return;
				}
				const { piece, to, off } = move;
				const from = { reel: piece.reel, row: piece.row };
				occupied.delete(key(from));
				if (off) {
					await slide(piece, to, true);
					progress = true;
					continue;
				}
				const kind = piece.symbol[1];
				const steps = forced ? undefined : path(kind, from, to, occupied);
				if (!steps && !forced) {
					occupied.add(key(from));
					later.push(move);
					continue;
				}
				for (const step of steps ?? [to]) await slide(piece, step);
				occupied.add(key(to));
				progress = true;
			}
			// nothing could move: the rest go straight
			forced = !progress;
			waiting = later;
		}
		game.pieces = game.pieces.filter((piece) => !piece.gone);
		// the missing pieces come in from the sides, one at a time
		for (const [symbol, squares] of free) {
			for (const square of squares) {
				if (!context.stateXstateDerived.isIdle()) {
					returning = false;
					return;
				}
				const { y } = context.stateGameDerived.squareCentre(square);
				const fromX = isMine(symbol) ? -SYMBOL_SIZE * 1.5 : BOARD_SIZES.width + SYMBOL_SIZE * 1.5;
				const piece = context.stateGameDerived.addPiece(symbol, square, { x: fromX, y });
				await context.eventEmitter.broadcastAsync({ type: 'playBoardSlide', id: piece.id, to: square, duration: MOVE_TIMING.returnMove });
			}
		}
		returning = false;
		if (!context.stateXstateDerived.isIdle()) return;
		game.sandboxTurn = 'you';
		game.selected = undefined;
		game.targets = [];
		game.turn = 'you';
		rules = freshRules();
		game.sandbox = true;
	};

	const select = (square: Position | undefined) => {
		const piece = square && context.stateGameDerived.pieceAt(square);
		const turn = context.stateGame.sandboxTurn;
		if (!piece || isMine(piece.symbol) !== (turn === 'you')) {
			context.stateGame.selected = undefined;
			context.stateGame.targets = [];
			return;
		}
		context.stateGame.selected = square;
		context.stateGame.targets = legalMoves(boardPieces(), turn, rules)
			.filter((move) => positionKey(move.from) === positionKey(square))
			.map((move) => move.to);
	};

	const play = async (from: Position, to: Position) => {
		const pieces = boardPieces();
		const turn = context.stateGame.sandboxTurn;
		const choices = legalMoves(pieces, turn, rules);
		const move = choices.find(
			(candidate) => positionKey(candidate.from) === positionKey(from) && positionKey(candidate.to) === positionKey(to),
		);
		if (!move) return;
		busy = true;
		context.stateGame.hints = [];
		if (turn === 'you') context.stateGame.blunder = undefined;
		context.stateGame.selected = undefined;
		context.stateGame.targets = [];
		// the engine's view before the player's move, to tell a blunder (asked while the move plays)
		const judging = turn === 'you' ? lozzaAnalyse(toFen(pieces, 'you', rules), BLUNDER.depth) : undefined;
		const other = turn === 'you' ? 'them' : 'you';
		const after = makeMove(pieces, move);
		const rulesNext = rulesAfter(rules, move, context.stateGameDerived.pieceAt(from)?.symbol ?? 'E');
		const check = inCheck(after, other);
		const mate = check && legalMoves(after, other, rulesNext).length === 0;
		const mover = context.stateGameDerived.pieceAt(from);
		const taken = context.stateGameDerived.pieceAt(move.enPassant ?? to);
		const event: BookEventOfType<'move'> = {
			index: 0,
			type: 'move',
			side: turn,
			from,
			to,
			piece: mover?.symbol ?? 'E',
			captured: taken?.symbol,
			promotion: move.promotion,
			check,
			mate,
			win: 0,
			multiplier: 1,
		};
		context.stateGame.turn = turn;
		// the move's sounds are the play board's, as the piece lands
		await context.eventEmitter.broadcastAsync({ type: 'playBoardMove', move: event });
		// a castling's rook comes over; an en passant's pawn, passed, is taken
		if (move.castle) {
			const rook = castlingRook(move);
			const rookPiece = context.stateGameDerived.pieceAt(rook.from);
			if (rookPiece) await context.eventEmitter.broadcastAsync({ type: 'playBoardSlide', id: rookPiece.id, to: rook.to, duration: MOVE_TIMING.slide, sound: 'castle' }); // prettier-ignore
		}
		if (move.enPassant) {
			if (taken) chessSound.take(taken.symbol, turn);
			await context.eventEmitter.broadcastAsync({ type: 'playBoardTake', position: move.enPassant });
		}
		rules = rulesNext;
		// the side panel's list of moves
		context.stateGame.moves = [...context.stateGame.moves, { side: turn, piece: event.piece, from, to, captured: taken?.symbol, promotion: move.promotion, check, mate }];
		// a blunder: the engine's view before the move against its view after it (from the other side,
		// so turned round), the move this much worse than the engine's best
		if (judging && !mate) {
			const before = await judging;
			const afterView = before ? await lozzaAnalyse(toFen(after, other, rules), BLUNDER.depth) : undefined;
			if (before && afterView && before.score + afterView.score >= BLUNDER.loss && context.stateGame.sandbox) {
				context.stateGame.blunder = to;
			}
		}
		context.stateGame.sandboxTurn = other;
		context.stateGame.turn = mate ? undefined : other;
		if (mate) {
			chessSound.mate(turn);
			context.eventEmitter.broadcast({ type: 'moveLabel', text: 'CHECKMATE', kind: 'info', hold: MOVE_TIMING.mate });
		} else if (check) {
			context.eventEmitter.broadcast({ type: 'moveLabel', text: 'CHECK', kind: 'info', hold: MOVE_TIMING.label });
		} else if (legalMoves(after, other, rules).length === 0) {
			context.eventEmitter.broadcast({ type: 'moveLabel', text: 'STALEMATE', kind: 'info', hold: MOVE_TIMING.mate });
		}
		busy = false;
		// the engine's answer, after a beat as if thinking
		if (turn === 'you' && !mate && legalMoves(after, other, rules).length > 0) {
			busy = true;
			const thisGame = game;
			await waitForTimeout(MOVE_TIMING.engineThink / stateBetDerived.timeScale());
			const reply = context.stateGame.sandbox && thisGame === game ? await opponentMove(boardPieces()) : undefined;
			busy = false;
			if (reply && thisGame === game && context.stateGame.sandbox) await play(reply.from, reply.to);
		}
	};

	// a piece held under the pointer: it follows the pointer, lifted, and is dropped on a square;
	// `away` once it has been taken off its square (a click alone doesn't)
	let drag: { piece: PlayPiece; from: Position; away: boolean } | undefined;
	const isTarget = (square: Position | undefined) =>
		square !== undefined && context.stateGame.targets.some((target) => positionKey(target) === positionKey(square));

	const down = (event: PIXI.FederatedPointerEvent) => {
		if (!active || busy || event.button !== 0) return;
		const local = event.currentTarget.toLocal(event.global);
		const square = context.stateGameDerived.squareAt(local.x, local.y);
		const selected = context.stateGame.selected;
		if (selected && isTarget(square)) {
			play(selected, square!);
			return;
		}
		select(square);
		const piece = context.stateGame.selected && context.stateGameDerived.pieceAt(context.stateGame.selected);
		if (!piece || !square) return;
		drag = { piece, from: square, away: false };
		chessSound.pick();
		context.stateGame.dragging = piece.id;
		piece.scale.set(1.18, { duration: 120 / stateBetDerived.timeScale() });
	};
	const move = (event: PIXI.FederatedPointerEvent) => {
		if (!drag) return;
		const local = event.currentTarget.toLocal(event.global);
		const at = context.stateGameDerived.boardPointAt(local.x, local.y);
		const home = context.stateGameDerived.squareCentre(drag.from);
		if (Math.hypot(at.x - home.x, at.y - home.y) > SYMBOL_SIZE * 0.35) drag.away = true;
		drag.piece.x.set(at.x, { duration: 0 });
		drag.piece.y.set(at.y, { duration: 0 });
	};
	const up = (event: PIXI.FederatedPointerEvent) => {
		if (!drag) return;
		const { piece, from, away } = drag;
		drag = undefined;
		context.stateGame.dragging = undefined;
		const ms = 150 / stateBetDerived.timeScale();
		piece.scale.set(1, { duration: ms });
		const local = event.currentTarget.toLocal(event.global);
		const square = context.stateGameDerived.squareAt(local.x, local.y);
		if (active && !busy && isTarget(square) && positionKey(square!) !== positionKey(from)) {
			play(from, square!);
			return;
		}
		// back onto its square, still picked up (set down softly, once it lands, if it was taken off it)
		const home = context.stateGameDerived.squareCentre(from);
		piece.x.set(home.x, { duration: ms });
		piece.y.set(home.y, { duration: ms }).then(() => {
			if (away) chessSound.back();
		});
	};
</script>

{#if active}
	<Container eventMode="static" cursor="pointer" onpointerdown={down} onpointermove={move} onpointerup={up} onpointerupoutside={up}>
		<Rectangle x={left} y={top} width={right - left} height={bottom - top} backgroundAlpha={0.001} />
	</Container>
{/if}
