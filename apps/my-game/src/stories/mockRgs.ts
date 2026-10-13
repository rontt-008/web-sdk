// Stands in for Stake Engine's RGS in Storybook, so the game can be played like the real thing: it
// keeps a balance, takes each bet at its mode's cost and answers with a round picked by its lookup
// table weight, from the real odds books exported from the math. Requests to the RGS endpoints are
// answered here; everything else goes through to the network.
import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

import config from '../game/config';
import baseBooks from './data/base_books_real';
import anteBooks from './data/ante_books_real';
import bonusBooks from './data/bonus_books_real';
import superBooks from './data/super_books_real';
import mythicBooks from './data/mythic_books_real';
import mysteryBooks from './data/mystery_books_real';
import featureBooks from './data/feature_books_real';
import { pickByWeight } from './pickByWeight';

type BetModeName = keyof typeof config.betModes;
type Book = { weight: number; payoutMultiplier: number; events: unknown[] };

const BOOKS: Record<BetModeName, Book[]> = {
	base: baseBooks,
	ante: anteBooks,
	bonus: bonusBooks,
	super: superBooks,
	mythic: mythicBooks,
	mystery: mysteryBooks,
	feature: featureBooks,
};

// bet sizes offered, in dollars (the bet menu shows a handful of them)
const BET_LEVELS = [
	0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7,
	8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100,
];

type Rgs = { balance: number; roundID: number; unpaid: number };

// amounts are kept in the API's integer units (1000000 is 1 dollar)
const createRgs = (balance: number): Rgs => ({
	balance: Math.round(balance * API_AMOUNT_MULTIPLIER),
	roundID: 0,
	unpaid: 0,
});

const balanceObject = (rgs: Rgs) => ({ amount: rgs.balance, currency: 'USD' });

// what a round's win is waiting for: the game ends the round to get paid
const payOut = (rgs: Rgs) => {
	rgs.balance += rgs.unpaid;
	rgs.unpaid = 0;
};

const HANDLERS: Record<string, (rgs: Rgs, body: Record<string, any>) => object> = {
	'/wallet/authenticate': (rgs) => ({
		balance: balanceObject(rgs),
		config: {
			gameID: config.gameID,
			minBet: BET_LEVELS[0] * API_AMOUNT_MULTIPLIER,
			maxBet: BET_LEVELS[BET_LEVELS.length - 1] * API_AMOUNT_MULTIPLIER,
			stepBet: 0.1 * API_AMOUNT_MULTIPLIER,
			defaultBetLevel: API_AMOUNT_MULTIPLIER,
			betLevels: BET_LEVELS.map((level) => Math.round(level * API_AMOUNT_MULTIPLIER)),
			betModes: {},
			jurisdiction: {
				socialCasino: false,
				disabledFullscreen: false,
				disabledTurbo: false,
				disabledSuperTurbo: false,
				disabledAutoplay: false,
				disabledSlamstop: false,
				disabledSpacebar: false,
				disabledBuyFeature: false,
				displayNetPosition: false,
				displayRTP: false,
				displaySessionTimer: false,
				minimumRoundDuration: 0,
			},
		},
		round: null,
	}),
	'/wallet/balance': (rgs) => ({ balance: balanceObject(rgs) }),
	'/wallet/play': (rgs, { mode, amount }) => {
		// a win whose round was never ended is paid first, as the RGS would
		payOut(rgs);

		const name = String(mode).toLowerCase() as BetModeName;
		if (!(name in BOOKS)) return { error: 'ERR_VAL', message: `Unknown bet mode: ${mode}` };

		const cost = Math.round(amount * config.betModes[name].cost);
		if (cost > rgs.balance) return { error: 'ERR_IPB', message: 'Insufficient balance' };
		rgs.balance -= cost;

		const books = BOOKS[name];
		const book = books[pickByWeight(books)];
		rgs.unpaid = Math.round(book.payoutMultiplier * amount);
		rgs.roundID += 1;

		return {
			balance: balanceObject(rgs),
			round: {
				roundID: rgs.roundID,
				amount,
				payout: rgs.unpaid,
				payoutMultiplier: book.payoutMultiplier,
				active: rgs.unpaid > 0,
				mode,
				event: null,
				state: book.events,
			},
		};
	},
	'/wallet/end-round': (rgs) => {
		payOut(rgs);
		return { balance: balanceObject(rgs) };
	},
	'/bet/event': (_, { event }) => ({ event }),
};

let activeRgs: Rgs | null = null;
let installed = false;

// window.fetch is wrapped once; it answers RGS requests while a mock RGS is active
const installFetch = () => {
	if (installed) return;
	installed = true;

	const networkFetch = window.fetch.bind(window);
	window.fetch = async (input, init) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		// the game asks https://<rgs_url>/<endpoint>, and Storybook has no rgs_url
		const path = Object.keys(HANDLERS).find((endpoint) => url.endsWith(endpoint));
		if (!activeRgs || !path) return networkFetch(input, init);

		const body = init?.body ? JSON.parse(String(init.body)) : {};
		return new Response(JSON.stringify(HANDLERS[path](activeRgs, body)), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	};
};

// Starts a mock RGS with this balance (in dollars). Returns a function that stops it.
export const startMockRgs = ({ balance }: { balance: number }) => {
	installFetch();
	const rgs = createRgs(balance);
	activeRgs = rgs;

	return () => {
		if (activeRgs === rgs) activeRgs = null;
	};
};
