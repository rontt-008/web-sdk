import type { Position, SymbolName } from './types';
import { positionKey, type BoardPiece, type ChessMove, type MoveRules } from './chess';

// The start screen's opponent (Sandbox): the math's own small engine (math-sdk games/my_chess_game/
// chess_engine.py) in the client, move for move. The board is 64 squares, index row * 8 + col with row 0
// the top as the game draws it: your pieces 1-6 (P N B R Q K), the other side's -1 to -6, 0 empty; you
// move up the board (to lower rows). Alpha-beta search `depth` plies deep, then captures only, iterative
// deepening within a node budget, a material and position evaluation. No castling, no en passant, a pawn
// promotes to a queen: the game's rules. Castling and en passant too, for the start screen's game: two
// more slots after the squares hold the castling rights (RIGHTS, bits for each side and corner) and the
// square a pawn has just passed with a two-square step (PASSED, the square + 1, 0 for none).
const RIGHTS = 64;
const PASSED = 65;
const WHITE = 1;
const BLACK = -1;
const [P, N, B, R, Q, K] = [1, 2, 3, 4, 5, 6];
const VALUES = [0, 100, 300, 310, 500, 900, 0];
const MATE = 100000;
const QUIESCENCE_PLIES = 6;
const LETTERS = ['', 'P', 'N', 'B', 'R', 'Q', 'K'];

type Board = Int8Array;
type Move = [number, number, number];

// the castling rights' bits, and each side's king and rook squares (index row * 8 + col, row 0 the top:
// your king on e1 is 60)
const RIGHT = { WK: 1, WQ: 2, BK: 4, BQ: 8 };
const CASTLING = [
	{ side: WHITE, king: 60, rookK: 63, rookQ: 56, rightK: RIGHT.WK, rightQ: RIGHT.WQ },
	{ side: BLACK, king: 4, rookK: 7, rookQ: 0, rightK: RIGHT.BK, rightQ: RIGHT.BQ },
];

const targets = (steps: number[][]) =>
	Array.from({ length: 64 }, (_, sq) => {
		const row = Math.floor(sq / 8);
		const col = sq % 8;
		return steps
			.filter(([dr, dc]) => row + dr >= 0 && row + dr < 8 && col + dc >= 0 && col + dc < 8)
			.map(([dr, dc]) => (row + dr) * 8 + col + dc);
	});
const rays = (dirs: number[][]) =>
	Array.from({ length: 64 }, (_, sq) => {
		const row = Math.floor(sq / 8);
		const col = sq % 8;
		const result: number[][] = [];
		for (const [dr, dc] of dirs) {
			const ray: number[] = [];
			let r = row + dr;
			let c = col + dc;
			while (r >= 0 && r < 8 && c >= 0 && c < 8) {
				ray.push(r * 8 + c);
				r += dr;
				c += dc;
			}
			if (ray.length) result.push(ray);
		}
		return result;
	});
const KNIGHT_TARGETS = targets([[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]);
const KING_TARGETS = targets([[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]);
const BISHOP_RAYS = rays([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
const ROOK_RAYS = rays([[-1, 0], [1, 0], [0, -1], [0, 1]]);
const QUEEN_RAYS = BISHOP_RAYS.map((bishop, sq) => [...bishop, ...ROOK_RAYS[sq]]);

// a little positional sense: pieces towards the middle, pawns pushed on
const CENTRE = Array.from({ length: 64 }, (_, sq) => {
	const r = Math.floor(sq / 8);
	const c = sq % 8;
	return 6 - Math.floor((Math.abs(2 * r - 7) + Math.abs(2 * c - 7)) / 2);
});
const PAWN_ROW = [0, 60, 30, 18, 10, 5, 0, 0];

const kingSquare = (board: Board, side: number) => board.indexOf(K * side);

const isAttacked = (board: Board, sq: number, by: number) => {
	const row = Math.floor(sq / 8);
	const col = sq % 8;
	const pawnRow = by === WHITE ? row + 1 : row - 1;
	if (pawnRow >= 0 && pawnRow < 8) {
		for (const dc of [-1, 1]) {
			const c = col + dc;
			if (c >= 0 && c < 8 && board[pawnRow * 8 + c] === P * by) return true;
		}
	}
	for (const t of KNIGHT_TARGETS[sq]) if (board[t] === N * by) return true;
	for (const t of KING_TARGETS[sq]) if (board[t] === K * by) return true;
	for (const ray of BISHOP_RAYS[sq]) {
		for (const t of ray) {
			const p = board[t];
			if (p) {
				if (p === B * by || p === Q * by) return true;
				break;
			}
		}
	}
	for (const ray of ROOK_RAYS[sq]) {
		for (const t of ray) {
			const p = board[t];
			if (p) {
				if (p === R * by || p === Q * by) return true;
				break;
			}
		}
	}
	return false;
};

const inCheck = (board: Board, side: number) => {
	const k = kingSquare(board, side);
	return k >= 0 && isAttacked(board, k, -side);
};

const pseudoMoves = (board: Board, side: number): Move[] => {
	const moves: Move[] = [];
	for (let sq = 0; sq < 64; sq++) {
		const p = board[sq];
		if (p === 0 || p > 0 !== side > 0) continue;
		const t = p * side;
		if (t === P) {
			const row = Math.floor(sq / 8);
			const col = sq % 8;
			const fwd = sq - 8 * side;
			if (fwd >= 0 && fwd < 64) {
				const promoRow = side === WHITE ? 0 : 7;
				const promo = Math.floor(fwd / 8) === promoRow ? Q : 0;
				if (board[fwd] === 0) {
					moves.push([sq, fwd, promo]);
					const startRow = side === WHITE ? 6 : 1;
					const fwd2 = fwd - 8 * side;
					if (row === startRow && board[fwd2] === 0) moves.push([sq, fwd2, 0]);
				}
				for (const dc of [-1, 1]) {
					const c = col + dc;
					if (c < 0 || c >= 8) continue;
					if (board[fwd + dc] * side < 0) moves.push([sq, fwd + dc, promo]);
					// en passant: the pawn that has just passed the square beside this one
					else if (board[PASSED] && board[PASSED] - 1 === fwd + dc) moves.push([sq, fwd + dc, 0]);
				}
			}
		} else if (t === N) {
			for (const to of KNIGHT_TARGETS[sq]) if (board[to] * side <= 0) moves.push([sq, to, 0]);
		} else if (t === K) {
			for (const to of KING_TARGETS[sq]) if (board[to] * side <= 0) moves.push([sq, to, 0]);
			// castling: the right still held, nothing between king and rook, the king not in check and
			// not crossing or landing on an attacked square
			const home = CASTLING.find((c) => c.side === side)!;
			if (sq === home.king && board[RIGHTS] & (home.rightK | home.rightQ) && !isAttacked(board, sq, -side)) {
				if (board[RIGHTS] & home.rightK && board[home.rookK] === R * side && board[sq + 1] === 0 && board[sq + 2] === 0) {
					if (!isAttacked(board, sq + 1, -side) && !isAttacked(board, sq + 2, -side)) moves.push([sq, sq + 2, 0]);
				}
				if (board[RIGHTS] & home.rightQ && board[home.rookQ] === R * side && board[sq - 1] === 0 && board[sq - 2] === 0 && board[sq - 3] === 0) {
					if (!isAttacked(board, sq - 1, -side) && !isAttacked(board, sq - 2, -side)) moves.push([sq, sq - 2, 0]);
				}
			}
		} else {
			const lines = t === B ? BISHOP_RAYS[sq] : t === R ? ROOK_RAYS[sq] : QUEEN_RAYS[sq];
			for (const ray of lines) {
				for (const to of ray) {
					const q = board[to];
					if (q === 0) moves.push([sq, to, 0]);
					else {
						if (q * side < 0) moves.push([sq, to, 0]);
						break;
					}
				}
			}
		}
	}
	return moves;
};

// a pawn going aside onto an empty square: the en passant capture
const isEnPassant = (board: Board, [frm, to]: Move) =>
	Math.abs(board[frm]) === P && frm % 8 !== to % 8 && board[to] === 0;

const makeMove = (board: Board, [frm, to, promo]: Move, side: number): Board => {
	const after = board.slice();
	const piece = board[frm];
	if (isEnPassant(board, [frm, to, promo])) after[to + 8 * side] = 0;
	after[to] = promo ? promo * side : piece;
	after[frm] = 0;
	// a castling: the rook comes over
	if (piece === K * side && Math.abs(to - frm) === 2) {
		const rookFrom = to > frm ? frm + 3 : frm - 4;
		const rookTo = to > frm ? frm + 1 : frm - 1;
		after[rookTo] = after[rookFrom];
		after[rookFrom] = 0;
	}
	// the rights: a king or rook moved from, or a rook taken on, its square
	for (const c of CASTLING) {
		if (frm === c.king || to === c.king) after[RIGHTS] &= ~(c.rightK | c.rightQ);
		if (frm === c.rookK || to === c.rookK) after[RIGHTS] &= ~c.rightK;
		if (frm === c.rookQ || to === c.rookQ) after[RIGHTS] &= ~c.rightQ;
	}
	// the square a pawn has just passed, for one move
	after[PASSED] = Math.abs(piece) === P && Math.abs(to - frm) === 16 ? (frm + to) / 2 + 1 : 0;
	return after;
};

const legalMoves = (board: Board, side: number): [Move, Board][] => {
	const result: [Move, Board][] = [];
	for (const move of pseudoMoves(board, side)) {
		const after = makeMove(board, move, side);
		if (!inCheck(after, side)) result.push([move, after]);
	}
	return result;
};

// the position from `side`'s point of view, in centipawns
const evaluate = (board: Board, side: number) => {
	let score = 0;
	for (let sq = 0; sq < 64; sq++) {
		const p = board[sq];
		if (p === 0) continue;
		const t = Math.abs(p);
		let value = VALUES[t];
		// a king that has castled (or walked to its corner) is a little safer: so the engine castles
		if (t === K && ((p > 0 && (sq === 62 || sq === 58)) || (p < 0 && (sq === 6 || sq === 2)))) value += 35;
		if (t === N || t === B) value += 4 * CENTRE[sq];
		else if (t === Q) value += 2 * CENTRE[sq];
		else if (t === P) {
			const row = Math.floor(sq / 8);
			value += p > 0 ? PAWN_ROW[row] : PAWN_ROW[7 - row];
		}
		score += p > 0 ? value : -value;
	}
	return score * side;
};

// captures first, the most valuable victim with the least valuable attacker; then promotions
const order = (board: Board, moves: [Move, Board][], side: number) =>
	moves.sort(([a], [b]) => key(board, b, side) - key(board, a, side));
const key = (board: Board, [frm, to, promo]: Move, side: number) => {
	const victim = board[to] * -side;
	const attacker = board[frm] * side;
	return VALUES[victim] * 10 - VALUES[attacker] + (promo ? 800 : 0) + (victim ? 900 : 0);
};

export class Search {
	nodes = 0;

	constructor(
		public depth = 3,
		public maxNodes = 12000,
	) {}

	bestMove(board: Board, side: number): [Move, Board, number] | undefined {
		const moves = legalMoves(board, side);
		if (!moves.length) return undefined;
		order(board, moves, side);
		let best: [Move, Board, number] | undefined;
		this.nodes = 0;
		for (let depth = 1; depth <= this.depth; depth++) {
			const result = this.root(board, side, moves, depth);
			if (!result) break;
			best = result;
			// the best move first on the next pass
			const chosen = best[0];
			moves.sort(([a], [b]) => Number(a !== chosen) - Number(b !== chosen));
			if (Math.abs(best[2]) >= MATE - 100) break;
		}
		return best;
	}

	private root(board: Board, side: number, moves: [Move, Board][], depth: number) {
		let alpha = -MATE - 1;
		const beta = MATE + 1;
		let best: [Move, Board, number] | undefined;
		for (const [move, after] of moves) {
			const score = -this.negamax(after, -side, depth - 1, -beta, -alpha, 1);
			if (this.nodes > this.maxNodes && best) return undefined;
			if (!best || score > alpha) {
				alpha = score;
				best = [move, after, score];
			}
		}
		return best;
	}

	private negamax(board: Board, side: number, depth: number, alpha: number, beta: number, ply: number): number {
		this.nodes++;
		if (depth <= 0) return this.quiesce(board, side, alpha, beta, ply);
		const moves = legalMoves(board, side);
		if (!moves.length) return inCheck(board, side) ? -(MATE - ply) : 0;
		order(board, moves, side);
		let best = -MATE - 1;
		for (const [, after] of moves) {
			const score = -this.negamax(after, -side, depth - 1, -beta, -alpha, ply + 1);
			if (score > best) {
				best = score;
				if (score > alpha) {
					alpha = score;
					if (alpha >= beta) break;
				}
			}
			if (this.nodes > this.maxNodes) break;
		}
		return best;
	}

	private quiesce(board: Board, side: number, alpha: number, beta: number, ply: number): number {
		this.nodes++;
		const stand = evaluate(board, side);
		if (ply > this.depth + QUIESCENCE_PLIES) return stand;
		if (stand >= beta) return stand;
		if (stand > alpha) alpha = stand;
		const captures: [Move, Board][] = [];
		for (const move of pseudoMoves(board, side)) {
			if (board[move[1]] !== 0 || move[2] || isEnPassant(board, move)) {
				const after = makeMove(board, move, side);
				if (!inCheck(after, side)) captures.push([move, after]);
			}
		}
		if (!captures.length) return stand;
		order(board, captures, side);
		let best = stand;
		for (const [, after] of captures) {
			const score = -this.quiesce(after, -side, -beta, -alpha, ply + 1);
			if (score > best) {
				best = score;
				if (score > alpha) {
					alpha = score;
					if (alpha >= beta) break;
				}
			}
		}
		return best;
	}
}

// --- the game's pieces in and out ------------------------------------------------------------------

const toPosition = (sq: number): Position => ({ reel: sq % 8, row: Math.floor(sq / 8) + 1 });

const toBoard = (pieces: BoardPiece[], rules?: MoveRules): Board => {
	const board = new Int8Array(66);
	for (const piece of pieces) {
		const kind = LETTERS.indexOf(piece.symbol[1]);
		board[(piece.row - 1) * 8 + piece.reel] = piece.symbol[0] === 'W' ? kind : -kind;
	}
	if (rules) {
		// a right held while the king and that rook stand on their squares, never moved
		for (const c of CASTLING) {
			const kingHome = board[c.king] === K * c.side && !rules.moved.has(positionKey(toPosition(c.king)));
			if (kingHome && board[c.rookK] === R * c.side && !rules.moved.has(positionKey(toPosition(c.rookK)))) board[RIGHTS] |= c.rightK;
			if (kingHome && board[c.rookQ] === R * c.side && !rules.moved.has(positionKey(toPosition(c.rookQ)))) board[RIGHTS] |= c.rightQ;
		}
		if (rules.passed) board[PASSED] = (rules.passed.row - 1) * 8 + rules.passed.reel + 1;
	}
	return board;
};

// an engine move as the game's, with a castling's or an en passant's mark on it
const toChessMove = (board: Board, [frm, to, promo]: Move, side: number): ChessMove => {
	const promotion = promo ? ((side === WHITE ? 'WQ' : 'BQ') as SymbolName) : undefined;
	const castle = board[frm] === K * side && Math.abs(to - frm) === 2 ? (to > frm ? 'K' : 'Q') : undefined;
	const enPassant = isEnPassant(board, [frm, to, promo]) ? toPosition(to + 8 * side) : undefined;
	return { from: toPosition(frm), to: toPosition(to), promotion, castle, enPassant };
};

// every legal move the engine sees for `side` (for checking it against the game's own rules)
export const engineLegalMoves = (pieces: BoardPiece[], side: 'you' | 'them', rules?: MoveRules): ChessMove[] => {
	const board = toBoard(pieces, rules);
	const colour = side === 'you' ? WHITE : BLACK;
	return legalMoves(board, colour).map(([move]) => toChessMove(board, move, colour));
};

// the engine's move for `side` on the game's board, or none with no legal move
export const engineMove = (pieces: BoardPiece[], side: 'you' | 'them', rules?: MoveRules, depth = 3): ChessMove | undefined => {
	const board = toBoard(pieces, rules);
	const colour = side === 'you' ? WHITE : BLACK;
	const best = new Search(depth).bestMove(board, colour);
	return best && toChessMove(board, best[0], colour);
};
