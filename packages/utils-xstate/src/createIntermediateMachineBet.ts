import { setup, fromPromise, assign } from 'xstate';

import { stateBet, stateBetDerived } from 'state-shared';

import { context, type Context } from './machineContext';
import type { PrimaryMachines } from './types';

const checkSpaceHold = fromPromise(async () => {
	if (stateBet.isSpaceHold) {
		if (stateBetDerived.activeBetMode()?.type === 'buy') {
			stateBet.activeBetModeKey = 'BASE';
		}

		// the balance no longer covers the next spin: stop here, without asking the RGS, and leave the
		// bet button to say why
		if (stateBetDerived.isBetCostAvailable()) return;
		stateBet.isSpaceHold = false;
	}
	throw Error('end bet');
});

export const createIntermediateMachineBet = ({
	newGame,
	playGame,
	endGame,
}: {
	newGame: PrimaryMachines['newGame'];
	playGame: PrimaryMachines['playGame'];
	endGame: PrimaryMachines['endGame'];
}) => {
	const machine =
		/** @xstate-layout N4IgpgJg5mDOIC5QCMwBcB0BLCAbMAxAEICiAKoqAA4D2sWaWNAdpSAB6ICMATAGwYADMMFcA7Dy4BWQQBZZgsQBoQAT24BmMRlkBOfQA4+fXWNl8pu2QF9rK1JgBm6AMYALLMygEILMNmYANxoAa38AWwBXNABDRhYidDZaenjWJA5EKQ0BWS0pHlMNGTE+FXUELlEMGRENXV4pKtFbe3QMZzR3T28wACc+mj6MKlw4xyHwjCjYtMS0ZLoGJnTQTgRs3PzCsWLFMrVEHjFBHX1TWXEzDQ0DGzsQBxGx1R8-AOCw55iK6iW0tjrKxcDAGRo8MEnRQ8crcHinc76QpSMxg3R8WwPZg0CBwNhPHD4RapFaAxCyGGHSoaEGI0oFPT1XStR7tTrdLzE5YsMkIeEGDC6O71LQGYSyMXKKlVXKIvhGc5cUwsp6jH5cgEZdYSXQYDQQrjmBrCKQHCq6U4iYQ0jQiMUaFXtMDMCAa0la7iKbSSAxiX2m4ToykVXgaQXnE5+iwNIyOhYZFLc1aZSoGWGpoRWrNWsSY6xAA */
		setup({
			types: {} as {
				context: Context;
			},
			actors: {
				newGame,
				playGame,
				endGame,
				checkSpaceHold,
			},
		}).createMachine({
			context,
			id: 'bet',
			initial: 'fetching',
			states: {
				fetching: {
					invoke: {
						id: 'newGame',
						src: 'newGame',
						onDone: [
							{
								actions: assign(({ context: _, event }) => event.output),
								target: 'play',
							},
						],
						// output: ,
						onError: [
							{
								target: 'end',
							},
						],
					},
				},
				play: {
					invoke: {
						id: 'playGame',
						src: 'playGame',
						input: ({ context }) => ({
							bet: context.bet,
						}),
						onDone: [
							{
								target: 'ending',
							},
						],
					},
				},
				ending: {
					invoke: {
						id: 'endGame',
						src: 'endGame',
						input: ({ context }) => ({
							bet: context.bet,
							rawBet: context.rawBet,
						}),
						onDone: [
							{
								target: 'checkSpaceHold',
							},
						],
					},
				},
				checkSpaceHold: {
					invoke: {
						id: 'checkSpaceHold',
						src: 'checkSpaceHold',
						onDone: 'fetching',
						onError: 'end',
					},
				},
				end: {
					type: 'final',
				},
			},
		});

	return machine;
};
