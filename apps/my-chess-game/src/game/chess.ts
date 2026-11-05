import type { PieceColour, PieceKind, Position, SymbolName } from './types';

// a symbol's kind (WQ: Q), or undefined for the empty square
export const pieceKind = (symbol: SymbolName): PieceKind | undefined =>
	symbol === 'E' ? undefined : (symbol[1] as PieceKind);

// whether a symbol is one of your pieces
export const isMine = (symbol: SymbolName) => symbol[0] === 'W';

// the picture of a symbol with your pieces in `colour` (static/assets/pieces): wQ, bQ...
export const pieceAssetKey = (symbol: SymbolName, colour: PieceColour) => {
	const kind = pieceKind(symbol);
	if (!kind) return undefined;
	const white = isMine(symbol) === (colour === 'white');
	return `${white ? 'w' : 'b'}${kind}`;
};

// a square's name in chess, with your side at the bottom (a1 bottom left): e4
export const squareName = ({ reel, row }: Position) =>
	`${'abcdefgh'[reel]}${9 - row}`;

export const positionKey = ({ reel, row }: Position) => `${reel}:${row}`;

// a move played this spin, as the side panel (SidePanel) keeps it
export type PlayedMove = {
	side: 'you' | 'them';
	piece: SymbolName;
	from: Position;
	to: Position;
	captured?: SymbolName;
	promotion?: SymbolName;
	check: boolean;
	mate: boolean;
};

// a move in chess notation: Nxe5, exd5, e8=Q+, Qh5#. No disambiguation (Nbd2): the panel has no board
// to tell two knights apart, and it reads fine without.
export const moveNotation = (move: PlayedMove) => {
	const kind = pieceKind(move.piece);
	const piece = kind === 'P' ? (move.captured ? squareName(move.from)[0] : '') : (kind ?? '');
	const promotion = move.promotion ? `=${pieceKind(move.promotion)}` : '';
	const check = move.mate ? '#' : move.check ? '+' : '';
	return `${piece}${move.captured ? 'x' : ''}${squareName(move.to)}${promotion}${check}`;
};

// an engine score in words, from your side: +1.5, -0.3, mate in 3, mated in 2 (the math's scores are in
// hundredths of a pawn, a mate 100000 less the plies to it)
export const scoreText = (score: number) => {
	if (Math.abs(score) >= 90000) {
		const moves = Math.ceil((100000 - Math.abs(score)) / 2);
		return score > 0 ? `mate in ${moves}` : `mated in ${moves}`;
	}
	const pawns = score / 100;
	return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
};

// the spin's moves paired up as numbered turns (yours first, as you always move first); a turn whose
// reply hasn't come yet has none
export const pairMoves = (moves: PlayedMove[]) => {
	const turns: { number: number; you?: PlayedMove; them?: PlayedMove }[] = [];
	for (const move of moves) {
		const last = turns[turns.length - 1];
		if (move.side === 'you' || !last || last.them) turns.push({ number: turns.length + 1, [move.side]: move });
		else last.them = move;
	}
	return turns;
};

// The pieces of `side` that attack `square` on a board of `pieces` (your pieces move up the board, to
// lower rows; the other side's down): the piece giving check, which is not always the piece that moved
// (a discovered check: the mover steps out of a line), and both of them in a double check.
const KNIGHT_STEPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export type BoardPiece = { symbol: SymbolName; reel: number; row: number };
// a move: with `castle` the king's two-square step (the rook on that side comes over), with `enPassant`
// a pawn's capture of the pawn on that square, which it passes
export type ChessMove = { from: Position; to: Position; promotion?: SymbolName; castle?: 'K' | 'Q'; enPassant?: Position };

// What the plain board can't tell: the squares a king or rook has ever moved from (castling needs the
// king and the rook on their starting squares, never moved) and the square a pawn has just passed over
// with a two-square step (open to en passant for one move only). The start screen's game keeps this;
// the math's spins have no history and play without either.
export type MoveRules = { moved: Set<string>; passed?: Position };
export const freshRules = (): MoveRules => ({ moved: new Set() });

// the starting squares of each side's king and rooks (castling): yours at the bottom
const HOME = {
	you: { king: { reel: 4, row: 8 }, rookK: { reel: 7, row: 8 }, rookQ: { reel: 0, row: 8 } },
	them: { king: { reel: 4, row: 1 }, rookK: { reel: 7, row: 1 }, rookQ: { reel: 0, row: 1 } },
};

const onBoard = ({ reel, row }: Position) => reel >= 0 && reel < 8 && row >= 1 && row <= 8;

// Every legal move of `side` on a board of `pieces`, the rules the math plays by (chess_engine.py): no
// castling and no en passant, pawns one step (two from their starting row: row 7 for yours, moving up to
// lower rows; row 2 for the other side's), promoting to a queen; a move may not leave the mover's own
// king in check.
export const legalMoves = (pieces: BoardPiece[], side: 'you' | 'them', rules?: MoveRules): ChessMove[] => {
	const at = new Map(pieces.map((piece) => [positionKey(piece), piece]));
	const mine = (piece: BoardPiece) => isMine(piece.symbol) === (side === 'you');
	const moves: ChessMove[] = [];
	const push = (from: Position, to: Position, promotion?: SymbolName) => {
		const other = at.get(positionKey(to));
		if (other && mine(other)) return;
		moves.push({ from, to, promotion });
	};
	const other = side === 'you' ? 'them' : 'you';
	// castling: the king and the rook on their squares and never moved, nothing between them, the king
	// not in check and not crossing or landing on an attacked square
	if (rules) {
		const home = HOME[side];
		const king = at.get(positionKey(home.king));
		const kingSymbol = (side === 'you' ? 'WK' : 'BK') as SymbolName;
		const rookSymbol = (side === 'you' ? 'WR' : 'BR') as SymbolName;
		if (king?.symbol === kingSymbol && !rules.moved.has(positionKey(home.king)) && !inCheck(pieces, side)) {
			const row = home.king.row;
			const sides: { castle: 'K' | 'Q'; rook: Position; between: number[]; crossed: number[] }[] = [
				{ castle: 'K', rook: home.rookK, between: [5, 6], crossed: [5, 6] },
				{ castle: 'Q', rook: home.rookQ, between: [1, 2, 3], crossed: [3, 2] },
			];
			for (const { castle, rook, between, crossed } of sides) {
				if (at.get(positionKey(rook))?.symbol !== rookSymbol || rules.moved.has(positionKey(rook))) continue;
				if (between.some((reel) => at.has(positionKey({ reel, row })))) continue;
				const safe = crossed.every((reel) => {
					const stepped = pieces.map((piece) =>
						positionKey(piece) === positionKey(home.king) ? { ...piece, reel, row } : piece,
					);
					return attackers(stepped, { reel, row }, other).length === 0;
				});
				if (safe) moves.push({ from: home.king, to: { reel: crossed[crossed.length - 1], row }, castle });
			}
		}
	}
	const slide = (from: Position, dirs: number[][]) => {
		for (const [dReel, dRow] of dirs) {
			let to = { reel: from.reel + dReel, row: from.row + dRow };
			while (onBoard(to)) {
				push(from, to);
				if (at.has(positionKey(to))) break;
				to = { reel: to.reel + dReel, row: to.row + dRow };
			}
		}
	};
	const step = (from: Position, list: number[][]) => {
		for (const [dReel, dRow] of list) {
			const to = { reel: from.reel + dReel, row: from.row + dRow };
			if (onBoard(to)) push(from, to);
		}
	};
	for (const piece of pieces) {
		if (!mine(piece)) continue;
		const from = { reel: piece.reel, row: piece.row };
		switch (pieceKind(piece.symbol)) {
			case 'P': {
				const dRow = side === 'you' ? -1 : 1;
				const startRow = side === 'you' ? 7 : 2;
				const lastRow = side === 'you' ? 1 : 8;
				const queen = (side === 'you' ? 'WQ' : 'BQ') as SymbolName;
				const ahead = { reel: from.reel, row: from.row + dRow };
				if (onBoard(ahead) && !at.has(positionKey(ahead))) {
					push(from, ahead, ahead.row === lastRow ? queen : undefined);
					const two = { reel: from.reel, row: from.row + dRow * 2 };
					if (from.row === startRow && !at.has(positionKey(two))) push(from, two);
				}
				for (const dReel of [-1, 1]) {
					const to = { reel: from.reel + dReel, row: from.row + dRow };
					const target = onBoard(to) ? at.get(positionKey(to)) : undefined;
					if (target && !mine(target)) push(from, to, to.row === lastRow ? queen : undefined);
					// en passant: the pawn that has just passed this square, beside this one, is taken
					else if (rules?.passed && positionKey(rules.passed) === positionKey(to)) {
						moves.push({ from, to, enPassant: { reel: to.reel, row: from.row } });
					}
				}
				break;
			}
			case 'N':
				step(from, KNIGHT_STEPS);
				break;
			case 'K':
				step(from, KING_STEPS);
				break;
			case 'B':
				slide(from, BISHOP_DIRS);
				break;
			case 'R':
				slide(from, ROOK_DIRS);
				break;
			case 'Q':
				slide(from, [...BISHOP_DIRS, ...ROOK_DIRS]);
				break;
		}
	}
	return moves.filter((move) => !inCheck(makeMove(pieces, move), side));
};

// the board after a move (the taken piece gone, a promoted pawn a queen, a castling's rook come over,
// an en passant's pawn gone)
export const makeMove = (pieces: BoardPiece[], move: ChessMove): BoardPiece[] => {
	const rook = move.castle ? castlingRook(move) : undefined;
	const taken = move.enPassant ? positionKey(move.enPassant) : positionKey(move.to);
	return pieces
		.filter((piece) => positionKey(piece) !== taken)
		.map((piece) => {
			if (positionKey(piece) === positionKey(move.from)) {
				return { symbol: move.promotion ?? piece.symbol, reel: move.to.reel, row: move.to.row };
			}
			if (rook && positionKey(piece) === positionKey(rook.from)) return { ...piece, reel: rook.to.reel, row: rook.to.row };
			return piece;
		});
};

// where a castling's rook goes: from the corner to the square the king crossed
export const castlingRook = (move: ChessMove) => {
	const row = move.from.row;
	return move.castle === 'K'
		? { from: { reel: 7, row }, to: { reel: 5, row } }
		: { from: { reel: 0, row }, to: { reel: 3, row } };
};

// the position as a FEN string for a UCI engine (Lozza): the pieces rank by rank from the top, the side to
// move, the castling rights still held, the en passant square; no move counts worth keeping
export const toFen = (pieces: BoardPiece[], side: 'you' | 'them', rules?: MoveRules) => {
	const at = new Map(pieces.map((piece) => [positionKey(piece), piece]));
	const ranks: string[] = [];
	for (let row = 1; row <= 8; row++) {
		let rank = '';
		let empty = 0;
		for (let reel = 0; reel < 8; reel++) {
			const piece = at.get(positionKey({ reel, row }));
			if (!piece) {
				empty++;
				continue;
			}
			if (empty) rank += empty;
			empty = 0;
			const letter = piece.symbol[1];
			rank += isMine(piece.symbol) ? letter : letter.toLowerCase();
		}
		if (empty) rank += empty;
		ranks.push(rank);
	}
	let castling = '';
	for (const [who, letters] of [['you', 'KQ'], ['them', 'kq']] as const) {
		const home = HOME[who];
		const king = at.get(positionKey(home.king));
		const kingSymbol = who === 'you' ? 'WK' : 'BK';
		const rookSymbol = who === 'you' ? 'WR' : 'BR';
		if (king?.symbol !== kingSymbol || rules?.moved.has(positionKey(home.king))) continue;
		if (at.get(positionKey(home.rookK))?.symbol === rookSymbol && !rules?.moved.has(positionKey(home.rookK))) castling += letters[0];
		if (at.get(positionKey(home.rookQ))?.symbol === rookSymbol && !rules?.moved.has(positionKey(home.rookQ))) castling += letters[1];
	}
	const passed = rules?.passed ? squareName(rules.passed) : '-';
	return `${ranks.join('/')} ${side === 'you' ? 'w' : 'b'} ${castling || '-'} ${passed} 0 1`;
};

// a move in UCI form (e2e4, e7e8q) as the game's squares
export const fromUci = (uci: string): { from: Position; to: Position } | undefined => {
	if (uci.length < 4) return undefined;
	const square = (text: string): Position => ({ reel: 'abcdefgh'.indexOf(text[0]), row: 9 - Number(text[1]) });
	const from = square(uci.slice(0, 2));
	const to = square(uci.slice(2, 4));
	if (from.reel < 0 || to.reel < 0 || isNaN(from.row) || isNaN(to.row)) return undefined;
	return { from, to };
};

// the rules after a move: a king or rook that has left its square, and the square a pawn has just
// passed with a two-square step
export const rulesAfter = (rules: MoveRules, move: ChessMove, piece: SymbolName): MoveRules => {
	const moved = new Set(rules.moved);
	const kind = pieceKind(piece);
	if (kind === 'K' || kind === 'R') moved.add(positionKey(move.from));
	if (move.castle) moved.add(positionKey(castlingRook(move).from));
	const passed =
		kind === 'P' && Math.abs(move.to.row - move.from.row) === 2
			? { reel: move.from.reel, row: (move.from.row + move.to.row) / 2 }
			: undefined;
	return { moved, passed };
};

// whether `side`'s king is attacked
export const inCheck = (pieces: BoardPiece[], side: 'you' | 'them') => {
	const king = pieces.find((piece) => pieceKind(piece.symbol) === 'K' && isMine(piece.symbol) === (side === 'you'));
	if (!king) return false;
	return attackers(pieces, { reel: king.reel, row: king.row }, side === 'you' ? 'them' : 'you').length > 0;
};

export const attackers = (
	pieces: { symbol: SymbolName; reel: number; row: number }[],
	square: Position,
	side: 'you' | 'them',
): Position[] => {
	const occupied = new Set(pieces.map(positionKey));
	// a sliding piece reaches the square if nothing stands between
	const clearLine = (from: Position, dirs: number[][]) =>
		dirs.some(([dReel, dRow]) => {
			let reel = from.reel + dReel;
			let row = from.row + dRow;
			while (reel >= 0 && reel < 8 && row >= 1 && row <= 8) {
				if (reel === square.reel && row === square.row) return true;
				if (occupied.has(positionKey({ reel, row }))) return false;
				reel += dReel;
				row += dRow;
			}
			return false;
		});
	const steps = (from: Position, list: number[][]) =>
		list.some(([dReel, dRow]) => from.reel + dReel === square.reel && from.row + dRow === square.row);
	return pieces
		.filter((piece) => isMine(piece.symbol) === (side === 'you'))
		.filter((piece) => {
			const from = { reel: piece.reel, row: piece.row };
			switch (pieceKind(piece.symbol)) {
				case 'P':
					return steps(from, side === 'you' ? [[-1, -1], [1, -1]] : [[-1, 1], [1, 1]]);
				case 'N':
					return steps(from, KNIGHT_STEPS);
				case 'K':
					return steps(from, KING_STEPS);
				case 'B':
					return clearLine(from, BISHOP_DIRS);
				case 'R':
					return clearLine(from, ROOK_DIRS);
				case 'Q':
					return clearLine(from, [...BISHOP_DIRS, ...ROOK_DIRS]);
				default:
					return false;
			}
		})
		.map((piece) => ({ reel: piece.reel, row: piece.row }));
};

// a move in words, for the move log: "YOU  Qd1→h5 ×P  CHECK"
export const describeMove = (move: {
	side: 'you' | 'them';
	piece: SymbolName;
	from: Position;
	to: Position;
	captured?: SymbolName;
	promotion?: SymbolName;
	check: boolean;
	mate: boolean;
	spot?: { op: '+' | 'x'; value: number };
}) => {
	const parts = [
		move.side === 'you' ? 'YOU' : 'THEM',
		`${pieceKind(move.piece) ?? ''}${squareName(move.from)}→${squareName(move.to)}`,
	];
	if (move.captured) parts.push(`×${pieceKind(move.captured)}`);
	if (move.spot) parts.push(`SPOT ${move.spot.op}${move.spot.value}`);
	if (move.promotion) parts.push(`=${pieceKind(move.promotion)}`);
	if (move.mate) parts.push('CHECKMATE');
	else if (move.check) parts.push('CHECK');
	return parts.join('  ');
};
