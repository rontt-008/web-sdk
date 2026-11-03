<script lang="ts" module>
	import type { Position } from '../game/types';

	// the base game's Mannaz (MANNAZ): gone as each base game spin starts; now and then appearing in
	// a spin, its spots under the spin's wins lighting up, all of it flaring when it is complete (the
	// mythic bonus follows)
	export type EmitterEventMannaz =
		| { type: 'mannazReset' }
		| { type: 'mannazShow' }
		| { type: 'mannazLight'; positions: Position[] }
		| { type: 'mannazComplete' };
</script>

<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { waitForTimeout } from 'utils-shared/wait';
	import { stateBetDerived } from 'state-shared';

	import BoardContainer from './BoardContainer.svelte';
	import RuneGlyph from './RuneGlyph.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { MANNAZ, NO_OFFSET, runeSpotIndex } from '../game/runes';

	const context = getContext();

	// Mannaz across the whole board, in some base game spins only: it isn't there until a spin's book
	// shows it (mannazShow, as the spin's symbols fall in), and goes as the next spin starts or the bonus does.
	// It shows as the free spins' runes do (RuneBoard, the user's choice): behind the symbols, its lines
	// between them, fading in unlit (in APPEAR ms), its spots under the spin's wins lighting up.
	const APPEAR = 350;
	const glows = MANNAZ.spots.map(() => new Tween(0, { duration: 650 }));
	const flash = new Tween(0, { duration: 250, easing: cubicOut });
	const fade = new Tween(0, { duration: 350, easing: cubicOut });
	// gone as the bonus starts (under the gale), as well as when a spin starts (set straight from
	// here and the events: a set while another runs drops the first's promise, which mannazShow waits
	// on)
	$effect(() => {
		if (context.stateGame.gameType !== 'basegame') untrack(() => fade.set(0));
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

	const unlit = (duration: number) => {
		glows.forEach((glow) => glow.set(0, { duration }));
		flash.set(0, { duration });
	};

	context.eventEmitter.subscribeOnMount({
		mannazReset: () => {
			fade.set(0, { duration: 250 });
			unlit(250);
		},
		mannazShow: async () => {
			unlit(0);
			await fade.set(1, { duration: APPEAR / stateBetDerived.timeScale() });
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
			glows={glows.map((glow) => glow.current)}
			flash={flash.current}
			spots={false}
			{time}
			idle
		/>
	{/if}
</BoardContainer>
