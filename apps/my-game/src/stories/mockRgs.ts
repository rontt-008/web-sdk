// Stands in for Stake Engine's RGS in Storybook, so the game can be played like the real thing: it
// keeps a balance, takes each bet at its mode's cost and answers with a round picked by its lookup
// table weight (or a max win or top win round, see startMockRgs), from the books exported from the
// math. Requests to the RGS endpoints are answered here; everything else goes through to the network.
import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

import config from '../game/config';
import baseBooks from './data/base_books_real';
import anteBooks from './data/ante_books_real';
import bonusBooks from './data/bonus_books_real';
import superBooks from './data/super_books_real';
import mysteryBooks from './data/mystery_books_real';
import featureBooks from './data/feature_books_real';
import baseTopBooks from './data/base_books_top';
import anteTopBooks from './data/ante_books_top';
import bonusTopBooks from './data/bonus_books_top';
import superTopBooks from './data/super_books_top';
import mysteryTopBooks from './data/mystery_books_top';
import featureTopBooks from './data/feature_books_top';
import { pickByWeight } from './pickByWeight';

type BetModeName = keyof typeof config.betModes;
type Book = { id: number; weight: number; payoutMultiplier: number; events: unknown[] };

const BOOKS: Record<BetModeName, Book[]> = {
	base: baseBooks,
	ante: anteBooks,
	bonus: bonusBooks,
	super: superBooks,
	mystery: mysteryBooks,
	feature: featureBooks,
};

// rounds of 3000x and up, spread over that range with only a few max wins (export_story_books.py)
const TOP_BOOKS: Record<BetModeName, Book[]> = {
	base: baseTopBooks,
	ante: anteTopBooks,
	bonus: bonusTopBooks,
	super: superTopBooks,
	mystery: mysteryTopBooks,
	feature: featureTopBooks,
};

// which rounds it answers with: picked by the real odds, only the mode's max wins, or only top wins
export type MockRounds = 'real odds' | 'max win' | 'top wins';

// bet sizes offered, in dollars (the bet menu shows a handful of them)
const BET_LEVELS = [
	0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7,
	8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100,
];

type Rgs = { balance: number; roundID: number; unpaid: number; rounds: MockRounds };

// amounts are kept in the API's integer units (1000000 is 1 dollar)
// What Engine's reviewers change, taken from the story's iframe url:
// &currency=JPY (the balance's currency; one without decimals gets levels and balance 100x),
// &betLevels=1,1.25,1.5,2&defaultBet=1.5 (the bet levels and default, in the currency's units),
// &resume=BASE:514:2.5 (authenticate answers with that round still open, at that bet), and
// &rgs_url=... (no mock at all: requests go to that RGS, e.g. an invalid one)
const urlParam = (key: string) => new URL(window.location.href).searchParams.get(key);
const currency = () => urlParam('currency')?.toUpperCase() || 'USD';
const levelScale = () => {
	try {
		const { maximumFractionDigits } = new Intl.NumberFormat('en', {
			style: 'currency',
			currency: currency(),
		}).resolvedOptions();
		return maximumFractionDigits === 0 ? 100 : 1;
	} catch {
		// not a currency code (a test of a bad one): the game deals with it, the levels stay as they are
		return 1;
	}
};
const betLevels = () =>
	(urlParam('betLevels')?.split(',').map(Number) ?? BET_LEVELS).map((level) => level * levelScale());
const defaultBet = () => (Number(urlParam('defaultBet')) || 1) * levelScale();
const toApi = (amount: number) => Math.round(amount * API_AMOUNT_MULTIPLIER);

const createRgs = (balance: number, rounds: MockRounds): Rgs => ({
	balance: toApi(balance * levelScale()),
	roundID: 0,
	unpaid: 0,
	rounds,
});

// the round of &resume=<mode>:<book id>:<bet>, still open
const roundToResume = (rgs: Rgs) => {
	const [mode, id, bet] = urlParam('resume')?.split(':') ?? [];
	const name = String(mode).toLowerCase() as BetModeName;
	const book = BOOKS[name]?.find((each) => each.id === Number(id));
	if (!book) return null;
	const amount = toApi(Number(bet) * levelScale());
	rgs.unpaid = Math.round(book.payoutMultiplier * amount);
	return {
		roundID: 1,
		amount,
		payout: rgs.unpaid,
		payoutMultiplier: book.payoutMultiplier,
		active: true,
		mode,
		event: null,
		state: book.events,
	};
};

// the rounds that pay the mode's max win (the real odds books hold one for each mode)
const maxWinBooks = (name: BetModeName) =>
	BOOKS[name].filter((book) => book.payoutMultiplier >= config.betModes[name].max_win);

const booksFor = (rgs: Rgs, name: BetModeName) => {
	if (rgs.rounds === 'max win') return maxWinBooks(name);
	if (rgs.rounds === 'top wins') return TOP_BOOKS[name];
	return BOOKS[name];
};

const balanceObject = (rgs: Rgs) => ({ amount: rgs.balance, currency: currency() });

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
			minBet: toApi(betLevels()[0]),
			maxBet: toApi(betLevels()[betLevels().length - 1]),
			stepBet: toApi(0.1 * levelScale()),
			defaultBetLevel: toApi(defaultBet()),
			betLevels: betLevels().map(toApi),
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
		round: roundToResume(rgs),
	}),
	'/wallet/balance': (rgs) => ({ balance: balanceObject(rgs) }),
	'/wallet/play': (rgs, { mode, amount }) => {
		// a win whose round was never ended is paid first, as the RGS would
		payOut(rgs);

		const name = String(mode).toLowerCase() as BetModeName;
		if (!(name in BOOKS)) return { error: 'ERR_VAL', message: `Unknown bet mode: ${mode}` };

		const books = booksFor(rgs, name);
		if (books.length === 0) {
			return {
				error: 'ERR_GEN',
				message: `No ${rgs.rounds} round for bet mode ${mode} in the story data`,
			};
		}

		const cost = Math.round(amount * config.betModes[name].cost);
		if (cost > rgs.balance) return { error: 'ERR_IPB', message: 'Insufficient balance' };
		rgs.balance -= cost;

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

// A replay (replay=true in the url) asks GET https://<rgs_url>/bet/replay/<game>/<version>/<mode>/<event>:
// it gets the round with that id from the story books, as the RGS answers. E.g. add to a PLAY
// story's url: &replay=true&game=x&version=1&mode=BONUS&event=1&amount=1000000&currency=USD
const REPLAY_PATH = /\/bet\/replay\/[^/]*\/[^/]*\/([^/]+)\/([^/?]+)/;

const replayAnswer = (url: string) => {
	const [, mode, event] = url.match(REPLAY_PATH) ?? [];
	const name = String(mode).toLowerCase() as BetModeName;
	if (!(name in BOOKS)) return undefined;
	const book = [...BOOKS[name], ...TOP_BOOKS[name]].find((each) => each.id === Number(event));
	if (!book) return undefined;
	return {
		payoutMultiplier: book.payoutMultiplier,
		costMultiplier: config.betModes[name].cost,
		state: book.events,
	};
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
		// a real (or deliberately invalid) rgs_url in the url gets the network, not the mock
		if (urlParam('rgs_url')) return networkFetch(input, init);
		if (activeRgs && REPLAY_PATH.test(url)) {
			console.log('mock rgs: GET', url.slice(url.indexOf('/bet/replay/')));
			const answer = replayAnswer(url);
			// an unknown mode or event is a plain 404, as from the RGS
			return answer
				? new Response(JSON.stringify(answer), {
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					})
				: new Response(null, { status: 404 });
		}
		// the game asks https://<rgs_url>/<endpoint>, and Storybook has no rgs_url
		const path = Object.keys(HANDLERS).find((endpoint) => url.endsWith(endpoint));
		if (!activeRgs || !path) return networkFetch(input, init);

		const body = init?.body ? JSON.parse(String(init.body)) : {};
		const answer: Record<string, any> = HANDLERS[path](activeRgs, body);
		// every request, so a check can count them (e.g. that a 0x round sends no end-round)
		console.log(
			'mock rgs:',
			path,
			JSON.stringify({
				mode: body.mode,
				amount: body.amount,
				payoutMultiplier: answer.round?.payoutMultiplier,
				active: answer.round?.active,
				error: answer.error,
			}),
		);
		return new Response(JSON.stringify(answer), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	};
};

// Starts a mock RGS with this balance (in dollars), answering with these rounds (see MockRounds).
// Returns a function that stops it.
export const startMockRgs = ({
	balance,
	rounds = 'real odds',
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
