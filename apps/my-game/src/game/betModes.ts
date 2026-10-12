import { stateMeta } from 'state-shared';

import config from './config';

// Bet mode keys sent to the RGS with each spin. They must match the bet modes in the math.
export const BONUS_MODE = 'BONUS';
export const BOOSTER_MODE = 'ANTE';

export const BONUS_COST = config.betModes.bonus.cost;
// cost of each spin while the booster is on, as a multiple of the bet; must match the math's 'ante' mode
export const BOOSTER_COST = 1.25;

// Replace the SDK's sample bet modes with the ones this game has. Icons are reused from the samples.
export const setBetModeMeta = () => {
	const samples = stateMeta.betModeMeta;

	stateMeta.betModeMeta = {
		BASE: samples.BASE,
		[BOOSTER_MODE]: {
			...samples.ANTE,
			mode: BOOSTER_MODE,
			costMultiplier: BOOSTER_COST,
			text: {
				...samples.ANTE.text,
				title: 'BOOSTER',
				dialog: `Increases your chance of triggering FREE SPINS. Each spin costs ${BOOSTER_COST}x your bet while the BOOSTER is on. It stays on until you turn it off.`,
				description: 'Increases your chance of triggering FREE SPINS.',
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
				title: 'BUY BONUS',
				dialog: `Go straight to FREE SPINS for ${BONUS_COST}x your bet.`,
				description: 'Go straight to FREE SPINS.',
			},
		},
	};
};
