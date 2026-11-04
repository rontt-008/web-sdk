<script lang="ts">
	import SymbolPose from './SymbolPose.svelte';
	import SymbolSkeleton from './SymbolSkeleton.svelte';
	import { getSymbolInfo } from '../game/utils';
	import { TILE_ALPHA } from '../game/constants';
	import { IDLE_FRAME_RATE, idleTime } from '../game/idleClock.svelte';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		// how many frames on from the clock its loop is
		phase?: number;
		// called when its motion ends (its landing), or straight away: a looping idle has no end
		oncomplete?: () => void;
	};

	const props: Props = $props();

	// its loop (art-source/symbol-spines.py), posed from the clock all of them play from, so its
	// motion (SymbolPose) moves the tile without restarting the loop; `idleSpeed` times as fast as
	// made (the premium tiles')
	const phase = $derived((props.phase ?? 0) / IDLE_FRAME_RATE);
	const idleSpeed = $derived(
		'idleSpeed' in props.symbolInfo ? (props.symbolInfo.idleSpeed as number) : 1,
	);
</script>

<SymbolPose x={props.x} y={props.y} symbolInfo={props.symbolInfo} oncomplete={props.oncomplete}>
	<SymbolSkeleton
		assetKey={props.symbolInfo.assetKey}
		animation="idle"
		loop
		time={() => idleTime() * idleSpeed + phase}
		sizeRatios={props.symbolInfo.sizeRatios}
		alpha={TILE_ALPHA}
	/>
</SymbolPose>
