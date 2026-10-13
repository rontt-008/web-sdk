<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateBet, stateReplay } from 'state-shared';

	import UiSprite from './UiSprite.svelte';
	import UiThemeButtonFace from './UiThemeButtonFace.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from '../constants';
	import { getContext } from '../context';
	import { getUiTheme } from '../theme';

	// plays the replayed round again once it has finished
	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();
	const theme = getUiTheme();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const disabled = $derived(!stateReplay.bet || !context.stateXstateDerived.isIdle());

	const onpress = () => {
		if (disabled || !stateReplay.bet) return;
		context.eventEmitter.broadcast({ type: 'soundPressBet' });
		stateBet.winBookEventAmount = 0;
		stateBet.betToResume = { ...stateReplay.bet };
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	};
</script>

<Button {...props} {sizes} {onpress} {disabled}>
	{#snippet children({ center, hovered, pressed })}
		{#if theme}
			<UiThemeButtonFace
				{center}
				{pressed}
				diameter={sizes.width * theme.spin.scale}
				icon="spin"
				iconColor={theme.spin.icon}
				outlineWidth={theme.outlineWidth * 1.3}
				outline={disabled ? theme.outlineDisabled : (theme.spin.outline ?? theme.outline)}
				fill={disabled
					? theme.spin.fillDisabled
					: pressed
						? theme.spin.fillPressed
						: hovered
							? theme.spin.fillHovered
							: theme.spin.fill}
			/>
		{:else}
			<Container {...center}>
				<UiSprite
					key="bet"
					width={sizes.width}
					height={sizes.height}
					anchor={0.5}
					{...disabled ? { backgroundColor: 0xaaaaaa } : {}}
				/>
			</Container>
		{/if}
		<Text
			anchor={{ x: 0.5, y: 0 }}
			x={center.x}
			y={center.y + sizes.height * 0.55}
			text="REPLAY"
			style={{
				fontFamily: theme?.fontFamily ?? 'proxima-nova',
				fontWeight: '700',
				fontSize: UI_BASE_FONT_SIZE * 0.6,
				letterSpacing: 2,
				fill: 0xffffff,
			}}
		/>
	{/snippet}
</Button>
