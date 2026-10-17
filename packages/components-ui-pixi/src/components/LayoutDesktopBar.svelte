<script lang="ts">
	import { stateSound, stateUi } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import type * as PIXI from 'pixi.js';
	import { Container, Graphics, Rectangle } from 'pixi-svelte';

	import UiVolumeSlider from './UiVolumeSlider.svelte';
	import { getContext } from '../context';
	import { getMenuButtons, getPanelCornerRadius, getUiTheme } from '../theme';
	import {
		ARROW_SCALE,
		BAR_SCALE,
		ICON_SCALE,
		LABEL_WIDTH,
		PANEL_GAP,
		PANEL_HEIGHT,
		SPIN_SCALE,
		getDesktopBar,
	} from '../desktopBar';
	import type { LayoutUiProps } from '../types';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const theme = getUiTheme();
	const menuButtons = $derived(getMenuButtons(props, theme));

	// One centred bar along the bottom of the standard layout (measured in desktopBar.ts): four
	// panels with their buttons drawn as bare icons, the spin button in a round notch at the end of
	// the last one and the buy bonus button after it.
	const ARROW_OFFSET = 24; // from the middle of the bar to the middle of each arrow
	const LABEL_SCALE = 0.75;
	// the menu item buttons are 1.3x the size of the others; scaled to match the close button
	const CLOSE_SCALE = 0.7;
	const MENU_ITEM_SCALE = CLOSE_SCALE / 1.3;
	const MENU_ITEM_SPACING = 110;

	const bar = $derived(
		getDesktopBar({
			theme,
			layoutType: context.stateLayoutDerived.layoutType(),
			standard: context.stateLayoutDerived.mainLayoutStandard(),
		}),
	);
	const barY = $derived(bar.y);
	const showBuyBonus = $derived(bar.showBuyBonus);
	const showMuteButtons = $derived(bar.showMuteButtons);
	const buyBonusScale = $derived(bar.buyBonusScale);

	// a panel whose right end is cut away in a circle (of radius `notch`) centred on that end, for the
	// spin button to sit in with a gap around it
	const drawNotchedPanel = (
		graphics: PIXI.Graphics,
		left: number,
		width: number,
		notch: number,
	) => {
		const half = PANEL_HEIGHT * 0.5;
		const corner = getPanelCornerRadius(theme, PANEL_HEIGHT);
		const right = left + width;
		// the circle meets the top and bottom edges this far left of the end; one too small to reach
		// them leaves a square end with the notch in it
		const reaches = notch > half;
		const inset = reaches ? Math.sqrt(notch * notch - half * half) : 0;
		const angle = Math.atan2(Math.min(notch, half), inset);

		graphics.moveTo(left, 0).arcTo(left, -half, right, -half, corner);
		if (!reaches) graphics.lineTo(right, -half);
		graphics.arc(right, 0, notch, angle - Math.PI, Math.PI - angle, true);
		if (!reaches) graphics.lineTo(right, half);
		graphics
			.arcTo(left, half, left, 0, corner)
			.closePath()
			.fill({ color: theme?.label.panel ?? 0x000000, alpha: theme?.label.panelAlpha ?? 1 })
			.stroke({
				color: theme?.outline ?? 0x000000,
				width: theme?.outlineWidth ?? 0,
				alpha: theme?.outlineAlpha ?? 1,
			});
	};
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
			{#if panel.notch}
				<Graphics
					draw={(graphics) => drawNotchedPanel(graphics, panel.left, panel.width, panel.notch!)}
				/>
			{:else}
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
			{/if}
		{/each}

		{#if !stateUi.menuOpen}
			<Container x={bar.menu} scale={ICON_SCALE}>
				{@render props.buttonMenu({ anchor: 0.5, bare: true })}
			</Container>
		{/if}

		<!-- hovering either mute button opens a volume slider above it -->
		{#if showMuteButtons}
			<UiVolumeSlider
				x={bar.muteMusic}
				bind:value={stateSound.volumeValueMusic}
				buttonSize={PANEL_HEIGHT}
				gap={PANEL_GAP}
			>
				<Container scale={ICON_SCALE}>
					{@render props.buttonMuteMusic({ anchor: 0.5, bare: true })}
				</Container>
			</UiVolumeSlider>

			<UiVolumeSlider
				x={bar.muteSounds}
				bind:value={stateSound.volumeValueSoundEffect}
				buttonSize={PANEL_HEIGHT}
				gap={PANEL_GAP}
			>
				<Container scale={ICON_SCALE}>
					{@render props.buttonMuteSounds({ anchor: 0.5, bare: true })}
				</Container>
			</UiVolumeSlider>
		{/if}

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
