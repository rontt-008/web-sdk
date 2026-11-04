<script lang="ts">
	import { Rectangle, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_COLOURS, BOARD_DIMENSIONS } from '../game/constants';

	// a dark frame round the board with the squares' names along its left and bottom edges, as a
	// chess board has (your side at the bottom: rank 1)
	const context = getContext();
	const PAD = SYMBOL_SIZE * 0.34;
	const board = $derived(context.stateGameDerived.boardLayout());
	const labelStyle = {
		fontFamily: 'proxima-nova',
		fontSize: SYMBOL_SIZE * 0.2,
		fontWeight: '700',
		fill: BOARD_COLOURS.label,
	} as const;
	const FILES = 'abcdefgh';
</script>

<Rectangle
	x={board.x}
	y={board.y}
	anchor={0.5}
	width={board.width + PAD * 2}
	height={board.height + PAD * 2}
	borderRadius={SYMBOL_SIZE * 0.18}
	backgroundColor={BOARD_COLOURS.frame}
	borderColor={BOARD_COLOURS.frameEdge}
	borderWidth={4}
/>

{#each FILES as file, index}
	<Text
		text={file}
		style={labelStyle}
		anchor={0.5}
		x={board.x - board.width / 2 + (index + 0.5) * SYMBOL_SIZE}
		y={board.y + board.height / 2 + PAD * 0.5}
	/>
{/each}
{#each Array(BOARD_DIMENSIONS.y) as _, index}
	<Text
		text={String(BOARD_DIMENSIONS.y - index)}
		style={labelStyle}
		anchor={0.5}
		x={board.x - board.width / 2 - PAD * 0.5}
		y={board.y - board.height / 2 + (index + 0.5) * SYMBOL_SIZE}
	/>
{/each}
