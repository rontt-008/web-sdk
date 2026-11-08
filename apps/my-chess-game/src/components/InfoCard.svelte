<script lang="ts" module>
	// A start screen card's height to its width
	export const INFO_CARD = { aspect: 1.385 };

	// the cards' colours: cream paper, ink, the red of the accents, and the small print
	export const CARD_COLOURS = {
		paper: 0xf7f2e6,
		ink: 0x1d1915,
		red: 0x8b2e22,
		caption: 0x4a443c,
	};
</script>

<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import type { Snippet } from 'svelte';
	import { Container, Graphics } from 'pixi-svelte';

	type Props = {
		// its middle
		x: number;
		y: number;
		// its height follows, keeping its shape
		width: number;
		alpha?: number;
		scale?: number;
		// what is on it, laid out in its size from its top left corner
		children?: Snippet<[{ width: number; height: number }]>;
	};

	const props: Props = $props();

	// A start screen card, flat like a printed one: cream paper with a thin ink border, and a solid ink
	// shadow straight below and right of it.
	const width = $derived(props.width);
	const height = $derived(props.width * INFO_CARD.aspect);

	const draw = (graphics: PIXI.Graphics) => {
		const w = width;
		const h = height;
		const offset = w * 0.022;
		const border = Math.max(1.5, w * 0.0066);
		graphics
			.rect(offset, offset, w, h)
			.fill(CARD_COLOURS.ink)
			.rect(0, 0, w, h)
			.fill(CARD_COLOURS.paper)
			.stroke({ color: CARD_COLOURS.ink, width: border, alignment: 1 });
	};
</script>

<Container
	x={props.x}
	y={props.y}
	pivot={{ x: width / 2, y: height / 2 }}
	alpha={props.alpha ?? 1}
	scale={props.scale ?? 1}
>
	<Graphics {draw} />
	{#if props.children}
		{@render props.children({ width, height })}
	{/if}
</Container>
