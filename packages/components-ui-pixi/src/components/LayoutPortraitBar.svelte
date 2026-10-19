<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';

	import { stateUi } from 'state-shared';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle } from 'pixi-svelte';
	import { waitForResolve } from 'utils-shared/wait';

	import LabelFreeSpinCounter from './LabelFreeSpinCounter.svelte';
	import ButtonDrawer from './ButtonDrawer.svelte';
	import type { LayoutUiProps } from '../types';
	import { getContext } from '../context';
	import { getBuyBonusExtraWidth, getMenuButtons, getPanelCornerRadius, getUiTheme } from '../theme';
	import { UI_BASE_SIZE } from '../constants';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const theme = getUiTheme();
	const menuButtons = $derived(getMenuButtons(props, theme));

	// For tall screens (a phone held upright), in three rows over the bottom of the screen:
	//   [ BALANCE      WIN      | BET  ⌃⌄ ]     one panel
	//     turbo       ( SPIN )      auto spin
	//   [ menu  music  sound ]       BUY BONUS
	// It stays below PORTRAIT_UI_HEIGHT, so games fit their board above it as with LayoutPortrait.
	// Sizes are in the standard layout (1080 wide), from its middle (x) and bottom (y).
	const SIDE = 500; // from the middle to each side of the panel and the bottom row
	const PANEL = { y: 590, height: 160 };
	const LABEL_SCALE = 1.3;
	// the left side of each value, from the middle, and the box it shrinks to fit
	const LABEL = {
		balance: { x: -SIDE + 50, width: 300 },
		win: { x: -120, width: 260 },
		bet: { x: 195, width: 205 },
	};
	const DIVIDER_X = 165;
	const ARROWS = { x: SIDE - 58, offset: 40, scale: 0.6 };

	const ROW_Y = 320;
	const SPIN_DIAMETER = 330;
	const SIDE_BUTTON = { x: 345, diameter: 176 };

	const BOTTOM = { y: 105 };
	const PILL = { width: 340, height: 140 };
	// the menu, music and sound icons along the pill, from its left end
	const PILL_ICONS = { menu: 70, music: 172, sound: 272 };
	const PILL_ICON_DIAMETER = 140;
	const BUY_BONUS_HEIGHT = 150;

	const buttonWidth = UI_BASE_SIZE * (theme?.button.scale ?? 1);
	const spinScale = SPIN_DIAMETER / (UI_BASE_SIZE * (theme?.spin.scale ?? 1));
	const sideScale = SIDE_BUTTON.diameter / buttonWidth;
	const iconScale = PILL_ICON_DIAMETER / buttonWidth;
	const buyBonusScale = BUY_BONUS_HEIGHT / buttonWidth;
	const buyBonusWidth = (buttonWidth + getBuyBonusExtraWidth(theme)) * buyBonusScale;
	// the menu's item buttons are 1.3x the size of the others; shown at the menu button's size
	const MENU_ITEM_SCALE = iconScale / 1.3;
	const MENU_ITEM_SPACING = 150;

	const standard = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const middle = $derived(standard.width * 0.5);
	const bottom = $derived(standard.height);
	const pillLeft = $derived(middle - SIDE);

	// During FREE SPINS the buttons slide down out of sight (the drawer folds) and the panel comes
	// down closer to the bottom, its BET turning into the free spin counter; the arrow button brings
	// them back. The game folds and unfolds it with drawerFold and drawerUnfold.
	const DRAWER_Y = { unfold: 0, fold: 520 };
	const PANEL_FOLD = 300;
	const drawerTween = new Tween(stateUi.drawerFold ? DRAWER_Y.fold : DRAWER_Y.unfold, {
		easing: cubicInOut,
	});
	let drawerButtonFadeComplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		drawerButtonShow: async () => {
			if (!stateUi.drawerButtonShow) {
				stateUi.drawerButtonShow = true;
				await waitForResolve((resolve) => (drawerButtonFadeComplete = resolve));
			}
		},
		drawerButtonHide: async () => {
			if (stateUi.drawerButtonShow) {
				stateUi.drawerButtonShow = false;
				await waitForResolve((resolve) => (drawerButtonFadeComplete = resolve));
			}
		},
		drawerUnfold: async () => {
			if (stateUi.drawerFold) await drawerTween.set(DRAWER_Y.unfold);
		},
		drawerFold: async () => {
			if (!stateUi.drawerFold) await drawerTween.set(DRAWER_Y.fold);
		},
	});

	const panelY = $derived(bottom - PANEL.y + (drawerTween.current / DRAWER_Y.fold) * PANEL_FOLD);
	const panelStyle = $derived({
		borderRadius: getPanelCornerRadius(theme, PANEL.height),
		backgroundColor: theme?.label.panel,
		backgroundAlpha: theme?.label.panelAlpha,
		borderColor: theme?.outline,
		borderWidth: theme?.outlineWidth,
		borderAlpha: theme?.outlineAlpha,
	});
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	<!-- the buttons, which slide away during FREE SPINS -->
	<Container y={drawerTween.current}>
		<!-- out of the way of the menu's items, which stack up over it, while the menu is open -->
		{#if !stateUi.menuOpen}
			<Container x={middle - SIDE_BUTTON.x} y={bottom - ROW_Y} scale={sideScale}>
				{@render props.buttonTurbo({ anchor: 0.5 })}
			</Container>

			<Container x={middle} y={bottom - ROW_Y} scale={spinScale}>
				{@render props.buttonBet({ anchor: 0.5 })}
			</Container>

			<Container x={middle + SIDE_BUTTON.x} y={bottom - ROW_Y} scale={sideScale}>
				{@render props.buttonAutoSpin({ anchor: 0.5 })}
			</Container>
		{/if}

		<!-- menu, music and sound on one pill -->
		<Rectangle
			x={pillLeft}
			y={bottom - BOTTOM.y}
			anchor={{ x: 0, y: 0.5 }}
			width={PILL.width}
			height={PILL.height}
			{...panelStyle}
			borderRadius={getPanelCornerRadius(theme, PILL.height)}
		/>
		{#if !stateUi.menuOpen}
			<Container x={pillLeft + PILL_ICONS.menu} y={bottom - BOTTOM.y} scale={iconScale}>
				{@render props.buttonMenu({ anchor: 0.5, bare: true })}
			</Container>
		{/if}
		{#if theme?.muteButtons}
			<Container x={pillLeft + PILL_ICONS.music} y={bottom - BOTTOM.y} scale={iconScale}>
				{@render props.buttonMuteMusic({ anchor: 0.5, bare: true })}
			</Container>
			<Container x={pillLeft + PILL_ICONS.sound} y={bottom - BOTTOM.y} scale={iconScale}>
				{@render props.buttonMuteSounds({ anchor: 0.5, bare: true })}
			</Container>
		{/if}

		<!-- the drawer's arrow button takes its place during FREE SPINS, when it can't be used anyway -->
		{#if !stateUi.drawerButtonShow}
			<Container x={middle + SIDE - buyBonusWidth * 0.5} y={bottom - BOTTOM.y} scale={buyBonusScale}>
				{@render props.buttonBuyBonus({ anchor: 0.5 })}
			</Container>
		{/if}
	</Container>

	<!-- balance, win and bet on one panel -->
	<Container y={panelY}>
		<Rectangle
			x={middle}
			anchor={0.5}
			width={SIDE * 2}
			height={PANEL.height}
			{...panelStyle}
		/>

		<Container x={middle + LABEL.balance.x} scale={LABEL_SCALE}>
			{@render props.amountBalance({
				plain: { width: LABEL.balance.width / LABEL_SCALE, align: 'left' },
			})}
		</Container>

		<Container x={middle + LABEL.win.x} scale={LABEL_SCALE}>
			{@render props.amountWin({ plain: { width: LABEL.win.width / LABEL_SCALE, align: 'left' } })}
		</Container>

		<!-- a thin line between the round's amounts and the bet -->
		<Rectangle
			x={middle + DIVIDER_X}
			anchor={0.5}
			width={3}
			height={PANEL.height * 0.6}
			backgroundColor={theme?.label.label ?? 0xffffff}
			backgroundAlpha={0.25}
		/>

		{#if stateUi.freeSpinCounterShow}
			<Container x={middle + LABEL.bet.x} scale={LABEL_SCALE}>
				<LabelFreeSpinCounter
					plain={{ width: (SIDE - LABEL.bet.x - 40) / LABEL_SCALE, align: 'left' }}
				/>
			</Container>
		{:else}
			<Container x={middle + LABEL.bet.x} scale={LABEL_SCALE}>
				{@render props.amountBet({ plain: { width: LABEL.bet.width / LABEL_SCALE, align: 'left' } })}
			</Container>

			<Container x={middle + ARROWS.x} y={-ARROWS.offset} scale={ARROWS.scale}>
				{@render props.buttonIncrease({ anchor: 0.5, arrow: true, bare: true })}
			</Container>
			<Container x={middle + ARROWS.x} y={ARROWS.offset} scale={ARROWS.scale}>
				{@render props.buttonDecrease({ anchor: 0.5, arrow: true, bare: true })}
			</Container>
		{/if}
	</Container>

	<!-- the arrow button that brings the buttons back during FREE SPINS: in the buy bonus button's
	     place, the same size (themed, the same round button), taking taps only while it shows -->
	<FadeContainer persistent show={stateUi.drawerButtonShow} oncomplete={drawerButtonFadeComplete}>
		<Container
			x={middle + SIDE - buyBonusWidth * 0.5}
			y={bottom - BOTTOM.y}
			scale={buyBonusScale}
			interactiveChildren={stateUi.drawerButtonShow}
		>
			<ButtonDrawer disabled={!stateUi.drawerButtonShow} anchor={0.5} />
		</Container>
	</FadeContainer>
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

	<!-- the menu's items stack up from the menu button, which turns into the close button -->
	<MainContainer standard alignVertical="bottom">
		<Container x={pillLeft + PILL_ICONS.menu} y={bottom - BOTTOM.y}>
			{#each menuButtons as button, index}
				<Container scale={MENU_ITEM_SCALE} y={-MENU_ITEM_SPACING * (menuButtons.length - index)}>
					{@render button({ anchor: 0.5 })}
				</Container>
			{/each}
			<Container scale={iconScale}>
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			</Container>
		</Container>
	</MainContainer>
{/if}
