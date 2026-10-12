<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	export type EmitterEventBoard =
		| { type: 'boardSettle'; board: RawSymbol[][] }
		| { type: 'boardShow' }
		| { type: 'boardHide' }
		| {
				type: 'boardWithAnimateSymbols';
				symbolPositions: Position[];
		  };
</script>

<script lang="ts">
	import { Rectangle } from 'pixi-svelte';
	import { waitForResolve } from 'utils-shared/wait';
	import { BoardContext } from 'components-shared';

	import { getContext } from '../game/context';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import BoardBase from './BoardBase.svelte';
	import WinLine from './WinLine.svelte';

	const context = getContext();

	let show = $state(true);

	// while any reel moves, clicking the reels stops them all
	const spinning = $derived(
		context.stateGame.board.some((reel) => reel.reelState.motion !== 'stopped'),
	);

	// skip rather than stop, so a scatter anticipation is cut short too
	const skipSpin = () => context.stateGameDerived.enhancedBoard.skip();

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: skipSpin,
		boardSettle: ({ board }) => context.stateGameDerived.enhancedBoard.settle(board),
		boardShow: () => (show = true),
		boardHide: () => (show = false),
		boardWithAnimateSymbols: async ({ symbolPositions }) => {
			const getPromises = () =>
				symbolPositions.map(async (position) => {
					const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
					reelSymbol.symbolState = 'win';
					await waitForResolve((resolve) => (reelSymbol.oncomplete = resolve));
					reelSymbol.symbolState = 'postWinStatic';
				});

			await Promise.all(getPromises());
		},
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer>
			<BoardMask />
			<BoardBase />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer>
			<BoardBase />
		</BoardContainer>
	</BoardContext>

	<!-- on top of every symbol -->
	<WinLine />

	{#if spinning}
		<BoardContainer>
			<Rectangle
				eventMode="static"
				cursor="pointer"
				backgroundColor={0xffffff}
				backgroundAlpha={0.001}
				width={context.stateGameDerived.boardLayout().width}
				height={context.stateGameDerived.boardLayout().height}
				onpointerdown={skipSpin}
			/>
		</BoardContainer>
	{/if}
{/if}
