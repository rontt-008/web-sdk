<script lang="ts">
	import { onMount } from 'svelte';
	import type * as PIXI from 'pixi.js';
	import { Container, Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { INITIAL_BOARD, MOVE_TIMING } from '../game/constants';
	import { waitForTimeout } from 'utils-shared/wait';
	import { stateBetDerived } from 'state-shared';

	import { inCheck, isMine, legalMoves, makeMove, positionKey, type BoardPiece } from '../game/chess';
	import { engineMove } from '../game/engine';
	import type { Position } from '../game/types';
	import type { BookEventOfType } from '../game/typesBookEvent';

	// The start screen is a game of chess against the game's own engine (engine.ts): the starting
	// position stands on the play board until the first spin, the player moves a piece of their side,
	// any legal move, and the engine answers for the other side after a beat. Click a piece (its squares
	// light up), then the square to go to; a taken piece bursts, a pawn on the last row becomes a queen,
	// check and checkmate are called. The board is a texture on a tilted mesh, which takes no presses, so the
	// clicks land on a clear, flat area over it, each point mapped back through the tilt to its square
	// (stateGameDerived.squareAt). The first spin drops the pieces off and ends the game.
	const context = getContext();

	const quad = $derived(context.stateGameDerived.boardQuad());
	const left = $derived(Math.min(quad[0], quad[6]));
	const right = $derived(Math.max(quad[2], quad[4]));
	const top = $derived(Math.min(quad[1], quad[3]));
	const bottom = $derived(Math.max(quad[5], quad[7]));
	const active = $derived(context.stateGame.sandbox && context.stateXstateDerived.isIdle());

	let busy = false;

	const boardPieces = (): BoardPiece[] =>
		context.stateGame.pieces.filter((piece) => !piece.gone).map(({ symbol, reel, row }) => ({ symbol, reel, row }));

	// the starting position, once the game is shown
	onMount(() => {
		context.stateGameDerived.initPlayBoard(INITIAL_BOARD);
		context.stateGame.playBoardShown = true;
		context.eventEmitter.broadcast({ type: 'boardHide' });
	});

	const select = (square: Position | undefined) => {
		const piece = square && context.stateGameDerived.pieceAt(square);
		const turn = context.stateGame.sandboxTurn;
		if (!piece || isMine(piece.symbol) !== (turn === 'you')) {
			context.stateGame.selected = undefined;
			context.stateGame.targets = [];
			return;
		}
		context.stateGame.selected = square;
		context.stateGame.targets = legalMoves(boardPieces(), turn)
			.filter((move) => positionKey(move.from) === positionKey(square))
			.map((move) => move.to);
	};

	const play = async (from: Position, to: Position) => {
		const pieces = boardPieces();
		const turn = context.stateGame.sandboxTurn;
		const move = legalMoves(pieces, turn).find(
			(candidate) => positionKey(candidate.from) === positionKey(from) && positionKey(candidate.to) === positionKey(to),
		);
		if (!move) return;
		busy = true;
		context.stateGame.selected = undefined;
		context.stateGame.targets = [];
		const other = turn === 'you' ? 'them' : 'you';
		const after = makeMove(pieces, move);
		const check = inCheck(after, other);
		const mate = check && legalMoves(after, other).length === 0;
		const mover = context.stateGameDerived.pieceAt(from);
		const taken = context.stateGameDerived.pieceAt(to);
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
		context.eventEmitter.broadcast({ type: 'soundOnce', name: taken ? 'sfx_multiplier_explosion_a' : 'sfx_royals_landing' });
		await context.eventEmitter.broadcastAsync({ type: 'playBoardMove', move: event });
		// the side panel's list of moves
		context.stateGame.moves = [...context.stateGame.moves, { side: turn, piece: event.piece, from, to, captured: taken?.symbol, promotion: move.promotion, check, mate }];
		context.stateGame.sandboxTurn = other;
		context.stateGame.turn = mate ? undefined : other;
		if (mate) {
			context.eventEmitter.broadcast({ type: 'moveLabel', text: 'CHECKMATE', kind: 'info', hold: MOVE_TIMING.mate });
		} else if (check) {
			context.eventEmitter.broadcast({ type: 'moveLabel', text: 'CHECK', kind: 'info', hold: MOVE_TIMING.label });
		} else if (legalMoves(after, other).length === 0) {
			context.eventEmitter.broadcast({ type: 'moveLabel', text: 'STALEMATE', kind: 'info', hold: MOVE_TIMING.mate });
		}
		busy = false;
		// the engine's answer, after a beat as if thinking
		if (turn === 'you' && !mate && legalMoves(after, other).length > 0) {
			busy = true;
			await waitForTimeout(MOVE_TIMING.engineThink / stateBetDerived.timeScale());
			const reply = context.stateGame.sandbox ? engineMove(boardPieces(), 'them') : undefined;
			busy = false;
			if (reply) await play(reply.from, reply.to);
		}
	};

	const down = (event: PIXI.FederatedPointerEvent) => {
		if (!active || busy || event.button !== 0) return;
		const local = event.currentTarget.toLocal(event.global);
		const square = context.stateGameDerived.squareAt(local.x, local.y);
		const selected = context.stateGame.selected;
		if (selected && square && context.stateGame.targets.some((target) => positionKey(target) === positionKey(square))) {
			play(selected, square);
			return;
		}
		select(square);
	};
</script>

{#if active}
	<Container eventMode="static" cursor="pointer" onpointerdown={down}>
		<Rectangle x={left} y={top} width={right - left} height={bottom - top} backgroundAlpha={0.001} />
	</Container>
{/if}
