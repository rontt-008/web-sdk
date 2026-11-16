import { BOARD_DIMENSIONS, LAND_POSE } from './constants';

// The slight tumble as a symbol lands (the user, 2026-11-13: "make a slight tumble animation when the
// symols land", after their own Blender lands for the letters and premiums were taken out as too much):
// symbols that land as their still (the letters, the premiums) squash a little onto their base as they
// hit, rebound a touch and settle (ReelSymbol). The reels say when each symbol arrives (stateGame's
// onSymbolLand, the moment it reaches its place): counted here per reel and per symbol (padding rows
// included, as the reels number them), so a symbol's pose starts when its count goes up.

export const stateLanded = $state({
	counts: Array.from({ length: BOARD_DIMENSIONS.x }, () => new Array(BOARD_DIMENSIONS.y + 2).fill(0)),
});

export const symbolLanded = (reel: number, symbolIndex: number) => {
	stateLanded.counts[reel][symbolIndex] += 1;
};

// the pose, t (0 to 1) of the way through it: a damped squash, `cycles` half-waves (squash, a slight
// stretch back, a smaller squash), dying away (`decay`) and ending exactly at rest; the width goes the
// other way by `widen` of it, so it keeps its bulk
export const landPose = (t: number) => {
	const { squash, cycles, decay, widen } = LAND_POSE;
	const s = squash * Math.exp(-decay * t) * Math.sin(Math.PI * cycles * t);
	return { x: 1 + s * widen, y: 1 - s };
};
