import { SYMBOL_SIZE } from './constants';

// Symbol animations drawn in code rather than Spine, as curves over their progress t (0 to 1): the
// symbol's offset, its width and height scale and its tilt (see SymbolSprite).
export type SymbolPose = { x: number; y: number; scaleX: number; scaleY: number; rotation: number };

export const REST_POSE: SymbolPose = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

// eased 0 to 1
const easeOut = (p: number) => Math.sin((Math.PI / 2) * p);
const easeInOut = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;

// Leaf win: lifts and grows as if caught by a gust, swings from side to side like a falling leaf
// (along a shallow U, rising and tilting up at each end), each swing smaller than the last, then
// floats back down into place.
const FLUTTER = {
	lift: SYMBOL_SIZE * 0.08,
	grow: 0.15,
	riseEnd: 0.15,
	fallStart: 0.75,
	swings: 3,
	swingX: SYMBOL_SIZE * 0.07,
	swingLift: SYMBOL_SIZE * 0.04,
	tilt: (16 * Math.PI) / 180,
};

export const flutterPose = (t: number, direction: 1 | -1 = 1): SymbolPose => {
	// how far up it is: rising, held while it swings, then settling
	const up =
		t < FLUTTER.riseEnd
			? easeOut(t / FLUTTER.riseEnd)
			: t < FLUTTER.fallStart
				? 1
				: 1 - easeInOut((t - FLUTTER.fallStart) / (1 - FLUTTER.fallStart));
	// -1 (left) to 1 (right), dying away
	const swing = direction * Math.sin(2 * Math.PI * FLUTTER.swings * t) * (1 - 0.5 * t) * up;
	const scale = 1 + FLUTTER.grow * up;
	return {
		x: FLUTTER.swingX * swing,
		y: -FLUTTER.lift * up - FLUTTER.swingLift * Math.abs(swing),
		scaleX: scale,
		scaleY: scale,
		rotation: -FLUTTER.tilt * swing,
	};
};

// Landing, as a symbol slows to a stop in its cell on a spin or a tumble: it sinks softly onto the
// bottom of its cell (a little flatter and wider) and eases back up, once, with no hop or wobble,
// its foot kept on the ground (the bottom of the art about `foot` below its middle).
const LAND = {
	squash: 0.04,
	widen: 0.5,
	sinkEnd: 0.3,
	foot: SYMBOL_SIZE * 0.45,
};

export const landPose = (t: number): SymbolPose => {
	// 0 to 1 and back, never past its rest shape: quickly into the squash, slowly out of it
	const squash =
		t < LAND.sinkEnd
			? easeOut(t / LAND.sinkEnd)
			: 1 - easeInOut((t - LAND.sinkEnd) / (1 - LAND.sinkEnd));
	const scaleY = 1 - LAND.squash * squash;
	return {
		x: 0,
		y: LAND.foot * (1 - scaleY),
		scaleX: 1 + LAND.squash * LAND.widen * squash,
		scaleY,
		rotation: 0,
	};
};

type Motion = { pose: (t: number, direction: 1 | -1) => SymbolPose; duration: number };

// each motion's curve and length in ms (the flutter as long as the gems' Spine wins were)
export const SYMBOL_MOTIONS: Record<'flutter' | 'land', Motion> = {
	flutter: { pose: flutterPose, duration: 2000 },
	land: { pose: landPose, duration: 300 },
};

export type SymbolMotion = keyof typeof SYMBOL_MOTIONS;
