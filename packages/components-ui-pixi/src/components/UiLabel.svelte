<script lang="ts">
	import { Rectangle, Text } from 'pixi-svelte';
	import { measureTextWidth as textWidth } from 'components-pixi';
	import { UI_FONT_FAMILY } from 'constants-shared/fonts';
	import { WHITE } from 'constants-shared/colors';

	import UiSprite from './UiSprite.svelte';
	import { UI_BASE_FONT_SIZE, UI_THEMED_LABEL_SIZES } from '../constants';
	import { getPanelCornerRadius, getUiTheme } from '../theme';
	import type { UiLabelOptions } from '../types';

	type Props = UiLabelOptions & {
		label: string;
		value: string;
		tiled?: boolean;
		// with a theme: the value in this colour instead of the theme's (like a win in its own colour)
		valueColor?: number;
	};

	const props: Props = $props();
	const theme = getUiTheme();

	// with the theme's hard shadow (see UiTheme.shadow): text casts one straight down, this share of
	// its size
	const TEXT_SHADOW_DROP = 0.1;
	const textShadow = (fontSize: number) =>
		theme?.shadow
			? {
					dropShadow: {
						color: theme.shadow.color,
						alpha: 1,
						angle: Math.PI / 2,
						blur: 0,
						distance: fontSize * TEXT_SHADOW_DROP,
					},
				}
			: {};

	const labelStyle = {
		fontFamily: UI_FONT_FAMILY,
		fontSize: UI_BASE_FONT_SIZE,
		fill: WHITE,
	} as const;

	const valueStyle = {
		fontFamily: UI_FONT_FAMILY,
		fontSize: UI_BASE_FONT_SIZE,
		fill: WHITE,
	} as const;

	// themed: a soft pill with a small label over a bold value
	const PILL_WIDTH = UI_THEMED_LABEL_SIZES.width;
	const PILL_HEIGHT = UI_THEMED_LABEL_SIZES.height;
	const themedLabelStyle = $derived({
		fontFamily: theme?.fontFamily,
		fontSize: UI_BASE_FONT_SIZE * 0.55,
		fontWeight: '700',
		letterSpacing: 3,
		fill: theme?.label.label,
		...textShadow(UI_BASE_FONT_SIZE * 0.55),
	} as const);
	const themedValueStyle = $derived({
		fontFamily: theme?.fontFamily,
		fontSize: UI_BASE_FONT_SIZE * 0.95,
		fontWeight: '800',
		fill: props.valueColor ?? theme?.label.value,
		...textShadow(UI_BASE_FONT_SIZE * 0.95),
	} as const);

	// long values, like MX$1,234,567.89 or a big balance, shrink to stay inside the pill: stacked
	// they get the pill's width, in a row what the label leaves of it, plain the box's width
	const valueRoom = $derived.by(() => {
		if (props.plain) return props.plain.width;
		if (props.stacked) return PILL_WIDTH - UI_BASE_FONT_SIZE;
		return UI_BASE_FONT_SIZE * 9.6 - textWidth(props.label, themedLabelStyle);
	});
	const valueScale = $derived(
		Math.min(1, valueRoom / Math.max(1, textWidth(props.value, themedValueStyle))),
	);
	// plain, a long label (like a bet mode's name over the bet) shrinks too
	const labelScale = $derived(
		props.plain
			? Math.min(1, props.plain.width / Math.max(1, textWidth(props.label, themedLabelStyle)))
			: 1,
	);

	// plain and outlined (on the game's art): the label and the value in an outline of the panel's
	// colour this wide
	const OUTLINE_WIDTH = { label: 5, value: 7 };
	const outlined = <Style extends object>(style: Style, width: number) =>
		props.plain?.outline && theme
			? { ...style, stroke: { color: theme.label.panel, width, join: 'round' as const } }
			: style;
	const ALIGN_ANCHOR_X = { left: 0, center: 0.5, right: 1 };
</script>

{#if theme}
	{#if props.plain}
		{@const anchorX = ALIGN_ANCHOR_X[props.plain.align]}
		<Text
			anchor={{ x: anchorX, y: 1 }}
			y={-UI_BASE_FONT_SIZE * 0.12}
			scale={labelScale}
			text={props.label}
			style={outlined(themedLabelStyle, OUTLINE_WIDTH.label)}
		/>
		<Text
			anchor={{ x: anchorX, y: 0 }}
			y={-UI_BASE_FONT_SIZE * 0.2}
			scale={valueScale}
			text={props.value}
			style={outlined(themedValueStyle, OUTLINE_WIDTH.value)}
		/>
	{:else if props.stacked}
		<Rectangle
			anchor={{ x: 0.5, y: 0 }}
			y={-UI_BASE_FONT_SIZE * 0.35}
			width={PILL_WIDTH}
			height={PILL_HEIGHT}
			borderRadius={getPanelCornerRadius(theme, PILL_HEIGHT)}
			backgroundColor={theme.label.panel}
			backgroundAlpha={theme.label.panelAlpha}
			borderColor={theme.outline}
			borderWidth={theme.outlineWidth}
			borderAlpha={theme.outlineAlpha}
		/>
		<Text anchor={{ x: 0.5, y: 0 }} text={props.label} style={themedLabelStyle} />
		<Text
			anchor={{ x: 0.5, y: 0 }}
			y={UI_BASE_FONT_SIZE * 0.6}
			scale={valueScale}
			text={props.value}
			style={themedValueStyle}
		/>
	{:else}
		<Rectangle
			x={-UI_BASE_FONT_SIZE * 0.8}
			anchor={{ x: 0, y: 0.5 }}
			width={UI_BASE_FONT_SIZE * 11.6}
			height={PILL_HEIGHT * 0.75}
			borderRadius={getPanelCornerRadius(theme, PILL_HEIGHT * 0.75)}
			backgroundColor={theme.label.panel}
			backgroundAlpha={theme.label.panelAlpha}
			borderColor={theme.outline}
			borderWidth={theme.outlineWidth}
			borderAlpha={theme.outlineAlpha}
		/>
		<Text anchor={{ x: 0, y: 0.5 }} text={props.label} style={themedLabelStyle} />
		<Text
			anchor={{ x: 1, y: 0.5 }}
			x={UI_BASE_FONT_SIZE * 10}
			scale={valueScale}
			text={props.value}
			style={themedValueStyle}
		/>
	{/if}
{:else if props.stacked}
	{#if props.tiled}
		<UiSprite
			y={-20}
			anchor={{ x: 0.5, y: 0 }}
			key="base_ticker"
			width={UI_BASE_FONT_SIZE * 3 * (326 / 73)}
			height={UI_BASE_FONT_SIZE * 3}
			borderRadius={35}
		/>
	{/if}
	<Text anchor={{ x: 0.5, y: 0 }} text={props.label} style={labelStyle} />
	<Text anchor={{ x: 0.5, y: 0 }} text={props.value} style={valueStyle} y={UI_BASE_FONT_SIZE} />
{:else}
	{#if props.tiled}
		<UiSprite
			x={-90}
			anchor={{ x: 0, y: 0.5 }}
			key="base_ticker"
			width={UI_BASE_FONT_SIZE * 3 * (326 / 73)}
			height={UI_BASE_FONT_SIZE * 3}
			borderRadius={35}
		/>
	{/if}
	<Text anchor={{ x: 0, y: 0.5 }} text={props.label} style={labelStyle} />
	<Text
		anchor={{ x: 1, y: 0.5 }}
		x={UI_BASE_FONT_SIZE * 10}
		text={props.value}
		style={valueStyle}
	/>
{/if}
