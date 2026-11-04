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
	import { Tween } from 'svelte/motion';
	import { quadInOut } from 'svelte/easing';

	import { BoardContext } from 'components-shared';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { stateBet, stateBetDerived } from 'state-shared';

	import TumbleBoardBase from './TumbleBoardBase.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import { findWildBlocks, getSymbolY } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { flownKey, type TumbleSymbol } from '../game/stateGame.svelte';

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

		const tumbleSymbol: TumbleSymbol = $state({
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
			// its big wilds, found on the board as it is now (each cell in its own row, none from the
			// padding rows above and below it), not again as symbols go and fall (the rows shift then)
			context.stateGame.tumbleBlocks = findWildBlocks(
				context.stateGame.tumbleBoardBase,
				(tumbleSymbol) => tumbleSymbol.rawSymbol.name === 'W' && !tumbleSymbol.gone,
			);
		},
		tumbleBoardReset: () => {
			context.stateGame.tumbleBoardAdding = [];
			context.stateGame.tumbleBoardBase = [];
			context.stateGame.tumbleBlocks = [];
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
			// a big wild that lost some of its cells is a big wild no more: the rest tumble one by one
			context.stateGame.tumbleBlocks = context.stateGame.tumbleBlocks.filter((block) =>
				block.cells.every((cell) => cell.symbolState !== 'explosion'),
			);
		},
		tumbleBoardSlideDown: async () => {
			const timeScale = stateBetDerived.timeScale();
			await waitForTimeout(FALL.pause / timeScale);

			// each falling symbol: where to, how long (longer the further it falls, quicker in turbo),
			// how long it waits, and whether it lands on the board (not the padding rows round it)
			const targetY = (symbolIndex: number) => getSymbolY(symbolIndex - 1); // Refer to initTumbleBoardBase
			type Fall = { to: number; duration: number; delay: number; lands: boolean };
			const falls = new Map<TumbleSymbol, Fall>();
			context.stateGameDerived.tumbleBoardCombined().forEach((tumbleReel, reelIndex) => {
				const falling = tumbleReel.map(
					(tumbleSymbol, symbolIndex) => targetY(symbolIndex) !== tumbleSymbol.symbolY.current,
				);
				tumbleReel.forEach((tumbleSymbol, symbolIndex) => {
					if (!falling[symbolIndex]) return;
					const distance = Math.abs(targetY(symbolIndex) - tumbleSymbol.symbolY.current);
					const fallingBelow = falling.slice(symbolIndex + 1).filter(Boolean).length;
					falls.set(tumbleSymbol, {
						to: targetY(symbolIndex),
						duration: (FALL.cell * Math.sqrt(distance / SYMBOL_SIZE)) / timeScale,
						delay: (FALL.reelDelay * reelIndex + FALL.rowDelay * fallingBelow) / timeScale,
						lands: symbolIndex > 0 && symbolIndex < tumbleReel.length - 1,
					});
				});
			});

			// A big wild falls as one, every cell with its lead (BigWild follows it), and lands once,
			// its lead waiting for that. One whose cells would fall unevenly (part of a column under it
			// went: the wind sweeping symbols off, say) is let go, its wilds falling and landing one by
			// one, so none waits for a landing the big wild doesn't play.
			const drop = (tumbleSymbol: TumbleSymbol) =>
				(falls.get(tumbleSymbol)?.to ?? tumbleSymbol.symbolY.current) -
				tumbleSymbol.symbolY.current;
			context.stateGame.tumbleBlocks = context.stateGame.tumbleBlocks.filter((block) =>
				block.cells.every((cell) => Math.abs(drop(cell) - drop(block.lead)) < 0.5),
			);
			const withLead = new Set<TumbleSymbol>();
			for (const block of context.stateGame.tumbleBlocks) {
				const lead = falls.get(block.lead);
				if (!lead) continue;
				for (const cell of block.cells) {
					const fall = falls.get(cell);
					if (cell === block.lead || !fall) continue;
					falls.set(cell, { ...fall, duration: lead.duration, delay: lead.delay });
					withLead.add(cell);
				}
			}

			const getPromises = () =>
				context.stateGameDerived.tumbleBoardCombined().flatMap((tumbleReel) => {
					let thudded = false;
					return tumbleReel.map(async (tumbleSymbol) => {
						const fall = falls.get(tumbleSymbol);
						if (!fall) return;
						await tumbleSymbol.symbolY.set(fall.to, {
							duration: fall.duration,
							delay: fall.delay,
							easing: quadInOut,
						});
						if (!fall.lands) return;

						// the first of the column to land thuds
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
						if (withLead.has(tumbleSymbol)) {
							tumbleSymbol.oncomplete = () => (tumbleSymbol.symbolState = 'static');
							return;
						}
						await waitForResolve((resolve) => {
							tumbleSymbol.oncomplete = () => {
								tumbleSymbol.symbolState = 'static';
								resolve();
							};
						});
					});
				});

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
