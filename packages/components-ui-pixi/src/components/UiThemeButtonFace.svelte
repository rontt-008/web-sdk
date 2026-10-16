<script lang="ts">
	import { CanvasTextMetrics, TextStyle } from 'pixi.js';
	import { Container, Rectangle, Text } from 'pixi-svelte';

	import UiIcon, { type UiIconName } from './UiIcon.svelte';
	import { getUiTheme } from '../theme';

	type Props = {
		center: { x: number; y: number };
		diameter: number;
		// wider than `diameter` for a pill
		width?: number;
		// defaults to round ends
		cornerRadius?: number;
		// no shadow or outline: the icon alone, for a button on a panel (its circle, even when fully
		// transparent, is what the pointer hits)
		bare?: boolean;
		fill: number;
		fillAlpha?: number;
		outline: number;
		outlineWidth: number;
		icon?: UiIconName;
		// a word on the button instead of an icon, drawn in `iconColor`
		text?: string;
		iconColor: number;
		pressed?: boolean;
	};

	const props: Props = $props();
	const theme = getUiTheme();

	const width = $derived(props.width ?? props.diameter);
	const cornerRadius = $derived(props.cornerRadius ?? props.diameter * 0.5);

	const textStyle = $derived({
		fontFamily: theme?.fontFamily,
		fontSize: props.diameter * 0.28,
		fontWeight: '800',
		letterSpacing: 1,
		fill: props.iconColor,
	} as const);
	// longer words, like a translation, shrink to stay inside the button's rounded ends
	const textScale = $derived(
		props.text
			? Math.min(
					1,
					(width - props.diameter * 0.35) /
						Math.max(1, CanvasTextMetrics.measureText(props.text, new TextStyle(textStyle)).width),
				)
			: 1,
	);
</script>

<!-- themed button face: soft drop shadow, filled circle (or pill) with outline, icon or word -->
<Container x={props.center.x} y={props.center.y} scale={props.pressed ? 0.94 : 1}>
	{#if !props.bare}
		<Rectangle
			anchor={0.5}
			y={props.diameter * 0.05}
			{width}
			height={props.diameter}
			borderRadius={cornerRadius}
			backgroundColor={0x000000}
			backgroundAlpha={0.25}
		/>
	{/if}
	<Rectangle
		anchor={0.5}
		{width}
		height={props.diameter}
		borderRadius={cornerRadius}
		backgroundColor={props.fill}
		backgroundAlpha={props.fillAlpha}
		borderColor={props.outline}
		borderWidth={props.bare ? 0 : props.outlineWidth}
		borderAlpha={theme?.outlineAlpha}
	/>
	{#if props.text}
		<Text anchor={0.5} scale={textScale} text={props.text} style={textStyle} />
	{:else if props.icon}
		<UiIcon
			icon={props.icon}
			size={props.diameter * 0.55}
			color={props.iconColor}
			background={(props.fillAlpha ?? 1) === 1 ? props.fill : theme?.label.panel}
		/>
	{/if}
</Container>
