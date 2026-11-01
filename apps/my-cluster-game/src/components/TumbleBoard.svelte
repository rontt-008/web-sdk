<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	type AddingBoard = RawSymbol[][];
	type ExplodingPositions = Position[];

	export type EmitterEventTumbleBoard =
		| { type: 'tumbleBoardShow' }
		| { type: 'tumbleBoardHide' }
		| { type: 'tumbleBoardInit'; addingBoard: AddingBoard }
		| { type: 'tumbleBoardReset' }
		| { type: 'tumbleBoardExplode'; explodingPositions: ExplodingPositions }
		| { type: 'tumbleBoardRemoveExploded' }
		| { type: 'tumbleBoardSlideDown' };
</script>

<script lang="ts">
	import _ from 'lodash';
	import { Tween } from 'svelte/motion';
	import { quadInOut } from 'svelte/easing';

	import { BoardContext } from 'components-shared';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { stateBet, stateBetDerived } from 'state-shared';

	import TumbleBoardBase from './TumbleBoardBase.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import { getSymbolY } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { flownKey } from '../game/stateGame.svelte';

	const context = getContext();

	// The board tumbles softly: a moment (pause ms) after the winners go, each symbol drops from rest,
	// speeding up, then slows to a stop right in its cell with no bounce (quadInOut), taking `cell` ms
	// to fall one cell (all five 540 ms, the time growing with the root of the distance; starting
	// later and falling further, none catches the one below), the columns from the left reelDelay ms
	// apart, in each the lowest first, rowDelay ms apart; then it settles (its 'land' motion, see
	// motion.ts), each column with a thud.
	const FALL = { pause: 80, cell: 240, reelDelay: 30, rowDelay: 25 };

	let show = $state(false);

	const createTumbleSymbol = ({ initY, rawSymbol }: { initY: number; rawSymbol: RawSymbol }) => {
		const symbolY = new Tween(initY);
		const oncomplete = () => {};

		const tumbleSymbol = $state({
			symbolY,
			rawSymbol,
			symbolState: 'static' as const,
			oncomplete,
		});

		return tumbleSymbol;
	};

	const initTumbleBoardAdding = ({ addingBoard }: { addingBoard: AddingBoard }) => {
		return context.stateGameDerived.boardRaw().map((_, reelIndex) => {
			const addingReel = addingBoard[reelIndex] ?? [];

			const tumbleReelAdding = addingReel.map((rawSymbol, symbolIndex) => {
				const initY = getSymbolY(symbolIndex - 1 - addingReel.length);
				return createTumbleSymbol({ initY, rawSymbol });
			});

			return tumbleReelAdding;
		});
	};

	// the board as it is, the symbols that have flown to the bonus meter already gone
	const initTumbleBoardBase = () => {
		return context.stateGameDerived.boardRaw().map((rawSymbolReel, reel) => {
			const tumbleReelBase = rawSymbolReel.map((rawSymbol, symbolIndex) => {
				const initY = getSymbolY(symbolIndex - 1);
				const tumbleSymbol = createTumbleSymbol({ initY, rawSymbol });
				tumbleSymbol.gone = context.stateGame.flown.includes(flownKey({ reel, row: symbolIndex }));
				return tumbleSymbol;
			});

			return tumbleReelBase;
		});
	};

	context.eventEmitter.subscribeOnMount({
		tumbleBoardShow: () => (show = true),
		tumbleBoardHide: () => (show = false),
		tumbleBoardInit: ({ addingBoard }) => {
			context.stateGame.tumbleBoardAdding = initTumbleBoardAdding({ addingBoard });
			context.stateGame.tumbleBoardBase = initTumbleBoardBase();
		},
		tumbleBoardReset: () => {
			context.stateGame.tumbleBoardAdding = [];
			context.stateGame.tumbleBoardBase = [];
			context.stateGame.flown = [];
		},
		// the winning symbols go (their 'explosion' state: they fade out, see SymbolVanish), those that
		// flew to the bonus meter at once
		tumbleBoardExplode: async ({ explodingPositions }) => {
			const getPromises = () =>
				explodingPositions.map(async (position) => {
					const tumbleSymbol = context.stateGame.tumbleBoardBase[position.reel][position.row];
					tumbleSymbol.symbolState = 'explosion';
					if (tumbleSymbol.gone) return;
					await waitForResolve((resolve) => (tumbleSymbol.oncomplete = resolve));
				});

			await Promise.all(getPromises());
		},
		tumbleBoardRemoveExploded: () => {
			context.stateGame.tumbleBoardBase.forEach((tumbleReel, reelIndex) => {
				context.stateGame.tumbleBoardBase[reelIndex] = tumbleReel.filter(
					(tumbleSymbol) => tumbleSymbol.symbolState !== 'explosion',
				);
			});
		},
		tumbleBoardSlideDown: async () => {
			const timeScale = stateBetDerived.timeScale();
			await waitForTimeout(FALL.pause / timeScale);

			const getPromises = () =>
				_.flatten(
					context.stateGameDerived.tumbleBoardCombined().map((tumbleReel, reelIndex) => {
						const targetY = (symbolIndex: number) => getSymbolY(symbolIndex - 1); // Refer to initTumbleBoardBase
						const falls = tumbleReel.map(
							(tumbleSymbol, symbolIndex) => targetY(symbolIndex) !== tumbleSymbol.symbolY.current,
						);
						let thudded = false;

						return tumbleReel.map(async (tumbleSymbol, symbolIndex) => {
							if (falls[symbolIndex]) {
								// longer the further it falls, quicker in turbo
								const distance = Math.abs(targetY(symbolIndex) - tumbleSymbol.symbolY.current);
								const duration = (FALL.cell * Math.sqrt(distance / SYMBOL_SIZE)) / timeScale;
								const fallingBelow = falls.slice(symbolIndex + 1).filter(Boolean).length;
								const delay =
									(FALL.reelDelay * reelIndex + FALL.rowDelay * fallingBelow) / timeScale;

								await tumbleSymbol.symbolY.set(targetY(symbolIndex), {
									duration,
									delay,
									easing: quadInOut,
								});

								// the first of the column to land thuds
								if (symbolIndex > 0 && symbolIndex < tumbleReel.length - 1) {
									if (!thudded) {
										thudded = true;
										context.eventEmitter.broadcast({
											type: 'soundOnce',
											name: 'sfx_reel_stop_1',
											forcePlay: !stateBet.isTurbo,
										});
									}
									tumbleSymbol.symbolState = 'land';
									context.stateGameDerived.onSymbolLand({ rawSymbol: tumbleSymbol.rawSymbol });
									await waitForResolve((resolve) => {
										tumbleSymbol.oncomplete = () => {
											tumbleSymbol.symbolState = 'static';
											resolve();
										};
									});
								}
							}
						});
					}),
				);

			await Promise.all(getPromises());
		},
	});
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer>
			<BoardMask />
			<TumbleBoardBase />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer>
			<TumbleBoardBase />
		</BoardContainer>
	</BoardContext>
{/if}
