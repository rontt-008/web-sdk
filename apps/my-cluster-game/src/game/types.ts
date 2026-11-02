import { type CascadingReelSymbolState } from 'utils-slots';
import type config from './config';

export type SymbolName = keyof typeof config.symbols;
export type RawSymbol = {
	name: SymbolName;
	multiplier?: number;
	scatter?: boolean;
	wild?: boolean;
	// the Fehu symbol's (F) and the Ingwaz symbol's (I)
	fehu?: boolean;
	ingwaz?: boolean;
};
export type BetMode = keyof typeof config.betModes;
export type GameType = keyof typeof config.paddingReels;
// which bonus the free spins are: the bonus (35+ symbols), the super bonus (50+), its powers bigger,
// or the mythic bonus (Mannaz fully lit in a base game spin), the super bonus's powers and two of
// the runes already collected
export type BonusType = 'normal' | 'super' | 'mythic';

export const SYMBOL_STATES = [
	'static',
	'spin',
	'land',
	'win',
	'postWinStatic',
	'explosion',
] as const;

export type SymbolState = CascadingReelSymbolState | (typeof SYMBOL_STATES)[number];

export type Position = {
	reel: number;
	row: number;
};
