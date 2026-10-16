<script lang="ts">
	import { stateUi } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle } from 'pixi-svelte';

	import { getContext } from '../context';
	import {
		getBuyBonusExtraWidth,
		getMenuButtons,
		getPanelCornerRadius,
		getUiTheme,
	} from '../theme';
	import { UI_BASE_SIZE } from '../constants';
	import type { LayoutUiProps } from '../types';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const theme = getUiTheme();
	const menuButtons = $derived(getMenuButtons(props, theme));

	// One centred bar along the bottom of the standard layout: three panels with their buttons drawn
	// as bare icons, the spin button over the end of the last one and the buy bonus button after it:
	// (menu, mute music, mute sounds | balance        win) (bet ⌃⌄) (turbo, auto spin  SPIN) BUY BONUS
	// Sizes below are before the whole bar (and the menu over it) is scaled by BAR_SCALE.
	const BAR_SCALE = 1.18;
	const BAR_OFFSET = 70; // from the bottom of the screen to the middle of the bar
	const PANEL_HEIGHT = 96;
	const PANEL_GAP = 10;
	// an icon at a panel's end sits as far in as the middle of a rounded end; text keeps this far from
	// the end
	const PANEL_END = PANEL_HEIGHT * 0.5;
	const TEXT_INSET = 32;
	// the line between the first panel's icons and the balance, in the outline colour
	const DIVIDER_WIDTH = 3;
	const ICON_SCALE = 0.62;
	const ICON_STEP = 88; // between neighbouring icons
	const ARROW_SCALE = 0.4;
	const ARROW_OFFSET = 24; // from the middle of the bar to the middle of each arrow
	const SPIN_SCALE = 0.68;
	const LABEL_SCALE = 0.75;
	// the boxes the balance, win and bet values shrink to fit
	const LABEL_WIDTH = { balance: 200, win: 170, bet: 180 };
	const GAP = { small: 16, medium: 20, large: 30 };
	// the menu item buttons are 1.3x the size of the others; scaled to match the close button
	const CLOSE_SCALE = 0.7;
	const MENU_ITEM_SCALE = CLOSE_SCALE / 1.3;
	const MENU_ITEM_SPACING = 110;

	const buttonWidth = UI_BASE_SIZE * (theme?.button.scale ?? 1);
	const iconRadius = buttonWidth * ICON_SCALE * 0.5;
	const arrowRadius = buttonWidth * ARROW_SCALE * 0.5;
	const spinRadius = UI_BASE_SIZE * (theme?.spin.scale ?? 1) * SPIN_SCALE * 0.5;
	// the buy bonus button is as tall as the panels
	const buyBonusScale = PANEL_HEIGHT / buttonWidth;
	const buyBonusWidth = (buttonWidth + getBuyBonusExtraWidth(theme)) * buyBonusScale;

	const showBuyBonus = $derived(
		!theme?.hideBuyBonusOn?.includes(context.stateLayoutDerived.layoutType()),
	);
	const showMuteButtons = !!theme?.muteButtons;

	// x of each panel's left end and width, and of each thing on them, from the bar's left end
	const bar = $derived.by(() => {
		const menu = PANEL_END;
		const muteMusic = menu + ICON_STEP;
		const muteSounds = muteMusic + ICON_STEP;
		const divider = (showMuteButtons ? muteSounds : menu) + iconRadius + GAP.medium;
		const balance = divider + GAP.medium;
		const win = balance + LABEL_WIDTH.balance + GAP.large + LABEL_WIDTH.win;
		const info = { left: 0, width: win + TEXT_INSET };

		const betLeft = info.width + PANEL_GAP;
		const bet = betLeft + TEXT_INSET;
		const betArrows = bet + LABEL_WIDTH.bet + GAP.small + arrowRadius;
		const betPanel = { left: betLeft, width: betArrows + PANEL_END - betLeft };

		const playLeft = betPanel.left + betPanel.width + PANEL_GAP;
		const turbo = playLeft + PANEL_END;
		const autoSpin = turbo + ICON_STEP;
		const spin = autoSpin + iconRadius + GAP.small + spinRadius;
		// runs under the spin button to its middle
		const play = { left: playLeft, width: spin - playLeft };

		const buyBonus = spin + spinRadius + GAP.medium + buyBonusWidth * 0.5;
		const width = showBuyBonus ? buyBonus + buyBonusWidth * 0.5 : spin + spinRadius;
		const left =
			(context.stateLayoutDerived.mainLayoutStandard().width - width * BAR_SCALE) * 0.5;

		return {
			left,
			panels: [info, betPanel, play],
			menu,
			muteMusic,
			muteSounds,
			divider,
			balance,
			win,
			bet,
			betArrows,
			turbo,
			autoSpin,
			spin,
			buyBonus,
		};
	});

	const barY = $derived(
		context.stateLayoutDerived.mainLayoutStandard().height - BAR_OFFSET * BAR_SCALE,
	);
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	<Container x={bar.left} y={barY} scale={BAR_SCALE}>
		{#each bar.panels as panel}
			<Rectangle
				x={panel.left}
				anchor={{ x: 0, y: 0.5 }}
				width={panel.width}
				height={PANEL_HEIGHT}
				borderRadius={getPanelCornerRadius(theme, PANEL_HEIGHT)}
				backgroundColor={theme?.label.panel}
				backgroundAlpha={theme?.label.panelAlpha}
				borderColor={theme?.outline}
				borderWidth={theme?.outlineWidth}
				borderAlpha={theme?.outlineAlpha}
			/>
		{/each}

		{#if !stateUi.menuOpen}
			<Container x={bar.menu} scale={ICON_SCALE}>
				{@render props.buttonMenu({ anchor: 0.5, bare: true })}
			</Container>
		{/if}

		{#if showMuteButtons}
			<Container x={bar.muteMusic} scale={ICON_SCALE}>
				{@render props.buttonMuteMusic({ anchor: 0.5, bare: true })}
			</Container>

			<Container x={bar.muteSounds} scale={ICON_SCALE}>
				{@render props.buttonMuteSounds({ anchor: 0.5, bare: true })}
			</Container>
		{/if}

		<Rectangle
			x={bar.divider}
			anchor={0.5}
			width={DIVIDER_WIDTH}
			height={PANEL_HEIGHT * 0.5}
			backgroundColor={theme?.outline}
			backgroundAlpha={theme?.outlineAlpha}
		/>

		<Container x={bar.balance} scale={LABEL_SCALE}>
			{@render props.amountBalance({
				plain: { width: LABEL_WIDTH.balance / LABEL_SCALE, align: 'left' },
			})}
		</Container>

		<Container x={bar.win} scale={LABEL_SCALE}>
			{@render props.amountWin({ plain: { width: LABEL_WIDTH.win / LABEL_SCALE, align: 'right' } })}
		</Container>

		<Container x={bar.bet} scale={LABEL_SCALE}>
			{@render props.amountBet({ plain: { width: LABEL_WIDTH.bet / LABEL_SCALE, align: 'left' } })}
		</Container>

		<Container x={bar.betArrows} y={-ARROW_OFFSET} scale={ARROW_SCALE}>
			{@render props.buttonIncrease({ anchor: 0.5, arrow: true, bare: true })}
		</Container>

		<Container x={bar.betArrows} y={ARROW_OFFSET} scale={ARROW_SCALE}>
			{@render props.buttonDecrease({ anchor: 0.5, arrow: true, bare: true })}
		</Container>

		<Container x={bar.turbo} scale={ICON_SCALE}>
			{@render props.buttonTurbo({ anchor: 0.5, bare: true })}
		</Container>

		<Container x={bar.autoSpin} scale={ICON_SCALE}>
			{@render props.buttonAutoSpin({ anchor: 0.5, bare: true })}
		</Container>

		<Container x={bar.spin} scale={SPIN_SCALE}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>

		{#if showBuyBonus}
			<Container x={bar.buyBonus} scale={buyBonusScale}>
				{@render props.buttonBuyBonus({ anchor: 0.5 })}
			</Container>
		{/if}
	</Container>
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

	<!-- menu items stack up from the menu button, which turns into the close button -->
	<MainContainer standard alignVertical="bottom">
		<Container x={bar.left + bar.menu * BAR_SCALE} y={barY} scale={BAR_SCALE}>
			{#each menuButtons as button, index}
				<Container scale={MENU_ITEM_SCALE} y={-MENU_ITEM_SPACING * (menuButtons.length - index)}>
					{@render button({ anchor: 0.5 })}
				</Container>
			{/each}
			<Container scale={CLOSE_SCALE}>
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			</Container>
		</Container>
	</MainContainer>
{/if}
