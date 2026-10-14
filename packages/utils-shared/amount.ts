import { stateI18n } from 'state-shared';

import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { stateBet } from 'state-shared';

// social currencies show as "10.00 SC", with 2 decimals and no symbol
const NO_LOCALISATION_CURRENCY_MAP: Record<string, string> = {
	XGC: 'GC',
	XSC: 'SC',
	XEC: 'SC',
};
const NO_LOCALISATION_FRACTION_DIGITS = 2;
// most decimals shown, for amounts finer than the currency's own decimals (e.g. sub-cent payouts)
const MAX_FRACTION_DIGITS = 4;

// the currency's own decimals: 2 for USD, 0 for JPY
const currencyFractionDigitsCache: Record<string, number> = {};
const currencyFractionDigits = (currency: string) => {
	if (!(currency in currencyFractionDigitsCache)) {
		currencyFractionDigitsCache[currency] = new Intl.NumberFormat('en', {
			style: 'currency',
			currency,
		}).resolvedOptions().maximumFractionDigits as number;
	}
	return currencyFractionDigitsCache[currency];
};

// as many decimals as the amount needs, e.g. $0.005 instead of $0.01
const fractionDigits = (value: number, minimumDigits: number) => {
	for (let digits = minimumDigits; digits <= MAX_FRACTION_DIGITS; digits++) {
		if (Math.abs(value - Number(value.toFixed(digits))) < 1e-9) return digits;
	}
	// finer than that isn't a payout: keep the currency's decimals
	return minimumDigits;
};

// bookEventAmount: is the amount or win numbers in the events of books, e.g. the amount in setTotalWin bookEvent
// {
// 	"index": 3,
// 	"type": "setTotalWin",
// 	"amount": 100
// },
// if betting on $1,   100 bookEventAmount equals to $1.    betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $1,    50 bookEventAmount equals to $0.5.  betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5
// if betting on $0.5, 100 bookEventAmount equals to $0.5.  betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $0.5,  50 bookEventAmount equals to $0.25. betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5

export const bookEventAmountToBetAmountMultiplier = (bookEventAmount: number) =>
	bookEventAmount / BOOK_AMOUNT_MULTIPLIER;

export const bookEventAmountToNormalisedAmount = (bookEventAmount: number) => {
	const betAmountMultiplier = bookEventAmountToBetAmountMultiplier(bookEventAmount);
	return stateBet.wageredBetAmount * betAmountMultiplier;
};

export const numberToFloat = (value: number) => Number.parseFloat(`${value}`);

type CurrencyStringOptions = {
	// an in-between value of a count up: only the currency's own decimals, e.g. ¥70 instead of ¥69.6
	counting?: boolean;
};

export const numberToCurrencyString = (value: number, options: CurrencyStringOptions = {}) => {
	if (stateBet.currency in NO_LOCALISATION_CURRENCY_MAP) {
		const digits = options.counting
			? NO_LOCALISATION_FRACTION_DIGITS
			: fractionDigits(numberToFloat(value), NO_LOCALISATION_FRACTION_DIGITS);
		const number = stateI18n.i18n.number(value, {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits,
		});
		return `${number} ${NO_LOCALISATION_CURRENCY_MAP[stateBet.currency]}`;
	}

	const currencyDigits = currencyFractionDigits(stateBet.currency);
	const digits = options.counting
		? currencyDigits
		: fractionDigits(numberToFloat(value), currencyDigits);
	return stateI18n.i18n.number(value, {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
		style: 'currency',
		currency: stateBet.currency,
		// numberingSystem: 'latn',
	});
};

export const bookEventAmountToCurrencyString = (
	bookEventAmount: number,
	options: CurrencyStringOptions = {},
) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToCurrencyString(normalisedAmount, options);
};
