<script lang="ts">
	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { measureTextWidth } from 'components-pixi';

	import UiIcon, { type UiIconName } from './UiIcon.svelte';
	import { getUiTheme } from '../theme';
	import { strokeTopInside } from '../draw';

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
	// with the theme's hard shadow (see UiTheme.shadow): how far down it is under the face and under
	// the icon, and how thick the highlight along the top inside is, as shares of the circle
	const SHADOW_DROP = 0.045;
	const ICON_SHADOW_DROP = 0.035;
	const HIGHLIGHT_WIDTH = 0.05;

	const solid = $derived(!props.bare && (props.fillAlpha ?? 1) === 1);

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
						Math.max(1, measureTextWidth(props.text, textStyle)),
				)
			: 1,
	);
</script>

<!-- themed button face: drop shadow (soft, or the theme's hard one), filled circle (or pill) with
outline and the theme's highlight, icon or word; no shadow under a see-through fill, where it would
show through -->
<Container x={props.center.x} y={props.center.y} scale={props.pressed ? 0.94 : 1}>
	{#if solid && props.shadow !== false}
		<Rectangle
			anchor={0.5}
			y={props.diameter * (theme?.shadow ? SHADOW_DROP : 0.05)}
			{width}
			height={props.diameter}
			borderRadius={cornerRadius}
			backgroundColor={theme?.shadow?.color ?? 0x000000}
			backgroundAlpha={theme?.shadow ? 1 : 0.25}
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
	{#if solid && theme?.shadow?.highlight}
		{@const highlight = theme.shadow.highlight}
		{@const lineWidth = props.diameter * HIGHLIGHT_WIDTH}
		<Graphics
			draw={(graphics) =>
				strokeTopInside(graphics, {
					width,
					height: props.diameter,
					radius: cornerRadius,
					inset: props.outlineWidth * 0.5 + lineWidth * 0.5,
					lineWidth,
					color: highlight.color,
					alpha: highlight.alpha,
				})}
		/>
	{/if}
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
		{#if theme?.shadow && !props.bare}
			<UiIcon
				icon={props.icon}
				y={props.diameter * ICON_SHADOW_DROP}
				size={props.diameter * 0.55}
				color={theme.shadow.color}
				background={theme.shadow.color}
			/>
		{/if}
		<UiIcon
			icon={props.icon}
			size={props.diameter * 0.55}
			color={props.iconColor}
			background={(props.fillAlpha ?? 1) === 1 ? props.fill : theme?.label.panel}
		/>
	{/if}
</Container>
