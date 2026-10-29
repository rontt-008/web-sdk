<script lang="ts">
	import { stateSound, stateUi } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle } from 'pixi-svelte';

	import UiVolumeSlider from './UiVolumeSlider.svelte';
	import { getContext } from '../context';
	import {
		getBuyBonusExtraWidth,
		getMenuButtons,
		getPanelCornerRadius,
		getUiTheme,
		type UiLayoutType,
	} from '../theme';
	import { UI_BASE_SIZE } from '../constants';
	import type { LayoutUiProps } from '../types';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const theme = getUiTheme();
	const menuButtons = $derived(getMenuButtons(props, theme));

	// The controls on two boxes in the bottom corners of the screen, and the win in the middle
	// between them, on the game's art:
	// (menu, mute music, mute sounds, buy bonus, balance)   win   (bet, + over -, SPIN, turbo, auto spin)
	// Each group is pinned to its corner (or the middle) of the screen's bottom, so on very wide
	// screens the corners stay in the corners. Sizes are how big each thing shows, in the standard
	// layout's units, before its group is scaled by GROUP_SCALE.
	// the tablet's standard layout is square (1920 x 1920), so everything is a little bigger there
	const GROUP_SCALE: Partial<Record<UiLayoutType, number>> = { tablet: 1.1 };
	// from the sides and the bottom of the screen to the boxes
	const MARGIN = 24;
	// the boxes hold the spin button with a little room around it
	const BOX_HEIGHT = 136;
	// from the middle of the row to the bottom of the screen
	const ROW = MARGIN + BOX_HEIGHT * 0.5;
	// a button at a box's end sits in the middle of its round end; text keeps this far from the end
	const BOX_END = BOX_HEIGHT * 0.5;
	const TEXT_INSET = 40;
	const BUTTON = 56;
	const SPIN = 120;
	// the + and - beside the bet, one over the other with this gap between them
	const BET_BUTTON = 44;
	const BET_BUTTON_GAP = 8;
	const BUY_BONUS = 88;
	// the boxes the balance, bet and win shrink to fit, and how big their text is
	const TEXT_WIDTH = { balance: 240, bet: 180, win: 360 };
	const WIN_SCALE = 1.2;
	const GAP = { small: 14, medium: 22, large: 30 };
	// between the menu's buttons, stacked up from the menu button above its box
	const MENU_ITEM_SPACING = 72;
	const MENU_ITEM_LIFT = 44;

	// how big a round button, the spin button and the buy bonus button show at scale 1
	const buttonFace = UI_BASE_SIZE * (theme?.button.scale ?? 1);
	const buttonScale = BUTTON / buttonFace;
	const betButtonScale = BET_BUTTON / buttonFace;
	const spinScale = SPIN / (UI_BASE_SIZE * (theme?.spin.scale ?? 1));
	const buyBonusScale = BUY_BONUS / buttonFace;
	const buyBonusWidth = (buttonFace + getBuyBonusExtraWidth(theme)) * buyBonusScale;
	// the menu item buttons are 1.3x the size of the others, so scale them back to match
	const menuItemScale = buttonScale / 1.3;

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const standard = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const groupScale = $derived(GROUP_SCALE[layoutType] ?? 1);
	const showBuyBonus = $derived(!theme?.hideBuyBonusOn?.includes(layoutType));
	const showMuteButtons = !!theme?.muteButtons;

	// a box from its side of the screen inwards, the first button in the middle of its round end:
	// how far in from that side the middle of each thing on it is ([key, width, gap before it]), and
	// how wide the box is
	const lineUpBox = (items: (readonly [string, number, number])[]) => {
		let edge = MARGIN + BOX_END - items[0][1] * 0.5;
		const centers: Record<string, number> = {};
		for (const [key, width, gap] of items) {
			edge += gap;
			centers[key] = edge + width * 0.5;
			edge += width;
		}
		return { centers, width: edge + TEXT_INSET - MARGIN };
	};

	const left = $derived(
		lineUpBox([
			['menu', BUTTON, 0],
			...(showMuteButtons
				? [['muteMusic', BUTTON, GAP.small] as const, ['muteSounds', BUTTON, GAP.small] as const]
				: []),
			...(showBuyBonus ? [['buyBonus', buyBonusWidth, GAP.medium] as const] : []),
			['balance', TEXT_WIDTH.balance, GAP.large],
		]),
	);

	// from the right side, so these are subtracted from it
	const right = lineUpBox([
		['autoSpin', BUTTON, 0],
		['turbo', BUTTON, GAP.small],
		['spin', SPIN, GAP.medium],
		['betButtons', BET_BUTTON, GAP.medium],
		['bet', TEXT_WIDTH.bet, GAP.medium],
	]);

	const boxProps = {
		anchor: { x: 0, y: 0.5 },
		y: -ROW,
		height: BOX_HEIGHT,
		borderRadius: getPanelCornerRadius(theme, BOX_HEIGHT),
		backgroundColor: theme?.label.panel ?? 0x000000,
		backgroundAlpha: theme?.label.panelAlpha ?? 1,
		borderColor: theme?.outline,
		borderWidth: theme?.outlineWidth,
		borderAlpha: theme?.outlineAlpha,
	};
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<!-- bottom left: menu, sound, buy bonus and the balance -->
<MainContainer standard alignVertical="bottom" alignHorizontal="left">
	<Container y={standard.height} scale={groupScale}>
		<Rectangle {...boxProps} x={MARGIN} width={left.width} />

		{#if !stateUi.menuOpen}
			<Container x={left.centers.menu} y={-ROW} scale={buttonScale}>
				{@render props.buttonMenu({ anchor: 0.5 })}
			</Container>
		{/if}

		<!-- hovering either mute button opens a volume slider above its box -->
		{#if showMuteButtons}
			<UiVolumeSlider
				x={left.centers.muteMusic}
				y={-ROW}
				bind:value={stateSound.volumeValueMusic}
				buttonSize={BUTTON}
				gap={(BOX_HEIGHT - BUTTON) * 0.5 + GAP.small}
			>
				<Container scale={buttonScale}>
					{@render props.buttonMuteMusic({ anchor: 0.5 })}
				</Container>
			</UiVolumeSlider>

			<UiVolumeSlider
				x={left.centers.muteSounds}
				y={-ROW}
				bind:value={stateSound.volumeValueSoundEffect}
				buttonSize={BUTTON}
				gap={(BOX_HEIGHT - BUTTON) * 0.5 + GAP.small}
			>
				<Container scale={buttonScale}>
					{@render props.buttonMuteSounds({ anchor: 0.5 })}
				</Container>
			</UiVolumeSlider>
		{/if}

		{#if showBuyBonus}
			<Container x={left.centers.buyBonus} y={-ROW} scale={buyBonusScale}>
				{@render props.buttonBuyBonus({ anchor: 0.5 })}
			</Container>
		{/if}

		<Container x={left.centers.balance - TEXT_WIDTH.balance * 0.5} y={-ROW}>
			{@render props.amountBalance({ plain: { width: TEXT_WIDTH.balance, align: 'left' } })}
		</Container>
	</Container>
</MainContainer>

<!-- bottom middle: the win, outlined on the game's art -->
<MainContainer standard alignVertical="bottom">
	<Container x={standard.width * 0.5} y={standard.height} scale={groupScale}>
		<Container y={-ROW} scale={WIN_SCALE}>
			{@render props.amountWin({
				plain: { width: TEXT_WIDTH.win / WIN_SCALE, align: 'center', outline: true },
			})}
		</Container>
	</Container>
</MainContainer>

<!-- bottom right: the bet and its + and -, the spin button, turbo and auto spin -->
<MainContainer standard alignVertical="bottom" alignHorizontal="right">
	<Container x={standard.width} y={standard.height} scale={groupScale}>
		<Rectangle {...boxProps} x={-MARGIN - right.width} width={right.width} />

		<Container x={-right.centers.bet - TEXT_WIDTH.bet * 0.5} y={-ROW}>
			{@render props.amountBet({ plain: { width: TEXT_WIDTH.bet, align: 'left' } })}
		</Container>

		<Container
			x={-right.centers.betButtons}
			y={-ROW - (BET_BUTTON + BET_BUTTON_GAP) * 0.5}
			scale={betButtonScale}
		>
			{@render props.buttonIncrease({ anchor: 0.5 })}
		</Container>

		<Container
			x={-right.centers.betButtons}
			y={-ROW + (BET_BUTTON + BET_BUTTON_GAP) * 0.5}
			scale={betButtonScale}
		>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>

		<Container x={-right.centers.spin} y={-ROW} scale={spinScale}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>

		<Container x={-right.centers.turbo} y={-ROW} scale={buttonScale}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>

		<Container x={-right.centers.autoSpin} y={-ROW} scale={buttonScale}>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>
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

	<!-- menu items stack up above the box from the menu button, which turns into the close button -->
	<MainContainer standard alignVertical="bottom" alignHorizontal="left">
		<Container y={standard.height} scale={groupScale}>
			<Container x={left.centers.menu} y={-ROW}>
				{#each menuButtons as button, index}
					<Container
						scale={menuItemScale}
						y={-BOX_HEIGHT * 0.5 -
							MENU_ITEM_LIFT -
							MENU_ITEM_SPACING * (menuButtons.length - 1 - index)}
					>
						{@render button({ anchor: 0.5 })}
					</Container>
				{/each}
				<Container scale={buttonScale}>
					{@render props.buttonMenuClose({ anchor: 0.5 })}
				</Container>
			</Container>
		</Container>
	</MainContainer>
{/if}
