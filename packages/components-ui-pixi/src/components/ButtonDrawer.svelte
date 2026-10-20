<script lang="ts">
	import { cubicInOut } from 'svelte/easing';

	import { stateUi } from 'state-shared';
	import { Container, Text } from 'pixi-svelte';
	import { UI_FONT_FAMILY } from 'constants-shared/fonts';
	import { Button, type ButtonProps } from 'components-pixi';

	import UiIcon from './UiIcon.svelte';
	import UiSprite from './UiSprite.svelte';
	import UiThemeButtonFace from './UiThemeButtonFace.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from '../constants';
	import { getContext } from '../context';
	import { getUiTheme } from '../theme';
	import { Tween } from 'svelte/motion';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();
	const theme = getUiTheme();
	// themed, it is a round button like the buy bonus button: the same size, fill and ring
	const sizes = theme
		? { width: UI_BASE_SIZE * theme.button.scale, height: UI_BASE_SIZE * theme.button.scale }
		: { width: UI_BASE_SIZE, height: UI_BASE_SIZE };

	const degreesToRads = (degrees: number) => (degrees * Math.PI) / 180.0;

	const DRAWER_ROTATION = {
		up: degreesToRads(-180),
		down: degreesToRads(0),
	};

	const rotationTween = new Tween(stateUi.drawerFold ? DRAWER_ROTATION.up : DRAWER_ROTATION.down, {
		easing: cubicInOut,
	});

	let moving = $state(false);
	const disabled = $derived(props.disabled || moving);

	const onpress = async () => {
		if (stateUi.drawerFold) {
			await context.eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		} else {
			await context.eventEmitter.broadcastAsync({ type: 'drawerFold' });
		}
	};

	context.eventEmitter.subscribeOnMount({
		drawerUnfold: async () => {
			if (stateUi.drawerFold) {
				moving = true;
				await rotationTween.set(DRAWER_ROTATION.down);
				stateUi.drawerFold = false;
				moving = false;
			}
		},
		drawerFold: async () => {
			if (!stateUi.drawerFold) {
				moving = true;
				await rotationTween.set(DRAWER_ROTATION.up);
				stateUi.drawerFold = true;
				moving = false;
			}
		},
	});
</script>

{#if theme}
	{@const colors = theme.buyBonus ?? theme.button}
	<Button {...props} {sizes} {onpress} {disabled}>
		{#snippet children({ center, hovered, pressed })}
			<UiThemeButtonFace
				{center}
				{pressed}
				diameter={sizes.width}
				outlineWidth={theme.buyBonus?.ring?.width ?? theme.outlineWidth}
				outline={theme.buyBonus?.ring?.color ?? theme.outline}
				outlineAlpha={theme.buyBonus?.ring ? 1 : undefined}
				fillAlpha={theme.buyBonus?.fillAlpha}
				shadow={theme.buyBonus?.shadow}
				fill={pressed ? colors.fillPressed : hovered ? colors.fillHovered : colors.fill}
				iconColor={theme.button.icon}
			/>
			<!-- the arrow points down to put the buttons away, up to bring them back -->
			<Container {...center} rotation={rotationTween.current}>
				<UiIcon icon="arrowDownLong" size={sizes.width * 0.5} color={theme.button.icon} />
			</Container>
		{/snippet}
	</Button>
{:else}
	<Button {...props} {sizes} {onpress} {disabled} alpha={disabled ? 0.5 : 1}>
		{#snippet children({ center })}
			<UiSprite
				key="base_mobile_drawer"
				{...center}
				anchor={0.5}
				width={sizes.width}
				height={sizes.height}
			/>
			<Text
				{...center}
				anchor={0.5}
				text="↓"
				style={{
					align: 'center',
					wordWrap: true,
					wordWrapWidth: 200,
					fontFamily: UI_FONT_FAMILY,
					fontWeight: '600',
					fontSize: UI_BASE_FONT_SIZE * 0.9,
					fill: 0xffffff,
				}}
				rotation={rotationTween.current}
			/>
		{/snippet}
	</Button>
{/if}
