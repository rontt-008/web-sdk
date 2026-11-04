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
}) => {
	const parts = [
		move.side === 'you' ? 'YOU' : 'THEM',
		`${pieceKind(move.piece) ?? ''}${squareName(move.from)}→${squareName(move.to)}`,
	];
	if (move.captured) parts.push(`×${pieceKind(move.captured)}`);
	if (move.promotion) parts.push(`=${pieceKind(move.promotion)}`);
	if (move.mate) parts.push('CHECKMATE');
	else if (move.check) parts.push('CHECK');
	return parts.join('  ');
};
