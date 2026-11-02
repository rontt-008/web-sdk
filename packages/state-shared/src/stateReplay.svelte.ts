import { stateBet, stateBetDerived, type BetToResume } from './stateBet.svelte';
import { stateUrlDerived } from './stateUrl.svelte';

// What the replay calls the round's numbers, on its card and under the board. Social mode (Stake.US)
// can't say bet, cost or payout, so it has Stake Engine's words for them instead.
const REPLAY_WORDS = {
	title: 'Bet Replay',
	mode: 'Mode',
	baseBet: 'Base Bet',
	costMultiplier: 'Cost Multiplier',
	totalCost: 'Total Bet Cost',
	payoutMultiplier: 'Payout Multiplier',
	totalWin: 'Total Win',
	start: 'Start Replay',
	note: 'This is a replay of a previous bet round. No bets will be placed.',
};
const REPLAY_WORDS_SOCIAL: typeof REPLAY_WORDS = {
	title: 'Round Replay',
	mode: 'Mode',
	baseBet: 'Base Play',
	costMultiplier: 'Feature Multiplier',
	totalCost: 'Total Play Worth',
	payoutMultiplier: 'Final Multiplier',
	totalWin: 'Total Win',
	start: 'Start Replay',
	note: 'This is a replay of a previous round. Your balance does not change.',
};

// the round of a replay (replay=true), kept so it can be played again
export const stateReplay = $state({
	bet: null as BetToResume,
	costMultiplier: 1,
	// the round's win as a multiple of its bet, from the replay's response
	payoutMultiplier: 0,
	// whether the round has started once: its button then says REPLAY instead of PLAY
	played: false,
});

export const stateReplayDerived = {
	// what the replayed mode costs, as a multiple of the bet: from the replay's response, or the
	// mode's own cost when the response doesn't say
	costMultiplier: () =>
		stateReplay.costMultiplier > 1
			? stateReplay.costMultiplier
			: (stateBetDerived.activeBetMode()?.costMultiplier ?? 1),
	// the replayed mode's name as the game shows it (e.g. BONUS), or its key when it has none (BASE)
	modeName: () =>
		stateBetDerived.activeBetMode()?.text?.title || stateBet.activeBetModeKey.toUpperCase(),
	words: () => (stateUrlDerived.socialWords() ? REPLAY_WORDS_SOCIAL : REPLAY_WORDS),
};
