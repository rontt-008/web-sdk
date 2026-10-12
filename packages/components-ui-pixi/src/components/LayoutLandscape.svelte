<script lang="ts">
	import { stateUi } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle, anchorToPivot } from 'pixi-svelte';

	import { LANDSCAPE_BASE_SIZE, LANDSCAPE_BACKGROUND_WIDTH_LIST } from '../constants';
	import type { LayoutUiProps } from '../types';
	import { getContext } from '../context';
	import { getUiTheme } from '../theme';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const theme = getUiTheme();
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
			sizes: {
				height: LANDSCAPE_BASE_SIZE,
				width: LANDSCAPE_BACKGROUND_WIDTH_LIST.reduce((sum, width) => sum + width, 0),
			},
		})}
	>
		<Container y={LANDSCAPE_BASE_SIZE * 0.5 - 90} x={85 + 20} scale={0.8}>
			{@render props.buttonMenu({ anchor: 0.5 })}
		</Container>

		{#if theme?.muteButtons}
			<Container y={LANDSCAPE_BASE_SIZE * 0.5 - 90} x={220 + 20} scale={0.8}>
				{@render props.buttonMuteMusic({ anchor: 0.5 })}
			</Container>

			<Container y={LANDSCAPE_BASE_SIZE * 0.5 - 90} x={355 + 20} scale={0.8}>
				{@render props.buttonMuteSounds({ anchor: 0.5 })}
			</Container>
		{/if}

		<Container
			y={LANDSCAPE_BASE_SIZE * 0.5 - 90}
			x={(theme?.muteButtons ? 490 : 220) + 20}
			scale={0.8}
		>
			{@render props.buttonBuyBonus({ anchor: 0.5 })}
		</Container>

		<Container y={LANDSCAPE_BASE_SIZE * 0.5} x={420} scale={0.8}>
			{@render props.amountBalance({ stacked: true })}
		</Container>

		<Container y={LANDSCAPE_BASE_SIZE * 0.5} x={910} scale={0.8}>
			{@render props.amountWin({ stacked: true })}
		</Container>

		<Container y={LANDSCAPE_BASE_SIZE * 0.5} x={1400} scale={0.8}>
			{@render props.amountBet({ stacked: true })}
		</Container>

		<Container y={LANDSCAPE_BASE_SIZE * 0.5 - 90} x={1580} scale={0.8}>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>

		<Container y={LANDSCAPE_BASE_SIZE * 0.5 - 90} x={1715} scale={0.8}>
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
		<Container x={LANDSCAPE_BASE_SIZE * 0.5} y={LANDSCAPE_BASE_SIZE * 0.5 - 140} scale={0.8}>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>

		<Container x={LANDSCAPE_BASE_SIZE * 0.5} y={LANDSCAPE_BASE_SIZE * 0.5} scale={0.8}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>

		<Container x={LANDSCAPE_BASE_SIZE * 0.5} y={LANDSCAPE_BASE_SIZE * 0.5 + 140} scale={0.8}>
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

	<MainContainer standard alignVertical="bottom">
		<Container
			x={165}
			y={context.stateLayoutDerived.mainLayoutStandard().height - LANDSCAPE_BASE_SIZE - 130}
		>
			<Container scale={0.8} y={LANDSCAPE_BASE_SIZE * 0.5 - 150 - 170 * 3}>
				{@render props.buttonPayTable({ anchor: 0.5 })}
			</Container>

			<Container scale={0.8} y={LANDSCAPE_BASE_SIZE * 0.5 - 150 - 170 * 2}>
				{@render props.buttonGameRules({ anchor: 0.5 })}
			</Container>

			<Container scale={0.8} y={LANDSCAPE_BASE_SIZE * 0.5 - 150 - 170 * 1}>
				{@render props.buttonSettings({ anchor: 0.5 })}
			</Container>

			<Container scale={0.8} y={LANDSCAPE_BASE_SIZE * 0.5 - 150}>
				{@render props.buttonSoundSwitch({ anchor: 0.5 })}
			</Container>

			<Container scale={0.8} y={LANDSCAPE_BASE_SIZE * 0.5}>
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			</Container>
		</Container>
	</MainContainer>
{/if}
