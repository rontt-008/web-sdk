<script lang="ts">
	import { SpineProvider, SpineTrack } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import type { Reel } from '../game/stateGame.svelte';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE, REEL_WIDTH, BOARD_DIMENSIONS } from '../game/constants';

	type Props = {
		reel: Reel;
		oncomplete: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	type AnimationName = 'anticipation_intro' | 'anticipation_loop' | 'anticipation_out';

	let animationName = $state<AnimationName>('anticipation_intro');

	// height was tuned for a 3-row board, so scale it with the row count
	const height = (SYMBOL_SIZE * 1.6 * BOARD_DIMENSIONS.y) / 3;

	$effect(() => {
		if (props.reel.reelState.motion === 'stopped') {
			animationName = 'anticipation_out';
		}
	});
</script>

<SpineProvider
	key="anticipation"
	width={REEL_WIDTH * 0.56}
	{height}
	x={context.stateGameDerived.boardLayout().x -
		context.stateGameDerived.boardLayout().width * 0.5 +
		getSymbolX(props.reel.reelIndex)}
	y={context.stateGameDerived.boardLayout().y - SYMBOL_SIZE * 0.06}
>
	<SpineTrack
		trackIndex={0}
		{animationName}
		loop={animationName === 'anticipation_loop'}
		timeScale={stateBetDerived.timeScale()}
		listener={{
			complete: () => {
				if (animationName === 'anticipation_intro') {
					animationName = 'anticipation_loop';
				}

				if (animationName === 'anticipation_out') {
					props.oncomplete();
				}
			},
		}}
	/>
</SpineProvider>
