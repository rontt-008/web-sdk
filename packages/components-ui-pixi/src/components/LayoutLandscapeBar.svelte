<script lang="ts">
	import { stateUi } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle } from 'pixi-svelte';

	import type { LayoutUiProps } from '../types';
	import { getContext } from '../context';
	import { getMenuButtons, getPanelCornerRadius, getUiTheme } from '../theme';
	import { UI_BASE_SIZE } from '../constants';
	import { LANDSCAPE_BAR, getLandscapeBar } from '../landscapeBar';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const theme = getUiTheme();
	const menuButtons = $derived(getMenuButtons(props, theme));

	// For small wide screens (a phone held sideways, the miniplayer): a bar of panels along the
	// bottom from one side of the screen to the other, and the spin buttons in a column on the right
	// above it (measured in landscapeBar.ts).
	const { height, pill, bet, info, column } = LANDSCAPE_BAR;
	const LABEL_SCALE = 1.25;

	const buttonWidth = UI_BASE_SIZE * (theme?.button.scale ?? 1);
	const spinScale = column.spin.diameter / (UI_BASE_SIZE * (theme?.spin.scale ?? 1));
	const autoSpinScale = column.autoSpin.diameter / buttonWidth;
	const turboScale = column.turbo.diameter / buttonWidth;
	const iconScale = pill.iconDiameter / buttonWidth;
	const betButtonScale = bet.buttonDiameter / buttonWidth;
	// the menu's item buttons are 1.3x the size of the others; shown at the menu button's size
	const MENU_ITEM_SCALE = iconScale / 1.3;
	const MENU_ITEM_SPACING = 150;
	// the soft circles behind the − and + on the bet's panel
	const BET_BUTTON_FILL = 0x2b2b2b;

	const bar = $derived(
		getLandscapeBar({
			theme,
			standard: context.stateLayoutDerived.mainLayoutStandard(),
			canvas: context.stateLayoutDerived.canvasSizes(),
		}),
	);

	const panelStyle = $derived({
		anchor: { x: 0, y: 0.5 },
		height,
		borderRadius: getPanelCornerRadius(theme, height),
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
	<!-- the spin buttons, in a column on the right -->
	<Container x={bar.column} y={bar.columnY.autoSpin} scale={autoSpinScale}>
		{@render props.buttonAutoSpin({ anchor: 0.5 })}
	</Container>
	<Container x={bar.column} y={bar.columnY.spin} scale={spinScale}>
		{@render props.buttonBet({ anchor: 0.5 })}
	</Container>
	<Container x={bar.column} y={bar.columnY.turbo} scale={turboScale}>
		{@render props.buttonTurbo({ anchor: 0.5 })}
	</Container>

	<Container y={bar.y}>
		<!-- menu, music and sound on one pill -->
		<Rectangle x={bar.pill.left} width={bar.pill.right - bar.pill.left} {...panelStyle} />
		{#if !stateUi.menuOpen}
			<Container x={bar.pill.left + pill.icons[0]} scale={iconScale}>
				{@render props.buttonMenu({ anchor: 0.5, bare: true })}
			</Container>
		{/if}
		{#if theme?.muteButtons}
			<Container x={bar.pill.left + pill.icons[1]} scale={iconScale}>
				{@render props.buttonMuteMusic({ anchor: 0.5, bare: true })}
			</Container>
			<Container x={bar.pill.left + pill.icons[2]} scale={iconScale}>
				{@render props.buttonMuteSounds({ anchor: 0.5, bare: true })}
			</Container>
		{/if}

		<!-- the balance on the left, the win on the right -->
		<Rectangle x={bar.info.left} width={bar.info.right - bar.info.left} {...panelStyle} />
		<Container x={bar.info.left + info.inset} scale={LABEL_SCALE}>
			{@render props.amountBalance({
				plain: {
					width: ((bar.info.right - bar.info.left) * 0.5 - info.inset) / LABEL_SCALE,
					align: 'left',
				},
			})}
		</Container>
		<Container x={bar.info.right - info.inset} scale={LABEL_SCALE}>
			{@render props.amountWin({
				plain: {
					width: ((bar.info.right - bar.info.left) * 0.5 - info.inset) / LABEL_SCALE,
					align: 'right',
				},
			})}
		</Container>

		<!-- the bet, with − and + -->
		<Rectangle x={bar.bet.left} width={bar.bet.right - bar.bet.left} {...panelStyle} />
		<Container x={bar.bet.left + bet.label} scale={LABEL_SCALE}>
			{@render props.amountBet({ plain: { width: bet.labelWidth / LABEL_SCALE, align: 'left' } })}
		</Container>
		{#each [{ x: bar.bet.right - bet.minus, button: props.buttonDecrease }, { x: bar.bet.right - bet.plus, button: props.buttonIncrease }] as { x, button }}
			<Rectangle
				{x}
				anchor={0.5}
				width={bet.buttonDiameter}
				height={bet.buttonDiameter}
				borderRadius={bet.buttonDiameter * 0.5}
				backgroundColor={BET_BUTTON_FILL}
			/>
			<Container {x} scale={betButtonScale}>
				{@render button({ anchor: 0.5, bare: true })}
			</Container>
		{/each}

		{#if bar.showBuyBonus}
			<Container x={bar.buyBonus} scale={bar.buyBonusScale}>
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

	<!-- the menu's items stack up from the menu button, which turns into the close button -->
	<MainContainer standard alignVertical="bottom">
		<Container x={bar.pill.left + pill.icons[0]} y={bar.y}>
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
