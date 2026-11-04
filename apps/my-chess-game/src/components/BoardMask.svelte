<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';

	// the pieces falling in and out are only seen on the board
	const context = getContext();
</script>

<Rectangle
	isMask
	width={context.stateGameDerived.boardLayout().width}
	height={context.stateGameDerived.boardLayout().height}
/>
