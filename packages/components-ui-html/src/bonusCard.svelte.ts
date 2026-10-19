import { stateBet, type BetModeData } from 'state-shared';
import { getContextEventEmitter } from 'utils-event-emitter';
import { numberToCurrencyString } from 'utils-shared/amount';

import { stateBonus } from './stateBonus.svelte';
import { i18nDerived } from './i18n/i18nDerived';
import type { EmitterEventModal } from './types';

// What a card in the buy bonus menu does, whatever it looks like: the default card (BonusCard) and
// a game's own card (Modals' bonusCard) both use it. Call it while the card is being created, with
// a function giving its levels: a bet mode followed by the modes whose parent it is.
export const createBonusCard = (getLevels: () => BetModeData[]) => {
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	// opens on the level in use, e.g. a booster level that is switched on
	let index = $state(
		Math.max(
			0,
			getLevels().findIndex((level) => level.mode === stateBet.activeBetModeKey),
		),
	);

	const levels = $derived(getLevels());
	const betModeData = $derived(levels[Math.min(index, levels.length - 1)]);
	const cost = $derived(stateBet.betAmount * betModeData.costMultiplier);
	// the card says why it can't be picked, instead of only being greyed out
	const notEnoughBalance = $derived(stateBet.balanceAmount < cost);
	const isActivate = $derived(betModeData.type === 'activate');
	const active = $derived(stateBet.activeBetModeKey === betModeData.mode);
	// a mode that is switched on is switched off from its card, straight away
	const canDisable = $derived(isActivate && active);

	return {
		get levels() {
			return levels;
		},
		get index() {
			return index;
		},
		get betModeData() {
			return betModeData;
		},
		get priceText() {
			return numberToCurrencyString(cost);
		},
		get notEnoughBalance() {
			return notEnoughBalance;
		},
		get isActivate() {
			return isActivate;
		},
		get active() {
			return active;
		},
		get hasLevels() {
			return levels.length > 1;
		},
		get disabled() {
			return !canDisable && (stateBet.betAmount <= 0 || notEnoughBalance);
		},
		get buttonLabel() {
			if (canDisable) return i18nDerived.disable();
			if (notEnoughBalance) return i18nDerived.notEnoughBalance();
			return betModeData.text.button;
		},
		// picks one of its levels
		select(levelIndex: number) {
			index = (levelIndex + levels.length) % levels.length;
			eventEmitter.broadcast({ type: 'soundPressGeneral' });
		},
		// its button: switches the mode off, or opens the dialog to buy it or switch it on
		press() {
			if (canDisable) {
				stateBet.activeBetModeKey = 'BASE';
			} else {
				stateBonus.selectedBetModeKey = betModeData.mode;
				eventEmitter.broadcast({ type: 'buyBonusConfirm' });
			}
			eventEmitter.broadcast({ type: 'soundPressGeneral' });
		},
	};
};

export type BonusCardState = ReturnType<typeof createBonusCard>;
