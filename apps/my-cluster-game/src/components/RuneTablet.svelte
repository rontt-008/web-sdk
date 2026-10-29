<script lang="ts">
	import { Container, Graphics, Text } from 'pixi-svelte';

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

	// in the box's height: its padding, outline and corners, the rune's power beside the picture
	// (below it in a narrow box), and the tick of a collected one
	const PAD = 0.1;
	const OUTLINE = 0.03;
	const CORNER = 0.12;
	const POWER_SIZE = 0.2;
	const NARROW_POWER_SIZE = 0.14;
	const TICK_RADIUS = 0.13;
	// wider than tall by this, the text beside the picture
	const WIDE = 1.6;
	// a word's width in its font size, about, for the longest (PREMIUMS)
	const LONGEST_WORD = 5.2;

	const PANEL = 0x232227;
	const OUTLINE_COLOR = 0x0a0a0c;
	const ACTIVE = 0xb8b4c6;
	const COLLECTED = 0x5cf08a;
	const TICK = 0x2f8f4e;
	const WHITE = 0xffffff;

	const pad = $derived(props.height * PAD);
	const wide = $derived(props.width >= props.height * WIDE);
	const glyph = $derived(
		wide
			? props.height - pad * 2
			: Math.min(props.width - pad * 2, props.height * 0.62),
	);
	const textLeft = $derived(pad * 2 + glyph);
	const textWidth = $derived(wide ? props.width - textLeft - pad : props.width - pad * 2);
	const powerSize = $derived(
		Math.min(props.height * (wide ? POWER_SIZE : NARROW_POWER_SIZE), textWidth / LONGEST_WORD),
	);
	const dim = $derived(props.state === 'waiting' ? 0.6 : 1);
</script>

<Container
	x={props.x + props.width / 2}
	y={props.y + props.height / 2}
	pivot={{ x: props.width / 2, y: props.height / 2 }}
	scale={props.scale}
>
	<Graphics
		draw={(graphics) => {
			const outline = props.height * OUTLINE;
			graphics
				.roundRect(0, 0, props.width, props.height, props.height * CORNER)
				.fill({ color: PANEL, alpha: 0.92 })
				.stroke({
					width: outline,
					color:
						props.state === 'collected'
							? COLLECTED
							: props.state === 'active'
								? ACTIVE
								: OUTLINE_COLOR,
				});
		}}
	/>

	<RuneGlyph
		rune={props.rune}
		size={glyph}
		x={wide ? pad : (props.width - glyph) / 2}
		y={pad}
		alpha={dim}
		offset={props.offset}
		glows={props.glows}
		flash={props.state === 'collected' ? 1 : 0}
		grid
	/>

	{#if wide}
		<Text
			x={textLeft}
			y={props.height / 2}
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
			x={props.width / 2}
			y={(pad + glyph + props.height) / 2}
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

	{#if props.state === 'collected'}
		<!-- a tick on the top right corner -->
		<Graphics
			x={props.width - props.height * 0.06}
			y={props.height * 0.06}
			draw={(graphics) => {
				const radius = props.height * TICK_RADIUS;
				graphics
					.circle(0, 0, radius)
					.fill({ color: TICK })
					.stroke({ width: props.height * OUTLINE, color: OUTLINE_COLOR });
				graphics
					.moveTo(-radius * 0.45, 0)
					.lineTo(-radius * 0.1, radius * 0.38)
					.lineTo(radius * 0.48, -radius * 0.35)
					.stroke({ width: radius * 0.28, color: WHITE, cap: 'round', join: 'round' });
			}}
		/>
	{/if}
</Container>
