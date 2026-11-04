import { stateMeta, stateUrlDerived, type BetModeMeta } from 'state-shared';
import { DEFAULT_BET_MODE_META } from 'state-shared/src/constants';

import config from './config';
import { FREE_SPINS, RETRIGGER_SPINS } from './constants';

// Bet mode keys sent to the RGS with each spin. They must match the bet modes in the math (config.ts
// betModes; the mock RGS in the stories takes them lowercased).
export const BONUS_MODE = 'BONUS';

export const BONUS_COST = config.betModes.bonus.cost;

// Replace the SDK's sample bet modes with this game's one bonus buy: the CHECKMATE BONUS at its price.
// Taken from the SDK's defaults, which stateMeta.betModeMeta no longer has once this has run; it runs
// every time the game mounts (switching stories in Storybook mounts it again).
export const setBetModeMeta = () => {
	const samples = DEFAULT_BET_MODE_META as BetModeMeta;
	// social mode (social=true) can't say bet, buy or cost (Stake Engine's restricted words)
	const social = stateUrlDerived.socialWords();
	const yourBet = social ? 'your play amount' : 'your bet';
	const buyButton = social ? 'PLAY' : 'BUY';

	stateMeta.betModeMeta = {
		BASE: samples.BASE,
		[BONUS_MODE]: {
			...samples.BONUS,
			mode: BONUS_MODE,
			costMultiplier: BONUS_COST,
			text: {
				...samples.BONUS.text,
				title: 'CHECKMATE BONUS',
				button: buyButton,
				dialog: `Go straight to the CHECKMATE BONUS for ${BONUS_COST}x ${yourBet}, as a checkmate gives it: ${FREE_SPINS} FREE SPINS on bigger boards, the multiplier never resetting, and every checkmate +${RETRIGGER_SPINS} spins.`,
				description: `${FREE_SPINS} FREE SPINS: bigger boards, a multiplier that never resets.`,
				tickerSpin: 'CHECKMATE BONUS ACTIVATED',
			},
		},
	};
};
