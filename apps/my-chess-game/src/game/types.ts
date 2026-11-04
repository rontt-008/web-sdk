import { type CascadingReelSymbolState } from 'utils-slots';
import type config from './config';

export type SymbolName = keyof typeof config.symbols;
export type RawSymbol = {
	name: SymbolName;
	mine?: boolean;
	king?: boolean;
	empty?: boolean;
};
export type BetMode = keyof typeof config.betModes;
export type GameType = keyof typeof config.paddingReels;

// whose move or piece: yours (white in the math) or the other side's
export type Side = 'you' | 'them';
// the colour your pieces are drawn in (the toggle): the maths is the same either way, see rules
export type PieceColour = 'white' | 'black';
// a piece's kind, the letter in its symbol (WQ, BQ: Q)
export type PieceKind = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';

export const SYMBOL_STATES = [
	'static',
	'spin',
	'land',
	'win',
	'postWinStatic',
	'explosion',
] as const;

export type SymbolState = CascadingReelSymbolState | (typeof SYMBOL_STATES)[number];

// a square of the board as the books have it: reel the column from the left (0-7), row counted from 1
// at the top (row 0 is the symbol above the board)
export type Position = {
	reel: number;
	row: number;
};
