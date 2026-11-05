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
	spot?: number;
}) => {
	const parts = [
		move.side === 'you' ? 'YOU' : 'THEM',
		`${pieceKind(move.piece) ?? ''}${squareName(move.from)}→${squareName(move.to)}`,
	];
	if (move.captured) parts.push(`×${pieceKind(move.captured)}`);
	if (move.spot) parts.push(`SPOT x${move.spot}`);
	if (move.promotion) parts.push(`=${pieceKind(move.promotion)}`);
	if (move.mate) parts.push('CHECKMATE');
	else if (move.check) parts.push('CHECK');
	return parts.join('  ');
};
