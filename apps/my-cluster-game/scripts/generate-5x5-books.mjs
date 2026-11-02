// Made-up 5x5 rounds for previewing the game in Storybook until the real math is exported.
//
//   node scripts/generate-5x5-books.mjs          writes src/stories/data/{base,bonus,super}_books.ts
//                                                and {base,bonus}_events.ts
//   node scripts/generate-5x5-books.mjs --stats  only prints how the made-up rules play
//
// It plays the cluster sample's rules on a 5x5 board and writes the rounds in the same book format
// the math SDK exports: clusters of 5+ matching symbols (side by side) pay the config's paytable and
// tumble out, new symbols drop in from above. A base game spin whose clusters, over all its
// tumbles, have 35 or more symbols (BONUS_TRIGGER; the bar right of the board counts them,
// updateBonusMeter) gives the bonus, 10 free spins, and 50 or more (SUPER_TRIGGER) the super bonus,
// the same with bigger powers (BONUS_TYPES); freeSpinTrigger says which (bonusType). Their wins are
// not multiplied (the user removed the sample's global multiplier, the free spin's number). The
// bonus and super bet modes buy them. There are no scatters.
//
// Runes: in the free spins one of four runes (RUNES, in random order) lies behind the symbols,
// anywhere on the board it fits. A spot of it lights up when a winning cluster covers it; when all
// its spots are lit, its power is collected, and the next rune shows when the next spin starts.
// After the free spins come 2 power spins (POWER_SPINS) with the collected powers: Fehu multiplies
// every win (x5, in the super bonus x10), Hagall puts a block of wilds on the board (2x2, in the super
// bonus 3x3), Othala only premiums, Ingwaz one power spin more. Wilds join any symbol's clusters.
//
// Wind: now and then (WIND.chance, any spin: base game, free spins and power spins) a gust blows a
// few wilds onto the board as it lands, before its wins (windWilds, after the reveal); more rarely
// (SWEEP.chance) instead it takes every symbol of one kind off the board (windSweep), and the board
// tumbles to fill their cells (tumbleBoard) before its wins.
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
// and the super bonus: the same as SUPER_TRIGGER there
const SUPER_TRIGGER = 50;
// amounts in books are in hundredths of the bet
const BET = 100;

// how often each symbol is drawn (premiums in power spins with Othala's power): mostly a few leaves,
// so clusters come often enough for the bonus meter to fill now and then and for runes to be
// collected in the free spins; and now and then a wild (W: in the base game and free spins about
// one board in three has one; Hagall's block of them in the power spins comes on top)
const WEIGHTS = {
	basegame: { L4: 40, L3: 30, L2: 20, L1: 12, H4: 5, H3: 4, H2: 3, H1: 2, W: 2 },
	freegame: { L4: 40, L3: 30, L2: 20, L1: 12, H4: 5, H3: 4, H2: 3, H1: 2, W: 2 },
	premiums: { H4: 11, H3: 9, H2: 7, H1: 5 },
};

// the runes' spots, [reel, row] with row 0 the top row, and their powers: the same as RUNES in
// src/game/runes.ts
const RUNES = {
	othala: {
		power: 'premiums',
		spots: [
			[2, 0],
			[1, 1],
			[3, 1],
			[2, 2],
			[1, 3],
			[3, 3],
		],
	},
	fehu: {
		power: 'multiplier',
		spots: [
			[2, 0],
			[3, 0],
			[2, 1],
			[3, 1],
			[2, 2],
			[2, 3],
			[2, 4],
		],
	},
	hagall: {
		power: 'wilds',
		spots: [
			[1, 1],
			[2, 1],
			[3, 1],
			[2, 2],
			[1, 3],
			[2, 3],
			[3, 3],
		],
	},
	ingwaz: {
		power: 'extraSpin',
		spots: [
			[1, 0],
			[3, 0],
			[2, 1],
			[1, 2],
			[3, 2],
			[2, 3],
			[1, 4],
			[3, 4],
		],
	},
};
const POWER_SPINS = 2;
// how often a spin's board gets a gust of wind, and how many of its cells (not wilds already) it
// blows wilds onto
const WIND = { chance: 0.06, count: { min: 2, max: 4 } };
// and how often instead it takes every symbol of one kind off the board: a kind it has at least
// `least` of (not wilds), at random
const SWEEP = { chance: 0.03, least: 3 };

// what Fehu's and Hagall's powers give in each bonus: its multiplier, and the side of its block of
// wilds (the same as BONUS_POWERS in src/game/runes.ts)
const BONUS_TYPES = { normal: { mult: 5, wilds: 2 }, super: { mult: 10, wilds: 3 } };

// the paytable, from the game's config: { L1: { 5: 0.6, 6: 1.5, ... }, ... }
const loadConfig = () => {
	const src = readFileSync(join(APP, 'src/game/config.ts'), 'utf8').replace(
		'export default',
		'return',
	);
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
	const sizes = Object.keys(table)
		.map(Number)
		.filter((n) => n <= size);
	return sizes.length ? table[Math.max(...sizes)] : 0;
};

// the math SDK's win levels: "standard" for a spin's win, "endFeature" for the free spins' total
const winLevel = (multiplier) =>
	[0.1, 1, 2, 5, 15, 30, 50, 100, config.betModes.base.max_win].findIndex((t) => multiplier < t) +
		1 || 10;
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
const shuffle = (list) =>
	list
		.map((x) => [random(), x])
		.sort((a, b) => a[0] - b[0])
		.map(([, x]) => x);

const draw = (gameType) => {
	const weights = WEIGHTS[gameType];
	const total = Object.values(weights).reduce((a, b) => a + b, 0);
	let roll = random() * total;
	const name = Object.keys(weights).find((key) => (roll -= weights[key]) < 0) ?? 'L4';
	return name === 'W' ? { name, wild: true } : { name };
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
		(p.reel - mx) ** 2 + (p.row - my) ** 2 < (best.reel - mx) ** 2 + (best.row - my) ** 2
			? p
			: best,
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
	const spots = RUNES[runes.current].spots.map(([reel, row]) => [
		reel + runes.offset.reel,
		row + runes.offset.row,
	]);
	const hit = positions.filter(
		(p) =>
			spots.some(([reel, row]) => p.reel === reel && p.row === row + 1) && !runes.lit.has(keyOf(p)),
	);
	if (!hit.length) return;
	hit.forEach((p) => runes.lit.add(keyOf(p)));
	push({ type: 'runeLight', rune: runes.current, positions: hit });
	if (runes.lit.size < spots.length) return;
	push({ type: 'runeComplete', rune: runes.current });
	runes.collected.push(runes.current);
	runes.current = null;
};

// a size x size block of wilds somewhere on the board
const placeWilds = (board, size) => {
	const left = randomInt(REELS - size + 1);
	const top = 1 + randomInt(ROWS - size + 1);
	for (let r = left; r < left + size; r++) {
		for (let row = top; row < top + size; row++) board[r][row] = { name: 'W', wild: true };
	}
};

// the board's cells that show (rows 1-5) with their symbols, but wilds
const nonWildCells = (board) =>
	board.flatMap((reel, r) =>
		reel
			.map((symbol, row) => ({ reel: r, row, symbol }))
			.filter(({ row, symbol }) => row >= 1 && row <= ROWS && symbol.name !== 'W'),
	);
const byReelAndRow = (a, b) => a.reel - b.reel || a.row - b.row;
// as the tumbles list the symbols going: by reel, in each the lowest first
const byTumble = (a, b) => a.reel - b.reel || b.row - a.row;

// the symbols at `positions` go and new ones, drawn from `symbols`, drop in on top: the first
// becomes the one above the board, and the one that was above the board drops into view. Returns
// the new ones, reel by reel
const refill = (board, positions, symbols) =>
	board.map((reel, r) => {
		const gone = positions.filter((p) => p.reel === r).map((p) => p.row);
		const added = Array.from({ length: gone.length }, () => draw(symbols));
		const kept = reel.filter((_, i) => !gone.includes(i));
		board[r] = [...added, ...kept];
		return added;
	});

// a gust of wind blowing wilds onto a few cells of the board that aren't wilds already (WIND)
const blowWilds = (push, board) => {
	const cells = nonWildCells(board);
	const count = WIND.count.min + randomInt(WIND.count.max - WIND.count.min + 1);
	const positions = shuffle(cells)
		.slice(0, count)
		.map(({ reel, row }) => ({ reel, row }))
		.sort(byReelAndRow);
	for (const { reel, row } of positions) board[reel][row] = { name: 'W', wild: true };
	push({ type: 'windWilds', positions });
};

// a gust of wind taking every symbol of one kind off the board (SWEEP), and the tumble filling their
// cells with new ones from `symbols`; none when no kind has enough
const sweepSymbols = (push, board, symbols) => {
	const cells = nonWildCells(board);
	const kinds = [...new Set(cells.map(({ symbol }) => symbol.name))].filter(
		(name) => cells.filter(({ symbol }) => symbol.name === name).length >= SWEEP.least,
	);
	if (!kinds.length) return;
	const symbol = kinds[randomInt(kinds.length)];
	const positions = cells
		.filter((cell) => cell.symbol.name === symbol)
		.map(({ reel, row }) => ({ reel, row }))
		.sort(byTumble);
	push({ type: 'windSweep', symbol, positions });
	push({
		type: 'tumbleBoard',
		newSymbols: structuredClone(refill(board, positions, symbols)),
		explodingSymbols: positions,
	});
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
	const gust = random();
	if (gust < WIND.chance) blowWilds(push, board);
	else if (gust < WIND.chance + SWEEP.chance) sweepSymbols(push, board, symbols);

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
		const exploding = unique(clusters.flatMap((c) => c.positions)).sort(byTumble);
		connected += exploding.length;
		if (gameType === 'basegame') push({ type: 'updateBonusMeter', amount: connected });
		if (runes) lightRune(push, runes, exploding);

		push({
			type: 'tumbleBoard',
			newSymbols: structuredClone(refill(board, exploding, symbols)),
			explodingSymbols: exploding,
		});
	}
	return { win: spinWin, connected };
};

// The power spins after the free spins, with the collected runes' powers as big as the bonus's
// (`bonusType`, BONUS_TYPES). Returns their win.
const playPowerSpins = ({ events, push, collected, total, bonusType }) => {
	const powers = collected.map((rune) => RUNES[rune].power);
	const spins = POWER_SPINS + (powers.includes('extraSpin') ? 1 : 0);
	const mult = powers.includes('multiplier') ? BONUS_TYPES[bonusType].mult : 1;
	const symbols = powers.includes('premiums') ? 'premiums' : 'freegame';
	push({ type: 'powerSpinsTrigger', totalSpins: spins, runes: collected });

	let win = 0;
	for (let spin = 1; spin <= spins; spin++) {
		push({ type: 'updatePowerSpin', amount: spin, total: spins });
		push({ type: 'updateGlobalMult', globalMult: mult });
		const board = newBoard(symbols);
		if (powers.includes('wilds')) placeWilds(board, BONUS_TYPES[bonusType].wilds);
		const spinWin = playSpin({
			events,
			board,
			gameType: 'freegame',
			symbols,
			globalMult: mult,
		}).win;
		win += spinWin;
		if (spinWin > 0) push({ type: 'setWin', amount: spinWin, winLevel: winLevel(spinWin / BET) });
		push({ type: 'setTotalWin', amount: total + win });
	}
	return win;
};

// A whole round: the base spin and, with BONUS_TRIGGER symbols in its clusters (SUPER_TRIGGER for the
// super bonus) or bought (`bonus`: 'normal' or 'super'), the free spins and the power spins.
const playRound = ({ id, bonus = null }) => {
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
	const triggered =
		bonus ?? (connected >= SUPER_TRIGGER ? 'super' : connected >= BONUS_TRIGGER ? 'normal' : null);
	if (triggered) {
		push({ type: 'freeSpinTrigger', totalFs: FREE_SPINS, positions: [], bonusType: triggered });
		const runes = newRunes();
		for (let spin = 1; spin <= FREE_SPINS; spin++) {
			push({ type: 'updateFreeSpin', amount: spin, total: FREE_SPINS });
			// the first rune, or the next one after one was collected
			if (!runes.current) showNextRune(push, runes);
			const { win } = playSpin({
				events,
				board: newBoard('freegame'),
				gameType: 'freegame',
				globalMult: 1,
				runes,
			});
			freeWin += win;
			total += win;
			if (win > 0) push({ type: 'setWin', amount: win, winLevel: winLevel(win / BET) });
			push({ type: 'setTotalWin', amount: total });
		}
		const powerWin = playPowerSpins({
			events,
			push,
			collected: runes.collected,
			total,
			bonusType: triggered,
		});
		freeWin += powerWin;
		total += powerWin;
		push({ type: 'freeSpinEnd', amount: freeWin, winLevel: endFeatureLevel(freeWin / BET) });
	}
	push({ type: 'finalWin', amount: total });

	return {
		id,
		payoutMultiplier: Math.round(total) / BET,
		events,
		criteria:
			triggered === 'super'
				? 'superfreegame'
				: triggered
					? 'freegame'
					: total > 0
						? 'basegame'
						: '0',
		baseGameWins: baseWin / BET,
		freeGameWins: freeWin / BET,
	};
};

// --- pick the books ----------------------------------------------------------------------------

const pool = Array.from({ length: 20000 }, (_, i) => playRound({ id: i }));
const natural = pool.filter((b) => !b.criteria.endsWith('freegame'));

if (process.argv.includes('--stats')) {
	const hits = natural.filter((b) => b.payoutMultiplier > 0).length;
	const mean = natural.reduce((s, b) => s + b.payoutMultiplier, 0) / natural.length;
	const triggers = (criteria) => pool.filter((b) => b.criteria === criteria).length;
	console.log(
		`base: hit rate ${((hits / natural.length) * 100).toFixed(1)}%, mean ${mean.toFixed(3)}x`,
	);
	console.log(
		`triggered naturally: bonus 1 in ${Math.round(pool.length / Math.max(1, triggers('freegame')))}, ` +
			`super 1 in ${Math.round(pool.length / Math.max(1, triggers('superfreegame')))}`,
	);
	// the bonus meter: how far base spins fill it
	const meters = pool.map((b) =>
		Math.max(0, ...b.events.filter((e) => e.type === 'updateBonusMeter').map((e) => e.amount)),
	);
	const atLeast = (n) =>
		`${((meters.filter((m) => m >= n).length / meters.length) * 100).toFixed(2)}%`;
	const oneIn = (type) =>
		Math.round(
			natural.length /
				Math.max(1, natural.filter((b) => b.events.some((e) => e.type === type)).length),
		);
	console.log(
		`wind: wilds in 1 base spin in ${oneIn('windWilds')}, a sweep in 1 in ${oneIn('windSweep')}`,
	);
	console.log(
		`bonus meter: 10+ ${atLeast(10)}, 20+ ${atLeast(20)}, 30+ ${atLeast(30)}, 35+ ${atLeast(35)}, 50+ ${atLeast(50)}, max ${Math.max(...meters)}`,
	);
	for (const type of Object.keys(BONUS_TYPES)) {
		const bonus = Array.from({ length: 2000 }, (_, i) => playRound({ id: i, bonus: type }));
		const bonusMean = bonus.reduce((s, b) => s + b.payoutMultiplier, 0) / bonus.length;
		console.log(
			`${type} bonus rounds: mean ${bonusMean.toFixed(1)}x, max ${Math.max(...bonus.map((b) => b.payoutMultiplier))}x`,
		);
		// how many runes a bonus collects, and what the power spins win
		const collected = bonus.map((b) => b.events.filter((e) => e.type === 'runeComplete').length);
		const share = (n) =>
			`${((collected.filter((c) => c === n).length / bonus.length) * 100).toFixed(0)}%`;
		console.log(
			`  runes collected: 0 ${share(0)}, 1 ${share(1)}, 2 ${share(2)}, 3 ${share(3)}, 4 ${share(4)}`,
		);
		const powerWins = bonus.map((b) => {
			const start = b.events.findIndex((e) => e.type === 'powerSpinsTrigger');
			const end = b.events.findIndex((e) => e.type === 'freeSpinEnd');
			return (
				b.events.slice(start, end).reduce((s, e) => s + (e.type === 'setWin' ? e.amount : 0), 0) /
				BET
			);
		});
		const sorted = [...powerWins].sort((a, b) => a - b);
		console.log(
			`  power spins: mean ${(powerWins.reduce((s, w) => s + w, 0) / bonus.length).toFixed(1)}x, ` +
				`median ${sorted[sorted.length >> 1]}x, max ${sorted[sorted.length - 1]}x`,
		);
		const tumbles = bonus.map((b) => b.events.filter((e) => e.type === 'tumbleBoard').length);
		console.log(`  tumbles per bonus: max ${Math.max(...tumbles)}`);
	}
	process.exit(0);
}

// evenly spread over a sorted list
const spread = (list, count) =>
	Array.from({ length: count }, (_, i) => list[Math.floor(((i + 0.5) * list.length) / count)]);

// a bonus's bought rounds under its bet mode's max win, by how many runes they collect and then by
// win: the books show every number of runes (all four are rare), BONUS_MIX of each, 0 to 4, spread
// over their wins, with those short of it made up from fewer
const BONUS_MIX = [4, 8, 8, 6, 4];
// all four is rarer than 1 in 10000: play on until there is one to show (up to MORE_BONUS more)
const MORE_BONUS = 150000;
const runesCollected = (book) => book.events.filter((e) => e.type === 'runeComplete').length;
const pickBonusBooks = (type, maxWin) => {
	const bonusPool = Array.from({ length: 8000 }, (_, i) =>
		playRound({ id: i, bonus: type }),
	).filter((b) => b.payoutMultiplier <= maxWin);
	for (let i = 0; i < MORE_BONUS && !bonusPool.some((b) => runesCollected(b) === 4); i++) {
		const book = playRound({ id: i, bonus: type });
		if (runesCollected(book) === 4 && book.payoutMultiplier <= maxWin) bonusPool.push(book);
	}
	const byRunes = BONUS_MIX.map((_, n) =>
		bonusPool
			.filter((b) => runesCollected(b) === n)
			.sort((a, b) => a.payoutMultiplier - b.payoutMultiplier),
	);
	console.log(
		`${type} bonus rounds by runes collected`,
		byRunes.map((list) => list.length).join(' '),
	);
	let short = 0;
	const picked = BONUS_MIX.map((count, n) => [count, n])
		.reverse()
		.flatMap(([count, n]) => {
			const wanted = count + short;
			const books = byRunes[n].length > wanted ? spread(byRunes[n], wanted) : byRunes[n];
			short = wanted - books.length;
			return books;
		});
	return shuffle(picked).map((book, i) => ({ ...book, id: i + 1 }));
};

const losses = natural.filter((b) => b.payoutMultiplier === 0);
const wins = natural
	.filter((b) => b.payoutMultiplier > 0)
	.sort((a, b) => a.payoutMultiplier - b.payoutMultiplier);
// bonus rounds the bar started, spread over their wins
const triggeredBooks = (criteria, count) =>
	spread(
		pool
			.filter((b) => b.criteria === criteria && b.payoutMultiplier <= config.betModes.base.max_win)
			.sort((a, b) => a.payoutMultiplier - b.payoutMultiplier),
		count,
	).filter(Boolean);
const baseBooks = shuffle([
	...spread(losses, 24),
	...spread(wins, 30),
	...triggeredBooks('freegame', 5),
	...triggeredBooks('superfreegame', 2),
]).map((book, i) => ({ ...book, id: i + 1 }));
const bonusBooks = pickBonusBooks('normal', config.betModes.bonus.max_win);
const superBooks = pickBonusBooks('super', config.betModes.super.max_win);

// one of each event, for the single event stories (their bonus's Hagall block wildSize cells a side,
// and the gust of wind's spin one of gameType)
const pickEvents = (books, wildSize, gameType) => {
	const all = books.flatMap((b) => b.events);
	// the first of a type passing the test, or the first of it at all if none does
	const first = (type, test = () => true) => {
		const { index, ...event } =
			all.find((e) => e.type === type && test(e)) ?? all.find((e) => e.type === type);
		return event;
	};
	// the runeShow before the first such event (in the same book: a rune shows before it lights)
	const showFor = (type, test = () => true) => {
		const at = all.findIndex((e) => e.type === type && test(e));
		const { index, ...event } = all.slice(0, at).findLast((e) => e.type === 'runeShow');
		return event;
	};
	// a power spin with Hagall's block of wilds (wildSize x wildSize), from its reveal up to the next
	// spin, for the story of the block (drawn as one big wild): it lands, wins with the symbols next
	// to it and goes (none in books without one)
	const wildBlockSpin = () => {
		const sides = [...Array(wildSize).keys()];
		const isBlock = (board, r, row) =>
			sides.every((dr) => sides.every((dy) => board[r + dr]?.[row + dy]?.name === 'W'));
		const at = all.findIndex(
			(e) =>
				e.type === 'reveal' &&
				e.board.some((_, r) => sides.some((dy) => isBlock(e.board, r, 1 + dy))),
		);
		if (at < 0) return [];
		const end = all.findIndex(
			(e, i) => i > at && ['reveal', 'updatePowerSpin', 'freeSpinEnd'].includes(e.type),
		);
		return all.slice(at, end).map(({ index, ...event }) => event);
	};
	// a spin of gameType with a gust of wind (`type`: windWilds or windSweep), from its reveal to its
	// end, for its story: the wilds blow in, or the symbols of a kind are blown away and the board
	// tumbles, and it wins (one passing `test` if there is: the gust's index in all)
	const SPIN_ENDS = ['setWin', 'setTotalWin'];
	const windSpin = (type, test) => {
		// from its reveal, just before it; in the free spins with the rune behind the board shown first
		// (its spots light)
		const spin = (at) => {
			const end = all.findIndex((e, i) => i > at && SPIN_ENDS.includes(e.type));
			const events = all.slice(at - 1, end);
			const show = events.some((e) => e.type === 'runeLight')
				? [all.slice(0, at).findLast((e) => e.type === 'runeShow')]
				: [];
			return [...show, ...events].map(({ index, ...event }) => event);
		};
		const gusts = all.flatMap((e, i) =>
			e.type === type && all[i - 1].gameType === gameType ? [i] : [],
		);
		if (!gusts.length) return [];
		return spin(gusts.find(test) ?? gusts[0]);
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
		// a big win's screen (MEGA WIN, level 8)
		setWinMega: first('setWin', (e) => e.winLevel === 8),
		freeSpinTrigger: trigger,
		updateBonusMeter: first('updateBonusMeter', (e) => e.amount >= 15),
		// past the bonus's 35, on toward the super bonus's 50
		updateBonusMeterSuper: first('updateBonusMeter', (e) => e.amount >= 42),
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
		wildBlock: wildBlockSpin(),
		// with a win round the wilds
		windWilds: windSpin('windWilds', (at) => all[at + 1]?.type === 'winInfo'),
		// a sweep of 5 or more symbols, the board winning after its tumble
		windSweep: windSpin(
			'windSweep',
			(at) => all[at].positions.length >= 5 && all[at + 2]?.type === 'winInfo',
		),
		// these rules have no retrigger; the event is made up from the trigger
		freeSpinRetrigger: {
			type: 'freeSpinRetrigger',
			totalFs: FREE_SPINS + 5,
			positions: trigger.positions,
		},
	};
};

const HEADER =
	'// Generated by scripts/generate-5x5-books.mjs: made-up 5x5 rounds for previewing the game until\n' +
	"// the real math is exported. Don't edit by hand.\n";
const write = (name, value) => {
	writeFileSync(
		join(DATA, name),
		`${HEADER}export default ${JSON.stringify(value, null, '\t')};\n`,
	);
	console.log(`wrote src/stories/data/${name}`);
};
write('base_books.ts', baseBooks);
write('bonus_books.ts', bonusBooks);
write('super_books.ts', superBooks);
write('base_events.ts', pickEvents(baseBooks, BONUS_TYPES.normal.wilds, 'basegame'));
// the bonus's, and the super bonus's own: its start, its power spins and its 3x3 block
const superEvents = pickEvents(superBooks, BONUS_TYPES.super.wilds, 'freegame');
write('bonus_events.ts', {
	...pickEvents(bonusBooks, BONUS_TYPES.normal.wilds, 'freegame'),
	superFreeSpinTrigger: superEvents.freeSpinTrigger,
	superPowerSpinsTrigger: superEvents.powerSpinsTrigger,
	superWildBlock: superEvents.wildBlock,
});

// a board without wins, for the game's first screen (INITIAL_BOARD in src/game/constants.ts)
const initial = losses[0].events[0].board;
console.log('INITIAL_BOARD', JSON.stringify(initial.map((reel) => reel.map((s) => s.name))));
