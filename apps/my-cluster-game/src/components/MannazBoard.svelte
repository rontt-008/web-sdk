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
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { waitForTimeout } from 'utils-shared/wait';
	import { stateBetDerived } from 'state-shared';

	import BoardContainer from './BoardContainer.svelte';
	import RuneGlyph from './RuneGlyph.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { MANNAZ, NO_OFFSET, runeSpotIndex } from '../game/runes';

	const context = getContext();

	// Mannaz across the whole board, in some base game spins only: it isn't there until a spin's book
	// shows it (mannazShow, after the board lands), and goes as the next spin starts or the bonus does.
	// It is drawn over the symbols, not behind them as the free spins' runes are: across all 25 cells,
	// its staves down the outer reels, it would hardly show between them. Unlit it is faint (UNLIT),
	// so the symbols read through it; its lit spots glow at full. It appears in a flare of all its
	// lines (APPEAR, in ms: fading in while it flares up, then the flare dying down to unlit).
	const UNLIT = 0.45;
	const APPEAR = { fadeIn: 350, flare: 250, settle: 550 };
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
			const speed = stateBetDerived.timeScale();
			unlit(0);
			await Promise.all([
				fade.set(1, { duration: APPEAR.fadeIn / speed }),
				flash.set(1, { duration: APPEAR.flare / speed, easing: cubicOut }),
			]);
			await flash.set(0, { duration: APPEAR.settle / speed, easing: cubicIn });
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
