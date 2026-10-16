<script lang="ts">
	import { stateUi } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle, anchorToPivot } from 'pixi-svelte';

	import { getContext } from '../context';
	import { getBuyBonusExtraWidth, getMenuButtons, getUiTheme } from '../theme';
	import type { LayoutUiProps } from '../types';
	import LabelFreeSpinCounter from './LabelFreeSpinCounter.svelte';
	import { DESKTOP_BASE_SIZE, DESKTOP_BACKGROUND_WIDTH_LIST, UI_BASE_SIZE } from '../constants';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const theme = getUiTheme();
	const menuButtons = $derived(getMenuButtons(props, theme));

	// themed, the buy bonus button (round or a pill, see buyBonus) sits right of SPIN, with auto spin
	// and turbo before it, as on the compact desktop layout; without a theme it is after the menu
	const SPIN_X = -10 + 180 * 5;
	const BUY_BONUS_GAP = 24;
	const buyBonusX = theme
		? SPIN_X +
			(UI_BASE_SIZE * (theme.spin.scale + theme.button.scale) + getBuyBonusExtraWidth(theme)) *
				0.5 +
			BUY_BONUS_GAP
		: 20 + 180;
	const autoSpinX = theme ? -10 + 180 * 3 : -10 + 180 * 4;
	const turboX = theme ? -10 + 180 * 4 : -10 + 180 * 6;
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	<Container
		x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
		y={context.stateLayoutDerived.mainLayoutStandard().height - DESKTOP_BASE_SIZE - 30}
		pivot={anchorToPivot({
			anchor: { x: 0.5, y: 0 },
			sizes: {
				height: DESKTOP_BASE_SIZE,
				width: DESKTOP_BACKGROUND_WIDTH_LIST.reduce((sum, width) => sum + width, 0),
			},
		})}
	>
		<Container y={DESKTOP_BASE_SIZE * 0.5 - 220} x={880 - 640}>
			{@render props.amountBalance({ stacked: true })}
		</Container>

		<Container y={DESKTOP_BASE_SIZE * 0.5 - 220} x={880}>
			{@render props.amountWin({ stacked: true })}
		</Container>

		<Container y={DESKTOP_BASE_SIZE * 0.5 - 220} x={880 + 640}>
			{@render props.amountBet({ stacked: true })}
		</Container>

		<Container y={DESKTOP_BASE_SIZE * 0.5} x={20}>
			{@render props.buttonMenu({ anchor: 0.5 })}
		</Container>

		{#if theme?.muteButtons}
			<Container y={DESKTOP_BASE_SIZE * 0.5} x={20 + 180}>
				{@render props.buttonMuteMusic({ anchor: 0.5 })}
			</Container>

			<Container y={DESKTOP_BASE_SIZE * 0.5} x={20 + 180 * 2}>
				{@render props.buttonMuteSounds({ anchor: 0.5 })}
			</Container>
		{/if}

		<Container y={DESKTOP_BASE_SIZE * 0.5} x={buyBonusX}>
			{@render props.buttonBuyBonus({ anchor: 0.5 })}
		</Container>

		<Container y={DESKTOP_BASE_SIZE * 0.5} x={autoSpinX}>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>

		<Container y={DESKTOP_BASE_SIZE * 0.5} x={SPIN_X}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>

		<Container y={DESKTOP_BASE_SIZE * 0.5} x={turboX}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>

		<Container y={DESKTOP_BASE_SIZE * 0.5} x={1560}>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>

		<Container y={DESKTOP_BASE_SIZE * 0.5} x={1560 + 180}>
			{@render props.buttonIncrease({ anchor: 0.5 })}
		</Container>

		{#if stateUi.freeSpinCounterShow}
			<Container y={DESKTOP_BASE_SIZE * 0.5 - 320} x={668}>
				<LabelFreeSpinCounter />
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
		backgroundColor={BLACK}
		width={context.stateLayoutDerived.canvasSizes().width}
		height={context.stateLayoutDerived.canvasSizes().height}
		x={context.stateLayoutDerived.canvasSizes().width * 0.5}
		y={context.stateLayoutDerived.canvasSizes().height * 0.5}
		onpointerup={() => (stateUi.menuOpen = false)}
	/>

	<MainContainer standard alignVertical="bottom">
		<Container
			x={100}
			y={context.stateLayoutDerived.mainLayoutStandard().height - DESKTOP_BASE_SIZE - 30}
		>
			{#each menuButtons as button, index}
				<Container y={DESKTOP_BASE_SIZE * 0.5 - 185 - 210 * (menuButtons.length - 1 - index)}>
					{@render button({ anchor: 0.5 })}
				</Container>
			{/each}

			<Container y={DESKTOP_BASE_SIZE * 0.5}>
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			</Container>
		</Container>
	</MainContainer>
{/if}
