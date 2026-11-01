<script lang="ts">
	import { Container, Graphics, Text } from 'pixi-svelte';

	import RuneGlyph from './RuneGlyph.svelte';
	import { RUNES, RUNE_COLOURS, type RuneName, type RuneOffset } from '../game/runes';
	import { signTextStyle } from '../game/signText';
	import { getContext } from '../game/context';

	const context = getContext();

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
	const NARROW_GLYPH = 0.6;
	const POWER_SIZE = 0.26;
	const NARROW_POWER_SIZE = 0.21;
	// wider than tall by this, the text beside the picture
	const WIDE = 1.6;
	// the longest word's and the longest power's widths in their font size (MULTIPLIER 4.43, ONLY
	// PREMIUMS 6.26 in Germania One bold), with the outline and a little to spare, and the lines'
	// height
	const LONGEST_WORD = 4.8;
	const LONGEST_LINE = 6.5;
	const LINE_HEIGHT = 1.1;

	// the panel: dark while the rune is locked, a deep shade of the rune's colour once collected
	const LOCKED = 0x121115;

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
	// beside the picture, as big as fits, on more lines if need be; under it, on one line as big as
	// fits (not wrapped: sized to fit, the text measures a hair wider when wrapping), or on two where
	// that is bigger (narrow boxes, lying down on phones)
	const power = $derived.by(() => {
		if (wide) return { size: Math.min(height * POWER_SIZE, textWidth / LONGEST_WORD), wrap: true };
		const room = height - pad * 2 - glyph;
		const oneLine = Math.min(room / LINE_HEIGHT, textWidth / LONGEST_LINE);
		const twoLines = Math.min(room / (LINE_HEIGHT * 2), textWidth / LONGEST_WORD);
		return {
			size: Math.min(height * NARROW_POWER_SIZE, Math.max(oneLine, twoLines)),
			wrap: twoLines > oneLine,
		};
	});
	const powerSize = $derived(power.size);
	const dim = $derived(props.state === 'waiting' ? 0.6 : 1);
</script>

<Container
	x={props.x + props.width / 2}
	y={props.y + props.height / 2}
	pivot={{ x: props.width / 2, y: props.height / 2 }}
	scale={props.scale}
>
	<!-- the panel, reaching under the branches: dark while the rune is locked, its colour once collected -->
	<Graphics
		draw={(graphics) => {
			const tuck = props.tuck;
			const collected = RUNE_COLOURS[props.rune].collected;
			graphics
				.rect(-tuck, -tuck, props.width + tuck * 2, props.height + tuck * 2)
				.fill({ color: props.state === 'collected' ? collected : LOCKED, alpha: 0.92 });
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
			text={RUNES[props.rune].powerText(context.stateGame.bonusType)}
			style={{
				...signTextStyle(powerSize),
				wordWrap: true,
				wordWrapWidth: textWidth,
				lineHeight: powerSize * LINE_HEIGHT,
			}}
		/>
	{:else}
		<Text
			x={props.width / 2}
			y={top + (pad + glyph + height) / 2}
			anchor={{ x: 0.5, y: 0.5 }}
			alpha={dim}
			text={RUNES[props.rune].powerText(context.stateGame.bonusType)}
			style={{
				...signTextStyle(powerSize),
				align: 'center',
				wordWrap: power.wrap,
				wordWrapWidth: textWidth,
				lineHeight: powerSize * LINE_HEIGHT,
			}}
		/>
	{/if}
</Container>
