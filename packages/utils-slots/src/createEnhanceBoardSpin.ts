import { stateBet } from 'state-shared';
import { waitForResolve } from 'utils-shared/wait';

import { stateSlots } from './stateSlots.svelte';
import type { Reel, GetRawSymbolFromReel } from './types';

export function createEnhanceBoardSpin<TReel extends Reel<any, any>>({
	board,
}: {
	board: TReel[];
}) {
	type TRawSymbol = GetRawSymbolFromReel<TReel>;

	let spinning = false;
	// set by skip during a spin: the reels all stop at once, so none starts anticipating
	let skipping = false;

	type BaseRevealEvent = {
		index: number;
		type: 'reveal';
		board: TRawSymbol[][];
		anticipation: number[];
		paddingPositions?: number[];
	};

	async function spin<RevealEvent extends BaseRevealEvent>({
		revealEvent,
		paddingBoard,
	}: {
		revealEvent: RevealEvent;
		paddingBoard?: TRawSymbol[][];
	}) {
		spinning = true;
		if (stateSlots.isPreSpinning) {
			await Promise.all(
				board.map(async (reel) => {
					await waitForResolve((resolve) => (reel.reelState.readyToSpin = resolve));
				}),
			);
		}

		stateSlots.isPreSpinning = false;

		const globalSpinType = stateBet.isTurbo ? 'fast' : 'normal';
		const globalHasAnticipation = revealEvent.anticipation.some(Boolean);
		const firstAnticipatedReelIndex = revealEvent.anticipation.findIndex(Boolean);
		const getSpinType = ({
			noStop,
			isAnticipated,
		}: {
			noStop: boolean;
			isAnticipated: boolean;
		}) => {
			if (isAnticipated) return 'anticipated';
			if (noStop) return 'normal';
			return globalSpinType;
		};

		board.reduce((previousPaddingSize, reel, reelIndex) => {
			const noStop = globalHasAnticipation && reelIndex >= firstAnticipatedReelIndex;
			const isAnticipated = (revealEvent.anticipation?.[reelIndex] || 0) > 0;
			const spinType = getSpinType({ noStop, isAnticipated });
			const symbols = revealEvent.board[reelIndex] as TRawSymbol[];
			const paddingReel = paddingBoard?.[reelIndex];
			const paddingPosition = revealEvent?.paddingPositions?.[reelIndex];

			const paddingSize = reel.prepareToSpin({
				noStop,
				spinType,
				symbols,
				// @ts-ignore Ignored because paddingReel is not required by createCascadingReel
				paddingReel,
				// @ts-ignore Ignored because paddingPosition is not required by createCascadingReel
				paddingPosition,
				previousPaddingSize,
				onSpinFinishing: () => {
					reel.onReelStopping();
					const nextReelIndex = reelIndex + 1;
					const isNextReelAnticipated = (revealEvent.anticipation?.[nextReelIndex] || 0) > 0;
					if (isNextReelAnticipated && !skipping) board[nextReelIndex].reelState.anticipating = true;
				},
			});

			return paddingSize;
		}, 0);

		await Promise.all(
			board.map(async (reel) => {
				await reel.spin();
			}),
		);
		spinning = false;
		skipping = false;
	}

	// Stops every reel at once, anticipated ones included (stop leaves those spinning).
	const skip = () => {
		if (spinning || stateSlots.isPreSpinning) skipping = true;
		board.forEach((reel) => reel.skip());
	};

	return { spin, skip };
}
