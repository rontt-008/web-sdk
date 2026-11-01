import { stateMeta, stateUrlDerived, type BetModeMeta } from 'state-shared';
import { DEFAULT_BET_MODE_META } from 'state-shared/src/constants';

import config from './config';
import { BONUS_TRIGGER, SUPER_TRIGGER } from './constants';
import { BONUS_POWERS } from './runes';

// Bet mode keys sent to the RGS with each spin. They must match the bet modes in the math (config.ts
// betModes; the mock RGS in the stories takes them lowercased).
export const BONUS_MODE = 'BONUS';
export const SUPER_MODE = 'SUPER';

export const BONUS_COST = config.betModes.bonus.cost;
export const SUPER_COST = config.betModes.super.cost;

// Replace the SDK's sample bet modes (boosters, a bonus at 100x, a super bonus at 200x) with the ones
// this game has: the bonus and the super bonus, bought at their prices. Taken from the SDK's
// defaults, which stateMeta.betModeMeta no longer has once this has run; it runs every time the game
// mounts (switching stories in Storybook mounts it again). The buy menu lists them in this order.
export const setBetModeMeta = () => {
	// typed the way the SDK uses them for stateMeta.betModeMeta
	const samples = DEFAULT_BET_MODE_META as BetModeMeta;
	// social mode (social=true) can't say bet or buy
	const social = stateUrlDerived.social();
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
				title: 'BONUS',
				button: buyButton,
				dialog: `Go straight to FREE SPINS for ${BONUS_COST}x ${yourBet}, as ${BONUS_TRIGGER} connected symbols give them.`,
				description: 'FREE SPINS: collect runes for their powers in the POWER SPINS.',
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
				dialog: `Go straight to SUPER FREE SPINS for ${SUPER_COST}x ${yourBet}, as ${SUPER_TRIGGER} connected symbols give them: the runes' powers are bigger, a ${BONUS_POWERS.super.wilds}x${BONUS_POWERS.super.wilds} BIG WILD and a ${BONUS_POWERS.super.mult}x MULTIPLIER.`,
				description: `SUPER FREE SPINS: bigger rune powers, a ${BONUS_POWERS.super.wilds}x${BONUS_POWERS.super.wilds} BIG WILD and a ${BONUS_POWERS.super.mult}x MULTIPLIER.`,
				tickerSpin: 'SUPER BONUS ACTIVATED',
			},
		},
	};
};
