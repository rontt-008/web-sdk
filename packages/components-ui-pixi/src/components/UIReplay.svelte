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
	import { getUiTheme } from '../theme';
	import { getSmallScreenBoost } from '../smallScreen';
	import type { LayoutUiProps } from '../types';
	import LabelFreeSpinCounter from './LabelFreeSpinCounter.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE, UI_THEMED_LABEL_SIZES } from '../constants';

	type Props = {
		gameName: LayoutUiProps['gameName'];
		logo: LayoutUiProps['logo'];
	};

	const props: Props = $props();
	const context = getContext();
	const theme = getUiTheme();
	// stacked up from the menu's close button, top first; the replay has no mute buttons, so it keeps
	// the sound switch
	const replayMenuButtons = [
		...(theme?.hidePayTable ? [] : [ButtonPayTable]),
		ButtonGameRules,
		...(theme?.hideSettings ? [] : [ButtonSettings]),
		ButtonSoundSwitch,
	];

	// wide screens put everything in one row under the board, tall ones stack it
	const wide = $derived(['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType()));
	const center = $derived(context.stateLayoutDerived.mainLayoutStandard().width * 0.5);
	const height = $derived(context.stateLayoutDerived.mainLayoutStandard().height);
	const rowY = $derived(height - 95);
	// half a button (UI_BASE_SIZE at scale 0.7), and the middle of a stacked label (at scale 0.8)
	const BUTTON_HALF = UI_BASE_SIZE * 0.7 * 0.5;
	const LABEL_CENTER = (UI_THEMED_LABEL_SIZES.height * 0.5 - UI_BASE_FONT_SIZE * 0.35) * 0.8;

	// on very small screens the row is drawn bigger (see getSmallScreenBoost) and packed closer
	// around the middle so it still fits: menu, turbo | win, bet, real cost | replay
	const boost = $derived(
		getSmallScreenBoost(context.stateLayoutDerived.mainLayoutStandard().scale),
	);
	// the menu opens over the menu button at its size
	const menuBoost = $derived(wide ? boost : 1);
	const ROW_GAP = 24;
	const rowX = $derived.by(() => {
		if (boost === 1) {
			return {
				menu: center - 720,
				turbo: center - 600,
				win: center - 330,
				realCost: center + 330,
				replay: center + 600,
			};
		}
		const button = UI_BASE_SIZE * (theme?.button.scale ?? 1) * 0.7 * boost;
		const replay = UI_BASE_SIZE * (theme?.spin.scale ?? 1) * 0.7 * boost;
		const label =
			(theme ? UI_THEMED_LABEL_SIZES.width : UI_BASE_FONT_SIZE * 3 * (326 / 73)) * 0.8 * boost;
		const labelStep = label + ROW_GAP;
		return {
			menu: center - labelStep - label * 0.5 - ROW_GAP * 2 - button * 1.5,
			turbo: center - labelStep - label * 0.5 - ROW_GAP - button * 0.5,
			win: center - labelStep,
			realCost: center + labelStep,
			replay: center + labelStep + label * 0.5 + ROW_GAP + replay * 0.5,
		};
	});
</script>

{#if theme?.spaceHoldSpins !== false}
	<EnableSpaceHold />
{/if}

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
			<Container x={rowX.menu} y={rowY} scale={0.7 * boost}>
				<ButtonMenu anchor={0.5} keepMenu />
			</Container>
			<Container x={rowX.turbo} y={rowY} scale={0.7 * boost}>
				<ButtonTurbo anchor={0.5} />
			</Container>
			<Container x={rowX.win} y={rowY - LABEL_CENTER * boost} scale={0.8 * boost}>
				<LabelWin stacked />
			</Container>
			<Container x={center} y={rowY - LABEL_CENTER * boost} scale={0.8 * boost}>
				<LabelReplayBet stacked />
			</Container>
			<Container x={rowX.realCost} y={rowY - LABEL_CENTER * boost} scale={0.8 * boost}>
				<LabelReplayBet realCost stacked />
			</Container>
			<!-- raised a little so its caption underneath stays on screen -->
			<Container x={rowX.replay} y={rowY - 20 * boost} scale={0.7 * boost}>
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
				<ButtonMenu keepMenu />
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
			<Container x={wide ? rowX.menu : center - 350} y={wide ? rowY : height - 390 - 15}>
				{#each replayMenuButtons as MenuButton, index}
					<Container
						scale={0.8 * menuBoost}
						y={-(150 + 170 * (replayMenuButtons.length - 1 - index)) * menuBoost}
					>
						<MenuButton anchor={0.5} />
					</Container>
				{/each}

				<Container scale={0.8 * menuBoost}>
					<ButtonMenuClose anchor={0.5} />
				</Container>
			</Container>
		</MainContainer>
	{/if}
</UiFadeContainer>
