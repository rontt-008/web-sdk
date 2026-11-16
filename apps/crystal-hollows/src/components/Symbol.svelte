<script lang="ts">
	import { Text } from 'pixi-svelte';

	import SymbolSpineMain from './SymbolSpineMain.svelte';
	import SymbolSprite from './SymbolSprite.svelte';
	import SymbolSheet from './SymbolSheet.svelte';
	import { getSymbolInfo } from '../game/utils';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { gameTextStyle, TEXT_GOLD } from '../game/textStyles';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
	};

	const props: Props = $props();
	const symbolInfo = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
	const isSprite = $derived(symbolInfo.type === 'sprite');
	// an animation that plays through (the lands, the premiums' hits) is done when it ends;
	// one that loops (the idles) is a resting state, done as soon as it shows
	const plays = $derived('play' in symbolInfo && symbolInfo.play);
	const loops = $derived('loop' in symbolInfo && symbolInfo.loop);
	// a symbol's multiplier is written on it, but not on the wild's (the bat in the ring): its
	// multiplier still counts in the wins
	const multiplierLabel = $derived(
		props.rawSymbol.multiplier && props.rawSymbol.name !== 'W'
			? `${props.rawSymbol.multiplier}X`
			: '',
	);

	// a still (see SYMBOL_INFO_MAP) is done as soon as it shows: the sprites say so themselves, a
	// looping skeleton here
	$effect(() => {
		if (isSprite || plays) return;
		void symbolInfo;
		props.oncomplete?.();
	});
</script>

{#if isSprite}
	<SymbolSprite {symbolInfo} x={props.x} y={props.y} oncomplete={props.oncomplete} />
{:else if symbolInfo.type === 'spriteSheet'}
	<!-- (the free spins symbol's drop and activation: frames, played through) -->
	<SymbolSheet {symbolInfo} x={props.x} y={props.y} oncomplete={props.oncomplete} />
{:else if symbolInfo.type === 'spine'}
	<SymbolSpineMain
		{symbolInfo}
		x={props.x}
		y={props.y}
		loop={loops}
		listener={plays ? { complete: () => props.oncomplete?.() } : {}}
	/>
{/if}

{#if multiplierLabel}
	<Text
		anchor={0.5}
		x={props.x}
		y={props.y}
		text={multiplierLabel}
		style={gameTextStyle(40, TEXT_GOLD)}
	/>
{/if}
