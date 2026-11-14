<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import type { Reel } from '../game/stateGame.svelte';
	import { REEL_WIDTH } from '../game/constants';
	import { boardNudgeY } from '../game/boardNudge.svelte';

	// A reel that could still give the free spins is lit with a flat, faint column while it spins on
	// (the sample's Mining Mayhem rocks-and-dust animation was removed); it goes once the reel stops.

	type Props = {
		reel: Reel;
		oncomplete: () => void;
	};

	const props: Props = $props();
	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());

	$effect(() => {
		if (props.reel.reelState.motion === 'stopped') props.oncomplete();
	});
</script>

<!-- (at the board's scale: it is placed outside it; nudged with the board as a spin starts) -->
<Rectangle
	x={board.x + (props.reel.reelIndex * REEL_WIDTH - board.width * 0.5) * board.scale}
	y={board.y - board.height * 0.5 * board.scale + boardNudgeY()}
	width={REEL_WIDTH * board.scale}
	height={board.height * board.scale}
	backgroundColor={0xffffff}
	backgroundAlpha={0.1}
/>
