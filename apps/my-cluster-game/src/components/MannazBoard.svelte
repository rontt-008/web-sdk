<script lang="ts" module>
	import type { Position } from '../game/types';

	// the base game's Mannaz (MANNAZ): back to unlit as a base game spin starts, its spots under the
	// spin's wins lighting up, all of it flaring when it is complete (the mythic bonus follows)
	export type EmitterEventMannaz =
		| { type: 'mannazReset' }
		| { type: 'mannazLight'; positions: Position[] }
		| { type: 'mannazComplete' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { waitForTimeout } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import RuneGlyph from './RuneGlyph.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { MANNAZ, NO_OFFSET, runeSpotIndex } from '../game/runes';

	const context = getContext();

	// Mannaz across the whole board, in the base game only (it fades out as the bonus starts and back
	// in as it ends, under the gale). It is drawn over the symbols, not behind them as the free spins'
	// runes are: across all 25 cells, its staves down the outer reels, it would hardly show between
	// them. Unlit it is faint (UNLIT), so the symbols read through it; its lit spots glow at full.
	const UNLIT = 0.45;
	const glows = MANNAZ.spots.map(() => new Tween(0, { duration: 650 }));
	const flash = new Tween(0, { duration: 250, easing: cubicOut });
	const inBaseGame = () => context.stateGame.gameType === 'basegame';
	const fade = new Tween(inBaseGame() ? 1 : 0, { duration: 350, easing: cubicOut });
	$effect(() => {
		fade.target = inBaseGame() ? 1 : 0;
	});

	// a count up a few times a second while some of it is lit, for its lines' crackle
	const CRACKLE_EVERY = 70;
	let time = $state(0);
	onMount(() => {
		const timer = setInterval(() => {
			if (fade.current > 0 && glows.some((glow) => glow.current > 0)) time += 1;
		}, CRACKLE_EVERY);
		return () => clearInterval(timer);
	});

	context.eventEmitter.subscribeOnMount({
		mannazReset: () => {
			glows.forEach((glow) => glow.set(0, { duration: 250 }));
			flash.set(0, { duration: 250 });
		},
		mannazLight: async ({ positions }) => {
			const spots = positions.map((position) => runeSpotIndex('mannaz', NO_OFFSET, position));
			await Promise.all(spots.filter((spot) => spot >= 0).map((spot) => glows[spot].set(1)));
		},
		// all of it lit, flaring, and left so until the mythic bonus takes it away
		mannazComplete: async () => {
			await Promise.all([...glows.map((glow) => glow.set(1)), flash.set(1)]);
			await waitForTimeout(600);
		},
	});
</script>

<BoardContainer>
	{#if fade.current > 0}
		<RuneGlyph
			rune="mannaz"
			size={SYMBOL_SIZE * 5}
			alpha={fade.current}
			unlitAlpha={UNLIT}
			glows={glows.map((glow) => glow.current)}
			flash={flash.current}
			spots={false}
			{time}
			idle
		/>
	{/if}
</BoardContainer>
