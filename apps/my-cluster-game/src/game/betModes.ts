import { stateMeta, stateUrlDerived, type BetModeMeta } from 'state-shared';
import { DEFAULT_BET_MODE_META } from 'state-shared/src/constants';

import config from './config';
import { BONUS_TRIGGER, SUPER_TRIGGER } from './constants';
import { BONUS_POWERS } from './runes';

// Bet mode keys sent to the RGS with each spin. They must match the bet modes in the math (config.ts
// betModes; the mock RGS in the stories takes them lowercased).
export const BONUS_MODE = 'BONUS';
export const SUPER_MODE = 'SUPER';
export const BOOSTER_MODE = 'BOOSTER';

export const BONUS_COST = config.betModes.bonus.cost;
export const SUPER_COST = config.betModes.super.cost;
// each spin's cost while the booster is on, as a multiple of the bet
export const BOOSTER_COST = config.betModes.booster.cost;

// Replace the SDK's sample bet modes (boosters, a bonus at 100x, a super bonus at 200x) with the ones
// this game has: the bonus and the super bonus, bought at their prices. Taken from the SDK's
// defaults, which stateMeta.betModeMeta no longer has once this has run; it runs every time the game
// mounts (switching stories in Storybook mounts it again). The buy menu lists them in this order.
export const setBetModeMeta = () => {
	// typed the way the SDK uses them for stateMeta.betModeMeta
	const samples = DEFAULT_BET_MODE_META as BetModeMeta;
	// no bet, buy or cost (Stake Engine's restricted words): this game uses social mode's words in
	// every mode (see context.ts)
	const social = stateUrlDerived.socialWords();
	const yourBet = social ? 'your play amount' : 'your bet';
	const buyButton = social ? 'PLAY' : 'BUY';
	const costs = social ? 'is played for' : 'costs';

	stateMeta.betModeMeta = {
		BASE: samples.BASE,
		// switched on in the buy menu (an 'activate' mode, the SDK's ANTE): every spin costs more and
		// starts the bonuses far more often, until it is switched off there
		[BOOSTER_MODE]: {
			...samples.ANTE,
			mode: BOOSTER_MODE,
			costMultiplier: BOOSTER_COST,
			text: {
				...samples.ANTE.text,
				title: 'BOOSTER',
				dialog: `Greatly increases your chance of triggering FREE SPINS and SUPER FREE SPINS. Each spin ${costs} ${BOOSTER_COST}x ${yourBet} while the BOOSTER is on. It stays on until you turn it off.`,
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
				dialog: `Go straight to FREE SPINS for ${BONUS_COST}x ${yourBet}, as ${BONUS_TRIGGER} connected symbols give them.`,
				description: 'FREE SPINS: collect runes for their powers in the POWER SPINS.',
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
				dialog: `Go straight to SUPER FREE SPINS for ${SUPER_COST}x ${yourBet}, as ${SUPER_TRIGGER} connected symbols give them: the RED RUNE's MULTIPLIER is bigger, ${BONUS_POWERS.super.mult}x instead of ${BONUS_POWERS.normal.mult}x.`,
				description: `SUPER FREE SPINS: a bigger RED RUNE, a ${BONUS_POWERS.super.mult}x MULTIPLIER.`,
				tickerIdle: 'COME AND PLAY',
				tickerSpin: 'SUPER BONUS ACTIVATED',
			},
		},
	};
};
