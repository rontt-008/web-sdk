<script lang="ts">
	import { Container } from 'pixi-svelte';

	import LogoText from './LogoText.svelte';
	import { SYMBOL_SIZE, TALL_WILD } from '../game/constants';

	// The tall WILD's multiplier ("x2", "x4", ...), in the logo's lettering (LogoText), centred on (x, y).
	// `pop` (0 to 1) is its pop as it doubles: it swells popScale bigger and back.

	type Props = { multiplier: number; pop: number; x: number; y: number; maxWidth: number; alpha: number };

	const props: Props = $props();

	const scale = $derived(1 + TALL_WILD.multiplier.popScale * Math.sin(Math.PI * props.pop));
</script>

{#if props.alpha > 0}
	<Container x={props.x} y={props.y} {scale} alpha={props.alpha}>
		<LogoText
			text={`x${props.multiplier}`}
			fontSize={TALL_WILD.multiplier.fontSize * SYMBOL_SIZE}
			maxWidth={props.maxWidth}
		/>
	</Container>
{/if}
