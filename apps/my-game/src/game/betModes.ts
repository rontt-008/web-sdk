import { stateMeta, stateUrlDerived, type BetModeMeta } from 'state-shared';
import { DEFAULT_BET_MODE_META } from 'state-shared/src/constants';

import config from './config';
import { BONUS_DESCRIPTION, FEATURE_SPIN_WILD_MULTIPLIERS } from './constants';

// Bet mode keys sent to the RGS with each spin. They must match the bet modes in the math.
export const BONUS_MODE = 'BONUS';
export const SUPER_MODE = 'SUPER';
export const MYTHIC_MODE = 'MYTHIC';
export const MYSTERY_MODE = 'MYSTERY';
export const FEATURE_MODE = 'FEATURE';
export const BOOSTER_MODE = 'ANTE';

export const BONUS_COST = config.betModes.bonus.cost;
export const SUPER_COST = config.betModes.super.cost;
export const MYTHIC_COST = config.betModes.mythic.cost;
export const MYSTERY_COST = config.betModes.mystery.cost;
export const FEATURE_COST = config.betModes.feature.cost;
// cost of each spin while the booster is on, as a multiple of the bet (the math's 'ante' mode)
export const BOOSTER_COST = config.betModes.ante.cost;

// chance of each bonus from the mystery bonus; must match the math's 'mystery' mode
export const MYSTERY_CHANCES = { normal: 0.5, super: 0.4, mythic: 0.1 };

const percent = (chance: number) => `${Math.round(chance * 100)}%`;
// "2x to 100x"
const featureMultipliers = `${Math.min(...FEATURE_SPIN_WILD_MULTIPLIERS)}x to ${Math.max(...FEATURE_SPIN_WILD_MULTIPLIERS)}x`;

// Replace the SDK's sample bet modes with the ones this game has. Icons are reused from the samples,
// taken from the SDK's defaults: stateMeta.betModeMeta no longer has them once this has run, and it
// runs every time the game mounts (switching stories in Storybook mounts it again). The buy menu
// lists the 'buy' modes in this order.
export const setBetModeMeta = () => {
	// typed the way the SDK uses them for stateMeta.betModeMeta
	const samples = DEFAULT_BET_MODE_META as BetModeMeta;
	// social mode (social=true) can't say bet or buy
	const social = stateUrlDerived.social();
	const yourBet = social ? 'your play amount' : 'your bet';
	const buyButton = social ? 'PLAY' : 'BUY';

	stateMeta.betModeMeta = {
		BASE: samples.BASE,
		[BOOSTER_MODE]: {
			...samples.ANTE,
			mode: BOOSTER_MODE,
			costMultiplier: BOOSTER_COST,
			text: {
				...samples.ANTE.text,
				title: 'BOOSTER',
				dialog: `Increases your chance of triggering FREE SPINS. Each spin costs ${BOOSTER_COST}x ${yourBet} while the BOOSTER is on. It stays on until you turn it off.`,
				description: 'Increases your chance of triggering FREE SPINS.',
				betAmountLabel: 'BOOSTER',
				tickerIdle: 'BOOSTER IS ON',
			},
		},
		// switched on in the buy menu (an 'activate' mode, like the booster): every spin is a feature
		// spin until it is switched off there
		[FEATURE_MODE]: {
			...samples.ANTE,
			mode: FEATURE_MODE,
			costMultiplier: FEATURE_COST,
			text: {
				...samples.ANTE.text,
				title: 'FEATURE SPIN',
				dialog: `Every spin has a guaranteed BIG WILD with a ${featureMultipliers} multiplier that shoots out 1 to 3 extra wilds. Each spin costs ${FEATURE_COST}x ${yourBet} while FEATURE SPIN is on. It stays on until you turn it off.`,
				description: 'Every spin has a BIG WILD with a multiplier that shoots out wilds.',
				betAmountLabel: 'FEATURE SPIN',
				tickerIdle: 'FEATURE SPIN IS ON',
				tickerSpin: 'FEATURE SPIN',
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
				dialog: `Go straight to FREE SPINS for ${BONUS_COST}x ${yourBet}.`,
				description: 'Go straight to FREE SPINS.',
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
				dialog: `Go straight to SUPER FREE SPINS for ${SUPER_COST}x ${yourBet}.`,
				description: 'Go straight to SUPER FREE SPINS.',
				tickerSpin: 'SUPER BONUS ACTIVATED',
			},
		},
		[MYTHIC_MODE]: {
			...samples.SUPER,
			mode: MYTHIC_MODE,
			costMultiplier: MYTHIC_COST,
			text: {
				...samples.SUPER.text,
				title: 'MYTHIC BONUS',
				button: buyButton,
				dialog: `Go straight to MYTHIC FREE SPINS for ${MYTHIC_COST}x ${yourBet}. ${BONUS_DESCRIPTION.mythic}`,
				description: 'Go straight to MYTHIC FREE SPINS.',
				tickerSpin: 'MYTHIC BONUS ACTIVATED',
			},
		},
		[MYSTERY_MODE]: {
			...samples.SUPER,
			mode: MYSTERY_MODE,
			costMultiplier: MYSTERY_COST,
			text: {
				...samples.SUPER.text,
				title: 'MYSTERY BONUS',
				button: buyButton,
				dialog: `Go straight to FREE SPINS for ${MYSTERY_COST}x ${yourBet}: a ${percent(MYSTERY_CHANCES.normal)} chance of the normal FREE SPINS, ${percent(MYSTERY_CHANCES.super)} of SUPER FREE SPINS and ${percent(MYSTERY_CHANCES.mythic)} of MYTHIC FREE SPINS.`,
				description: 'FREE SPINS, with a chance of SUPER or MYTHIC FREE SPINS.',
				tickerSpin: 'MYSTERY BONUS ACTIVATED',
			},
		},
	};
};
