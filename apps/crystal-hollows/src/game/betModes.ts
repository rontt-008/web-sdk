import { stateMeta, stateUrlDerived, type BetModeMeta } from 'state-shared';
import { DEFAULT_BET_MODE_META } from 'state-shared/src/constants';

import config from './config';
import { TALL_WILD } from './constants';

// Bet mode keys sent to the RGS with each spin. They must match the bet modes in the math (config.ts
// betModes; the mock RGS in the stories takes them lowercased).
export const BOOSTER_MODE = 'BOOSTER';
export const BONUS_MODE = 'BONUS';
export const SUPER_MODE = 'SUPER';
export const MYSTERY_MODE = 'MYSTERY';

// each spin's cost while the booster is on, and the buys' prices, as multiples of the bet
export const BOOSTER_COST = config.betModes.booster.cost;
export const BONUS_COST = config.betModes.bonus.cost;
export const SUPER_COST = config.betModes.super.cost;
export const MYSTERY_COST = config.betModes.mystery.cost;
// the mystery bonus's chance of the free spins: its price over the bonus's, so it returns as much on
// average
export const MYSTERY_CHANCE = MYSTERY_COST / BONUS_COST;

// the WILDs' multiplier at the start of the free spins, and of the super free spins (tallWilds)
export const BONUS_WILD_START = TALL_WILD.multiplier.start;
export const SUPER_WILD_START = TALL_WILD.multiplier.superStart;

// Replace the SDK's sample bet modes (DOUBLE BOOST, SUPER BOOST, SAMURAI SPIN, a bonus at 100x, a
// super bonus at 200x) with the ones this game has (the user, 2026-11-17: "make these have only the
// booster and normal bonus buy, super bonus buy and gamble bonus buy"; the gamble then renamed: "make
// the gamble say mysterybonus instead"), in that order in the buy menu: the booster, switched on there
// (and switched off there or with the buy bonus button's X: uiTheme offWhileOn), and three buys. Taken from the SDK's defaults, which
// stateMeta.betModeMeta no longer has once this has run; it runs every time the game mounts (switching
// stories in Storybook mounts it again). As RuneFall's (apps/my-cluster-game betModes).
export const setBetModeMeta = () => {
	// typed the way the SDK uses them for stateMeta.betModeMeta
	const samples = DEFAULT_BET_MODE_META as BetModeMeta;
	// no bet, buy or cost in social mode (Stake Engine's restricted words)
	const social = stateUrlDerived.socialWords();
	const yourBet = social ? 'your play amount' : 'your bet';
	const buyButton = social ? 'PLAY' : 'BUY';
	const costs = social ? 'is played for' : 'costs';
	const percent = Math.round(MYSTERY_CHANCE * 100);

	stateMeta.betModeMeta = {
		BASE: samples.BASE,
		// switched on in the buy menu (an 'activate' mode, the SDK's ANTE): every spin costs more and
		// starts the free spins far more often, until it is switched off there
		[BOOSTER_MODE]: {
			...samples.ANTE,
			mode: BOOSTER_MODE,
			costMultiplier: BOOSTER_COST,
			text: {
				...samples.ANTE.text,
				title: 'BOOSTER',
				dialog: `Greatly increases your chance of triggering FREE SPINS. Each spin ${costs} ${BOOSTER_COST}x ${yourBet} while the BOOSTER is on. It stays on until you turn it off.`,
				description: 'Greatly increases your chance of triggering FREE SPINS.',
				betAmountLabel: 'BOOSTER',
				tickerIdle: 'BOOSTER IS ON',
			},
		},
		[BONUS_MODE]: {
			...samples.BONUS,
			mode: BONUS_MODE,
			costMultiplier: BONUS_COST,
			text: {
				...samples.BONUS.text,
				title: 'BONUS',
				button: buyButton,
				dialog: `Go straight to FREE SPINS for ${BONUS_COST}x ${yourBet}. Bats that land stay as sticky WILDs, starting at x${BONUS_WILD_START} and doubling when they hit.`,
				description: `FREE SPINS: sticky bat WILDs that start at x${BONUS_WILD_START}.`,
				// (not the sample's PLACE YOUR BET: no restricted words anywhere)
				tickerIdle: 'COME AND PLAY',
				tickerSpin: 'BONUS ACTIVATED',
			},
		},
		[SUPER_MODE]: {
			...samples.SUPER,
			mode: SUPER_MODE,
			costMultiplier: SUPER_COST,
			text: {
				...samples.SUPER.text,
				title: 'SUPER BONUS',
				button: buyButton,
				dialog: `Go straight to SUPER FREE SPINS for ${SUPER_COST}x ${yourBet}: every sticky bat WILD starts at x${SUPER_WILD_START} instead of x${BONUS_WILD_START}, and doubles when it hits.`,
				description: `SUPER FREE SPINS: every bat WILD starts at x${SUPER_WILD_START}.`,
				tickerIdle: 'COME AND PLAY',
				tickerSpin: 'SUPER BONUS ACTIVATED',
			},
		},
		[MYSTERY_MODE]: {
			...samples.BONUS,
			mode: MYSTERY_MODE,
			costMultiplier: MYSTERY_COST,
			text: {
				...samples.BONUS.text,
				title: 'MYSTERY BONUS',
				button: buyButton,
				dialog: `A ${percent}% chance of FREE SPINS for ${MYSTERY_COST}x ${yourBet}. If the mystery opens, the FREE SPINS start; if not, the round ends.`,
				description: `A ${percent}% chance of FREE SPINS for ${MYSTERY_COST}x.`,
				tickerIdle: 'COME AND PLAY',
				tickerSpin: 'MYSTERY BONUS ACTIVATED',
			},
		},
	};
};
