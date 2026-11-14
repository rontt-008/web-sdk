<script lang="ts">
	import { SpineProvider, SpineTrack, type SpineTrackProps } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';

	// a symbol's skeleton state (SYMBOL_INFO_MAP), or another animation of it (the wild's `fly`)
	type SpineInfo = Pick<
		Extract<ReturnType<typeof getSymbolInfo>, { type: 'spine' }>,
		'assetKey' | 'sizeRatios'
	> & { animationName: string };

	type Props = {
		symbolInfo: SpineInfo;
		x?: number;
		y?: number;
		listener: SpineTrackProps['listener'];
		loop?: boolean;
	};

	const props: Props = $props();
</script>

<SpineProvider
	x={props.x}
	y={props.y}
	key={props.symbolInfo.assetKey}
	height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
>
	<!-- a loop (the letters' idles) keeps its own pace; one-offs (their lands) follow the game's speed -->
	<SpineTrack
		loop={props.loop}
		trackIndex={0}
		animationName={props.symbolInfo.animationName}
		timeScale={props.loop ? 1 : stateBetDerived.timeScale()}
		listener={props.listener}
	/>
</SpineProvider>
