<script lang="ts">
	import { Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateModal, stateBet, stateBetDerived } from 'state-shared';

	import UiSprite from './UiSprite.svelte';
	import UiThemeButtonFace from './UiThemeButtonFace.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from '../constants';
	import { getContext } from '../context';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { getUiTheme } from '../theme';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const { stateXstateDerived, eventEmitter } = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const disabled = $derived(!stateXstateDerived.isIdle());
	const active = $derived(stateBetDerived.activeBetMode()?.type === 'activate');
	const theme = getUiTheme();

	const openModal = () => (stateModal.modal = { name: 'buyBonus' });
	const disableActiveBetMode = () => (stateBet.activeBetModeKey = 'BASE');
	const onpress = () => {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });

		if (active) {
			disableActiveBetMode();
		} else {
			openModal();
		}
	};

	const getState = (value: {
		active: boolean;
		disabled: boolean;
		hovered: boolean;
		pressed: boolean;
	}) => {
		if (value.disabled) return 'disabled' as const;
		if (value.pressed) return 'pressed' as const;
		if (value.hovered) return 'hovered' as const;
		if (value.active) return 'active' as const;
		return 'default' as const;
	};
</script>

{#if theme}
	<Button {...props} {sizes} {disabled} {onpress}>
		{#snippet children({ center, hovered, pressed })}
			<UiThemeButtonFace
				{center}
				{pressed}
				icon="buyBonus"
				diameter={sizes.width * theme.button.scale}
				outlineWidth={theme.outlineWidth}
				outline={disabled ? theme.outlineDisabled : theme.outline}
				fill={disabled
					? theme.button.fillDisabled
					: active
						? theme.button.fillActive
						: pressed
							? theme.button.fillPressed
							: hovered
								? theme.button.fillHovered
								: theme.button.fill}
				iconColor={disabled
					? theme.button.iconDisabled
					: active
						? theme.button.iconActive
						: theme.button.icon}
			/>
		{/snippet}
	</Button>
{:else}
	<Button {...props} {sizes} {disabled} {onpress}>
		{#snippet children({ center, hovered, pressed })}
			{@const state = getState({
				active,
				disabled,
				hovered,
				pressed,
			})}

			<UiSprite
				key="buyBonus"
				{...center}
				anchor={0.5}
				width={sizes.width}
				height={sizes.height}
				{...disabled
					? {
							backgroundColor: 0xaaaaaa,
						}
					: {}}
				{...active
					? {
							borderWidth: 10,
							borderColor: 0xffffff,
						}
					: {}}
			/>

			<Text
				{...center}
				anchor={0.5}
				text={state === 'active' ? i18nDerived.disable() : i18nDerived.buyBonus()}
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
		{/snippet}
	</Button>
{/if}
