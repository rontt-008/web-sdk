<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { boardNudgeY } from '../game/boardNudge.svelte';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();

	const context = getContext();
</script>

<!-- (nudged down a little as a spin starts, with the frame: boardNudge) -->
<Container
	x={context.stateGameDerived.boardLayout().x}
	y={context.stateGameDerived.boardLayout().y + boardNudgeY()}
	pivot={context.stateGameDerived.boardLayout().pivot}
	scale={context.stateGameDerived.boardLayout().scale}
>
	{@render props.children()}
</Container>
