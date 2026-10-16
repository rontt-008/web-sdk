<script lang="ts">
	import { stateUi } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle, anchorToPivot } from 'pixi-svelte';

	import { LANDSCAPE_BASE_SIZE, LANDSCAPE_BACKGROUND_WIDTH_LIST } from '../constants';
	import type { LayoutUiProps } from '../types';
	import { getContext } from '../context';
	import { getBuyBonusExtraWidth, getMenuButtons, getUiTheme } from '../theme';
	import { getSmallScreenBoost } from '../smallScreen';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const theme = getUiTheme();
	const menuButtons = $derived(getMenuButtons(props, theme));

	// bottom row: buttons along the top of it, the balance, win and bet under them
	const ROW_WIDTH = LANDSCAPE_BACKGROUND_WIDTH_LIST.reduce((sum, width) => sum + width, 0);
	const BUTTONS_Y = LANDSCAPE_BASE_SIZE * 0.5 - 90;
	const LABELS_Y = LANDSCAPE_BASE_SIZE * 0.5;
	const SCALE = 0.8;
	// between the middles of neighbouring buttons, and of the spin column's buttons
	const BUTTON_STEP = 135;
	const COLUMN_STEP = 140;

	// On very small screens everything is drawn bigger (see getSmallScreenBoost), and laid out
	// differently to fit: the menu, sound and buy bonus buttons go in a grid of two by two left of
	// the board, which leaves the bottom row to the balance, win and bet, with − and + beside them.
	const boost = $derived(
		getSmallScreenBoost(context.stateLayoutDerived.mainLayoutStandard().scale),
	);
	const compact = $derived(boost > 1);
	const scale = $derived(SCALE * boost);
	const sideButtons = $derived(theme?.muteButtons ? 4 : 2);

	// the row's own coordinates start this far in from the left of the standard layout
	const rowLeft = $derived(
		(context.stateLayoutDerived.mainLayoutStandard().width - ROW_WIDTH) * 0.5,
	);
	// the middle of the left side buttons (menu, mute music, mute sounds, buy bonus) by index, in the
	// row's coordinates
	const sideButton = $derived((index: number) => {
		if (!compact) return { x: 105 + BUTTON_STEP * index, y: BUTTONS_Y };
		const step = 140 * boost;
		const columns = 2;
		const rows = Math.ceil(sideButtons / columns);
		const row = Math.floor(index / columns);
		return {
			x: 105 - rowLeft + step * (index % columns),
			// the last row ends a little above the balance, the first a little under the free spin
			// counter beside the board
			y: -52 - step * (rows - 1 - row),
		};
	});
	// the balance, win and bet in a row, with their pills' bottom edge kept clear of the screen's
	const labelsY = $derived(compact ? 151 - 73.8 * boost : LABELS_Y);
	const labelX = $derived(compact ? [360, 790, 1220] : [420, 910, 1400]);
	// − and +: up with the buttons, or beside the bet on small screens
	const betButtons = $derived(
		compact
			? { y: labelsY + 30.6 * boost, decrease: 1520, increase: 1520 + 150 * boost }
			: { y: BUTTONS_Y, decrease: 1715 - BUTTON_STEP, increase: 1715 },
	);
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
		y={context.stateLayoutDerived.mainLayoutStandard().height - LANDSCAPE_BASE_SIZE - 40}
		pivot={anchorToPivot({
			anchor: { x: 0.5, y: 0 },
			sizes: { height: LANDSCAPE_BASE_SIZE, width: ROW_WIDTH },
		})}
	>
		{#if !stateUi.menuOpen}
			<Container {...sideButton(0)} {scale}>
				{@render props.buttonMenu({ anchor: 0.5 })}
			</Container>
		{/if}

		{#if theme?.muteButtons}
			<Container {...sideButton(1)} {scale}>
				{@render props.buttonMuteMusic({ anchor: 0.5 })}
			</Container>

			<Container {...sideButton(2)} {scale}>
				{@render props.buttonMuteSounds({ anchor: 0.5 })}
			</Container>
		{/if}

		<!-- a wider buy bonus button (a pill) grows to the right, away from the buttons before it -->
		<Container
			y={sideButton(sideButtons - 1).y}
			x={sideButton(sideButtons - 1).x + getBuyBonusExtraWidth(theme) * 0.5 * scale}
			{scale}
		>
			{@render props.buttonBuyBonus({ anchor: 0.5 })}
		</Container>

		<Container y={labelsY} x={labelX[0]} {scale}>
			{@render props.amountBalance({ stacked: true })}
		</Container>

		<Container y={labelsY} x={labelX[1]} {scale}>
			{@render props.amountWin({ stacked: true })}
		</Container>

		<Container y={labelsY} x={labelX[2]} {scale}>
			{@render props.amountBet({ stacked: true })}
		</Container>

		<Container y={betButtons.y} x={betButtons.decrease} {scale}>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>

		<Container y={betButtons.y} x={betButtons.increase} {scale}>
			{@render props.buttonIncrease({ anchor: 0.5 })}
		</Container>
	</Container>

	<Container
		x={context.stateLayoutDerived.mainLayoutStandard().width - 60}
		y={context.stateLayoutDerived.mainLayoutStandard().height * 0.5}
		pivot={anchorToPivot({
			anchor: { x: 1, y: 0.5 },
			sizes: {
				height: LANDSCAPE_BASE_SIZE,
				width: LANDSCAPE_BASE_SIZE,
			},
		})}
	>
		<Container
			x={LANDSCAPE_BASE_SIZE * 0.5}
			y={LANDSCAPE_BASE_SIZE * 0.5 - COLUMN_STEP * boost}
			{scale}
		>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>

		<Container x={LANDSCAPE_BASE_SIZE * 0.5} y={LANDSCAPE_BASE_SIZE * 0.5} {scale}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>

		<Container
			x={LANDSCAPE_BASE_SIZE * 0.5}
			y={LANDSCAPE_BASE_SIZE * 0.5 + COLUMN_STEP * boost}
			{scale}
		>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>
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

	<!-- the menu items stack up from the menu button, which turns into the close button -->
	<MainContainer standard alignVertical="bottom">
		<Container
			x={rowLeft + sideButton(0).x}
			y={context.stateLayoutDerived.mainLayoutStandard().height -
				LANDSCAPE_BASE_SIZE -
				40 +
				sideButton(0).y}
		>
			{#each menuButtons as button, index}
				<Container
					{scale}
					y={-(150 + 170 * (menuButtons.length - 1 - index)) * boost}
				>
					{@render button({ anchor: 0.5 })}
				</Container>
			{/each}

			<Container {scale}>
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			</Container>
		</Container>
	</MainContainer>
{/if}
