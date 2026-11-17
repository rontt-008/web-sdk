<script lang="ts">
	import { SpineProvider, SpineTrack, type SpineTrackProps } from 'pixi-svelte';
	import { getSymbolInfo } from '../game/utils';
	import { winTimeScale } from '../game/winsHurry.svelte';
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
	<!-- a loop (the letters' idles) keeps its own pace; one-offs (their lands, the premiums' hits) follow
		 the game's speed, and a hit speeds up as it plays if the wins are hurried (winsHurry) -->
	<SpineTrack
		loop={props.loop}
		trackIndex={0}
		animationName={props.symbolInfo.animationName}
		timeScale={props.loop ? 1 : winTimeScale()}
		listener={props.listener}
	/>
</SpineProvider>
