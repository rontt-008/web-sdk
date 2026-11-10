<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Container, Graphics, Text, type Sizes } from 'pixi-svelte';
	import { ResponsiveText } from 'components-pixi';

	import { getContext } from '../game/context';
	import { PRINT_COLOURS, drawChecker, drawPaper, printResolution, printStyle } from '../game/print';

	// A slip of the printed paper (print.ts) just big enough for its words, drawn round its middle: the
	// words in bold ink (or red), and with them, as asked for:
	// - `mark`: a square at its left end, ink (or red) with the mark in the paper's cream, like a move's
	//   sign in a chess book: + for a check, # for a mate, ½ for a draw
	// - `label`: a small line in red over the words
	// - `band`: two rows of chessboard squares along its top and its foot
	// The words over the board (MoveLabel), a small win (Win) and a capture's pay on its square
	// (MoveWinAmounts).
	type Props = {
		text: string;
		// the words' font size; everything else follows
		size: number;
		tone?: 'ink' | 'red';
		mark?: string;
		label?: string;
		band?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const resolution = $derived(printResolution(context.stateLayoutDerived.mainLayout().scale));

	let textSizes = $state<Sizes>({ width: 0, height: 0 });
	let labelSizes = $state<Sizes>({ width: 0, height: 0 });

	const size = $derived(props.size);
	const colour = $derived(props.tone === 'red' ? PRINT_COLOURS.red : PRINT_COLOURS.ink);
	const border = $derived(Math.max(1.5, size * 0.06));
	const pad = $derived({ x: size * 0.62, y: size * 0.34 });
	const labelSize = $derived(size * 0.36);
	const labelHeight = $derived(props.label ? labelSize * 1.5 : 0);
	// the band's squares: about a seventh of the words' size, a whole number of them across, two rows
	const inner = $derived(Math.max(textSizes.width, labelSizes.width) + pad.x * 2);
	const bodyHeight = $derived(size * 1.16 + labelHeight + pad.y * 2);
	const box = $derived(props.mark ? bodyHeight : 0);
	const width = $derived(box + inner + border * 2);
	const BAND_ROWS = 2;
	const cols = $derived(Math.max(4, Math.round((width - border * 2) / (size * 0.15))));
	const cell = $derived((width - border * 2) / cols);
	const bandHeight = $derived(props.band ? cell * BAND_ROWS : 0);
	const height = $derived(bodyHeight + bandHeight * 2 + border * 2);

	const draw = (graphics: PIXI.Graphics) => {
		drawPaper(graphics, { x: -width / 2, y: -height / 2, width, height, offset: size * 0.14, border });
		if (props.band) {
			drawChecker(graphics, { x: -width / 2 + border, y: -height / 2 + border, cols, rows: BAND_ROWS, cell });
			drawChecker(graphics, {
				x: -width / 2 + border,
				y: height / 2 - border - bandHeight,
				cols,
				rows: BAND_ROWS,
				cell,
				dark: false,
			});
		}
		if (props.mark) {
			graphics.rect(-width / 2 + border, -bodyHeight / 2, box, bodyHeight).fill(colour);
		}
	};

	// the words' middle: right of the mark's square, under the label
	const textX = $derived(-width / 2 + border + box + inner / 2);
</script>

<Graphics {draw} />
{#if props.mark}
	<Container x={-width / 2 + border + box / 2} y={-size * 0.03}>
		<ResponsiveText
			anchor={0.5}
			text={props.mark}
			maxWidth={box * 0.78}
			{resolution}
			style={printStyle(size * 0.95, PRINT_COLOURS.paper, { bold: true })}
		/>
	</Container>
{/if}
{#if props.label}
	<Text
		anchor={0.5}
		x={textX + (labelSize * 0.4) / 2}
		y={-bodyHeight / 2 + pad.y + labelSize * 0.55}
		text={props.label}
		{resolution}
		style={printStyle(labelSize, PRINT_COLOURS.red, { bold: true, spacing: 0.4 })}
		onresize={(sizes) => (labelSizes = sizes)}
	/>
{/if}
<!-- (the letter spacing comes after the last letter too: half of it back) -->
<Text
	anchor={0.5}
	x={textX + size * 0.03}
	y={labelHeight / 2 - size * 0.03}
	text={props.text}
	{resolution}
	style={printStyle(size, colour, { bold: true, spacing: 0.06 })}
	onresize={(sizes) => (textSizes = sizes)}
/>
