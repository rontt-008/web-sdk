import { stateMeta, stateUrlDerived, type BetModeMeta } from 'state-shared';
import { DEFAULT_BET_MODE_META } from 'state-shared/src/constants';

import config from './config';
import { FREE_SPINS, RETRIGGER_SPINS } from './constants';

// Bet mode keys sent to the RGS with each spin. They must match the bet modes in the math (config.ts
// betModes; the mock RGS in the stories takes them lowercased).
export const BOOSTER_MODE = 'BOOSTER';
export const BONUS_MODE = 'BONUS';
export const CHEAT_MODE = 'CHEAT';

// each spin's cost while DUMB MODE is on, as a multiple of the bet
export const BOOSTER_COST = config.betModes.booster.cost;
export const BONUS_COST = config.betModes.bonus.cost;
export const CHEAT_COST = config.betModes.cheat.cost;

// Replace the SDK's sample bet modes with this game's: DUMB MODE (switched on and off), the CHECKMATE
// BONUS and the CHEATER SPIN, bought at their prices. Taken from the SDK's defaults, which
// stateMeta.betModeMeta no longer has once this has run; it runs every time the game mounts (switching
// stories in Storybook mounts it again). The buy menu lists them in this order.
export const setBetModeMeta = () => {
	const samples = DEFAULT_BET_MODE_META as BetModeMeta;
	// social mode (social=true) can't say bet, buy or cost (Stake Engine's restricted words)
	const social = stateUrlDerived.socialWords();
	const yourBet = social ? 'your play amount' : 'your bet';
	const buyButton = social ? 'PLAY' : 'BUY';
	const costs = social ? 'is played for' : 'costs';

	stateMeta.betModeMeta = {
		BASE: samples.BASE,
		// switched on in the bonus menu (an 'activate' mode, the SDK's ANTE): every spin costs more and
		// the other side plays dumb, so checkmates come far more often
		[BOOSTER_MODE]: {
			...samples.ANTE,
			mode: BOOSTER_MODE,
			costMultiplier: BOOSTER_COST,
			text: {
				...samples.ANTE.text,
				title: 'DUMB MODE',
				dialog: `The other side plays like a beginner (any legal move, at random): it hangs its pieces, and checkmates and the CHECKMATE BONUS come about five times as often. Each spin ${costs} ${BOOSTER_COST}x ${yourBet} while DUMB MODE is on. It stays on until you turn it off.`,
				description: 'The other side plays like a beginner: far more checkmates.',
				betAmountLabel: 'DUMB MODE',
				tickerIdle: 'DUMB MODE IS ON',
			},
		},
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
		[CHEAT_MODE]: {
			...samples.SUPER,
			mode: CHEAT_MODE,
			costMultiplier: CHEAT_COST,
			text: {
				...samples.SUPER.text,
				title: 'CHEATER SPIN',
				button: buyButton,
				dialog: `One spin for ${CHEAT_COST}x ${yourBet}: your queen always lands, with 3 to 5 multiplier spots on the board. Before the moves she collects every spot into the spin's multiplier, and a checkmate takes that multiplier into the CHECKMATE BONUS.`,
				description: 'Your queen collects every multiplier spot, then plays.',
				tickerSpin: 'CHEATER SPIN ACTIVATED',
			},
		},
	};
};
