import { stateI18nDerived, stateUrlDerived } from 'state-shared';

// social mode (social=true) can't use words like bet, buy or funds
const social = () => stateUrlDerived.social();

export const i18nDerived = {
	bet: () => (social() ? 'PLAY AMOUNT' : stateI18nDerived.translate('BET')),
	max: () => stateI18nDerived.translate('MAX'),
	betMenu: () => (social() ? 'PLAY AMOUNT' : stateI18nDerived.translate('BET MENU')),
	selectYourBet: () =>
		social() ? 'SELECT YOUR PLAY AMOUNT' : stateI18nDerived.translate('SELECT YOUR BET'),
	confirm: () => stateI18nDerived.translate('CONFIRM'),
	cancel: () => stateI18nDerived.translate('CANCEL'),
	masterVolume: () => stateI18nDerived.translate('MASTER VOLUME'),
	musicVolume: () => stateI18nDerived.translate('MUSIC VOLUME'),
	soundEffectVolume: () => stateI18nDerived.translate('SOUND EFFECT VOLUME'),
	autoSpins: () => stateI18nDerived.translate('AUTO SPINS'),
	numberOfRounds: () => stateI18nDerived.translate('NUMBER OF ROUNDS'),
	advanced: () => stateI18nDerived.translate('ADVANCED'),
	singleWinLimit: () => stateI18nDerived.translate('SINGLE WIN LIMIT'),
	lossLimit: () => stateI18nDerived.translate('LOSS LIMIT'),
	startAutoplay: () => stateI18nDerived.translate('START AUTOPLAY'),
	notification: () => stateI18nDerived.translate('NOTIFICATION'),
	autoSpinsStopInfo: () => stateI18nDerived.translate('AUTO PLAY HAS STOPPED DUE TO'),
	insufficientFunds: () =>
		social()
			? 'NOT ENOUGH BALANCE FOR THIS PLAY. PLEASE GET COINS OR LOWER THE PLAY AMOUNT.'
			: stateI18nDerived.translate(
					'INSUFFICIENT FUNDS TO PLACE THIS BET. PLEASE ADD FUNDS TO YOUR ACCOUNT OR LOWER THE BET LEVEL.',
				),
	lossLimitReached: () => stateI18nDerived.translate('LOSS LIMIT REACHED'),
	singleWinLimitReached: () => stateI18nDerived.translate('SINGLE WIN LIMIT REACHED'),
	settings: () => stateI18nDerived.translate('SETTINGS'),
	balance: () => stateI18nDerived.translate('BALANCE'),
	buyBonus: () => (social() ? 'PLAY BONUS' : stateI18nDerived.translate('BUY BONUS')),
	volatility: () => stateI18nDerived.translate('VOLATILITY'),
	notEnoughBalance: () => stateI18nDerived.translate('NOT ENOUGH BALANCE'),
	disable: () => stateI18nDerived.translate('DISABLE'),
	payTable: () => (social() ? 'WIN TABLE' : stateI18nDerived.translate('PAYTABLE')),
};
