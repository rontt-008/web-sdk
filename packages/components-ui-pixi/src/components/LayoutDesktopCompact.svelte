<script lang="ts">
	import { stateUi } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle } from 'pixi-svelte';

	import { getContext } from '../context';
	import { getUiTheme } from '../theme';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE, UI_THEMED_LABEL_SIZES } from '../constants';
	import type { LayoutUiProps } from '../types';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const theme = getUiTheme();

	// One centred row along the bottom of the 1920x1080 standard layout:
	// menu, mute music, mute sounds | balance | win | bet, with up and down arrows stacked on its right | auto spin, SPIN,
	// turbo | buy bonus
	const BAR_OFFSET = 80; // from the bottom of the screen to the middle of the row
	const BUTTON_SCALE = 0.7;
	// the two arrows together are about as tall as the bet's panel
	const BET_ARROW_SCALE = 0.33;
	const BET_ARROW_OFFSET = 23; // from the middle of the row to the middle of each arrow
	const SPIN_SCALE = 0.75;
	const LABEL_SCALE = 0.75;
	// stacked labels are drawn from near the top of their pill (see UiLabel); this lifts them so the
	// pill is centred on the row
	const LABEL_CENTER_OFFSET =
		(UI_THEMED_LABEL_SIZES.height * 0.5 - UI_BASE_FONT_SIZE * 0.35) * LABEL_SCALE;
	// the menu item buttons are 1.3x the size of the others, so scale them back to match
	const MENU_ITEM_SCALE = BUTTON_SCALE / 1.3;
	const MENU_ITEM_SPACING = 110;
	const GAP = { small: 10, medium: 14, large: 28 };

	const buttonWidth = UI_BASE_SIZE * (theme?.button.scale ?? 1);
	const spinWidth = UI_BASE_SIZE * (theme?.spin.scale ?? 1);
	const labelWidth = UI_THEMED_LABEL_SIZES.width * LABEL_SCALE;

	const showBuyBonus = $derived(!theme?.hideBuyBonusOn?.includes('desktop'));
	const showMuteButtons = !!theme?.muteButtons;

	// [key, visible width, gap before it]
	const items = $derived([
		['menu', buttonWidth * BUTTON_SCALE, 0],
		...(showMuteButtons
			? [
					['muteMusic', buttonWidth * BUTTON_SCALE, GAP.medium] as const,
					['muteSounds', buttonWidth * BUTTON_SCALE, GAP.medium] as const,
				]
			: []),
		['balance', labelWidth, GAP.large],
		['win', labelWidth, GAP.medium],
		['bet', labelWidth, GAP.large],
		['betArrows', buttonWidth * BET_ARROW_SCALE, GAP.small],
		['autoSpin', buttonWidth * BUTTON_SCALE, GAP.large],
		['spin', spinWidth * SPIN_SCALE, GAP.medium],
		['turbo', buttonWidth * BUTTON_SCALE, GAP.medium],
		...(showBuyBonus ? [['buyBonus', buttonWidth * BUTTON_SCALE, GAP.large] as const] : []),
	] as const);

	// centre x of each item, with the whole row centred on the screen
	const x = $derived.by(() => {
		const total = items.reduce((sum, [, width, gap]) => sum + gap + width, 0);
		let left = (context.stateLayoutDerived.mainLayoutStandard().width - total) * 0.5;
		const centers: Record<string, number> = {};
		for (const [key, width, gap] of items) {
			left += gap;
			centers[key] = left + width * 0.5;
			left += width;
		}
		return centers;
	});

	const barY = $derived(context.stateLayoutDerived.mainLayoutStandard().height - BAR_OFFSET);
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	{#if !stateUi.menuOpen}
		<Container x={x.menu} y={barY} scale={BUTTON_SCALE}>
			{@render props.buttonMenu({ anchor: 0.5 })}
		</Container>
	{/if}

	{#if showMuteButtons}
		<Container x={x.muteMusic} y={barY} scale={BUTTON_SCALE}>
			{@render props.buttonMuteMusic({ anchor: 0.5 })}
		</Container>

		<Container x={x.muteSounds} y={barY} scale={BUTTON_SCALE}>
			{@render props.buttonMuteSounds({ anchor: 0.5 })}
		</Container>
	{/if}

	<Container x={x.balance} y={barY - LABEL_CENTER_OFFSET} scale={LABEL_SCALE}>
		{@render props.amountBalance({ stacked: true })}
	</Container>

	<Container x={x.win} y={barY - LABEL_CENTER_OFFSET} scale={LABEL_SCALE}>
		{@render props.amountWin({ stacked: true })}
	</Container>

	<Container x={x.bet} y={barY - LABEL_CENTER_OFFSET} scale={LABEL_SCALE}>
		{@render props.amountBet({ stacked: true })}
	</Container>

	<Container x={x.betArrows} y={barY - BET_ARROW_OFFSET} scale={BET_ARROW_SCALE}>
		{@render props.buttonIncrease({ anchor: 0.5, arrow: true })}
	</Container>

	<Container x={x.betArrows} y={barY + BET_ARROW_OFFSET} scale={BET_ARROW_SCALE}>
		{@render props.buttonDecrease({ anchor: 0.5, arrow: true })}
	</Container>

	<Container x={x.autoSpin} y={barY} scale={BUTTON_SCALE}>
		{@render props.buttonAutoSpin({ anchor: 0.5 })}
	</Container>

	<Container x={x.spin} y={barY} scale={SPIN_SCALE}>
		{@render props.buttonBet({ anchor: 0.5 })}
	</Container>

	<Container x={x.turbo} y={barY} scale={BUTTON_SCALE}>
		{@render props.buttonTurbo({ anchor: 0.5 })}
	</Container>

	{#if showBuyBonus}
		<Container x={x.buyBonus} y={barY} scale={BUTTON_SCALE}>
			{@render props.buttonBuyBonus({ anchor: 0.5 })}
		</Container>
	{/if}
</MainContainer>

{#if stateUi.menuOpen}
	<Rectangle
		eventMode="static"
		cursor="pointer"
		alpha={0.5}
		anchor={0.5}
		backgroundColor={0x000000}
		width={context.stateLayoutDerived.canvasSizes().width}
		height={context.stateLayoutDerived.canvasSizes().height}
		x={context.stateLayoutDerived.canvasSizes().width * 0.5}
		y={context.stateLayoutDerived.canvasSizes().height * 0.5}
		onpointerup={() => (stateUi.menuOpen = false)}
	/>

	<!-- menu items stack up from the menu button -->
	<MainContainer standard alignVertical="bottom">
		<Container x={x.menu} y={barY}>
			<Container scale={MENU_ITEM_SCALE} y={-MENU_ITEM_SPACING * 4}>
				{@render props.buttonPayTable({ anchor: 0.5 })}
			</Container>
			<Container scale={MENU_ITEM_SCALE} y={-MENU_ITEM_SPACING * 3}>
				{@render props.buttonGameRules({ anchor: 0.5 })}
			</Container>
			<Container scale={MENU_ITEM_SCALE} y={-MENU_ITEM_SPACING * 2}>
				{@render props.buttonSettings({ anchor: 0.5 })}
			</Container>
			<Container scale={MENU_ITEM_SCALE} y={-MENU_ITEM_SPACING}>
				{@render props.buttonSoundSwitch({ anchor: 0.5 })}
			</Container>
			<Container scale={BUTTON_SCALE}>
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			</Container>
		</Container>
	</MainContainer>
{/if}
