import { stateMeta, stateUrlDerived, type BetModeMeta } from 'state-shared';
import { DEFAULT_BET_MODE_META } from 'state-shared/src/constants';

import config from './config';
import { FREE_SPINS, CHEAT_SPOTS } from './constants';

// Bet mode keys sent to the RGS with each spin. They must match the bet modes in the math (config.ts
// betModes; the mock RGS in the stories takes them lowercased).
export const BOOSTER_MODE = 'BOOSTER';
export const BONUS_MODE = 'BONUS';
export const CHEAT_MODE = 'CHEAT';

// each spin's cost while DUMB MODE or CHEATER MODE is on, and the bonus's, as multiples of the bet
export const BOOSTER_COST = config.betModes.booster.cost;
export const BONUS_COST = config.betModes.bonus.cost;
export const CHEAT_COST = config.betModes.cheat.cost;

// Replace the SDK's sample bet modes with this game's: DUMB MODE and CHEATER MODE (switched on and off,
// every spin at their price) and the CHECKMATE BONUS, bought. Taken from the SDK's defaults, which
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
				dialog: `Go straight to the CHECKMATE BONUS for ${BONUS_COST}x ${yourBet}, as a checkmate gives it: ${FREE_SPINS} FREE SPINS on bigger boards, with more multiplier spots and the multiplier never resetting.`,
				description: `${FREE_SPINS} FREE SPINS: bigger boards, a multiplier that never resets.`,
				tickerSpin: 'CHECKMATE BONUS ACTIVATED',
			},
		},
		// switched on like DUMB MODE (the SDK's SUPERANTE, an 'activate' mode too): every spin costs more,
		// your queen always lands and collects the spots
		[CHEAT_MODE]: {
			...samples.SUPERANTE,
			mode: CHEAT_MODE,
			costMultiplier: CHEAT_COST,
			text: {
				...samples.SUPERANTE.text,
				title: 'CHEATER MODE',
				dialog: `Your queen always lands, with ${CHEAT_SPOTS.min} to ${CHEAT_SPOTS.max} multiplier spots on the board. Before the moves she collects every spot into the spin's multiplier (every + first, then every x), and a checkmate takes that multiplier into the CHECKMATE BONUS. Each spin ${costs} ${CHEAT_COST}x ${yourBet} while CHEATER MODE is on. It stays on until you turn it off.`,
				description: 'Your queen collects every multiplier spot, then plays.',
				betAmountLabel: 'CHEATER MODE',
				tickerIdle: 'CHEATER MODE IS ON',
			},
		},
	};
};
