<script lang="ts">
	import { CanvasTextMetrics, TextStyle } from 'pixi.js';
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';

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
		// defaults to the theme's
		outlineAlpha?: number;
		icon?: UiIconName;
		// a sprite instead of the icon: the key of square white art, tinted `iconColor`
		sprite?: string;
		// drawn behind `sprite`: the key of the same art grown by an outline's width, and its colour
		spriteOutline?: { key: string; color: number };
		hideSpriteOutline?: boolean;
		// a word on the button instead of an icon, drawn in `iconColor`
		text?: string;
		iconColor: number;
		pressed?: boolean;
		// false: no drop shadow
		shadow?: boolean;
	};

	const props: Props = $props();
	const theme = getUiTheme();

	// a sprite's square, as a share of the circle
	const SPRITE_SIZE = 0.74;

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

<!-- themed button face: soft drop shadow, filled circle (or pill) with outline, icon or word; no
shadow under a see-through fill, where it would show through -->
<Container x={props.center.x} y={props.center.y} scale={props.pressed ? 0.94 : 1}>
	{#if !props.bare && props.shadow !== false && (props.fillAlpha ?? 1) === 1}
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
		borderAlpha={props.outlineAlpha ?? theme?.outlineAlpha}
	/>
	{#if props.text}
		<Text anchor={0.5} scale={textScale} text={props.text} style={textStyle} />
	{:else if props.sprite}
		{#if props.spriteOutline}
			<Sprite
				key={props.spriteOutline.key}
				anchor={0.5}
				width={props.diameter * SPRITE_SIZE}
				height={props.diameter * SPRITE_SIZE}
				tint={props.spriteOutline.color}
				visible={!props.hideSpriteOutline}
			/>
		{/if}
		<Sprite
			key={props.sprite}
			anchor={0.5}
			width={props.diameter * SPRITE_SIZE}
			height={props.diameter * SPRITE_SIZE}
			tint={props.iconColor}
		/>
	{:else if props.icon}
		<UiIcon
			icon={props.icon}
			size={props.diameter * 0.55}
			color={props.iconColor}
			background={(props.fillAlpha ?? 1) === 1 ? props.fill : theme?.label.panel}
		/>
	{/if}
</Container>
