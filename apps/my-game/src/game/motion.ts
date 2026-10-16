import { SYMBOL_SIZE } from './constants';

// The symbol animations, as curves over their progress t (0 to 1). Each gives the symbol's offset
// and its scale: x and y scale move opposite ways so it squashes and stretches like something soft,
// always about its bottom edge, so it looks like it's standing on something (see SymbolSprite).
export type SymbolPose = {
	y: number;
	scaleX: number;
	scaleY: number;
	rotation: number;
};

export const REST_POSE: SymbolPose = { y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

// height scale -> width scale, so the symbol keeps about the same area
const keepArea = (scaleY: number) => 1 / Math.sqrt(scaleY);

// a wobble that starts at 1 and dies away to 0 by t = 1
const settle = (t: number, wobbles: number) => (1 - t) ** 2 * Math.cos(2 * Math.PI * wobbles * t);

// how a squashing wobble of `amount` (1 down to -1 and back) scales the height: flatter going one
// way, taller (by less) the other
const squashScale = (wave: number, squash: number, stretch: number) =>
	wave > 0 ? 1 - squash * wave : 1 - stretch * wave;

// Win: crouches, jumps up stretched and leaning, lands squashed and wobbles still.
const HOP = {
	height: SYMBOL_SIZE * 0.24,
	crouchEnd: 0.16,
	landAt: 0.7,
	crouch: 0.13,
	stretch: 0.1,
	lean: (7 * Math.PI) / 180,
	landSquash: 0.14,
	landStretch: 0.05,
};

export const hopPose = (t: number, direction: 1 | -1 = 1): SymbolPose => {
	if (t < HOP.crouchEnd) {
		const crouch = Math.sin((Math.PI / 2) * (t / HOP.crouchEnd));
		const scaleY = 1 - HOP.crouch * crouch;
		return { y: 0, scaleX: keepArea(scaleY), scaleY, rotation: 0 };
	}
	if (t < HOP.landAt) {
		const p = (t - HOP.crouchEnd) / (HOP.landAt - HOP.crouchEnd);
		// stretched while moving fast, at take-off and coming down, round at the top
		const speed = Math.abs(1 - 2 * p);
		const scaleY = 1 + HOP.stretch * speed;
		return {
			y: -HOP.height * 4 * p * (1 - p),
			scaleX: keepArea(scaleY),
			scaleY,
			rotation: HOP.lean * direction * Math.sin(2 * Math.PI * p),
		};
	}
	const r = (t - HOP.landAt) / (1 - HOP.landAt);
	const scaleY = squashScale(settle(r, 1.25), HOP.landSquash, HOP.landStretch);
	return { y: 0, scaleX: keepArea(scaleY), scaleY, rotation: 0 };
};

// Scatter win: the hop, spinning round twice in the air like a tossed coin. The badge turns edge-on
// and back to its face each half turn, so it is never seen mirrored.
export const flipPose = (t: number, direction: 1 | -1 = 1): SymbolPose => {
	const pose = hopPose(t, direction);
	if (t < HOP.crouchEnd || t >= HOP.landAt) return pose;
	const p = (t - HOP.crouchEnd) / (HOP.landAt - HOP.crouchEnd);
	return { ...pose, scaleX: pose.scaleX * Math.abs(Math.cos(2 * Math.PI * p)), rotation: 0 };
};

// Big wild win: too big to jump, so it swells twice like a heartbeat.
const PUNCH = { scale: 0.06, beats: 2 };

export const punchPose = (t: number): SymbolPose => {
	const beat = Math.max(0, Math.sin(Math.PI * PUNCH.beats * t));
	const scale = 1 + PUNCH.scale * beat * (1 - 0.35 * t);
	return { y: 0, scaleX: scale, scaleY: scale, rotation: 0 };
};

// Scatter and wild landing: swells out, then wobbles back down to size.
const POP = { peakAt: 0.22, scale: 0.28, wobbles: 1.5 };

export const popPose = (t: number): SymbolPose => {
	if (t < POP.peakAt) {
		const scale = 1 + POP.scale * Math.sin((Math.PI / 2) * (t / POP.peakAt));
		return { y: 0, scaleX: scale, scaleY: scale, rotation: 0 };
	}
	const r = (t - POP.peakAt) / (1 - POP.peakAt);
	const scale = 1 + POP.scale * settle(r, POP.wobbles) * (r < 0.5 ? 1 : 0.4);
	return { y: 0, scaleX: scale, scaleY: scale, rotation: 0 };
};

// Big wild landing: thumps down squashed, springs up a little tall and settles.
const SLAM = { squash: 0.07, stretch: 0.035, wobbles: 1.5 };

export const slamPose = (t: number): SymbolPose => {
	const scaleY = squashScale(settle(t, SLAM.wobbles), SLAM.squash, SLAM.stretch);
	// the reel is only so wide, so it barely widens
	return { y: 0, scaleX: 1 + (1 - scaleY) * 0.3, scaleY, rotation: 0 };
};

// Scatters already on the board while a reel is anticipated: a nervous little wiggle, on a loop
// (time in seconds).
const EXCITED = { scale: 0.1, period: 0.55, tilt: (6 * Math.PI) / 180, tiltPeriod: 1.1 };

export const excitedPose = (time: number): SymbolPose => {
	const scale = 1 + EXCITED.scale * (0.5 + 0.5 * Math.sin((2 * Math.PI * time) / EXCITED.period));
	return {
		y: 0,
		scaleX: scale,
		scaleY: scale,
		rotation: EXCITED.tilt * Math.sin((2 * Math.PI * time) / EXCITED.tiltPeriod),
	};
};

// how far through a step of an entrance it is (0 to 1), from its start and length in seconds
export const stage = (time: number, start: number, length: number) =>
	Math.min(1, Math.max(0, (time - start) / length));

// the overshooting ease the screens pop in with (svelte's backOut, with a stronger overshoot)
export const popOut = (t: number, overshoot = 2.2) => {
	const s = t - 1;
	return s * s * ((overshoot + 1) * s + overshoot) + 1;
};
