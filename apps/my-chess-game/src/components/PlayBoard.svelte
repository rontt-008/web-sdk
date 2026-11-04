<script lang="ts" module>
	import type { BookEventOfType } from '../game/typesBookEvent';

	export type EmitterEventPlayBoard = { type: 'playBoardMove'; move: BookEventOfType<'move'> };
</script>

<script lang="ts">
	import { cubicInOut, cubicOut } from 'svelte/easing';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { MOVE_TIMING } from '../game/constants';
	import type { PlayPiece } from '../game/stateGame.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import Piece from './Piece.svelte';

	// The pieces once landed, moved about by the spin's moves: the piece slides to its square (a little
	// bigger on the way, over the others), a taken piece bursts as it arrives, a pawn that promotes
	// changes into a queen. The reels (Board) take over again for the next spin.
	const context = getContext();
	const timeScale = () => stateBetDerived.timeScale();

	let moving = $state<number | undefined>(undefined);

	const burst = async (piece: PlayPiece) => {
		piece.gone = true;
		const duration = MOVE_TIMING.burst / timeScale();
		piece.scale.set(1.6, { duration, easing: cubicOut });
		await piece.alpha.set(0, { duration, easing: cubicOut });
		context.stateGame.pieces = context.stateGame.pieces.filter((other) => other !== piece);
	};

	context.eventEmitter.subscribeOnMount({
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
			piece.scale
				.set(1.18, { duration: duration * 0.45, easing: cubicOut })
				.then(() => piece.scale.set(1, { duration: duration * 0.55, easing: cubicInOut }));
			await Promise.all([
				piece.x.set(x, { duration, easing: cubicInOut }),
				piece.y.set(y, { duration, easing: cubicInOut }),
			]);
			if (move.promotion) piece.symbol = move.promotion;
			if (move.check) {
				context.stateGame.checkSquare = context.stateGameDerived.kingSquare(
					move.side === 'you' ? 'BK' : 'WK',
				);
			}
			if (target) await burst(target);
			moving = undefined;
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
				zIndex={piece.id === moving ? 10 : piece.gone ? 5 : 1}
			/>
		{/each}
	</BoardContainer>
{/if}
