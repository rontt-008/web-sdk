<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventWildThrow = {
		type: 'wildThrow';
		// the big wild's reel; the fish fly out of the cat's mouth on it
		reel: number;
		positions: Position[];
	};
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { quadOut } from 'svelte/easing';
	import { Container, Sprite } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import _ from 'lodash';

	import { getContext } from '../game/context';
	import { getSymbolX, FIRST_VISIBLE_ROW } from '../game/utils';
	import { BOARD_DIMENSIONS, BOARD_SIZES, REEL_WIDTH, SYMBOL_SIZE } from '../game/constants';
	import type { RawSymbol } from '../game/types';
	import BoardContainer from './BoardContainer.svelte';

	// A big wild throws its wilds as fish: each flies straight out of the fish in the cat's mouth on
	// the big wild, head first, wriggling, and turns into a wild where it lands.
	const FLIGHT_DURATION = 600;
	// the fish leave one after another
	const FLIGHT_STAGGER = 200;
	// how long a landed wild's pop lasts (a wild landing's motion, see SymbolSprite)
	const LANDING_HOLD = 480;
	// the fish in the cat's mouth: its middle, across and down the big wild's art (which covers the
	// whole reel), and its width, of the reel's
	const MOUTH_FISH = { x: 0.404, y: 0.508, width: 0.456 };
	// a thrown fish grows from that to this wide on the way, a little bigger still mid-air
	const LANDING_WIDTH = SYMBOL_SIZE * 0.85;
	const MID_AIR_SWELL = 0.12;
	// the fish image's height over its width
	const FISH_RATIO = 286 / 400;
	// it wriggles its way there, less as it lands (radians, wriggles per flight)
	const WRIGGLE = { angle: 0.14, count: 3 };
	// Now and then a fish teases: it heads for another place near its own (up to 2 places away, one
	// that isn't getting a wild), slows as if to land there, then darts off to its own. How often,
	// how close it gets to the decoy, when (in the flight) it darts, and how long the flight takes.
	const BAIT = { chance: 0.35, reach: 2, approach: 0.8, switchAt: 0.55, duration: 950 };
	const WILD: RawSymbol = { name: 'W', wild: true };

	type Point = { x: number; y: number };
	type Flight = {
		id: number;
		from: Point;
		to: Point;
		// a teasing fish's turning point, near its decoy
		via?: Point;
		progress: Tween<number>;
	};

	const lerp = (a: Point, b: Point, t: number): Point => ({
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t,
	});

	// for some fish (BAIT.chance), a place to tease with near its own: on the board, not under a big
	// wild, not on the throwing big wild's reel and not getting a wild itself (none if none fits)
	const pickDecoy = (reel: number, target: Position, targets: Position[]) => {
		if (Math.random() >= BAIT.chance) return undefined;
		const visibleRows = _.range(FIRST_VISIBLE_ROW, FIRST_VISIBLE_ROW + BOARD_DIMENSIONS.y);
		const places = _.range(BOARD_DIMENSIONS.x).flatMap((r) =>
			visibleRows.map((row) => ({ reel: r, row })),
		);
		const decoys = places.filter((place) => {
			const distance = Math.max(
				Math.abs(place.reel - target.reel),
				Math.abs(place.row - target.row),
			);
			return (
				distance >= 1 &&
				distance <= BAIT.reach &&
				place.reel !== reel &&
				!targets.some((t) => t.reel === place.reel && t.row === place.row) &&
				!context.stateGame.board[place.reel].reelState.symbols[place.row]?.rawSymbol.bigWild
			);
		});
		return _.sample(decoys);
	};

	// where a flight is at t, and which way it is heading: straight there, slowing as it lands; or,
	// teasing, slowing towards its decoy, then darting on to its own place
	const flightPath = (flight: Flight, t: number) => {
		if (!flight.via) {
			return { at: lerp(flight.from, flight.to, quadOut(t)), from: flight.from, to: flight.to };
		}
		if (t < BAIT.switchAt) {
			return {
				at: lerp(flight.from, flight.via, quadOut(t / BAIT.switchAt)),
				from: flight.from,
				to: flight.via,
			};
		}
		const p = (t - BAIT.switchAt) / (1 - BAIT.switchAt);
		return { at: lerp(flight.via, flight.to, quadOut(p)), from: flight.via, to: flight.to };
	};

	const context = getContext();

	let flights = $state<Flight[]>([]);
	let nextFlightId = 0;

	// where a flight is at t, how big and which way it faces: head first along the way it is heading
	// (the image faces left, so it is mirrored to fly right)
	const flightLook = (flight: Flight, t: number) => {
		const path = flightPath(flight, t);
		const dx = path.to.x - path.from.x;
		const dy = path.to.y - path.from.y;
		const startWidth = REEL_WIDTH * MOUTH_FISH.width;
		const width =
			(startWidth + (LANDING_WIDTH - startWidth) * t) * (1 + MID_AIR_SWELL * Math.sin(Math.PI * t));
		const wriggle = WRIGGLE.angle * (1 - t) * Math.sin(2 * Math.PI * WRIGGLE.count * t);
		const right = dx > 0;
		return {
			...path.at,
			width,
			mirror: right ? -1 : 1,
			rotation: (right ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx)) + wriggle,
		};
	};

	// the big wild's last fish has gone: its mouth is empty now
	const emptyMouth = (reel: number) => {
		const anchor = context.stateGame.board[reel].reelState.symbols.find(
			(reelSymbol) => reelSymbol.rawSymbol.bigWild?.anchor,
		);
		const bigWild = anchor?.rawSymbol.bigWild;
		if (!anchor || !bigWild?.fish) return;
		anchor.rawSymbol = { ...anchor.rawSymbol, bigWild: { ...bigWild, fish: false, fade: true } };
	};

	const throwFish = async ({
		reel,
		position,
		targets,
		last,
	}: {
		reel: number;
		position: Position;
		targets: Position[];
		// the last fish: as it leaves, the big wild's mouth is left empty
		last: boolean;
	}) => {
		const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
		const from = {
			x: getSymbolX(reel) + (MOUTH_FISH.x - 0.5) * REEL_WIDTH,
			y: BOARD_SIZES.height * MOUTH_FISH.y,
		};
		const decoy = pickDecoy(reel, position, targets);
		const decoySymbol = decoy && context.stateGame.board[decoy.reel].reelState.symbols[decoy.row];
		const flight: Flight = {
			id: nextFlightId++,
			from,
			to: { x: getSymbolX(position.reel), y: reelSymbol.symbolY() },
			via:
				decoy &&
				decoySymbol &&
				lerp(from, { x: getSymbolX(decoy.reel), y: decoySymbol.symbolY() }, BAIT.approach),
			progress: new Tween(0),
		};
		flights.push(flight);
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fish_throw' });
		if (last) emptyMouth(reel);
		await flight.progress.set(1, {
			duration: (flight.via ? BAIT.duration : FLIGHT_DURATION) / stateBetDerived.timeScale(),
		});
		flights = flights.filter(({ id }) => id !== flight.id);

		reelSymbol.rawSymbol = WILD;
		// pops into place as a wild with a puff of sparkles, as a wild landing from the reels does,
		// with a watery bloop
		reelSymbol.symbolState = 'land';
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fish_land' });
	};

	context.eventEmitter.subscribeOnMount({
		wildThrow: async ({ reel, positions }) => {
			// a wild thrown onto a big wild would vanish under it, so there is nothing to show
			const targets = positions.filter(
				(position) =>
					!context.stateGame.board[position.reel].reelState.symbols[position.row].rawSymbol
						.bigWild,
			);
			// with nothing to show, the fish are gone all the same
			if (targets.length === 0) emptyMouth(reel);
			await Promise.all(
				targets.map(async (position, index) => {
					await waitForTimeout((index * FLIGHT_STAGGER) / stateBetDerived.timeScale());
					await throwFish({ reel, position, targets, last: index === targets.length - 1 });
				}),
			);
			// the last wild pops into place before the round goes on: in turbo, with autoplay or the
			// space bar held, the next spin starts straight away and would take it off with its reel
			if (targets.length > 0) {
				await waitForTimeout(LANDING_HOLD / stateBetDerived.timeScale());
			}
		},
	});
</script>

<BoardContainer>
	{#each flights as flight (flight.id)}
		{@const look = flightLook(flight, flight.progress.current)}
		<Container x={look.x} y={look.y} rotation={look.rotation} scale={{ x: look.mirror, y: 1 }}>
			<Sprite key="wildFish" anchor={0.5} width={look.width} height={look.width * FISH_RATIO} />
		</Container>
	{/each}
</BoardContainer>
