// The anticipation's beat (the user, 2026-11-17: "rework the reel anticipation"). While a reel that could
// still give the free spins waits (Anticipations), the anticipation sound loops: the cave trembling,
// a heavy boom every BEAT_MS (scripts/generate-sounds.mjs anticipationLoop), from the moment it starts.
// The columns' light (Anticipation) and the free spins rocks already down (ReelSymbol) throb with it.
export const ANTICIPATION_BEAT_MS = 750;

// `active` while any reel anticipates; `time`: seconds since it began (the sound's loop began with it)
export const stateAnticipation = $state({ active: false, time: 0 });

// 1 at each boom, dying away quickly before the next
export const throb = (time: number) => Math.exp(-((time * 1000) % ANTICIPATION_BEAT_MS) / 180);

// which beat it is in (0 the first)
export const beatOf = (time: number) => Math.floor((time * 1000) / ANTICIPATION_BEAT_MS);
