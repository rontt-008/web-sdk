import { stateI18nDerived, stateUrlDerived } from 'state-shared';

export const i18nDerived = {
	audio: () => stateI18nDerived.translate('AUDIO'),
	balance: () => stateI18nDerived.translate('BALANCE'),
	win: () => stateI18nDerived.translate('WIN'),
	bet: () => stateUrlDerived.social() ? 'SPIN' : stateI18nDerived.translate('BET'),
	stop: () => stateI18nDerived.translate('STOP'),
	buyBonus: () => stateUrlDerived.social() ? 'PLAY BONUS' : stateI18nDerived.translate('BUY BONUS'),
	disable: () => stateI18nDerived.translate('DISABLE'),
	freeSpins: () => stateI18nDerived.translate('FREE SPINS'),
	notEnoughBalance: () => stateI18nDerived.translate('NOT ENOUGH BALANCE'),
	//
	decrease: () => stateI18nDerived.translate('-'),
	increase: () => stateI18nDerived.translate('+'),
	menu: () => stateI18nDerived.translate('MENU'),
	turbo: () => stateI18nDerived.translate('TURBO'),
	autoSpin: () => stateI18nDerived.translate('AUTO SPIN'),
	payTable: () => stateUrlDerived.social() ? 'WIN TABLE' : stateI18nDerived.translate('PAYTABLE'),
	info: () => stateI18nDerived.translate('INFO'),
	settings: () => stateI18nDerived.translate('SETTINGS'),
	soundOn: () => stateI18nDerived.translate('SOUND ON'),
	soundOff: () => stateI18nDerived.translate('SOUND OFF'),
	menuExit: () => stateI18nDerived.translate('EXIT'),
};
