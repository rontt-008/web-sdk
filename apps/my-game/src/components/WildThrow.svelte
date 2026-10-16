<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventWildThrow = {
		type: 'wildThrow';
		// the big wild's reel; the wilds fly out of its centre
		reel: number;
		positions: Position[];
	};
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import { Container } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { BOARD_SIZES, SYMBOL_SIZE } from '../game/constants';
	import type { RawSymbol } from '../game/types';
	import BoardContainer from './BoardContainer.svelte';
	import Symbol from './Symbol.svelte';

	const FLIGHT_DURATION = 650;
	// the wilds leave one after another
	const FLIGHT_STAGGER = 200;
	// how far the flight path bows up above the straight line to the target
	const ARC_HEIGHT = SYMBOL_SIZE * 1.2;
	// a wild starts small inside the big wild, swells mid-air and lands at full size
	const START_SCALE = 0.4;
	const MID_AIR_SWELL = 0.4;
	const WILD: RawSymbol = { name: 'W', wild: true };

	type Flight = {
		id: number;
		from: { x: number; y: number };
		to: { x: number; y: number };
		progress: Tween<number>;
	};

	const context = getContext();

	let flights = $state<Flight[]>([]);
	let nextFlightId = 0;

	const throwWild = async ({ reel, position }: { reel: number; position: Position }) => {
		const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
		const flight: Flight = {
			id: nextFlightId++,
			from: { x: getSymbolX(reel), y: BOARD_SIZES.height / 2 },
			to: { x: getSymbolX(position.reel), y: reelSymbol.symbolY() },
			progress: new Tween(0),
		};
		flights.push(flight);
		await flight.progress.set(1, {
			duration: FLIGHT_DURATION / stateBetDerived.timeScale(),
			easing: cubicInOut,
		});
		flights = flights.filter(({ id }) => id !== flight.id);

		reelSymbol.rawSymbol = WILD;
		// pops into place with a puff of sparkles, as a wild landing from the reels does
		reelSymbol.symbolState = 'land';
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
	};

	context.eventEmitter.subscribeOnMount({
		wildThrow: async ({ reel, positions }) => {
			// a wild thrown onto a big wild would vanish under it, so there is nothing to show
			const targets = positions.filter(
				(position) =>
					!context.stateGame.board[position.reel].reelState.symbols[position.row].rawSymbol
						.bigWild,
			);
			await Promise.all(
				targets.map(async (position, index) => {
					await waitForTimeout((index * FLIGHT_STAGGER) / stateBetDerived.timeScale());
					await throwWild({ reel, position });
				}),
			);
		},
	});
</script>

<BoardContainer>
	{#each flights as flight (flight.id)}
		{@const t = flight.progress.current}
		<Container
			x={flight.from.x + (flight.to.x - flight.from.x) * t}
			y={flight.from.y + (flight.to.y - flight.from.y) * t - ARC_HEIGHT * 4 * t * (1 - t)}
			scale={START_SCALE + (1 - START_SCALE) * t + MID_AIR_SWELL * Math.sin(Math.PI * t)}
			rotation={Math.PI * 2 * t}
		>
			<Symbol state="static" rawSymbol={WILD} />
		</Container>
	{/each}
</BoardContainer>
