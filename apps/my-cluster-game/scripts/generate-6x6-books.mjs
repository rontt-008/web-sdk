// Made-up 6x6 rounds for previewing the game in Storybook until the real math is exported.
//
//   node scripts/generate-6x6-books.mjs          writes src/stories/data/{base,bonus}_{books,events}.ts
//   node scripts/generate-6x6-books.mjs --stats  only prints how the made-up rules play
//
// It plays the cluster sample's rules on a 6x6 board and writes the rounds in the same book format
// the math SDK exports: clusters of 5+ matching symbols (side by side) pay the config's paytable and
// tumble out, new symbols drop in from above; 4+ scatters give 10 free spins, where every spot in a
// win is marked and then doubles (x2, x4 ... x128) each time it wins again, a cluster pays the sum of
// its spots' multipliers, and the global multiplier is the free spin's number. The odds are not
// tuned: this is for seeing the game, not for its RTP.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(APP, 'src/stories/data');

const REELS = 6;
const ROWS = 6;
const MIN_CLUSTER = 5;
const FREE_SPINS = 10;
const SCATTERS_TO_TRIGGER = 4;
const MAX_GRID_MULT = 128;
// amounts in books are in hundredths of the bet
const BET = 100;

// how often each symbol is drawn (scatters only in the base game)
const WEIGHTS = {
	basegame: { L4: 24, L3: 22, L2: 20, L1: 18, H4: 11, H3: 9, H2: 7, H1: 5, S: 1.2 },
	freegame: { L4: 24, L3: 22, L2: 20, L1: 18, H4: 11, H3: 9, H2: 7, H1: 5 },
};

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

const draw = (gameType) => {
	const weights = WEIGHTS[gameType];
	const total = Object.values(weights).reduce((a, b) => a + b, 0);
	let roll = random() * total;
	const name = Object.keys(weights).find((key) => (roll -= weights[key]) < 0) ?? 'L4';
	return name === 'S' ? { name, scatter: true } : { name };
};

// a board is reels of 8 symbols: one above the board, the 6 rows, one below (rows 1-6 show)
const newBoard = (gameType) =>
	Array.from({ length: REELS }, () => Array.from({ length: ROWS + 2 }, () => draw(gameType)));

const scatterPositions = (board) =>
	board.flatMap((reel, r) =>
		reel.slice(1, ROWS + 1).flatMap((symbol, i) => (symbol.scatter ? [{ reel: r, row: i + 1 }] : [])),
	);

// puts `count` scatters on the board, in different places
const forceScatters = (board, count) => {
	const spots = Array.from({ length: REELS * ROWS }, (_, i) => i).sort(() => random() - 0.5);
	let placed = scatterPositions(board).length;
	for (const spot of spots) {
		if (placed >= count) break;
		const symbol = board[spot % REELS][1 + Math.floor(spot / REELS)];
		if (!symbol.scatter) {
			board[spot % REELS][1 + Math.floor(spot / REELS)] = { name: 'S', scatter: true };
			placed++;
		}
	}
};

// reels after the third scatter (counting reel by reel) spin longer, 1, 2, 3 ...
const anticipation = (board) => {
	let seen = 0;
	let next = 0;
	return board.map((reel) => {
		const value = seen >= SCATTERS_TO_TRIGGER - 1 ? ++next : 0;
		seen += reel.slice(1, ROWS + 1).filter((symbol) => symbol.scatter).length;
		return value;
	});
};

const findClusters = (board) => {
	const seen = new Set();
	const clusters = [];
	for (let r = 0; r < REELS; r++) {
		for (let row = 1; row <= ROWS; row++) {
			const name = board[r][row].name;
			if (seen.has(`${r}:${row}`) || name === 'S') continue;
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
					if (board[q.reel][q.row].name !== name) continue;
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

const emptyGrid = () => Array.from({ length: REELS }, () => Array(ROWS).fill(0));

// One spin with its tumbles, pushing its events. In free spins `grid` holds the spots' multipliers.
const playSpin = ({ events, board, gameType, grid, globalMult }) => {
	const push = (event) => events.push({ index: events.length, ...event });
	push({
		type: 'reveal',
		board: structuredClone(board),
		paddingPositions: board.map(() => randomInt(250)),
		gameType,
		anticipation: anticipation(board),
	});
	if (grid) push({ type: 'updateGrid', gridMultipliers: structuredClone(grid) });

	let spinWin = 0;
	for (;;) {
		const clusters = findClusters(board);
		if (!clusters.length) break;

		const wins = clusters.map(({ name, positions }) => {
			const base = pay(name, positions.length);
			const spotMult = grid
				? positions.reduce((sum, p) => sum + (grid[p.reel][p.row - 1] >= 2 ? grid[p.reel][p.row - 1] : 0), 0)
				: 0;
			const clusterMult = Math.max(1, spotMult);
			return {
				symbol: name,
				clusterSize: positions.length,
				win: Math.round(base * BET * clusterMult * globalMult),
				positions,
				meta: { globalMult, clusterMult, winWithoutMult: base, overlay: overlay(positions) },
			};
		});
		const tumbleWin = wins.reduce((sum, w) => sum + w.win, 0);
		spinWin += tumbleWin;
		push({ type: 'winInfo', totalWin: tumbleWin, wins });
		push({ type: 'updateTumbleWin', amount: spinWin });

		const exploding = clusters
			.flatMap((c) => c.positions)
			.sort((a, b) => a.reel - b.reel || b.row - a.row);
		if (grid) {
			for (const p of exploding) {
				const v = grid[p.reel][p.row - 1];
				grid[p.reel][p.row - 1] = v === 0 ? 1 : Math.min(v * 2, MAX_GRID_MULT);
			}
			push({ type: 'updateGrid', gridMultipliers: structuredClone(grid) });
		}

		// the new symbols drop in on top: the first becomes the one above the board, and the one that
		// was above the board drops into view
		const newSymbols = board.map((reel, r) => {
			const gone = exploding.filter((p) => p.reel === r).map((p) => p.row);
			const added = Array.from({ length: gone.length }, () => draw(gameType));
			const kept = reel.filter((_, i) => !gone.includes(i));
			board[r] = [...added, ...kept];
			return added;
		});
		push({ type: 'tumbleBoard', newSymbols: structuredClone(newSymbols), explodingSymbols: exploding });
	}
	return spinWin;
};

// A whole round: the base spin and, with 4+ scatters, the free spins.
const playRound = ({ id, scatters = 0 }) => {
	const events = [];
	const push = (event) => events.push({ index: events.length, ...event });

	const board = newBoard('basegame');
	if (scatters) forceScatters(board, scatters);
	const baseWin = playSpin({ events, board, gameType: 'basegame', grid: null, globalMult: 1 });
	if (baseWin > 0) push({ type: 'setWin', amount: baseWin, winLevel: winLevel(baseWin / BET) });
	push({ type: 'setTotalWin', amount: baseWin });

	let total = baseWin;
	let freeWin = 0;
	const triggers = scatterPositions(board);
	if (triggers.length >= SCATTERS_TO_TRIGGER) {
		push({ type: 'freeSpinTrigger', totalFs: FREE_SPINS, positions: triggers });
		const grid = emptyGrid();
		for (let spin = 1; spin <= FREE_SPINS; spin++) {
			push({ type: 'updateFreeSpin', amount: spin, total: FREE_SPINS });
			push({ type: 'updateGlobalMult', globalMult: spin });
			const win = playSpin({
				events,
				board: newBoard('freegame'),
				gameType: 'freegame',
				grid,
				globalMult: spin,
			});
			freeWin += win;
			total += win;
			if (win > 0) push({ type: 'setWin', amount: win, winLevel: winLevel(win / BET) });
			push({ type: 'setTotalWin', amount: total });
		}
		push({ type: 'freeSpinEnd', amount: freeWin, winLevel: endFeatureLevel(freeWin / BET) });
	}
	push({ type: 'finalWin', amount: total });

	return {
		id,
		payoutMultiplier: Math.round(total) / BET,
		events,
		criteria: freeWin > 0 || triggers.length >= SCATTERS_TO_TRIGGER ? 'freegame' : total > 0 ? 'basegame' : '0',
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
	const bonus = Array.from({ length: 2000 }, (_, i) => playRound({ id: i, scatters: 4 }));
	const bonusMean = bonus.reduce((s, b) => s + b.payoutMultiplier, 0) / bonus.length;
	console.log(`base: hit rate ${((hits / natural.length) * 100).toFixed(1)}%, mean ${mean.toFixed(3)}x`);
	console.log(`free spins triggered naturally: 1 in ${Math.round(pool.length / Math.max(1, triggers))}`);
	console.log(`bonus rounds: mean ${bonusMean.toFixed(1)}x, max ${Math.max(...bonus.map((b) => b.payoutMultiplier))}x`);
	process.exit(0);
}

// evenly spread over a sorted list
const spread = (list, count) =>
	Array.from({ length: count }, (_, i) => list[Math.floor(((i + 0.5) * list.length) / count)]);
const shuffle = (list) => list.map((x) => [random(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

const losses = natural.filter((b) => b.payoutMultiplier === 0);
const wins = natural.filter((b) => b.payoutMultiplier > 0).sort((a, b) => a.payoutMultiplier - b.payoutMultiplier);
const baseBooks = shuffle([
	...spread(losses, 24),
	...spread(wins, 30),
	...Array.from({ length: 6 }, (_, i) => playRound({ id: 0, scatters: 4 + (i % 2) })),
]).map((book, i) => ({ ...book, id: i + 1 }));
const bonusBooks = Array.from({ length: 30 }, (_, i) => playRound({ id: i + 1, scatters: 4 + (i % 3 === 0) }));

// one of each event, for the single event stories
const pickEvents = (books) => {
	const all = books.flatMap((b) => b.events);
	const first = (type, test = () => true) => {
		const { index, ...event } = all.find((e) => e.type === type && test(e));
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
		updateFreeSpin: first('updateFreeSpin'),
		updateGlobalMult: first('updateGlobalMult', (e) => e.globalMult > 1),
		updateGrid: first('updateGrid', (e) => e.gridMultipliers.flat().some((v) => v >= 2)),
		freeSpinEnd: first('freeSpinEnd'),
		// these rules have no retrigger; the event is made up from the trigger
		freeSpinRetrigger: { type: 'freeSpinRetrigger', totalFs: FREE_SPINS + 5, positions: trigger.positions },
	};
};

const HEADER =
	'// Generated by scripts/generate-6x6-books.mjs: made-up 6x6 rounds for previewing the game until\n' +
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
