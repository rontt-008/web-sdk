<script lang="ts">
	import _ from 'lodash';
	import { Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE, REEL_WIDTH, BOARD_DIMENSIONS } from '../game/constants';

	const context = getContext();

	// board-frame.png is 1174x772; the inner wooden panel (where the reels sit) was measured from the image.
	const FRAME_IMAGE = { width: 1174, height: 772 };
	const FRAME_INNER = { x: 140, y: 135, width: 881, height: 530 };
	// wood visible between the reels and the frame border
	const FRAME_PADDING = SYMBOL_SIZE * 0.1;
	// anchor on the centre of the inner panel so it lines up with the centre of the board
	const FRAME_ANCHOR = {
		x: (FRAME_INNER.x + FRAME_INNER.width / 2) / FRAME_IMAGE.width,
		y: (FRAME_INNER.y + FRAME_INNER.height / 2) / FRAME_IMAGE.height,
	};

	// stretch the frame so its inner panel wraps the board plus padding
	const frameSizes = $derived({
		width:
			FRAME_IMAGE.width *
			((context.stateGameDerived.boardLayout().width + FRAME_PADDING * 2) / FRAME_INNER.width),
		height:
			FRAME_IMAGE.height *
			((context.stateGameDerived.boardLayout().height + FRAME_PADDING * 2) / FRAME_INNER.height),
	});

	// darker column behind each reel so the symbols sit in the board
	const REEL_COLUMN_GAP = SYMBOL_SIZE * 0.04;
	const REEL_COLUMN_COLOR = 0x281206;
	const REEL_COLUMN_ALPHA = 0.3;
	const boardLeft = $derived(
		context.stateGameDerived.boardLayout().x - context.stateGameDerived.boardLayout().width * 0.5,
	);
	const boardTop = $derived(
		context.stateGameDerived.boardLayout().y - context.stateGameDerived.boardLayout().height * 0.5,
	);
</script>

<!-- no glow around the board in free spins: the frame looks the same in every mode -->
<Sprite
	key="boardFrame"
	anchor={FRAME_ANCHOR}
	x={context.stateGameDerived.boardLayout().x}
	y={context.stateGameDerived.boardLayout().y}
	{...frameSizes}
/>

{#each _.range(BOARD_DIMENSIONS.x) as reelIndex}
	<Rectangle
		anchor={{ x: 0.5, y: 0 }}
		x={boardLeft + getSymbolX(reelIndex)}
		y={boardTop - REEL_COLUMN_GAP}
		width={REEL_WIDTH - REEL_COLUMN_GAP * 2}
		height={context.stateGameDerived.boardLayout().height + REEL_COLUMN_GAP * 2}
		borderRadius={SYMBOL_SIZE * 0.12}
		backgroundColor={REEL_COLUMN_COLOR}
		backgroundAlpha={REEL_COLUMN_ALPHA}
	/>
{/each}
