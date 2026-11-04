<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_COLOURS, BOARD_DIMENSIONS } from '../game/constants';
	import BoardContainer from './BoardContainer.svelte';

	// the chequered squares, the last move's two squares lit gold and a king in check lit red
	const context = getContext();
	const squares = Array.from({ length: BOARD_DIMENSIONS.x * BOARD_DIMENSIONS.y }, (_, index) => ({
		reel: index % BOARD_DIMENSIONS.x,
		row: Math.floor(index / BOARD_DIMENSIONS.x),
	}));
	const lit = $derived(
		[context.stateGame.lastMove?.from, context.stateGame.lastMove?.to].filter(
			(position) => position !== undefined,
		),
	);
</script>

<BoardContainer>
	{#each squares as { reel, row }}
		<Rectangle
			x={reel * SYMBOL_SIZE}
			y={row * SYMBOL_SIZE}
			width={SYMBOL_SIZE}
			height={SYMBOL_SIZE}
			backgroundColor={(reel + row) % 2 === 0 ? BOARD_COLOURS.light : BOARD_COLOURS.dark}
		/>
	{/each}
	{#each lit as position}
		<Rectangle
			x={position.reel * SYMBOL_SIZE}
			y={(position.row - 1) * SYMBOL_SIZE}
			width={SYMBOL_SIZE}
			height={SYMBOL_SIZE}
			backgroundColor={BOARD_COLOURS.lastMove}
			backgroundAlpha={0.45}
		/>
	{/each}
	{#if context.stateGame.checkSquare}
		<Rectangle
			x={context.stateGame.checkSquare.reel * SYMBOL_SIZE}
			y={(context.stateGame.checkSquare.row - 1) * SYMBOL_SIZE}
			width={SYMBOL_SIZE}
			height={SYMBOL_SIZE}
			backgroundColor={BOARD_COLOURS.check}
			backgroundAlpha={0.6}
		/>
	{/if}
</BoardContainer>
