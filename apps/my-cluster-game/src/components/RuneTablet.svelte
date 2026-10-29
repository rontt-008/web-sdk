<script lang="ts" module>
	// The frame round each box (static/assets/rune-box-frame.webp, from art-source/rune-box-frame.py),
	// in its pixels: its size, the inner edges of its branches, their outer edges (the twigs and post
	// ends reach past them), and where it is cut into nine (the corners hold the posts' crossings and
	// the vines round them; the branches between stretch).
	export const RUNE_BOX_FRAME = {
		width: 1298,
		height: 723,
		opening: { left: 96, top: 84, right: 1196, bottom: 641 },
		outer: { left: 42, top: 49, right: 1268, bottom: 677 },
		slices: { left: 200, top: 190, right: 230, bottom: 170 },
	};

	// the frame drawn as big as its two ways fit the box between them (the branches stretch the rest)
	export const runeBoxFrameScale = (width: number, height: number) =>
		Math.sqrt((width / RUNE_BOX_FRAME.width) * (height / RUNE_BOX_FRAME.height));
</script>

<script lang="ts">
	import { Container, Graphics, Text } from 'pixi-svelte';

	import NineSliceSprite from './NineSliceSprite.svelte';
	import RuneGlyph from './RuneGlyph.svelte';
	import { RUNES, type RuneName, type RuneOffset } from '../game/runes';
	import { uiTheme } from '../game/uiTheme';

	type Props = {
		rune: RuneName;
		x: number;
		y: number;
		width: number;
		height: number;
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

	// the panel's reach under the branches, in the frame's pixels (they are about 40 to 55 thick)
	const TUCK = 18;
	// in the opening's height: its padding, the rune's power beside the picture (below it in a narrow
	// box)
	const PAD = 0.1;
	const POWER_SIZE = 0.2;
	const NARROW_POWER_SIZE = 0.14;
	// wider than tall by this, the text beside the picture
	const WIDE = 1.6;
	// a word's width in its font size, about, for the longest (PREMIUMS)
	const LONGEST_WORD = 5.2;

	// the panel: dark while the rune is locked, a deep green once collected
	const LOCKED = 0x121115;
	const COLLECTED = 0x1c6a34;
	const WHITE = 0xffffff;

	// the frame's size, and its opening in the box, where everything else goes
	const frameScale = $derived(runeBoxFrameScale(props.width, props.height));
	const opening = $derived.by(() => {
		const { width, height, opening } = RUNE_BOX_FRAME;
		const left = opening.left * frameScale;
		const top = opening.top * frameScale;
		return {
			x: left,
			y: top,
			width: props.width - left - (width - opening.right) * frameScale,
			height: props.height - top - (height - opening.bottom) * frameScale,
		};
	});

	const pad = $derived(opening.height * PAD);
	const wide = $derived(opening.width >= opening.height * WIDE);
	const glyph = $derived(
		wide
			? opening.height - pad * 2
			: Math.min(opening.width - pad * 2, opening.height * 0.62),
	);
	const textLeft = $derived(opening.x + pad * 2 + glyph);
	const textWidth = $derived(
		wide ? opening.x + opening.width - pad - textLeft : opening.width - pad * 2,
	);
	const powerSize = $derived(
		Math.min(opening.height * (wide ? POWER_SIZE : NARROW_POWER_SIZE), textWidth / LONGEST_WORD),
	);
	const dim = $derived(props.state === 'waiting' ? 0.6 : 1);
</script>

<Container
	x={props.x + props.width / 2}
	y={props.y + props.height / 2}
	pivot={{ x: props.width / 2, y: props.height / 2 }}
	scale={props.scale}
>
	<!-- the panel in the opening, reaching under the branches: dark while the rune is locked, green
	once collected -->
	<Graphics
		draw={(graphics) => {
			const tuck = TUCK * frameScale;
			graphics
				.rect(opening.x - tuck, opening.y - tuck, opening.width + tuck * 2, opening.height + tuck * 2)
				.fill({ color: props.state === 'collected' ? COLLECTED : LOCKED, alpha: 0.92 });
		}}
	/>

	<!-- the frame, cut into nine and drawn at frameScale so only its branches stretch to the box -->
	<Container scale={frameScale}>
		<NineSliceSprite
			key="runeBoxFrame"
			width={props.width / frameScale}
			height={props.height / frameScale}
			leftWidth={RUNE_BOX_FRAME.slices.left}
			topHeight={RUNE_BOX_FRAME.slices.top}
			rightWidth={RUNE_BOX_FRAME.slices.right}
			bottomHeight={RUNE_BOX_FRAME.slices.bottom}
		/>
	</Container>

	<RuneGlyph
		rune={props.rune}
		size={glyph}
		x={wide ? opening.x + pad : opening.x + (opening.width - glyph) / 2}
		y={opening.y + pad}
		alpha={dim}
		offset={props.offset}
		glows={props.glows}
		flash={props.state === 'collected' ? 1 : 0}
		grid
	/>

	{#if wide}
		<Text
			x={textLeft}
			y={opening.y + opening.height / 2}
			anchor={{ x: 0, y: 0.5 }}
			alpha={dim}
			text={RUNES[props.rune].powerText}
			style={{
				fontFamily: uiTheme.fontFamily,
				fontSize: powerSize,
				fontWeight: '800',
				fill: WHITE,
				wordWrap: true,
				wordWrapWidth: textWidth,
				lineHeight: powerSize * 1.05,
			}}
		/>
	{:else}
		<Text
			x={opening.x + opening.width / 2}
			y={opening.y + (pad + glyph + opening.height) / 2}
			anchor={{ x: 0.5, y: 0.5 }}
			alpha={dim}
			text={RUNES[props.rune].powerText}
			style={{
				fontFamily: uiTheme.fontFamily,
				fontSize: powerSize,
				fontWeight: '800',
				fill: WHITE,
				align: 'center',
				wordWrap: true,
				wordWrapWidth: textWidth,
				lineHeight: powerSize * 1.05,
			}}
		/>
	{/if}
</Container>
