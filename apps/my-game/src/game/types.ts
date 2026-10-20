import { type SpinningReelSymbolState } from 'utils-slots';
import type config from './config';

export type SymbolName = keyof typeof config.symbols;
export type RawSymbol = {
	name: SymbolName;
	multiplier?: number;
	scatter?: boolean;
	wild?: boolean;
	// set by the frontend, not the math: a scatter the cat ate (see ScatterFeed), not drawn while
	// the reels spin it away
	eaten?: boolean;
	// set by the frontend, not the math (see markBigWilds)
	// fish: it still has the fish in its mouth, as it throws them later in the spin (see WildThrow);
	// without, it is drawn with an empty mouth. fade: its mouth has just changed and fades to it (it
	// threw its last fish, or it is walking on to throw some in the next spin, see WalkingWilds)
	bigWild?: { anchor: boolean; multiplier?: number; fish?: boolean; fade?: boolean };
};
export type BetMode = keyof typeof config.betModes;
export type GameType = keyof typeof config.paddingReels;
export type BonusType = 'normal' | 'super' | 'mythic';

export const SYMBOL_STATES = [
	'static',
	'spin',
	'land',
	'win',
	'postWinStatic',
] as const;

export type SymbolState = SpinningReelSymbolState | (typeof SYMBOL_STATES)[number];

export type Position = {
	reel: number;
	row: number;
};
