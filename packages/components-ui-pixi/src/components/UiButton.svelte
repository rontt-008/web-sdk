<script lang="ts">
	import { Text } from 'pixi-svelte';
	import { UI_FONT_FAMILY } from 'constants-shared/fonts';
	import { Button, type ButtonProps } from 'components-pixi';

	import UiSprite from './UiSprite.svelte';
	import UiThemeButtonFace from './UiThemeButtonFace.svelte';
	import type { UiIconName } from './UiIcon.svelte';
	import type { ButtonIcon } from '../types';
	import type { Snippet } from 'svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { UI_BASE_FONT_SIZE } from '../constants';
	import { getUiTheme } from '../theme';

	type Props = Omit<ButtonProps, 'children'> & {
		icon: ButtonIcon;
		// drawn instead of `icon` when a theme is used (without one, `icon` names the button's text)
		themeIcon?: UiIconName;
		sizes: { width: number; height: number };
		active?: boolean;
		children?: Snippet;
		variant?: 'dark' | 'light';
		// see UiButtonOptions
		bare?: boolean;
	};

	const {
		icon,
		themeIcon,
		active,
		variant = 'dark',
		bare,
		children: childrenFromParent,
		...buttonProps
	}: Props = $props();

	const theme = getUiTheme();
	// a bare button's circle while hovered: a faint wash of the outline colour
	const BARE_HOVER_ALPHA = 0.15;
</script>

{#if theme}
	<Button {...buttonProps}>
		{#snippet children({ center, hovered, pressed })}
			{@const colors = theme.button}
			<UiThemeButtonFace
				{center}
				{pressed}
				{bare}
				fillAlpha={bare && !active
					? !buttonProps.disabled && (pressed || hovered)
						? BARE_HOVER_ALPHA
						: 0
					: 1}
				icon={themeIcon ?? icon}
				diameter={buttonProps.sizes.width * colors.scale}
				outlineWidth={theme.outlineWidth}
				outline={buttonProps.disabled ? theme.outlineDisabled : theme.outline}
				fill={bare
					? active
						? colors.fillActive
						: theme.outline
					: buttonProps.disabled
						? colors.fillDisabled
						: active
							? colors.fillActive
							: pressed
								? colors.fillPressed
								: hovered
									? colors.fillHovered
									: colors.fill}
				iconColor={buttonProps.disabled
					? colors.iconDisabled
					: active
						? colors.iconActive
						: colors.icon}
			/>

			{@render childrenFromParent?.()}
		{/snippet}
	</Button>
{:else}
	<Button {...buttonProps}>
		{#snippet children({ center, hovered, pressed })}
			<UiSprite
				{...center}
				anchor={0.5}
				width={buttonProps.sizes.width}
				height={buttonProps.sizes.height}
				backgroundColor={variant === 'dark' ? 0x000000 : 0xffffff}
				{...buttonProps.disabled
					? {
							backgroundColor: 0xaaaaaa,
						}
					: {}}
				{...active
					? {
							borderWidth: 10,
							borderColor: variant === 'dark' ? 0xffffff : 0x000000,
						}
					: {}}
			/>

			<Text
				{...center}
				anchor={0.5}
				text={i18nDerived[icon]()}
				style={{
					align: 'center',
					wordWrap: true,
					wordWrapWidth: 200,
					fontFamily: UI_FONT_FAMILY,
					fontWeight: '600',
					fontSize: UI_BASE_FONT_SIZE * 0.9,
					fill: variant === 'dark' ? 0xffffff : 0x000000,
				}}
			/>

			{@render childrenFromParent?.()}
		{/snippet}
	</Button>
{/if}
