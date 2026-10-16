<script lang="ts" module>
	export type EmitterEventWalkingWilds =
		// SUPER free spins: the big wilds that walk on cover their reels, as they look on the board
		| { type: 'walkingWildsShow'; moves: { from: number; to: number; multiplier: number }[] }
		// while the other reels spin, they walk one reel left (or off the first one)
		| { type: 'walkingWildsMove' }
		// they are in place: the board draws them again
		| { type: 'walkingWildsHide' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import { Container } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { BOARD_SIZES } from '../game/constants';
	import type { RawSymbol } from '../game/types';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import Symbol from './Symbol.svelte';

	const MOVE_DURATION = 450;

	// from one reel to the one on its left; to is -1 off the board
	type Walker = { from: number; to: number; rawSymbol: RawSymbol };

	const context = getContext();

	let walkers = $state<Walker[]>([]);
	// 0 on the reel it was on, 1 on the reel it moves to
	const progress = new Tween(0);

	const getX = (walker: Walker) =>
		getSymbolX(walker.from) + (getSymbolX(walker.to) - getSymbolX(walker.from)) * progress.current;

	context.eventEmitter.subscribeOnMount({
		walkingWildsShow: ({ moves }) => {
			progress.set(0, { duration: 0 });
			walkers = moves.map(({ from, to, multiplier }) => ({
				from,
				to,
				rawSymbol: { name: 'W', wild: true, multiplier, bigWild: { anchor: true, multiplier } },
			}));
		},
		walkingWildsMove: async () => {
			if (walkers.length === 0) return;
			await progress.set(1, {
				duration: MOVE_DURATION / stateBetDerived.timeScale(),
				easing: cubicInOut,
			});
		},
		walkingWildsHide: () => {
			walkers = [];
		},
	});
</script>

<!-- over the reels, clipped to the board like them; one walking off the first reel fades out -->
<BoardContainer>
	<BoardMask />
	{#each walkers as walker, index (index)}
		<Container
			x={getX(walker)}
			y={BOARD_SIZES.height / 2}
			alpha={walker.to < 0 ? 1 - progress.current : 1}
		>
			<Symbol state="static" rawSymbol={walker.rawSymbol} />
		</Container>
	{/each}
</BoardContainer>
