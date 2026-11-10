<script lang="ts" module>
	export type EmitterEventTransition = { type: 'transition' };
</script>

<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { cubicOut, linear } from 'svelte/easing';
	import { Graphics } from 'pixi-svelte';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { PRINT_COLOURS } from '../game/print';

	// Between the game and the bonus (in and out of the free spins): a chessboard wipes over the screen.
	// Its squares, ink and the cards' cream (print.ts), grow one after another in a wave from the top
	// left corner to the bottom right until the whole screen is a chessboard; then they go the same way,
	// the first to come the first to leave. Whoever asked for the transition goes on once the screen is
	// covered, so what changes (the bonus's card coming up, the board going back to the game) changes
	// behind the board and is there as it clears.
	const context = getContext();

	// in ms: the wave over the screen, the board held whole, the wave off it
	const TIMING = { cover: 620, hold: 180, clear: 620 };
	// the squares: this many along the screen's longer side; how much of the wave a single square's
	// growing takes (the rest is the squares' start, one after another along the diagonals)
	const SQUARES = 10;
	const GROW = 0.45;

	// 0: clear, 1: covered, 2: clear again
	const progress = new Tween(0, { easing: linear });
	let running = $state(false);

	context.eventEmitter.subscribeOnMount({
		transition: async () => {
			running = true;
			await progress.set(0, { duration: 0 });
			await progress.set(1, { duration: TIMING.cover });
			// the rest goes on by itself, behind whatever comes next
			(async () => {
				await waitForTimeout(TIMING.hold);
				await progress.set(2, { duration: TIMING.clear });
				if (progress.target === 2) running = false;
			})();
		},
	});

	const draw = (graphics: PIXI.Graphics) => {
		const { width, height } = context.stateLayoutDerived.canvasSizes();
		const cell = Math.ceil(Math.max(width, height) / SQUARES);
		const cols = Math.ceil(width / cell);
		const rows = Math.ceil(height / cell);
		const covering = progress.current <= 1;
		const wave = covering ? progress.current : progress.current - 1;
		const diagonals = Math.max(1, cols + rows - 2);
		for (let col = 0; col < cols; col++) {
			for (let row = 0; row < rows; row++) {
				// where the square is in its own growing (or going), 0 to 1
				const start = ((col + row) / diagonals) * (1 - GROW);
				const t = Math.min(1, Math.max(0, (wave - start) / GROW));
				const size = covering ? cubicOut(t) : 1 - cubicOut(t);
				if (size <= 0) continue;
				// a hair over its size once whole, so no line of the screen shows between two squares
				const side = cell * size + (size >= 1 ? 1 : 0);
				graphics
					.rect((col + 0.5) * cell - side / 2, (row + 0.5) * cell - side / 2, side, side)
					.fill((col + row) % 2 === 0 ? PRINT_COLOURS.paper : PRINT_COLOURS.ink);
			}
		}
	};
</script>

{#if running}
	<!-- over everything, what's put up after it too (the bonus's card comes up while it's covering) -->
	<Graphics {draw} zIndex={1000} />
{/if}
