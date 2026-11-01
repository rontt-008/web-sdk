<script lang="ts">
	import { SpriteSheet } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		// called when it has played through once
		oncomplete?: () => void;
	};

	const props: Props = $props();

	// a symbol state drawn as a sprite sheet (the leaves' hits, art-source/leaf-hits.py) plays at its
	// own frame rate, or 30 frames a second; the speed is in frames a tick, at 60 ticks a second
	const FRAME_RATE = 30;
	const frameRate = $derived(
		'frameRate' in props.symbolInfo ? props.symbolInfo.frameRate : FRAME_RATE,
	);
</script>

<SpriteSheet
	key={props.symbolInfo.assetKey}
	x={props.x}
	y={props.y}
	anchor={0.5}
	width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width}
	height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
	animationSpeed={(frameRate / 60) * stateBetDerived.timeScale()}
	loop={false}
	onComplete={() => props.oncomplete?.()}
	play
/>
