<script lang="ts">
	import SymbolSpine from './SymbolSpine.svelte';
	import SymbolSprite from './SymbolSprite.svelte';
	import { getSymbolInfo } from '../game/utils';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { getContext } from '../game/context';
	import { BIG_WILD_MULTIPLIER } from '../game/constants';
	import { createBoardTextStyle, fitBoardFontSize } from '../game/textStyles';
	import { Text } from 'pixi-svelte';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
		// squash and spring back once, as when a cat lands (sprite symbols only)
		jiggle?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const symbolInfo = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
	const isSprite = $derived(symbolInfo.type === 'sprite');
	// wins have no frame around each symbol: a line is drawn through them instead (see WinLine)
	const bigWildMultiplier = $derived(props.rawSymbol.bigWild?.multiplier);
	const bigWildMultiplierText = $derived(`${bigWildMultiplier}X`);
	// shrink long text to fit the strip
	const bigWildMultiplierFontSize = $derived(
		fitBoardFontSize({
			text: bigWildMultiplierText,
			fontSize: BIG_WILD_MULTIPLIER.fontSize,
			maxWidth: BIG_WILD_MULTIPLIER.maxWidth,
		}),
	);
	// same look as the win amounts on the lines, in yellow fading down to orange
	const bigWildMultiplierStyle = $derived(
		createBoardTextStyle({
			fontSize: bigWildMultiplierFontSize,
			top: 0xffe234,
			bottom: 0xff8c1a,
			outline: 0x4a1c00,
		}),
	);
</script>

{#if isSprite}
	<SymbolSprite
		{symbolInfo}
		x={props.x}
		y={props.y}
		animate={props.state === 'win'}
		jiggle={props.jiggle}
		oncomplete={props.oncomplete}
	>
		{#if bigWildMultiplier}
			<Text
				anchor={0.5}
				y={BIG_WILD_MULTIPLIER.y}
				text={bigWildMultiplierText}
				style={bigWildMultiplierStyle}
			/>
		{/if}
	</SymbolSprite>
{:else}
	<SymbolSpine
		loop={props.loop}
		{symbolInfo}
		x={props.x}
		y={props.y}
		listener={{
			complete: props.oncomplete,
			event: (_, event) => {
				if (event.data?.name === 'wildExplode') {
					context.eventEmitter?.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
				}
			},
		}}
	/>
{/if}
