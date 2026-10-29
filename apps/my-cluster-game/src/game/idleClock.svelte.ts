// The premium symbols' idle loops (SymbolIdle) all play from this one clock, at the frame rate they
// were made at: a symbol that changes state, or is drawn again (as it tumbles), carries on its loop
// where it was rather than starting it again.
export const IDLE_FRAME_RATE = 30;
// each reel this many frames further on than the one left of it, so the tiles move in a wave across
// the board (a symbol stays in its reel as it tumbles, so it never jumps)
export const IDLE_REEL_PHASE = 8;

let frame = $state(0);
const started = typeof performance === 'undefined' ? 0 : performance.now();

const tick = () => {
	const next = Math.floor(((performance.now() - started) / 1000) * IDLE_FRAME_RATE);
	if (next !== frame) frame = next;
	requestAnimationFrame(tick);
};
if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(tick);

// the clock's frame, counting up from when the game started
export const idleFrame = () => frame;
