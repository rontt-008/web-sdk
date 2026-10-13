<script lang="ts">
	import { EnableSpaceHold } from 'components-shared';

	import UiFadeContainer from './UiFadeContainer.svelte';
	import LabelWin from './LabelWin.svelte';
	import LabelReplayBet from './LabelReplayBet.svelte';
	import ButtonReplay from './ButtonReplay.svelte';
	import ButtonPayTable from './ButtonPayTable.svelte';
	import ButtonGameRules from './ButtonGameRules.svelte';
	import ButtonSettings from './ButtonSettings.svelte';
	import ButtonTurbo from './ButtonTurbo.svelte';
	import ButtonMenu from './ButtonMenu.svelte';
	import ButtonMenuClose from './ButtonMenuClose.svelte';
	import ButtonSoundSwitch from './ButtonSoundSwitch.svelte';
	import { stateUi } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle } from 'pixi-svelte';
	import { getContext } from '../context';
	import type { LayoutUiProps } from '../types';
	import LabelFreeSpinCounter from './LabelFreeSpinCounter.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE, UI_THEMED_LABEL_SIZES } from '../constants';

	type Props = {
		gameName: LayoutUiProps['gameName'];
		logo: LayoutUiProps['logo'];
	};

	const props: Props = $props();
	const context = getContext();

	// wide screens put everything in one row under the board, tall ones stack it
	const wide = $derived(['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType()));
	const center = $derived(context.stateLayoutDerived.mainLayoutStandard().width * 0.5);
	const height = $derived(context.stateLayoutDerived.mainLayoutStandard().height);
	const rowY = $derived(height - 95);
	// half a button (UI_BASE_SIZE at scale 0.7), and the middle of a stacked label (at scale 0.8)
	const BUTTON_HALF = UI_BASE_SIZE * 0.7 * 0.5;
	const LABEL_CENTER = (UI_THEMED_LABEL_SIZES.height * 0.5 - UI_BASE_FONT_SIZE * 0.35) * 0.8;
</script>

<EnableSpaceHold />

<UiFadeContainer>
	<Container x={20}>
		{@render props.gameName()}
	</Container>

	<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
		{@render props.logo()}
	</Container>

	<MainContainer standard alignVertical="bottom">
		{#if stateUi.freeSpinCounterShow && !wide}
			<Container x={center} y={120}>
				<LabelFreeSpinCounter stacked />
			</Container>
		{/if}

		{#if wide}
			<!-- one row under the board: menu, turbo, win, bet, real cost, replay -->
			<Container x={center - 720 - BUTTON_HALF} y={rowY - BUTTON_HALF} scale={0.7}>
				<ButtonMenu />
			</Container>
			<Container x={center - 600 - BUTTON_HALF} y={rowY - BUTTON_HALF} scale={0.7}>
				<ButtonTurbo />
			</Container>
			<Container x={center - 330} y={rowY - LABEL_CENTER} scale={0.8}>
				<LabelWin stacked />
			</Container>
			<Container x={center} y={rowY - LABEL_CENTER} scale={0.8}>
				<LabelReplayBet stacked />
			</Container>
			<Container x={center + 330} y={rowY - LABEL_CENTER} scale={0.8}>
				<LabelReplayBet realCost stacked />
			</Container>
			<!-- raised a little so its caption underneath stays on screen -->
			<Container x={center + 600} y={rowY - 20} scale={0.7}>
				<ButtonReplay anchor={0.5} />
			</Container>
		{:else}
			<!-- stacked under the board: win, bet and real cost in the middle, buttons at the sides -->
			<Container x={center} y={height - 390} scale={0.8}>
				<LabelWin stacked />
			</Container>
			<Container x={center} y={height - 270} scale={0.8}>
				<LabelReplayBet stacked />
			</Container>
			<Container x={center} y={height - 150} scale={0.8}>
				<LabelReplayBet realCost stacked />
			</Container>
			<Container x={center - 350} y={height - 390 - 15} scale={0.7}>
				<ButtonMenu />
			</Container>
			<Container x={center - 350} y={height - 270 - 15} scale={0.7}>
				<ButtonTurbo />
			</Container>
			<Container x={center + 350} y={height - 390 - 15 + BUTTON_HALF} scale={0.7}>
				<ButtonReplay anchor={0.5} />
			</Container>
		{/if}
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
			<!-- over the menu button, with its close button where the menu button is -->
			<Container x={wide ? center - 720 : center - 350} y={wide ? rowY : height - 390 - 15}>
				<Container scale={0.8} y={0 * 0.5 - 150 - 170 * 3}>
					<ButtonPayTable anchor={0.5} />
				</Container>

				<Container scale={0.8} y={0 * 0.5 - 150 - 170 * 2}>
					<ButtonGameRules anchor={0.5} />
				</Container>

				<Container scale={0.8} y={0 * 0.5 - 150 - 170 * 1}>
					<ButtonSettings anchor={0.5} />
				</Container>

				<Container scale={0.8} y={0 * 0.5 - 150}>
					<ButtonSoundSwitch anchor={0.5} />
				</Container>

				<Container scale={0.8} y={0 * 0.5}>
					<ButtonMenuClose anchor={0.5} />
				</Container>
			</Container>
		</MainContainer>
	{/if}
</UiFadeContainer>
