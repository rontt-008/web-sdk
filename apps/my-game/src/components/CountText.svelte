<script lang="ts" module>
	import { CanvasTextMetrics, TextStyle, type TextStyleOptions } from 'pixi.js';

	const DIGITS = '0123456789';
	const advancesCache = new Map<
		string,
		{ stroke: number; advance: (char: string) => number }
	>();

	// How far each character moves the next one along, without the outline (which Pixi measures as
	// one stroke width on top of the glyph): the digits all as far as the widest, as tabular figures.
	const advancesFor = (style: TextStyleOptions) => {
		const stroke = (style.stroke as { width?: number } | undefined)?.width ?? 0;
		const key = `${style.fontFamily ?? ''}:${style.fontSize ?? ''}:${stroke}`;
		const cached = advancesCache.get(key);
		if (cached) return cached;

		const textStyle = new TextStyle(style);
		const measure = (char: string) => CanvasTextMetrics.measureText(char, textStyle).width - stroke;
		const digit = Math.max(...[...DIGITS].map(measure));
		const cache = new Map<string, number>();
		const entry = {
			stroke,
			advance: (char: string) => {
				if (DIGITS.includes(char)) return digit;
				if (!cache.has(char)) cache.set(char, measure(char));
				return cache.get(char)!;
			},
		};
		advancesCache.set(key, entry);
		return entry;
	};

	// how wide an amount is drawn by CountText in this style, outline included
	export const countTextWidth = (text: string, style: TextStyleOptions) => {
		const { stroke, advance } = advancesFor(style);
		return [...text].reduce((width, char) => width + advance(char), 0) + stroke;
	};
</script>

<script lang="ts">
	import { Container, Text } from 'pixi-svelte';

	type Props = {
		text: string;
		style: TextStyleOptions;
		// as a Text's anchor: which point of the amount sits on (0, 0)
		anchor?: { x: number; y: number };
		// laid out as wide as this text (the amount it counts up to), its characters to the right:
		// a digit it gains while counting comes in on the left, and the rest stay where they are
		fitText?: string;
	};

	const props: Props = $props();

	// A counting amount, drawn a character at a time with every digit as wide as the widest, so it
	// keeps its width (and its edges their place) while it counts rather than shifting every time a
	// digit changes; and a changed digit only swaps to its character's texture, kept from before,
	// rather than the whole text being drawn again each frame. All the outlines go under all the
	// fills, as in one text, so no character's outline covers the next one.
	const anchor = $derived(props.anchor ?? { x: 0.5, y: 0.5 });
	const layout = $derived(advancesFor(props.style));
	// the outlines alone and the fills alone, measuring the same as the style, so they line up
	const outlineStyle = $derived({ ...props.style, fill: { color: 0x000000, alpha: 0 } });
	const fillStyle = $derived({
		...props.style,
		stroke: { ...(props.style.stroke as object), alpha: 0 },
	});
	const widthOf = (text: string) =>
		[...text].reduce((sum, char) => sum + layout.advance(char), 0) + layout.stroke;
	const textWidth = $derived(widthOf(props.text));
	// the width it's laid out in, the text at its right
	const width = $derived(Math.max(textWidth, props.fitText ? widthOf(props.fitText) : 0));
	// each character's middle, from the left edge of that width
	const chars = $derived.by(() => {
		let x = width - textWidth + layout.stroke / 2;
		return [...props.text].map((char) => {
			const advance = layout.advance(char);
			const middle = x + advance / 2;
			x += advance;
			return { char, middle };
		});
	});
</script>

<Container x={-width * anchor.x}>
	{#each [outlineStyle, fillStyle] as style}
		{#each chars as { char, middle }}
			<Text text={char} {style} x={middle} anchor={{ x: 0.5, y: anchor.y }} />
		{/each}
		<!-- Every digit, drawn at no size: Pixi frees a character's texture as soon as no text uses
		     it, so without these a digit gone for a frame would be drawn again when it came back. -->
		{#each DIGITS as digit}
			<Text text={digit} {style} scale={0} />
		{/each}
	{/each}
</Container>
