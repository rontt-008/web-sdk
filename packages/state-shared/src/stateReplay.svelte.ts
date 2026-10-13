import type { BetToResume } from './stateBet.svelte';

// the round of a replay (replay=true), kept so it can be played again
export const stateReplay = $state({
	bet: null as BetToResume,
	costMultiplier: 1,
});
