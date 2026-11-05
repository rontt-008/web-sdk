<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { BOARD_COLOURS, SYMBOL_SIZE } from '../game/constants';
	import { drawArrow } from '../game/drawArrow';
	import BoardContainer from './BoardContainer.svelte';

	// Over the pieces, in the start screen's game: the engine's best move for the player, asked for with
	// the lightbulb (SandboxControls), as an arrow, gone with the player's move
	const context = getContext();
	const ALPHAS = [0.85, 0.6, 0.4];

	const draw = (graphics: PIXI.Graphics) => {
		graphics.clear();
		// the weakest first, so the best lies on top
		[...context.stateGame.hints].reverse().forEach((hint) => {
			drawArrow(graphics, hint.from, hint.to, BOARD_COLOURS.hint, ALPHAS[hint.rank - 1] ?? 0.4);
		});
	};
</script>

<BoardContainer>
	<Graphics {draw} zIndex={30} />
</BoardContainer>
