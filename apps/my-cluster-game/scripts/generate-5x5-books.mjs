// Made-up 5x5 rounds for previewing the game in Storybook until the real math is exported.
//
//   node scripts/generate-5x5-books.mjs          writes src/stories/data/{base,bonus}_{books,events}.ts
//   node scripts/generate-5x5-books.mjs --stats  only prints how the made-up rules play
//
// It plays the cluster sample's rules on a 5x5 board and writes the rounds in the same book format
// the math SDK exports: clusters of 5+ matching symbols (side by side) pay the config's paytable and
// tumble out, new symbols drop in from above. A base game spin whose clusters, over all its
// tumbles, have 35 or more symbols (BONUS_TRIGGER; the bar right of the board counts them,
// updateBonusMeter) gives 10 free spins, where the global multiplier is the free spin's number; the
// bonus bet mode buys them. There are no scatters.
//
// Runes: in the free spins one of four runes (RUNES, in random order) lies behind the symbols,
// anywhere on the board it fits. A spot of it lights up when a winning cluster covers it; when all
// its spots are lit, its power is collected, and the next rune shows when the next spin starts.
// After the free spins come 2 power spins (POWER_SPINS) with the collected powers: Fehu x3 on
// every win (POWER_MULT), Hagall a 3x3 block of wilds on the board, Othala only premiums, Ingwaz one
// power spin more. Wilds join any symbol's clusters.
//
// The odds are not tuned: this is for seeing the game, not for its RTP.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(APP, 'src/stories/data');

const REELS = 5;
const ROWS = 5;
const MIN_CLUSTER = 5;
const FREE_SPINS = 10;
// symbols in a base spin's clusters, all its tumbles together, that start the free spins: the same
// as BONUS_TRIGGER in src/game/constants.ts
const BONUS_TRIGGER = 35;
// amounts in books are in hundredths of the bet
const BET = 100;

// how often each symbol is drawn (premiums in power spins with Othala's power): mostly a few leaves,
// so clusters come often enough for the bonus meter to fill now and then (about 1 base spin in 190)
// and for runes to be collected in the free spins
const WEIGHTS = {
	basegame: { L4: 40, L3: 30, L2: 20, L1: 12, H4: 5, H3: 4, H2: 3, H1: 2 },
	freegame: { L4: 40, L3: 30, L2: 20, L1: 12, H4: 5, H3: 4, H2: 3, H1: 2 },
	premiums: { H4: 11, H3: 9, H2: 7, H1: 5 },
};

// the runes' spots, [reel, row] with row 0 the top row, and their powers: the same as RUNES in
// src/game/runes.ts
const RUNES = {
	othala: { power: 'premiums', spots: [[2, 0], [1, 1], [3, 1], [2, 2], [1, 3], [3, 3]] },
	fehu: { power: 'multiplier', spots: [[2, 0], [3, 0], [2, 1], [3, 1], [2, 2], [2, 3], [2, 4]] },
	hagall: { power: 'wilds', spots: [[1, 1], [2, 1], [3, 1], [2, 2], [1, 3], [2, 3], [3, 3]] },
	ingwaz: {
		power: 'extraSpin',
		spots: [[1, 0], [3, 0], [2, 1], [1, 2], [3, 2], [2, 3], [1, 4], [3, 4]],
	},
};
const POWER_SPINS = 2;
const POWER_MULT = 3;
const WILDS = 3;

// the paytable, from the game's config: { L1: { 5: 0.6, 6: 1.5, ... }, ... }
const loadConfig = () => {
	const src = readFileSync(join(APP, 'src/game/config.ts'), 'utf8').replace('export default', 'return');
	return new Function(src)();
};
const config = loadConfig();
const PAYTABLE = Object.fromEntries(
	Object.entries(config.symbols)
		.filter(([, symbol]) => symbol.paytable)
		.map(([name, symbol]) => [name, Object.assign({}, ...symbol.paytable)]),
);
const pay = (name, size) => {
	const table = PAYTABLE[name];
	const sizes = Object.keys(table).map(Number).filter((n) => n <= size);
	return sizes.length ? table[Math.max(...sizes)] : 0;
};

// the math SDK's win levels: "standard" for a spin's win, "endFeature" for the free spins' total
const winLevel = (multiplier) =>
	[0.1, 1, 2, 5, 15, 30, 50, 100, config.betModes.base.max_win].findIndex((t) => multiplier < t) + 1 ||
	10;
const endFeatureLevel = (multiplier) =>
	[1, 5, 10, 20, 50, 100, 500].findIndex((t) => multiplier < t) + 1 || 9;

// seeded, so the books come out the same each run
let seed = 20261020;
const random = () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const randomInt = (max) => Math.floor(random() * max);
const shuffle = (list) => list.map((x) => [random(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

const draw = (gameType) => {
	const weights = WEIGHTS[gameType];
	const total = Object.values(weights).reduce((a, b) => a + b, 0);
	let roll = random() * total;
	return { name: Object.keys(weights).find((key) => (roll -= weights[key]) < 0) ?? 'L4' };
};

// a board is reels of 7 symbols: one above the board, the 5 rows, one below (rows 1-5 show)
const newBoard = (gameType) =>
	Array.from({ length: REELS }, () => Array.from({ length: ROWS + 2 }, () => draw(gameType)));

// a wild is in the clusters of every symbol next to it, so each symbol has its own spots seen
const findClusters = (board) => {
	const seenBy = {};
	const clusters = [];
	for (let r = 0; r < REELS; r++) {
		for (let row = 1; row <= ROWS; row++) {
			const name = board[r][row].name;
			const seen = (seenBy[name] ??= new Set());
			if (seen.has(`${r}:${row}`) || name === 'W') continue;
			const positions = [];
			const queue = [{ reel: r, row }];
			seen.add(`${r}:${row}`);
			while (queue.length) {
				const p = queue.shift();
				positions.push(p);
				for (const [dr, dy] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1],
				]) {
					const q = { reel: p.reel + dr, row: p.row + dy };
					const key = `${q.reel}:${q.row}`;
					if (q.reel < 0 || q.reel >= REELS || q.row < 1 || q.row > ROWS || seen.has(key)) continue;
					if (board[q.reel][q.row].name !== name && board[q.reel][q.row].name !== 'W') continue;
					seen.add(key);
					queue.push(q);
				}
			}
			if (positions.length >= MIN_CLUSTER) clusters.push({ name, positions });
		}
	}
	return clusters;
};

// the spot in the cluster nearest its middle, where its win amount shows
const overlay = (positions) => {
	const mx = positions.reduce((s, p) => s + p.reel, 0) / positions.length;
	const my = positions.reduce((s, p) => s + p.row, 0) / positions.length;
	return positions.reduce((best, p) =>
		(p.reel - mx) ** 2 + (p.row - my) ** 2 < (best.reel - mx) ** 2 + (best.row - my) ** 2 ? p : best,
	);
};

const keyOf = ({ reel, row }) => `${reel}:${row}`;
const unique = (positions) => [...new Map(positions.map((p) => [keyOf(p), p])).values()];

// the free spins' runes: `order` they show in, the one showing and where (its offset from RUNES),
// its spots lit, and those collected
const newRunes = () => ({
	order: shuffle(Object.keys(RUNES)),
	current: null,
	offset: { reel: 0, row: 0 },
	lit: new Set(),
	collected: [],
});

// every offset that keeps all of a rune's spots on the board
const runeOffsets = (rune) => {
	const reels = RUNES[rune].spots.map(([reel]) => reel);
	const rows = RUNES[rune].spots.map(([, row]) => row);
	const offsets = [];
	for (let row = -Math.min(...rows); row < ROWS - Math.max(...rows); row++) {
		for (let reel = -Math.min(...reels); reel < REELS - Math.max(...reels); reel++) {
			offsets.push({ reel, row });
		}
	}
	return offsets;
};

// the next rune, if one is left, anywhere on the board it fits
const showNextRune = (push, runes) => {
	runes.current = runes.order[runes.collected.length] ?? null;
	runes.lit.clear();
	if (!runes.current) return;
	const offsets = runeOffsets(runes.current);
	runes.offset = offsets[randomInt(offsets.length)];
	push({ type: 'runeShow', rune: runes.current, offset: runes.offset });
};

// lights the rune's spots under the winning clusters; with all lit, collects it (the spin goes on
// without a rune)
const lightRune = (push, runes, positions) => {
	if (!runes.current) return;
	const spots = RUNES[runes.current].spots.map(([reel, row]) => [reel + runes.offset.reel, row + runes.offset.row]);
	const hit = positions.filter(
		(p) => spots.some(([reel, row]) => p.reel === reel && p.row === row + 1) && !runes.lit.has(keyOf(p)),
	);
	if (!hit.length) return;
	hit.forEach((p) => runes.lit.add(keyOf(p)));
	push({ type: 'runeLight', rune: runes.current, positions: hit });
	if (runes.lit.size < spots.length) return;
	push({ type: 'runeComplete', rune: runes.current });
	runes.collected.push(runes.current);
	runes.current = null;
};

// a 3x3 block of wilds somewhere on the board
const placeWilds = (board) => {
	const left = randomInt(REELS - WILDS + 1);
	const top = 1 + randomInt(ROWS - WILDS + 1);
	for (let r = left; r < left + WILDS; r++) {
		for (let row = top; row < top + WILDS; row++) board[r][row] = { name: 'W', wild: true };
	}
};

// One spin with its tumbles, pushing its events; its win, and how many symbols its clusters had (all
// its tumbles together; a base game spin counts them on the bonus meter as it goes). In free spins
// `runes` holds the runes. New symbols are drawn from `symbols` (WEIGHTS).
const playSpin = ({ events, board, gameType, symbols = gameType, globalMult, runes = null }) => {
	const push = (event) => events.push({ index: events.length, ...event });
	push({
		type: 'reveal',
		board: structuredClone(board),
		paddingPositions: board.map(() => randomInt(250)),
		gameType,
		anticipation: board.map(() => 0),
	});

	let spinWin = 0;
	let connected = 0;
	for (;;) {
		const clusters = findClusters(board);
		if (!clusters.length) break;

		const wins = clusters.map(({ name, positions }) => {
			const base = pay(name, positions.length);
			return {
				symbol: name,
				clusterSize: positions.length,
				win: Math.round(base * BET * globalMult),
				positions,
				meta: { globalMult, clusterMult: 1, winWithoutMult: base, overlay: overlay(positions) },
			};
		});
		const tumbleWin = wins.reduce((sum, w) => sum + w.win, 0);
		spinWin += tumbleWin;
		push({ type: 'winInfo', totalWin: tumbleWin, wins });
		push({ type: 'updateTumbleWin', amount: spinWin });

		// a wild in two clusters explodes once
		const exploding = unique(clusters.flatMap((c) => c.positions)).sort(
			(a, b) => a.reel - b.reel || b.row - a.row,
		);
		connected += exploding.length;
		if (gameType === 'basegame') push({ type: 'updateBonusMeter', amount: connected });
		if (runes) lightRune(push, runes, exploding);

		// the new symbols drop in on top: the first becomes the one above the board, and the one that
		// was above the board drops into view
		const newSymbols = board.map((reel, r) => {
			const gone = exploding.filter((p) => p.reel === r).map((p) => p.row);
			const added = Array.from({ length: gone.length }, () => draw(symbols));
			const kept = reel.filter((_, i) => !gone.includes(i));
			board[r] = [...added, ...kept];
			return added;
		});
		push({ type: 'tumbleBoard', newSymbols: structuredClone(newSymbols), explodingSymbols: exploding });
	}
	return { win: spinWin, connected };
};

// The power spins after the free spins, with the collected runes' powers. Returns their win.
const playPowerSpins = ({ events, push, collected, total }) => {
	const powers = collected.map((rune) => RUNES[rune].power);
	const spins = POWER_SPINS + (powers.includes('extraSpin') ? 1 : 0);
	const mult = powers.includes('multiplier') ? POWER_MULT : 1;
	const symbols = powers.includes('premiums') ? 'premiums' : 'freegame';
	push({ type: 'powerSpinsTrigger', totalSpins: spins, runes: collected });

	let win = 0;
	for (let spin = 1; spin <= spins; spin++) {
		push({ type: 'updatePowerSpin', amount: spin, total: spins });
		push({ type: 'updateGlobalMult', globalMult: mult });
		const board = newBoard(symbols);
		if (powers.includes('wilds')) placeWilds(board);
		const spinWin = playSpin({ events, board, gameType: 'freegame', symbols, globalMult: mult }).win;
		win += spinWin;
		if (spinWin > 0) push({ type: 'setWin', amount: spinWin, winLevel: winLevel(spinWin / BET) });
		push({ type: 'setTotalWin', amount: total + win });
	}
	return win;
};

// A whole round: the base spin and, with BONUS_TRIGGER symbols in its clusters (or bought, `bonus`),
// the free spins and the power spins.
const playRound = ({ id, bonus = false }) => {
	const events = [];
	const push = (event) => events.push({ index: events.length, ...event });

	const { win: baseWin, connected } = playSpin({
		events,
		board: newBoard('basegame'),
		gameType: 'basegame',
		globalMult: 1,
	});
	if (baseWin > 0) push({ type: 'setWin', amount: baseWin, winLevel: winLevel(baseWin / BET) });
	push({ type: 'setTotalWin', amount: baseWin });

	let total = baseWin;
	let freeWin = 0;
	const triggered = bonus || connected >= BONUS_TRIGGER;
	if (triggered) {
		push({ type: 'freeSpinTrigger', totalFs: FREE_SPINS, positions: [] });
		const runes = newRunes();
		for (let spin = 1; spin <= FREE_SPINS; spin++) {
			push({ type: 'updateFreeSpin', amount: spin, total: FREE_SPINS });
			push({ type: 'updateGlobalMult', globalMult: spin });
			// the first rune, or the next one after one was collected
			if (!runes.current) showNextRune(push, runes);
			const { win } = playSpin({
				events,
				board: newBoard('freegame'),
				gameType: 'freegame',
				globalMult: spin,
				runes,
			});
			freeWin += win;
			total += win;
			if (win > 0) push({ type: 'setWin', amount: win, winLevel: winLevel(win / BET) });
			push({ type: 'setTotalWin', amount: total });
		}
		const powerWin = playPowerSpins({ events, push, collected: runes.collected, total });
		freeWin += powerWin;
		total += powerWin;
		push({ type: 'freeSpinEnd', amount: freeWin, winLevel: endFeatureLevel(freeWin / BET) });
	}
	push({ type: 'finalWin', amount: total });

	return {
		id,
		payoutMultiplier: Math.round(total) / BET,
		events,
		criteria: triggered ? 'freegame' : total > 0 ? 'basegame' : '0',
		baseGameWins: baseWin / BET,
		freeGameWins: freeWin / BET,
	};
};

// --- pick the books ----------------------------------------------------------------------------

const pool = Array.from({ length: 20000 }, (_, i) => playRound({ id: i }));
const natural = pool.filter((b) => b.criteria !== 'freegame');

if (process.argv.includes('--stats')) {
	const hits = natural.filter((b) => b.payoutMultiplier > 0).length;
	const mean = natural.reduce((s, b) => s + b.payoutMultiplier, 0) / natural.length;
	const triggers = pool.length - natural.length;
	const bonus = Array.from({ length: 2000 }, (_, i) => playRound({ id: i, bonus: true }));
	const bonusMean = bonus.reduce((s, b) => s + b.payoutMultiplier, 0) / bonus.length;
	console.log(`base: hit rate ${((hits / natural.length) * 100).toFixed(1)}%, mean ${mean.toFixed(3)}x`);
	console.log(`free spins triggered naturally: 1 in ${Math.round(pool.length / Math.max(1, triggers))}`);
	// the bonus meter: how far base spins fill it
	const meters = pool.map((b) =>
		Math.max(0, ...b.events.filter((e) => e.type === 'updateBonusMeter').map((e) => e.amount)),
	);
	const atLeast = (n) => `${((meters.filter((m) => m >= n).length / meters.length) * 100).toFixed(2)}%`;
	console.log(`bonus meter: 10+ ${atLeast(10)}, 20+ ${atLeast(20)}, 30+ ${atLeast(30)}, 35+ ${atLeast(35)}, max ${Math.max(...meters)}`);
	console.log(`bonus rounds: mean ${bonusMean.toFixed(1)}x, max ${Math.max(...bonus.map((b) => b.payoutMultiplier))}x`);
	// how many runes a bonus collects, and what the power spins win
	const collected = bonus.map((b) => b.events.filter((e) => e.type === 'runeComplete').length);
	const share = (n) => `${((collected.filter((c) => c === n).length / bonus.length) * 100).toFixed(0)}%`;
	console.log(`runes collected: 0 ${share(0)}, 1 ${share(1)}, 2 ${share(2)}, 3 ${share(3)}, 4 ${share(4)}`);
	const powerWins = bonus.map((b) => {
		const start = b.events.findIndex((e) => e.type === 'powerSpinsTrigger');
		const end = b.events.findIndex((e) => e.type === 'freeSpinEnd');
		return b.events.slice(start, end).reduce((s, e) => s + (e.type === 'setWin' ? e.amount : 0), 0) / BET;
	});
	const sorted = [...powerWins].sort((a, b) => a - b);
	console.log(
		`power spins: mean ${(powerWins.reduce((s, w) => s + w, 0) / bonus.length).toFixed(1)}x, ` +
			`median ${sorted[sorted.length >> 1]}x, max ${sorted[sorted.length - 1]}x`,
	);
	const tumbles = bonus.map((b) => b.events.filter((e) => e.type === 'tumbleBoard').length);
	console.log(`tumbles per bonus: max ${Math.max(...tumbles)}`);
	process.exit(0);
}

// evenly spread over a sorted list
const spread = (list, count) =>
	Array.from({ length: count }, (_, i) => list[Math.floor(((i + 0.5) * list.length) / count)]);

// bonus rounds under the max win, by how many runes they collect and then by win: the books show
// every number of runes (all four are rare), `mix` of each, 0 to 4, spread over their wins, with
// those short of it made up from fewer
const BONUS_MIX = [4, 8, 8, 6, 4];
const runesCollected = (book) => book.events.filter((e) => e.type === 'runeComplete').length;
const bonusPool = Array.from({ length: 8000 }, (_, i) => playRound({ id: i, bonus: true })).filter(
	(b) => b.payoutMultiplier <= config.betModes.bonus.max_win,
);
// all four is rarer than 1 in 10000: play on until there is one to show (up to MORE_BONUS more)
const MORE_BONUS = 150000;
for (let i = 0; i < MORE_BONUS && !bonusPool.some((b) => runesCollected(b) === 4); i++) {
	const book = playRound({ id: i, bonus: true });
	if (runesCollected(book) === 4 && book.payoutMultiplier <= config.betModes.bonus.max_win) bonusPool.push(book);
}
const byRunes = BONUS_MIX.map((_, n) =>
	bonusPool.filter((b) => runesCollected(b) === n).sort((a, b) => a.payoutMultiplier - b.payoutMultiplier),
);
const pickBonus = (mix) => {
	let short = 0;
	return mix
		.map((count, n) => [count, n])
		.reverse()
		.flatMap(([count, n]) => {
			const wanted = count + short;
			const picked = byRunes[n].length > wanted ? spread(byRunes[n], wanted) : byRunes[n];
			short = wanted - picked.length;
			return picked;
		});
};
console.log('bonus rounds by runes collected', byRunes.map((list) => list.length).join(' '));

const losses = natural.filter((b) => b.payoutMultiplier === 0);
const wins = natural.filter((b) => b.payoutMultiplier > 0).sort((a, b) => a.payoutMultiplier - b.payoutMultiplier);
const baseBooks = shuffle([
	...spread(losses, 24),
	...spread(wins, 30),
	// bonus rounds the bar started, spread over their wins
	...spread(
		pool
			.filter((b) => b.criteria === 'freegame' && b.payoutMultiplier <= config.betModes.base.max_win)
			.sort((a, b) => a.payoutMultiplier - b.payoutMultiplier),
		6,
	),
]).map((book, i) => ({ ...book, id: i + 1 }));
const bonusBooks = shuffle(pickBonus(BONUS_MIX)).map((book, i) => ({ ...book, id: i + 1 }));

// one of each event, for the single event stories
const pickEvents = (books) => {
	const all = books.flatMap((b) => b.events);
	const first = (type, test = () => true) => {
		const { index, ...event } = all.find((e) => e.type === type && test(e));
		return event;
	};
	// the runeShow before the first such event (in the same book: a rune shows before it lights)
	const showFor = (type, test = () => true) => {
		const at = all.findIndex((e) => e.type === type && test(e));
		const { index, ...event } = all.slice(0, at).findLast((e) => e.type === 'runeShow');
		return event;
	};
	const trigger = first('freeSpinTrigger');
	return {
		reveal: first('reveal', (e) => e.gameType === 'basegame'),
		setTotalWin: first('setTotalWin', (e) => e.amount > 0),
		finalWin: first('finalWin', (e) => e.amount > 0),
		winInfo: first('winInfo'),
		updateTumbleWin: first('updateTumbleWin'),
		tumbleBoard: first('tumbleBoard'),
		setWin: first('setWin'),
		freeSpinTrigger: trigger,
		updateBonusMeter: first('updateBonusMeter', (e) => e.amount >= 15),
		updateFreeSpin: first('updateFreeSpin'),
		updateGlobalMult: first('updateGlobalMult', (e) => e.globalMult > 1),
		freeSpinEnd: first('freeSpinEnd'),
		runeShow: first('runeShow', (e) => e.offset.reel !== 0 || e.offset.row !== 0),
		runeLight: first('runeLight', (e) => e.positions.length > 1),
		runeComplete: first('runeComplete'),
		// the runeShow that put each of those two's rune on the board
		runeLightShow: showFor('runeLight', (e) => e.positions.length > 1),
		runeCompleteShow: showFor('runeComplete'),
		powerSpinsTrigger: first('powerSpinsTrigger', (e) => e.runes.length > 1),
		updatePowerSpin: first('updatePowerSpin'),
		// these rules have no retrigger; the event is made up from the trigger
		freeSpinRetrigger: { type: 'freeSpinRetrigger', totalFs: FREE_SPINS + 5, positions: trigger.positions },
	};
};

const HEADER =
	'// Generated by scripts/generate-5x5-books.mjs: made-up 5x5 rounds for previewing the game until\n' +
	"// the real math is exported. Don't edit by hand.\n";
const write = (name, value) => {
	writeFileSync(join(DATA, name), `${HEADER}export default ${JSON.stringify(value, null, '\t')};\n`);
	console.log(`wrote src/stories/data/${name}`);
};
write('base_books.ts', baseBooks);
write('bonus_books.ts', bonusBooks);
write('base_events.ts', pickEvents(baseBooks));
write('bonus_events.ts', pickEvents(bonusBooks));

// a board without wins, for the game's first screen (INITIAL_BOARD in src/game/constants.ts)
const initial = losses[0].events[0].board;
console.log('INITIAL_BOARD', JSON.stringify(initial.map((reel) => reel.map((s) => s.name))));
