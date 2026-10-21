<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventScatterFeed =
		// the scatters that triggered free spins bounce off the board into the cat's mouth
		| { type: 'scatterFeed'; positions: Position[] }
		// the cat swallows one (see LogoCat)
		| { type: 'catGulp' };
</script>

<script lang="ts">
	import _ from 'lodash';
	import { Tween } from 'svelte/motion';
	import { linear } from 'svelte/easing';
	import { Container } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { SCATTER_LAND_SOUND_MAP, SYMBOL_SIZE } from '../game/constants';
	import type { RawSymbol } from '../game/types';
	import Symbol from './Symbol.svelte';

	// Like the wilds a big wild throws: each scatter hops off its place, drops and bounces once on the
	// way, then arcs into the cat's mouth, spinning, and shrinks as the cat swallows it. They go one
	// after another, the nearest the cat first.
	const FLIGHT_DURATION = 1100;
	const FLIGHT_STAGGER = 280;
	// where along the way it bounces, how far below the lower of its start and the mouth, and how high
	// each of the two arcs rises above a straight line
	const BOUNCE_AT = 0.42;
	const BOUNCE_DROP = SYMBOL_SIZE * 0.35;
	const ARC = { first: SYMBOL_SIZE * 0.7, second: SYMBOL_SIZE * 1.3 };
	// squashed for a moment as it bounces (this long, in the flight's time)
	const BOUNCE_SQUASH = { length: 0.06, amount: 0.25 };
	// it shrinks into the mouth over the end of the flight, and fades at the very end
	const SWALLOW_FROM = 0.8;
	const SWALLOW_SCALE = 0.15;
	const FADE_FROM = 0.94;
	// the cat opens its mouth as the next scatter gets this far
	const MOUTH_OPENS_AT = 0.55;
	// and keeps hopping this long after the last gulp
	const HOP_AFTER = 350;

	type Flight = {
		id: number;
		rawSymbol: RawSymbol;
		from: { x: number; y: number };
		progress: Tween<number>;
	};

	const context = getContext();

	let flights = $state<Flight[]>([]);
	let nextFlightId = 0;

	const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

	// a board position in the game's layout, where the cat is (the board is drawn about its middle)
	const fromBoard = (x: number, y: number) => {
		const board = context.stateGameDerived.boardLayout();
		return { x: board.x - board.pivot.x + x, y: board.y - board.pivot.y + y };
	};

	// where a flight is at t: two arcs, to the bounce and on into the mouth (which moves as the cat
	// hops, so it is aimed at where the mouth is now)
	const flightAt = (flight: Flight, t: number) => {
		const to = context.stateGame.catMouth?.() ?? flight.from;
		const bounce = {
			x: lerp(flight.from.x, to.x, BOUNCE_AT),
			y: Math.max(flight.from.y, to.y) + BOUNCE_DROP,
		};
		const arcTo = (start: typeof to, end: typeof to, height: number, p: number) => ({
			x: lerp(start.x, end.x, p),
			y: lerp(start.y, end.y, p) - height * 4 * p * (1 - p),
		});
		return t < BOUNCE_AT
			? arcTo(flight.from, bounce, ARC.first, t / BOUNCE_AT)
			: arcTo(bounce, to, ARC.second, (t - BOUNCE_AT) / (1 - BOUNCE_AT));
	};

	const flightLook = (t: number) => {
		const swallow = t > SWALLOW_FROM ? (t - SWALLOW_FROM) / (1 - SWALLOW_FROM) : 0;
		const size = lerp(1, SWALLOW_SCALE, swallow);
		const squash = Math.max(0, 1 - Math.abs(t - BOUNCE_AT) / BOUNCE_SQUASH.length);
		const scaleY = 1 - BOUNCE_SQUASH.amount * squash;
		return {
			scale: { x: size / Math.sqrt(scaleY), y: size * scaleY },
			alpha: t > FADE_FROM ? 1 - (t - FADE_FROM) / (1 - FADE_FROM) : 1,
			// turning towards the cat, on its left
			rotation: -Math.PI * 2 * t,
		};
	};

	const feed = async (position: Position, index: number) => {
		const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
		const flight: Flight = {
			id: nextFlightId++,
			rawSymbol: { ...reelSymbol.rawSymbol },
			from: fromBoard(getSymbolX(position.reel), reelSymbol.symbolY()),
			progress: new Tween(0),
		};
		// gone from its place: not drawn there until the next spin takes it away with its reel (and
		// the symbols that land then are new, so nothing needs putting back)
		reelSymbol.rawSymbol = { ...reelSymbol.rawSymbol, eaten: true };
		flights.push(flight);
		await flight.progress.set(1, {
			duration: FLIGHT_DURATION / stateBetDerived.timeScale(),
			easing: linear,
		});
		flights = flights.filter(({ id }) => id !== flight.id);
		context.eventEmitter.broadcast({ type: 'catGulp' });
		// the same sound as the scatter landing on the reels, which can still be playing (they last
		// over 2 seconds), and a sound already playing is skipped unless forced
		context.eventEmitter.broadcast({
			type: 'soundOnce',
			name: SCATTER_LAND_SOUND_MAP[Math.min(index + 1, 5) as 1 | 2 | 3 | 4 | 5],
			forcePlay: true,
		});
	};

	// the cat's mouth opens as the next scatter comes, and its eyes follow that one
	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => {
			const catFeed = context.stateGame.catFeed;
			if (!catFeed) return;
			const next = _.maxBy(flights, (flight) => flight.progress.current);
			const t = next?.progress.current ?? 0;
			catFeed.open = next ? Math.max(0, (t - MOUTH_OPENS_AT) / (1 - MOUTH_OPENS_AT)) : 0;
			catFeed.watch = next ? flightAt(next, t) : undefined;
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	context.eventEmitter.subscribeOnMount({
		scatterFeed: async ({ positions }) => {
			// only where the cat is on screen (beside the board, on wide screens)
			if (!context.stateGame.catMouth) return;
			context.stateGame.catFeed = { open: 0 };
			const nearestFirst = _.sortBy(positions, ['reel', 'row']);
			await Promise.all(
				nearestFirst.map(async (position, index) => {
					await waitForTimeout((index * FLIGHT_STAGGER) / stateBetDerived.timeScale());
					await feed(position, index);
				}),
			);
			await waitForTimeout(HOP_AFTER / stateBetDerived.timeScale());
			context.stateGame.catFeed = undefined;
		},
	});
</script>

{#each flights as flight (flight.id)}
	{@const t = flight.progress.current}
	{@const look = flightLook(t)}
	<!-- squashed up and down on the screen as it bounces, whichever way it has turned -->
	<Container {...flightAt(flight, t)} scale={look.scale} alpha={look.alpha}>
		<Container rotation={look.rotation}>
			<Symbol state="static" rawSymbol={flight.rawSymbol} />
		</Container>
	</Container>
{/each}
