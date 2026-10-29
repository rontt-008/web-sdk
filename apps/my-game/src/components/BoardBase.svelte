<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { Container } from 'pixi-svelte';
	import { getContextBoard } from 'components-shared';
	import { stateBetDerived } from 'state-shared';

	import ReelBlur from './ReelBlur.svelte';
	import ReelStrip from './ReelStrip.svelte';
	import ReelSymbol from './ReelSymbol.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	// the board's layer of resting and spinning symbols, or the one of animating symbols over it
	const boardContext = getContextBoard();

	// A quick damped shake of the reels when a big wild slams down onto the board (see SymbolSprite).
	const SHAKE_DURATION = 300;
	const SHAKE_Y = SYMBOL_SIZE * 0.065;
	const SHAKE_X = SYMBOL_SIZE * 0.025;
	const shake = new Tween(1);

	$effect(() => {
		if (!context.stateGame.groundShake) return;
		untrack(() => {
			shake.set(0, { duration: 0 });
			shake.set(1, {
				duration: SHAKE_DURATION / stateBetDerived.timeScale(),
				easing: (t) => t,
			});
		});
	});

	const shakeX = $derived.by(() => {
		const t = shake.current;
		if (t >= 1) return 0;
		return SHAKE_X * (1 - t) ** 2 * Math.sin(2 * Math.PI * 5 * t);
	});
	const shakeY = $derived.by(() => {
		const t = shake.current;
		if (t >= 1) return 0;
		return SHAKE_Y * (1 - t) ** 2 * Math.sin(2 * Math.PI * 3 * t);
	});
</script>

<Container x={shakeX} y={shakeY}>
	{#each context.stateGame.board as reel, reelIndex (reelIndex)}
		<!-- each reel blurs with its own speed (see ReelBlur) -->
		<ReelBlur {reel}>
			<!-- while a reel spins its symbols scroll by at rest, drawn by its strip (see ReelStrip); once
			     it stops, each has its own ReelSymbol again, to land, win and animate -->
			{#if !boardContext.animate}
				<ReelStrip {reel} {reelIndex} />
			{/if}
			{#if !reel.reelState.scrolling}
				{#each reel.reelState.symbols as reelSymbol, rowIndex}
					<ReelSymbol {reelIndex} {rowIndex} {reelSymbol} />
				{/each}
			{/if}
		</ReelBlur>
	{/each}
</Container>
