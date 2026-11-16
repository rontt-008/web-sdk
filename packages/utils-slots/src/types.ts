import type { FirstArgOf } from 'utils-shared/types';

import type { createReelForSpinning } from './createReelForSpinning.svelte';
import type { createReelForCascading } from './createReelForCascading.svelte';

export type SpinType = 'normal' | 'fast' | 'anticipated';

export type SpinningReelSpinOptions = {
	// speed (pixel / ms)
	reelPreSpinSpeed: number;
	reelBounceBackSpeed: number;
	reelSpinSpeed: number;
	reelSpinSpeedBeforeBounce: number;
	// size
	reelBounceSizeMulti: number;
	// extra padding
	reelPaddingMultiplierNormal: number;
	reelPaddingMultiplierAnticipated: number;
	reelSpinDelay: number;
	// Anticipated reels (out of turbo) slow right down at the end, so it is clear what landed: from
	// brakeSymbols + crawlSymbols before the stop they brake from full speed to crawlSpeed, then
	// creep the last crawlSymbols in, slowing to endSpeed (pixel / ms). Without it they stop as
	// normal reels do.
	reelAnticipatedSlowdown?: {
		brakeSymbols: number;
		crawlSymbols: number;
		crawlSpeed: number;
		endSpeed: number;
	};
	// How a reel starts from rest: it lifts a little against the spin (lift, in symbols, over
	// liftDuration ms), then speeds up smoothly to reelSpinSpeed over accelerateDuration ms and keeps
	// it. Without it, a reel starting a spin jumps straight to reelSpinSpeed, and the pre-spin winds
	// up with backIn at reelPreSpinSpeed, which ends at almost 5 times that speed.
	reelStart?: {
		lift: number;
		liftDuration: number;
		accelerateDuration: number;
	};
};

export type CascadingReelSpinOptions = {
	// speed (pixel / ms) and intervals(ms) between reels/symbols
	symbolFallInSpeed: number;
	symbolFallInInterval: number;
	symbolFallInBounceSpeed: number;
	symbolFallInBounceSizeMulti: number;
	symbolFallOutSpeed: number;
	symbolFallOutInterval: number;
	// reel
	reelFallInDelay: number;
	// extra padding
	reelPaddingMultiplierNormal: number;
	reelPaddingMultiplierAnticipated: number;
	reelFallOutDelay: number;
	// How symbols move as they fall out of the board and into it (to their bounce, before it), over
	// the same time their speed gives: e.g. quadIn, dropping from rest and speeding up as if under
	// gravity. Without them they move at their speed all the way.
	symbolFallOutEasing?: (t: number) => number;
	symbolFallInEasing?: (t: number) => number;
};

type ReelCreateOptions<TRawSymbol extends object, TSymbolState extends string> = {
	initialSymbols: TRawSymbol[];
	initialSymbolState: TSymbolState;
	reelIndex: number;
	symbolHeight: number;
	onReelStopping: () => void;
	// symbolIndex: its row on the reel, counting the padding row above the board (which lands too)
	onSymbolLand: (args: { rawSymbol: TRawSymbol; symbolIndex: number }) => void;
};

export type SpinningReelCreateOptions<
	TRawSymbol extends object,
	TSymbolState extends string,
> = ReelCreateOptions<TRawSymbol, TSymbolState> & {
	// For land animations that fall in before they hit the ground: the reel's symbols go to 'land'
	// this long (ms) before the reel reaches the bottom of its slide (where it hits and bounces back),
	// while it is still coming down, so they hit as the reel does. onSymbolLand is still called once
	// the reel has stopped. Without it (or when the reel skips its slide, e.g. stopped in turbo), they
	// land once the reel has bounced back and stopped.
	landLead?: () => number;
};

export type CascadingReelCreateOptions<
	TRawSymbol extends object,
	TSymbolState extends string,
> = ReelCreateOptions<TRawSymbol, TSymbolState> & {
	// As for spinning reels, for land animations that fall in before they hit the ground: each symbol
	// goes to 'land' this long (ms) before it reaches its place as it falls in, so it hits as it
	// arrives. onSymbolLand is still called as it arrives.
	landLead?: () => number;
};

export type SpinningReel<TRawSymbol extends object, TSymbolState extends string> = ReturnType<
	typeof createReelForSpinning<TRawSymbol, TSymbolState>
>;
export type CascadingReel<TRawSymbol extends object, TSymbolState extends string> = ReturnType<
	typeof createReelForCascading<TRawSymbol, TSymbolState>
>;

export type Reel<TRawSymbol extends object, TSymbolState extends string> =
	| SpinningReel<TRawSymbol, TSymbolState>
	| CascadingReel<TRawSymbol, TSymbolState>;

export type FallOptionsTurbo = {
	fallInSpeedTurbo: number;
	fallInIntervalTurbo: number;
	fallInBounceTurbo: number;
	fallInBounceDistanceTurbo: number;

	fallOutSpeedTurbo: number;
	fallOutIntervalTurbo: number;
};

export type GetRawSymbolFromReel<TReel extends Reel<any, any>> = NonNullable<
	FirstArgOf<TReel['setSymbolsWithRawSymbols']>
>[number];
