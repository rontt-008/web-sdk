<script lang="ts">
	import { BaseSpineProvider, getContextApp, type LoadedSpine } from 'pixi-svelte';

	import SymbolSkeletonPose from './SymbolSkeletonPose.svelte';
	import { SYMBOL_SIZE } from '../game/constants';

	type Props = {
		// a symbol's skeleton (art-source/symbol-spines.py): 1 unit is 1 px of its 256 px still, the
		// origin its middle
		assetKey: string;
		animation: string;
		// where it is in the animation, in seconds, read every frame
		time: () => number;
		loop?: boolean;
		x?: number;
		y?: number;
		// the still's size, in cells
		sizeRatios: { width: number; height: number };
		alpha?: number;
	};

	const STILL = 256;

	const props: Props = $props();
	const context = getContextApp();
	const spineData = $derived(context.stateApp.loadedAssets?.[props.assetKey] as LoadedSpine | undefined);
</script>

{#if spineData}
	{#key spineData}
		<BaseSpineProvider
			{spineData}
			autoUpdate={false}
			x={props.x}
			y={props.y}
			scale={{
				x: (SYMBOL_SIZE * props.sizeRatios.width) / STILL,
				y: (SYMBOL_SIZE * props.sizeRatios.height) / STILL,
			}}
			alpha={props.alpha ?? 1}
		>
			<SymbolSkeletonPose animation={props.animation} time={props.time} loop={props.loop} />
		</BaseSpineProvider>
	{/key}
{/if}
