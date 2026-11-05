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
export type ChessMove = { from: Position; to: Position; promotion?: SymbolName };

const onBoard = ({ reel, row }: Position) => reel >= 0 && reel < 8 && row >= 1 && row <= 8;

// Every legal move of `side` on a board of `pieces`, the rules the math plays by (chess_engine.py): no
// castling and no en passant, pawns one step (two from their starting row: row 7 for yours, moving up to
// lower rows; row 2 for the other side's), promoting to a queen; a move may not leave the mover's own
// king in check.
export const legalMoves = (pieces: BoardPiece[], side: 'you' | 'them'): ChessMove[] => {
	const at = new Map(pieces.map((piece) => [positionKey(piece), piece]));
	const mine = (piece: BoardPiece) => isMine(piece.symbol) === (side === 'you');
	const moves: ChessMove[] = [];
	const push = (from: Position, to: Position, promotion?: SymbolName) => {
		const other = at.get(positionKey(to));
		if (other && mine(other)) return;
		moves.push({ from, to, promotion });
	};
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
					const other = onBoard(to) ? at.get(positionKey(to)) : undefined;
					if (other && !mine(other)) push(from, to, to.row === lastRow ? queen : undefined);
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

// the board after a move (the taken piece gone, a promoted pawn a queen)
export const makeMove = (pieces: BoardPiece[], move: ChessMove): BoardPiece[] =>
	pieces
		.filter((piece) => positionKey(piece) !== positionKey(move.to))
		.map((piece) =>
			positionKey(piece) === positionKey(move.from)
				? { symbol: move.promotion ?? piece.symbol, reel: move.to.reel, row: move.to.row }
				: piece,
		);

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
