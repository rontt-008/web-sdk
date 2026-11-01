<script lang="ts">
	import { Sprite } from 'pixi-svelte';

	import SymbolPose from './SymbolPose.svelte';
	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		// called when its motion ends, or straight away when it has none
		oncomplete?: () => void;
	};

	const props: Props = $props();
</script>

<SymbolPose x={props.x} y={props.y} symbolInfo={props.symbolInfo} oncomplete={props.oncomplete}>
	<Sprite
		anchor={0.5}
		key={props.symbolInfo.assetKey}
		width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width}
		height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
	/>
</SymbolPose>
