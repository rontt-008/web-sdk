// Lozza (static/lozza/lozza11.0.js, by Colin Jenkins: https://github.com/op12no2/lozza, "feel free to use
// as you like"): the start screen's opponent (Sandbox), a UCI engine in a web worker, far stronger than
// the game's own engine (engine.ts), which stands in if the worker can't be started or doesn't answer.
// One question at a time: the position as a FEN string, the depth to look, and its best move back in UCI
// form (e2e4, e7e8q).

let worker: Worker | undefined;
let ready: Promise<void> | undefined;
let failed = false;

const start = () => {
	if (ready) return ready;
	ready = new Promise<void>((resolve, reject) => {
		try {
			worker = new Worker(new URL('lozza/lozza11.0.js', document.baseURI));
		} catch (error) {
			reject(error);
			return;
		}
		const timer = setTimeout(() => reject(new Error('Lozza did not answer')), 10000);
		worker.onerror = (event) => {
			clearTimeout(timer);
			reject(event.error ?? new Error(event.message));
		};
		worker.onmessage = (event: MessageEvent<string>) => {
			if (String(event.data).startsWith('uciok')) {
				clearTimeout(timer);
				resolve();
			}
		};
		worker.postMessage('uci');
	});
	ready.catch(() => {
		failed = true;
		worker?.terminate();
		worker = undefined;
	});
	return ready;
};

// the engine's best move for the position, or none when the engine isn't there or takes too long
export const lozzaBestMove = async (fen: string, depth: number, timeout = 8000): Promise<string | undefined> => {
	if (failed) return undefined;
	try {
		await start();
	} catch {
		return undefined;
	}
	const engine = worker;
	if (!engine) return undefined;
	return new Promise<string | undefined>((resolve) => {
		const timer = setTimeout(() => {
			engine.onmessage = null;
			engine.postMessage('stop');
			resolve(undefined);
		}, timeout);
		engine.onmessage = (event: MessageEvent<string>) => {
			const line = String(event.data);
			if (!line.startsWith('bestmove')) return;
			clearTimeout(timer);
			engine.onmessage = null;
			const move = line.split(/\s+/)[1];
			resolve(move && move !== '(none)' && move !== '0000' ? move : undefined);
		};
		engine.postMessage('ucinewgame');
		engine.postMessage(`position fen ${fen}`);
		engine.postMessage(`go depth ${depth}`);
	});
};

// the engine's best `count` moves for the position, the best first, in UCI form with their scores (its
// MultiPV; the scores in hundredths of a pawn from the side to move, a mate far above any material): the
// player's hint, and the grading; empty when the engine isn't there or takes too long
export type TopMove = { move: string; score: number };
export const lozzaTopMoves = async (fen: string, depth: number, count: number, timeout = 10000): Promise<TopMove[]> => {
	if (failed) return [];
	try {
		await start();
	} catch {
		return [];
	}
	const engine = worker;
	if (!engine) return [];
	return new Promise<TopMove[]>((resolve) => {
		const lines = new Map<number, TopMove>();
		const finish = (result: TopMove[]) => {
			engine.onmessage = null;
			engine.postMessage('setoption name MultiPV value 1');
			resolve(result);
		};
		const timer = setTimeout(() => {
			engine.postMessage('stop');
			finish([]);
		}, timeout);
		engine.onmessage = (event: MessageEvent<string>) => {
			const line = String(event.data);
			if (line.startsWith('info ') && line.includes(' multipv ') && line.includes(' pv ')) {
				const parts = line.trim().split(/\s+/);
				const rank = Number(parts[parts.indexOf('multipv') + 1]);
				const move = parts[parts.indexOf('pv') + 1];
				const at = parts.indexOf('score');
				const value = Number(parts[at + 2]);
				const score = at < 0 || Number.isNaN(value) ? 0 : parts[at + 1] === 'mate' ? Math.sign(value) * (100000 - Math.abs(value)) : value;
				if (rank && move) lines.set(rank, { move, score });
			}
			if (line.startsWith('bestmove')) {
				clearTimeout(timer);
				finish([...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, line]) => line));
			}
		};
		engine.postMessage('ucinewgame');
		engine.postMessage(`setoption name MultiPV value ${count}`);
		engine.postMessage(`position fen ${fen}`);
		engine.postMessage(`go depth ${depth}`);
	});
};

// the engine's best move for the position with its score, in hundredths of a pawn from the side to
// move (a mate far above any material: 100000 less the moves to it), or none without the engine
export const lozzaAnalyse = async (fen: string, depth: number, timeout = 8000): Promise<{ move: string; score: number } | undefined> => {
	if (failed) return undefined;
	try {
		await start();
	} catch {
		return undefined;
	}
	const engine = worker;
	if (!engine) return undefined;
	return new Promise((resolve) => {
		let score = 0;
		const timer = setTimeout(() => {
			engine.onmessage = null;
			engine.postMessage('stop');
			resolve(undefined);
		}, timeout);
		engine.onmessage = (event: MessageEvent<string>) => {
			const line = String(event.data);
			if (line.startsWith('info ') && line.includes(' score ')) {
				const parts = line.trim().split(/\s+/);
				const at = parts.indexOf('score');
				const value = Number(parts[at + 2]);
				if (!Number.isNaN(value)) score = parts[at + 1] === 'mate' ? Math.sign(value) * (100000 - Math.abs(value)) : value;
			}
			if (line.startsWith('bestmove')) {
				clearTimeout(timer);
				engine.onmessage = null;
				const move = line.split(/\s+/)[1];
				resolve(move && move !== '(none)' && move !== '0000' ? { move, score } : undefined);
			}
		};
		engine.postMessage('ucinewgame');
		engine.postMessage(`position fen ${fen}`);
		engine.postMessage(`go depth ${depth}`);
	});
};

// warms the engine up as the game starts, so its first answer is quick
export const lozzaPrepare = () => {
	start().catch(() => undefined);
};
