<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBetDerived } from 'state-shared';

	import UiSprite from './UiSprite.svelte';
	import UiThemeButtonFace from './UiThemeButtonFace.svelte';
	import ButtonBetProvider from './ButtonBetProvider.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from '../constants';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { getUiTheme } from '../theme';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const disabled = $derived(!stateBetDerived.isBetCostAvailable());
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const theme = getUiTheme();
</script>

<ButtonBetProvider>
	{#snippet children({ key, onpress })}
		<OnHotkey hotkey="Space" {disabled} {onpress} />
		{#if theme}
			{@const faceDisabled = disabled || ['spin_disabled', 'stop_disabled'].includes(key)}
			<Button {...props} {sizes} {onpress} {disabled}>
				{#snippet children({ center, hovered, pressed })}
					<UiThemeButtonFace
						{center}
						{pressed}
						diameter={sizes.width * theme.spin.scale}
						icon={['spin_default', 'spin_disabled'].includes(key) ? 'spin' : 'stop'}
						iconColor={theme.spin.icon}
						outlineWidth={theme.outlineWidth * 1.3}
						outline={faceDisabled ? theme.outlineDisabled : (theme.spin.outline ?? theme.outline)}
						fill={faceDisabled
							? theme.spin.fillDisabled
							: pressed
								? theme.spin.fillPressed
								: hovered
									? theme.spin.fillHovered
									: theme.spin.fill}
					/>
				{/snippet}
			</Button>
		{:else}
			<Button {...props} {sizes} {onpress} {disabled}>
				{#snippet children({ center, hovered })}
					<Container {...center}>
						<UiSprite
							key="bet"
							width={sizes.width}
							height={sizes.height}
							anchor={0.5}
							{...disabled || ['spin_disabled', 'stop_disabled'].includes(key)
								? {
										backgroundColor: 0xaaaaaa,
									}
								: {}}
						/>
						<Text
							anchor={0.5}
							text={['spin_default', 'spin_disabled'].includes(key)
								? i18nDerived.bet()
								: i18nDerived.stop()}
							style={{
								align: 'center',
								wordWrap: true,
								wordWrapWidth: 200,
								fontFamily: 'proxima-nova',
								fontWeight: '600',
								fontSize: UI_BASE_FONT_SIZE * 0.9,
								fill: 0xffffff,
							}}
						/>
					</Container>
				{/snippet}
			</Button>
		{/if}
	{/snippet}
</ButtonBetProvider>
