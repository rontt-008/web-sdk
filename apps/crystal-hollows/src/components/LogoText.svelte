<script lang="ts">
	import { Container, Text } from 'pixi-svelte';

	import {
		LOGO_TEXT_SKEW,
		fitLogoFontSize,
		logoTextLayers,
		type LogoTextColors,
		type LogoTextLook,
	} from '../game/textStyles';

	// Text in the logo's lettering (textStyles logoTextLayers: Germania One, RuneFall's font, leaning, a top-to-bottom fade
	// cut from rock, over a darker underside, outlined), centred on (x, y): fontSize, or smaller to fit
	// in maxWidth; in `colors` (LOGO_TEXT_COLORS: by default the whole logo's cyan to pink) and `look`
	// (simple: a thin outline, the tall WILD's multiplier, WildMultiplier; logo: drawn as the logo's
	// letters are, the free spins sign's words, FreeSpinCounter). Since 2026-11-16 every text over the
	// game is in it (only the UI's are not): lines may be split by "\n" (centred, lineHeight apart, fitted
	// by the longest), and it fades with alpha; `rock` is how much of the rock is over it (1, all; less
	// for small text, the start screen cards' captions).

	type Props = {
		text: string;
		x?: number;
		y?: number;
		fontSize: number;
		maxWidth: number;
		colors?: LogoTextColors;
		look?: LogoTextLook;
		lineHeight?: number;
		alpha?: number;
		rock?: number;
	};

	const props: Props = $props();

	const fontSize = $derived(fitLogoFontSize(props.text, props.fontSize, props.maxWidth, props.look));
	const layers = $derived(logoTextLayers(fontSize, props.colors, props.look, props.rock));
</script>

<Container
	x={props.x ?? 0}
	y={props.y ?? 0}
	skew={{ x: LOGO_TEXT_SKEW, y: 0 }}
	alpha={props.alpha ?? 1}
>
	{#each layers as layer}
		<Text
			text={props.text}
			anchor={0.5}
			y={layer.y}
			style={props.lineHeight ? { ...layer.style, lineHeight: props.lineHeight } : layer.style}
			blendMode={layer.blendMode ?? 'inherit'}
			alpha={layer.alpha ?? 1}
		/>
	{/each}
</Container>
