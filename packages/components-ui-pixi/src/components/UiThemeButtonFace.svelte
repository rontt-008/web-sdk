<script lang="ts">
	import { Container, Rectangle } from 'pixi-svelte';

	import UiIcon, { type UiIconName } from './UiIcon.svelte';
	import { getUiTheme } from '../theme';

	type Props = {
		center: { x: number; y: number };
		diameter: number;
		fill: number;
		outline: number;
		outlineWidth: number;
		icon?: UiIconName;
		iconColor: number;
		pressed?: boolean;
	};

	const props: Props = $props();
	const theme = getUiTheme();
</script>

<!-- round button face for themed UIs: soft drop shadow, filled circle with outline, icon -->
<Container x={props.center.x} y={props.center.y} scale={props.pressed ? 0.94 : 1}>
	<Rectangle
		anchor={0.5}
		y={props.diameter * 0.05}
		width={props.diameter}
		height={props.diameter}
		borderRadius={props.diameter * 0.5}
		backgroundColor={0x000000}
		backgroundAlpha={0.25}
	/>
	<Rectangle
		anchor={0.5}
		width={props.diameter}
		height={props.diameter}
		borderRadius={props.diameter * 0.5}
		backgroundColor={props.fill}
		borderColor={props.outline}
		borderWidth={props.outlineWidth}
		borderAlpha={theme?.outlineAlpha}
	/>
	{#if props.icon}
		<UiIcon
			icon={props.icon}
			size={props.diameter * 0.55}
			color={props.iconColor}
			background={props.fill}
		/>
	{/if}
</Container>
