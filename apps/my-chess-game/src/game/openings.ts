import { freshRules, fromUci, legalMoves, makeMove, positionKey, rulesAfter, toFen, type BoardPiece, type ChessMove, type MoveRules } from './chess';
import { INITIAL_BOARD, BOARD_DIMENSIONS } from './constants';

// The practice board's opening book (Sandbox): the main lines of the common openings, as the moves from
// the starting position in UCI form. While a position is in the book, the engine plays a book move and
// the hint shows the main line's; once the game leaves the book the search takes over. The first line
// for a position is its main line (the hint's); the engine picks among all of them.
export const OPENING_LINES: { name: string; moves: string }[] = [
	// 1.e4 e5
	{ name: 'Italian Game, Giuoco Pianissimo', moves: 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d3 d7d6 e1g1 e8g8' },
	{ name: 'Italian Game, Two Knights', moves: 'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3 f8c5 c2c3 d7d6 e1g1 e8g8' },
	{ name: 'Ruy Lopez, Closed', moves: 'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 d7d6 c2c3 e8g8' },
	{ name: 'Ruy Lopez, Berlin', moves: 'e2e4 e7e5 g1f3 b8c6 f1b5 g8f6 e1g1 f6e4 d2d4 e4d6 b5c6 d7c6 d4e5 d6f5' },
	{ name: 'Scotch Game', moves: 'e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 d4c6 b7c6 e4e5 d8e7 d1e2 f6d5' },
	{ name: 'Petroff Defence', moves: 'e2e4 e7e5 g1f3 g8f6 f3e5 d7d6 e5f3 f6e4 d2d4 d6d5 f1d3 b8c6' },
	{ name: 'Four Knights', moves: 'e2e4 e7e5 g1f3 b8c6 b1c3 g8f6 f1b5 f8b4 e1g1 e8g8 d2d3 d7d6' },
	{ name: 'Vienna Game', moves: 'e2e4 e7e5 b1c3 g8f6 f2f4 d7d5 f4e5 f6e4 g1f3 f8e7 d2d4 e8g8' },
	{ name: "King's Gambit", moves: 'e2e4 e7e5 f2f4 e5f4 g1f3 g7g5 h2h4 g5g4 f3e5 g8f6' },
	{ name: 'Philidor Defence', moves: 'e2e4 e7e5 g1f3 d7d6 d2d4 e5d4 f3d4 g8f6 b1c3 f8e7 f1e2 e8g8' },
	// 1.e4 c5
	{ name: 'Sicilian, Najdorf', moves: 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3 e7e5 d4b3 f8e7' },
	{ name: 'Sicilian, Dragon', moves: 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6 c1e3 f8g7 f2f3 e8g8' },
	{ name: 'Sicilian, Sveshnikov', moves: 'e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e5 d4b5 d7d6' },
	{ name: 'Sicilian, Taimanov', moves: 'e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 b8c6 b1c3 d8c7 c1e3 a7a6' },
	{ name: 'Sicilian, Alapin', moves: 'e2e4 c7c5 c2c3 g8f6 e4e5 f6d5 d2d4 c5d4 g1f3 b8c6 c3d4 d7d6' },
	{ name: 'Sicilian, Closed', moves: 'e2e4 c7c5 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7 d2d3 d7d6 f2f4 e7e6' },
	// 1.e4 others
	{ name: 'French, Winawer', moves: 'e2e4 e7e6 d2d4 d7d5 b1c3 f8b4 e4e5 c7c5 a2a3 b4c3 b2c3 g8e7' },
	{ name: 'French, Tarrasch', moves: 'e2e4 e7e6 d2d4 d7d5 b1d2 c7c5 e4d5 e6d5 g1f3 b8c6 f1b5 f8d6' },
	{ name: 'French, Advance', moves: 'e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3 b8c6 g1f3 d8b6 a2a3 c5c4' },
	{ name: 'French, Exchange', moves: 'e2e4 e7e6 d2d4 d7d5 e4d5 e6d5 g1f3 g8f6 f1d3 f8d6 e1g1 e8g8' },
	{ name: 'Caro-Kann, Classical', moves: 'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6 h2h4 h7h6 g1f3 b8d7' },
	{ name: 'Caro-Kann, Advance', moves: 'e2e4 c7c6 d2d4 d7d5 e4e5 c8f5 g1f3 e7e6 f1e2 c6c5 c1e3 d8b6' },
	{ name: 'Caro-Kann, Exchange', moves: 'e2e4 c7c6 d2d4 d7d5 e4d5 c6d5 f1d3 b8c6 c2c3 g8f6 c1f4 c8g4' },
	{ name: 'Pirc Defence', moves: 'e2e4 d7d6 d2d4 g8f6 b1c3 g7g6 g1f3 f8g7 f1e2 e8g8 e1g1 c7c6' },
	{ name: 'Modern Defence', moves: 'e2e4 g7g6 d2d4 f8g7 b1c3 d7d6 f2f4 g8f6 g1f3 e8g8' },
	{ name: 'Scandinavian', moves: 'e2e4 d7d5 e4d5 d8d5 b1c3 d5a5 d2d4 g8f6 g1f3 c7c6 f1c4 c8f5' },
	{ name: 'Alekhine Defence', moves: 'e2e4 g8f6 e4e5 f6d5 d2d4 d7d6 g1f3 c8g4 f1e2 e7e6 e1g1 f8e7' },
	// 1.d4
	{ name: "Queen's Gambit Declined", moves: 'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8 g1f3 b8d7 a1c1 c7c6' },
	{ name: "Queen's Gambit Accepted", moves: 'd2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6 f1c4 c7c5 e1g1 a7a6 d4c5 f8c5' },
	{ name: 'Slav Defence', moves: 'd2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4 a2a4 c8f5 e2e3 e7e6 f1c4 f8b4' },
	{ name: 'Semi-Slav', moves: 'd2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 e7e6 e2e3 b8d7 f1d3 d5c4 d3c4 b7b5' },
	{ name: "King's Indian, Classical", moves: 'd2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5 e1g1 b8c6 d4d5 c6e7' },
	{ name: 'Nimzo-Indian', moves: 'd2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8 f1d3 d7d5 g1f3 c7c5 e1g1 b8c6' },
	{ name: "Queen's Indian", moves: 'd2d4 g8f6 c2c4 e7e6 g1f3 b7b6 g2g3 c8b7 f1g2 f8e7 e1g1 e8g8 b1c3 f6e4' },
	{ name: 'Grünfeld Defence', moves: 'd2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3 b2c3 f8g7 g1f3 c7c5' },
	{ name: 'Modern Benoni', moves: 'd2d4 g8f6 c2c4 c7c5 d4d5 e7e6 b1c3 e6d5 c4d5 d7d6 e2e4 g7g6 g1f3 f8g7' },
	{ name: 'Dutch Defence', moves: 'd2d4 f7f5 g2g3 g8f6 f1g2 e7e6 g1f3 f8e7 e1g1 e8g8 c2c4 d7d6' },
	{ name: 'London System', moves: 'd2d4 d7d5 c1f4 g8f6 e2e3 c7c5 c2c3 b8c6 b1d2 e7e6 g1f3 f8d6 f4g3 e8g8' },
	{ name: "London vs King's Indian", moves: 'd2d4 g8f6 c1f4 g7g6 e2e3 f8g7 g1f3 e8g8 h2h3 d7d6 f1e2 c7c5' },
	{ name: 'Colle System', moves: 'd2d4 d7d5 g1f3 g8f6 e2e3 e7e6 f1d3 c7c5 c2c3 b8c6 b1d2 f8d6' },
	{ name: 'Trompowsky', moves: 'd2d4 g8f6 c1g5 e7e6 e2e4 h7h6 g5f6 d8f6 g1f3 d7d6 b1c3 b8d7' },
	{ name: 'Catalan', moves: 'd2d4 g8f6 c2c4 e7e6 g2g3 d7d5 f1g2 f8e7 g1f3 e8g8 e1g1 d5c4 d1c2 a7a6' },
	// others
	{ name: 'English, Reversed Sicilian', moves: 'c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 g2g3 d7d5 c4d5 f6d5 f1g2 d5b6 e1g1 f8e7' },
	{ name: 'English, Symmetrical', moves: 'c2c4 c7c5 g1f3 g8f6 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7 e1g1 e8g8 d2d4 c5d4 f3d4' },
	{ name: 'Réti Opening', moves: 'g1f3 d7d5 c2c4 e7e6 g2g3 g8f6 f1g2 f8e7 e1g1 e8g8 b2b3 c7c5 c1b2 b8c6' },
];

// the position's key: the FEN without its move counts
const keyOf = (pieces: BoardPiece[], side: 'you' | 'them', rules: MoveRules) => toFen(pieces, side, rules).split(' ').slice(0, 4).join(' ');

const startPieces = (): BoardPiece[] =>
	INITIAL_BOARD.flatMap((reel, reelIndex) =>
		reel.flatMap((raw, row) => (row >= 1 && row <= BOARD_DIMENSIONS.y && raw.name !== 'E' ? [{ symbol: raw.name, reel: reelIndex, row }] : [])),
	);

// the book as positions, each with the moves the lines play from it (the main line's first), built once
let book: Map<string, ChessMove[]> | undefined;
const build = () => {
	const built = new Map<string, ChessMove[]>();
	for (const line of OPENING_LINES) {
		let pieces = startPieces();
		let rules = freshRules();
		let side: 'you' | 'them' = 'you';
		for (const uci of line.moves.split(/\s+/)) {
			const squares = fromUci(uci);
			const move = squares && legalMoves(pieces, side, rules).find(
				(candidate) => positionKey(candidate.from) === positionKey(squares.from) && positionKey(candidate.to) === positionKey(squares.to),
			);
			if (!move) {
				console.warn(`opening book: ${line.name}: ${uci} is not a legal move here`);
				break;
			}
			const key = keyOf(pieces, side, rules);
			const known = built.get(key) ?? [];
			if (!known.some((other) => positionKey(other.from) === positionKey(move.from) && positionKey(other.to) === positionKey(move.to))) {
				built.set(key, [...known, move]);
			}
			const piece = pieces.find((candidate) => positionKey(candidate) === positionKey(move.from))!;
			rules = rulesAfter(rules, move, piece.symbol);
			pieces = makeMove(pieces, move);
			side = side === 'you' ? 'them' : 'you';
		}
	}
	return built;
};

// the book's moves from this position, the main line's first; none when the position isn't in it
export const bookMoves = (pieces: BoardPiece[], side: 'you' | 'them', rules: MoveRules): ChessMove[] => {
	book ??= build();
	return book.get(keyOf(pieces, side, rules)) ?? [];
};
