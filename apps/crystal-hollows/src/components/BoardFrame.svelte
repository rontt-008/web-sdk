<script lang="ts">
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { boardNudgeY } from '../game/boardNudge.svelte';

	// The board: the user's blue stone frame round its dark blue panel, fitted round the symbols
	// (see boardFrameLayout in stateGame); nudged down a little with the board as a spin starts
	// (boardNudge)
	const context = getContext();
	const frame = $derived(context.stateGameDerived.boardFrameLayout());
</script>

<Sprite key="boardFrame" x={frame.x} y={frame.y + boardNudgeY()} scale={frame.scale} />
