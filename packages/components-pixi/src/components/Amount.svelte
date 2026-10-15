<script lang="ts" module>
	import {
		REM,
		Text,
		Container,
		Rectangle,
		anchorToPivot,
		type PixiPoint,
		type TextProps,
		type ContainerProps,
	} from 'pixi-svelte';

	export type Props = Omit<ContainerProps, 'children' | 'pivot'> & {
		amount: number;
		amountStyle?: TextProps['style'];
		anchor?: PixiPoint;
		label?: string;
		centerLabel?: boolean;
		labelStyle?: TextProps['style'];
		stacked?: boolean;
		disabled?: boolean;
		debug?: boolean;
	};
</script>

<script lang="ts">
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { UI_FONT_FAMILY } from 'constants-shared/fonts';
	import { GREY, WHITE } from 'constants-shared/colors';

	const {
		amount,
		amountStyle = {},
		anchor,
		label,
		centerLabel,
		labelStyle = {},
		stacked,
		disabled,
		debug,
		...containerProps
	}: Props = $props();

	let labelTextSizes = $state({ width: 0, height: 0 });
	let amountTextSizes = $state({ width: 0, height: 0 });

	const gap = $derived(label ? 0.25 * amountTextSizes.height : 0);
	const componentSizes = $derived({
		width: stacked
			? Math.max(labelTextSizes.width, amountTextSizes.width)
			: labelTextSizes.width + gap + amountTextSizes.width,
		height: stacked
			? labelTextSizes.height + amountTextSizes.height
			: Math.max(labelTextSizes.height, amountTextSizes.height),
	});
</script>

<Container {...containerProps} pivot={anchorToPivot({ anchor, sizes: componentSizes })}>
	{#if debug}
		<Rectangle
			width={componentSizes.width}
			height={componentSizes.height}
			alpha={0.5}
			borderWidth={2}
			borderColor={0xffffff}
		/>
	{/if}
	{#if label}
		<Text
			x={centerLabel ? componentSizes.width * 0.5 : 0}
			anchor={{ x: centerLabel ? 0.5 : 0, y: 0.5 }}
			y={stacked ? labelTextSizes.height * 0.5 : amountTextSizes.height * 0.5}
			text={label}
			style={{
				fontFamily: UI_FONT_FAMILY,
				fontSize: REM,
				fontWeight: '600',
				fill: disabled ? GREY : WHITE,
				...labelStyle,
			}}
			onresize={(value) => (labelTextSizes = value)}
		/>
	{/if}
	<Text
		x={stacked ? (centerLabel ? componentSizes.width * 0.5 : 0) : labelTextSizes.width + gap}
		y={stacked ? labelTextSizes.height : 0}
		anchor={{ x: centerLabel ? 0.5 : 0, y: 0 }}
		text={numberToCurrencyString(amount)}
		style={{
			fontFamily: UI_FONT_FAMILY,
			fontSize: REM,
			fontWeight: '600',
			fill: disabled ? GREY : amountStyle.fill === undefined ? WHITE : amountStyle.fill,
			...amountStyle,
		}}
		onresize={(value) => (amountTextSizes = value)}
	/>
</Container>
