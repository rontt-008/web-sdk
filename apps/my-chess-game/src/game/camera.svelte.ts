import { Tween } from 'svelte/motion';
import { cubicInOut, cubicOut, quintOut, sineInOut } from 'svelte/easing';
import { stateBetDerived } from 'state-shared';

import type { Position } from './types';
import { stateGameDerived } from './stateGame.svelte';

// The camera over the board: the board scene (the background picture, the squares, the reels, the
// pieces and the pays floating off them, each under a CameraContainer) glides in towards the square a
// move lands on, gives the faintest nudge as a piece is taken, and drifts back out. A point stays put
// under the camera when it is the focus; the focus is tweened, so the view never jumps as it moves on
// to the next square. Everything is in the main layout's units.
const ZOOM = {
	move: 1.1,
	capture: 1.22,
	mate: 1.3,
	collect: 1.18,
};

// how the camera moves, in ms (divided by the turbo's time scale): the glide in, the hold on the
// square once the move is done, the drift back out
const TIMING = {
	zoomIn: 900,
	hold: 250,
	zoomOut: 1100,
};

const timeScale = () => stateBetDerived.timeScale();

export const camera = {
	scale: new Tween(1),
	focusX: new Tween(0),
	focusY: new Tween(0),
	shakeX: new Tween(0),
	shakeY: new Tween(0),
};

let nudging = 0;

// the camera glides onto a square, zooming in to `scale` on the way (the pan is a little quicker than
// the zoom, so the square is in the middle by the time the zoom settles)
const zoomTo = (position: Position, scale: number, duration = TIMING.zoomIn) => {
	const { x, y } = stateGameDerived.cellCentre(position);
	const ms = duration / timeScale();
	camera.focusX.set(x, { duration: ms * 0.8, easing: sineInOut });
	camera.focusY.set(y, { duration: ms * 0.8, easing: sineInOut });
	return camera.scale.set(scale, { duration: ms, easing: quintOut });
};

// a slow drift back out to the whole board, after a hold on the square (a move that follows takes
// the camera on from wherever it has got to)
const reset = (duration = TIMING.zoomOut, hold = TIMING.hold) => {
	const ms = duration / timeScale();
	return camera.scale.set(1, { duration: ms, delay: hold / timeScale(), easing: cubicInOut });
};

// a soft nudge: the view dips a touch and settles, with a little extra push into the zoom
const nudge = async (strength: number, extraZoom = 0.03) => {
	const call = ++nudging;
	const from = camera.scale.target;
	const inMs = 110 / timeScale();
	const outMs = 420 / timeScale();
	camera.scale
		.set(from + extraZoom, { duration: inMs, easing: cubicOut })
		.then(() => camera.scale.set(from, { duration: outMs, easing: sineInOut }));
	const angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.8;
	await Promise.all([
		camera.shakeX.set(Math.cos(angle) * strength, { duration: inMs, easing: cubicOut }),
		camera.shakeY.set(Math.sin(angle) * strength, { duration: inMs, easing: cubicOut }),
	]);
	if (call !== nudging) return;
	camera.shakeX.set(0, { duration: outMs, easing: sineInOut });
	camera.shakeY.set(0, { duration: outMs, easing: sineInOut });
};

export const cameraDerived = {
	ZOOM,
	TIMING,
	zoomTo,
	reset,
	nudge,
};
