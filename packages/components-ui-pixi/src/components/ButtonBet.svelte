<script lang="ts">
	import { backOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';

	import { Container, Text } from 'pixi-svelte';
	import { UI_FONT_FAMILY } from 'constants-shared/fonts';
	import { Button, type ButtonProps } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBet, stateBetDerived, stateModal, stateUi } from 'state-shared';

	import UiSprite from './UiSprite.svelte';
	import UiThemeButtonFace from './UiThemeButtonFace.svelte';
	import UiThemeSpinFace from './UiThemeSpinFace.svelte';
	import ButtonBetProvider from './ButtonBetProvider.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from '../constants';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { getUiTheme } from '../theme';
	import { getContext } from '../context';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();
	// only a new spin needs the balance: stopping the reels (or autoplay) always works
	const disabled = $derived(
		context.stateXstateDerived.isIdle() && !stateBetDerived.isBetCostAvailable(),
	);
	// the space bar does nothing while a menu or a modal is open over the game
	const hotkeyDisabled = $derived(disabled || !!stateModal.modal || stateUi.menuOpen);
	// why the button is disabled when the balance doesn't cover the next bet
	const notEnoughBalance = $derived(
		context.stateXstateDerived.isIdle() && stateBetDerived.betCost() > stateBet.balanceAmount,
	);
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const theme = getUiTheme();

	// the rimmed face's sync icon turns a full circle, overshooting a little, as each spin starts
	// (from the button, the space bar or auto play)
	const SPIN_TURN = { duration: 800, easing: backOut };
	const iconRotation = new Tween(0, SPIN_TURN);
	let wasIdle = context.stateXstateDerived.isIdle();
	$effect(() => {
		const idle = context.stateXstateDerived.isIdle();
		if (wasIdle && !idle) iconRotation.target += 360;
		wasIdle = idle;
	});
</script>

<!-- over the disabled button: why it can't be pressed -->
{#snippet notEnoughBalanceText(center: { x: number; y: number })}
	{#if notEnoughBalance}
		<Text
			anchor={0.5}
			x={center.x}
			y={center.y}
			text={i18nDerived.notEnoughBalance()}
			style={{
				align: 'center',
				wordWrap: true,
				wordWrapWidth: sizes.width * 0.9,
				fontFamily: theme?.fontFamily ?? UI_FONT_FAMILY,
				fontWeight: '800',
				fontSize: UI_BASE_FONT_SIZE * 0.55,
				fill: 0xffffff,
				stroke: { color: 0x000000, width: 6 },
			}}
		/>
	{/if}
{/snippet}

<ButtonBetProvider>
	{#snippet children({ key, onpress })}
		<OnHotkey hotkey="Space" disabled={hotkeyDisabled} {onpress} />
		{#if theme?.spin.rim}
			{@const rim = theme.spin.rim}
			{@const faceDisabled = disabled || ['spin_disabled', 'stop_disabled'].includes(key)}
			<Button {...props} {sizes} {onpress} {disabled}>
				{#snippet children({ center, hovered, pressed })}
					<UiThemeSpinFace
						{center}
						{hovered}
						{pressed}
						diameter={sizes.width * theme.spin.scale}
						fill={faceDisabled ? theme.spin.fillDisabled : theme.spin.fill}
						rim={rim.color}
						rimWidth={rim.width}
						iconColor={faceDisabled ? theme.button.iconDisabled : theme.spin.icon}
						rotation={iconRotation.current}
					/>
					{@render notEnoughBalanceText(center)}
				{/snippet}
			</Button>
		{:else if theme}
			{@const faceDisabled = disabled || ['spin_disabled', 'stop_disabled'].includes(key)}
			<Button {...props} {sizes} {onpress} {disabled}>
				{#snippet children({ center, hovered, pressed })}
					<UiThemeButtonFace
						{center}
						{pressed}
						diameter={sizes.width * theme.spin.scale}
						icon={['spin_default', 'spin_disabled'].includes(key) ? 'spin' : 'stop'}
						iconColor={theme.spin.icon}
						outlineWidth={theme.spin.outlineWidth ?? theme.outlineWidth * 1.3}
						outline={faceDisabled ? theme.outlineDisabled : (theme.spin.outline ?? theme.outline)}
						fill={faceDisabled
							? theme.spin.fillDisabled
							: pressed
								? theme.spin.fillPressed
								: hovered
									? theme.spin.fillHovered
									: theme.spin.fill}
					/>
					{@render notEnoughBalanceText(center)}
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
								fontFamily: UI_FONT_FAMILY,
								fontWeight: '600',
								fontSize: UI_BASE_FONT_SIZE * 0.9,
								fill: 0xffffff,
							}}
						/>
					</Container>
					{@render notEnoughBalanceText(center)}
				{/snippet}
			</Button>
		{/if}
	{/snippet}
</ButtonBetProvider>
