// Stands in for Stake Engine's RGS in Storybook, so the game can be played like the real thing (the PLAY
// stories, as RuneFall's and Cat Hunt's): it keeps a balance, takes each bet at its mode's cost and answers
// with a round from the story books. Crystal Hollows has no math of its own yet: the books are the sample
// game's (data/base_books, data/bonus_books), with no lookup table weights, so every round is as likely as
// any other (pickByWeight with weight 1), not the real odds. Requests to the RGS endpoints are answered
// here; everything else goes through to the network.
import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

import config from '../game/config';
import baseBooks from './data/base_books';
import bonusBooks from './data/bonus_books';
import { pickByWeight } from './pickByWeight';

type BetModeName = keyof typeof config.betModes;
type Book = {
	weight?: number;
	payoutMultiplier: number;
	events: { type: string; board?: { name: string }[][] }[];
};

// the base spin's board (its first reveal; some rounds go on into free spins), without the padding rows
const firstBoard = (book: Book) =>
	(book.events.find((event) => event.type === 'reveal')?.board ?? []).map((reel) =>
		reel.slice(1, -1),
	);
const triggersFreeSpins = (book: Book) =>
	book.events.some((event) => event.type === 'freeSpinTrigger');
const landsRings = (book: Book) =>
	firstBoard(book).some((reel) => reel.some((symbol) => symbol.name === 'W'));

const base = baseBooks as Book[];
const bonus = bonusBooks as Book[];

// which rounds it answers with: any of the books; only rounds whose spin triggers the free spins; only
// rounds whose spin lands bat rings (each a tall wild). The bonus buy always plays a bonus book.
export type MockRounds = 'random' | 'free spins' | 'tall wild';

const ROUNDS: Record<MockRounds, Partial<Record<BetModeName, Book[]>>> = {
	random: { base, bonus },
	'free spins': { base: base.filter(triggersFreeSpins), bonus },
	'tall wild': { base: base.filter(landsRings), bonus },
};

// bet sizes offered, in dollars (the bet menu shows a handful of them)
const BET_LEVELS = [
	0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6,
	7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100,
];

type Rgs = { balance: number; roundID: number; unpaid: number; rounds: MockRounds };

// amounts are kept in the API's integer units (1000000 is 1 dollar)
const createRgs = (balance: number, rounds: MockRounds): Rgs => ({
	balance: Math.round(balance * API_AMOUNT_MULTIPLIER),
	roundID: 0,
	unpaid: 0,
	rounds,
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
		if (!(name in config.betModes)) {
			return { error: 'ERR_VAL', message: `Unknown bet mode: ${mode}` };
		}
		const books = ROUNDS[rgs.rounds][name];
		if (!books?.length) {
			return { error: 'ERR_VAL', message: `No rounds for bet mode ${mode} in the story data` };
		}
		const cost = Math.round(amount * config.betModes[name].cost);
		if (cost > rgs.balance) return { error: 'ERR_IPB', message: 'Insufficient balance' };
		rgs.balance -= cost;

		const book = books[pickByWeight(books.map((book) => ({ weight: book.weight ?? 1 })))];
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

// Starts a mock RGS with this balance (in dollars), answering with these rounds (see MockRounds).
// Returns a function that stops it.
export const startMockRgs = ({
	balance,
	rounds = 'random',
}: {
	balance: number;
	rounds?: MockRounds;
}) => {
	installFetch();
	const rgs = createRgs(balance, rounds);
	activeRgs = rgs;

	return () => {
		if (activeRgs === rgs) activeRgs = null;
	};
};
