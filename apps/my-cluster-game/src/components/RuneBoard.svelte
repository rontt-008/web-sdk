<script lang="ts" module>
	import type { RuneName, RuneOffset } from '../game/runes';
	import type { Position } from '../game/types';

	// the runes in the free spins, for the rune behind the board and the boxes left of it
	// (RuneTablets): a rune shows, its spots under wins light up, it is collected, and it hides when
	// the power spins start; restored as it was when a bonus is resumed
	export type EmitterEventRunes =
		| { type: 'runesShow'; rune: RuneName; offset: RuneOffset }
		| { type: 'runesLight'; positions: Position[] }
		| { type: 'runesComplete'; rune: RuneName }
		| { type: 'runesHide' }
		| { type: 'runesReset' }
		| {
				type: 'runesRestore';
				rune?: RuneName;
				// where each rune shown so far lies, or lay
				offsets: Partial<Record<RuneName, RuneOffset>>;
				lit: Position[];
				collected: RuneName[];
		  };
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
	import { NO_OFFSET, RUNES, runeSpotIndex } from '../game/runes';

	const context = getContext();

	let rune = $state<RuneName | undefined>(undefined);
	let offset = $state<RuneOffset>(NO_OFFSET);
	// how lit each of the rune's spots is
	let glows = $state<Tween<number>[]>([]);
	const fade = new Tween(0, { duration: 350, easing: cubicOut });
	// all of it lit up as it is collected
	const flash = new Tween(0, { duration: 250, easing: cubicOut });

	// a count up a few times a second while some of the rune is lit, for its lines' crackle
	const CRACKLE_EVERY = 70;
	let time = $state(0);
	onMount(() => {
		const timer = setInterval(() => {
			if (rune && glows.some((glow) => glow.current > 0)) time += 1;
		}, CRACKLE_EVERY);
		return () => clearInterval(timer);
	});

	const showRune = (name: RuneName, at: RuneOffset, lit: Position[] = []) => {
		rune = name;
		offset = at;
		glows = RUNES[name].spots.map(() => new Tween(0, { duration: 650 }));
		lit.forEach((position) => glows[runeSpotIndex(name, at, position)]?.set(1, { duration: 0 }));
		flash.set(0, { duration: 0 });
	};

	const hideRune = async () => {
		await fade.set(0, { duration: 450 });
		rune = undefined;
	};

	context.eventEmitter.subscribeOnMount({
		runesShow: async ({ rune: name, offset: at }) => {
			showRune(name, at);
			await fade.set(1);
		},
		runesLight: async ({ positions }) => {
			const name = rune;
			if (!name) return;
			const spots = positions.map((position) => runeSpotIndex(name, offset, position));
			await Promise.all(spots.filter((spot) => spot >= 0).map((spot) => glows[spot].set(1)));
		},
		runesComplete: async () => {
			await flash.set(1);
			await waitForTimeout(300);
			await hideRune();
		},
		runesHide: hideRune,
		runesReset: () => {
			rune = undefined;
			fade.set(0, { duration: 0 });
		},
		runesRestore: ({ rune: name, offsets, lit }) => {
			if (!name) {
				rune = undefined;
				fade.set(0, { duration: 0 });
				return;
			}
			showRune(name, offsets[name] ?? NO_OFFSET, lit);
			fade.set(1, { duration: 0 });
		},
	});
</script>

<!-- on the board's panel, behind the symbols, only its lines: they show between the symbols, and
where they tumble out -->
<BoardContainer>
	{#if rune}
		<RuneGlyph
			{rune}
			size={SYMBOL_SIZE * 5}
			{offset}
			alpha={fade.current}
			glows={glows.map((glow) => glow.current)}
			flash={flash.current}
			spots={false}
			{time}
		/>
	{/if}
</BoardContainer>
