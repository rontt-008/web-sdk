<script lang="ts">
	import { Container, Text } from 'pixi-svelte';

	import {
		LOGO_TEXT_SKEW,
		fitLogoFontSize,
		logoTextLayers,
		type LogoTextColors,
		type LogoTextLook,
	} from '../game/textStyles';

	// Text in the logo's lettering (textStyles logoTextLayers: Titan One, leaning, a top-to-bottom fade
	// over a darker underside, outlined), centred on (x, y): fontSize, or smaller to fit in maxWidth; in
	// `colors` (LOGO_TEXT_COLORS: by default the whole logo's cyan to pink) and `look` (simple: a thin
	// outline, the tall WILD's multiplier, WildMultiplier; logo: drawn as the logo's letters are, the
	// free spins sign's words, FreeSpinCounter).

	type Props = {
		text: string;
		x?: number;
		y?: number;
		fontSize: number;
		maxWidth: number;
		colors?: LogoTextColors;
		look?: LogoTextLook;
	};

	const props: Props = $props();

	const fontSize = $derived(fitLogoFontSize(props.text, props.fontSize, props.maxWidth, props.look));
	const layers = $derived(logoTextLayers(fontSize, props.colors, props.look));
</script>

<Container x={props.x ?? 0} y={props.y ?? 0} skew={{ x: LOGO_TEXT_SKEW, y: 0 }}>
	{#each layers as layer}
		<Text text={props.text} anchor={0.5} y={layer.y} style={layer.style} />
	{/each}
</Container>
