<script lang="ts">
	import { Container, Graphics, Text } from 'pixi-svelte';

	import RuneGlyph from './RuneGlyph.svelte';
	import { RUNES, type RuneName, type RuneOffset } from '../game/runes';
	import { signTextStyle } from '../game/signText';

	// One rune's box: in one of the ladder's compartments (see RuneTablets), the ladder drawn over it.
	type Props = {
		rune: RuneName;
		// the compartment, inside the branches
		x: number;
		y: number;
		width: number;
		height: number;
		// how far the panel reaches under the branches round it
		tuck: number;
		// the size the picture and power are laid out in, in the middle of the box: the same for all
		// the boxes, so they all look alike though the compartments differ a little
		content: { width: number; height: number };
		// still to come, behind the board now, or collected
		state: 'waiting' | 'active' | 'collected';
		// where the rune lies on the board, or lay (the picture shows it there)
		offset: RuneOffset;
		// how lit the rune's spots are on the board
		glows: number[];
		// bigger for a moment when it is collected
		scale: number;
	};

	const props: Props = $props();

	// in the content's height: its padding, the picture (in a narrow box, with the power below it) and
	// the power's size
	const PAD = 0.06;
	const NARROW_GLYPH = 0.68;
	const POWER_SIZE = 0.2;
	const NARROW_POWER_SIZE = 0.15;
	// wider than tall by this, the text beside the picture
	const WIDE = 1.6;
	// the longest word's width in its font size (MULTIPLIER, 4.43 in Germania One bold), with its
	// outline and a little to spare
	const LONGEST_WORD = 4.8;

	// the panel: dark while the rune is locked, a deep green once collected
	const LOCKED = 0x121115;
	const COLLECTED = 0x1c6a34;

	// the content's size, and where it starts in the box (its middle in the box's middle)
	const width = $derived(props.content.width);
	const height = $derived(props.content.height);
	const left = $derived((props.width - width) / 2);
	const top = $derived((props.height - height) / 2);

	const pad = $derived(height * PAD);
	const wide = $derived(width >= height * WIDE);
	const glyph = $derived(
		wide ? height - pad * 2 : Math.min(width - pad * 2, height * NARROW_GLYPH),
	);
	const textLeft = $derived(left + pad * 2 + glyph);
	const textWidth = $derived(wide ? left + width - pad - textLeft : width - pad * 2);
	const powerSize = $derived(
		Math.min(height * (wide ? POWER_SIZE : NARROW_POWER_SIZE), textWidth / LONGEST_WORD),
	);
	const dim = $derived(props.state === 'waiting' ? 0.6 : 1);
</script>

<Container
	x={props.x + props.width / 2}
	y={props.y + props.height / 2}
	pivot={{ x: props.width / 2, y: props.height / 2 }}
	scale={props.scale}
>
	<!-- the panel, reaching under the branches: dark while the rune is locked, green once collected -->
	<Graphics
		draw={(graphics) => {
			const tuck = props.tuck;
			graphics
				.rect(-tuck, -tuck, props.width + tuck * 2, props.height + tuck * 2)
				.fill({ color: props.state === 'collected' ? COLLECTED : LOCKED, alpha: 0.92 });
		}}
	/>

	<RuneGlyph
		rune={props.rune}
		size={glyph}
		x={wide ? left + pad : (props.width - glyph) / 2}
		y={top + pad}
		alpha={dim}
		offset={props.offset}
		glows={props.glows}
		flash={props.state === 'collected' ? 1 : 0}
		grid
	/>

	{#if wide}
		<Text
			x={textLeft}
			y={top + height / 2}
			anchor={{ x: 0, y: 0.5 }}
			alpha={dim}
			text={RUNES[props.rune].powerText}
			style={{
				...signTextStyle(powerSize),
				wordWrap: true,
				wordWrapWidth: textWidth,
				lineHeight: powerSize * 1.1,
			}}
		/>
	{:else}
		<Text
			x={props.width / 2}
			y={top + (pad + glyph + height) / 2}
			anchor={{ x: 0.5, y: 0.5 }}
			alpha={dim}
			text={RUNES[props.rune].powerText}
			style={{
				...signTextStyle(powerSize),
				align: 'center',
				wordWrap: true,
				wordWrapWidth: textWidth,
				lineHeight: powerSize * 1.1,
			}}
		/>
	{/if}
</Container>
