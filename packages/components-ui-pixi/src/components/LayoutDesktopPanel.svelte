<script lang="ts">
	import { stateBet, stateConfig, stateSound, stateUi } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import type * as PIXI from 'pixi.js';
	import { Container, Graphics, Rectangle } from 'pixi-svelte';

	import UiVolumeSlider from './UiVolumeSlider.svelte';
	import { getContext } from '../context';
	import { getMenuButtons, getUiTheme, type UiLayoutType } from '../theme';
	import { UI_BASE_SIZE } from '../constants';
	import { strokeTopInside } from '../draw';
	import type { LayoutUiProps } from '../types';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const theme = getUiTheme();
	const menuButtons = $derived(getMenuButtons(props, theme));

	// A chunky bar along the bottom of the standard layout, centred and only as wide as what is on it,
	// its look from the theme (see UiTheme.shadow and UiTheme.panelBar):
	// (BUY BONUS) [menu, mute music, mute sounds | balance     (win)     (- bet + ) (SPIN] auto spin
	//                                                                                  turbo
	// the buy bonus button a disc as tall as the panel at its left, the win in a recessed well in the
	// middle, the bet in a recessed well at the right end, under the spin disc, which hangs over the
	// panel's end, and auto spin over turbo beside it. Sizes are before the whole bar is scaled by
	// SCALE (the tablet's standard layout is square, 1920 x 1920, so it is bigger there).
	const SCALE: Partial<Record<UiLayoutType, number>> = { desktop: 1.05, tablet: 1.3 };
	// from the bottom of the screen to the bar
	const BOTTOM = 14;
	// the panel, and the buy bonus disc
	const HEIGHT = 124;
	const SHADOW_DROP = 5;
	const RADIUS = 26;
	// between the disc, the panel and the column of auto spin and turbo, which keeps clear of the spin
	// disc hanging over the panel's end
	const GAP = 12;
	const COLUMN_GAP = 28;
	// from the panel's edge to its first button
	const PADDING = 20;
	const BUTTON = 56;
	const COLUMN_BUTTON = 52;
	const BET_BUTTON = 54;
	const SPIN = 156;
	// the spin disc reaches this far past the panel's end
	const SPIN_OVERHANG = 30;
	const DIVIDER = { width: 3, height: 62, before: 16, after: 14 };
	const HIGHLIGHT = { width: 3, alpha: 0.08 };
	// the balance's text box, the win's well (with this much room either side of it) and the bet's
	// well (with the room the spin disc covers: it covers 122, the rest is the gap before it)
	const BALANCE_WIDTH = 185;
	const WIN_WELL = { width: 204, height: 72, border: 3, ring: 3, gap: 20 };
	const BET_WELL = { margin: 6, padding: 12, middle: 190, spin: 146, radius: 44 };
	const BET_LEVEL = { width: 160, height: 5 };
	// the amounts' text: how big (the value is 42.75 at scale 1), and how far up to centre it
	const TEXT = { balance: 0.7, win: 0.7, bet: 0.8 };
	const TEXT_LIFT = { balance: 2, win: 2, bet: 7 };
	const BET_LEVEL_DROP = 31;
	const MENU_ITEM_SPACING = 72;
	const MENU_ITEM_LIFT = 44;

	const row = -(BOTTOM + HEIGHT * 0.5);
	const buttonFace = UI_BASE_SIZE * (theme?.button.scale ?? 1);
	const spinFace = UI_BASE_SIZE * (theme?.spin.scale ?? 1);
	const outline = theme?.outline ?? 0x000000;
	const shadowColor = theme?.shadow?.color ?? 0x000000;
	const highlight = theme?.shadow?.highlight;
	const bar = theme?.panelBar;

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const standard = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const scale = $derived(SCALE[layoutType] ?? SCALE.desktop!);
	const showBuyBonus = $derived(!theme?.hideBuyBonusOn?.includes(layoutType));
	const showMuteButtons = !!theme?.muteButtons;

	// where everything goes, from the bar's left end, and where that is (`left`): the bar centred in the
	// standard layout
	const x = $derived.by(() => {
		const border = bar?.outlineWidth ?? 0;
		const buyBonus = HEIGHT * 0.5;
		const panelLeft = showBuyBonus ? HEIGHT + GAP : 0;

		const menu = panelLeft + border + PADDING + BUTTON * 0.5;
		const muteMusic = menu + BUTTON + GAP;
		const muteSounds = muteMusic + BUTTON + GAP;
		const lastButton = showMuteButtons ? muteSounds : menu;
		const divider = lastButton + BUTTON * 0.5 + DIVIDER.before;
		const balance = divider + DIVIDER.width + DIVIDER.after;

		const winWellWidth = WIN_WELL.width + WIN_WELL.ring * 2;
		const win = balance + BALANCE_WIDTH + WIN_WELL.gap + winWellWidth * 0.5;

		const betWellWidth = BET_WELL.padding + BET_BUTTON * 2 + BET_WELL.middle + BET_WELL.spin;
		const betWellLeft = win + winWellWidth * 0.5 + WIN_WELL.gap;
		const decrease = betWellLeft + BET_WELL.padding + BET_BUTTON * 0.5;
		const bet = decrease + BET_BUTTON * 0.5 + BET_WELL.middle * 0.5;
		const increase = bet + BET_WELL.middle * 0.5 + BET_BUTTON * 0.5;

		const panelRight = betWellLeft + betWellWidth + border;
		const spin = panelRight + SPIN_OVERHANG - SPIN * 0.5;
		const column = panelRight + GAP + COLUMN_GAP + COLUMN_BUTTON * 0.5;

		const width = column + COLUMN_BUTTON * 0.5;

		return {
			left: (standard.width - width * scale) * 0.5,
			buyBonus,
			panelLeft,
			panelRight,
			column,
			menu,
			muteMusic,
			muteSounds,
			divider,
			balance,
			win,
			betWellLeft,
			betWellWidth,
			decrease,
			bet,
			increase,
			spin,
		};
	});

	// how far up the bet levels the bet is, 0 to 1
	const betLevel = $derived.by(() => {
		const options = [...stateConfig.betAmountOptions].sort((a, b) => a - b);
		if (options.length < 2) return 1;
		return Math.max(0, options.indexOf(stateBet.betAmount)) / (options.length - 1);
	});

	const drawPanel = (graphics: PIXI.Graphics) => {
		const width = x.panelRight - x.panelLeft;
		const centerX = x.panelLeft + width * 0.5;
		graphics
			.roundRect(x.panelLeft, row - HEIGHT * 0.5 + SHADOW_DROP, width, HEIGHT, RADIUS)
			.fill({ color: shadowColor })
			.roundRect(x.panelLeft, row - HEIGHT * 0.5, width, HEIGHT, RADIUS)
			.fill({ color: theme?.label.panel ?? 0x000000, alpha: theme?.label.panelAlpha ?? 1 })
			.stroke({ color: outline, width: bar?.outlineWidth ?? 0, alignment: 1 });
		if (highlight) {
			strokeTopInside(graphics, {
				x: centerX,
				y: row,
				width,
				height: HEIGHT,
				radius: RADIUS,
				inset: (bar?.outlineWidth ?? 0) + HIGHLIGHT.width * 0.5,
				lineWidth: HIGHLIGHT.width,
				color: highlight.color,
				alpha: HIGHLIGHT.alpha,
			});
		}
	};

	// a recessed well: its fill, a dark line along its top inside, and its border (and a ring of the
	// outline around that, for the win's)
	const drawWell = (
		graphics: PIXI.Graphics,
		well: { left: number; width: number; height: number; radius: number; fill: number },
		border?: { width: number; color: number; ring: number },
	) => {
		const top = row - well.height * 0.5;
		if (border) {
			graphics
				.roundRect(
					well.left - border.ring,
					top - border.ring,
					well.width + border.ring * 2,
					well.height + border.ring * 2,
					well.radius + border.ring,
				)
				.fill({ color: outline });
		}
		graphics
			.roundRect(well.left, top, well.width, well.height, well.radius)
			.fill({ color: well.fill });
		strokeTopInside(graphics, {
			x: well.left + well.width * 0.5,
			y: row,
			width: well.width,
			height: well.height,
			radius: well.radius,
			inset: (border?.width ?? 0) + 2.5,
			lineWidth: 5,
			color: 0x000000,
			alpha: 0.4,
		});
		if (border) {
			graphics
				.roundRect(well.left, top, well.width, well.height, well.radius)
				.stroke({ color: border.color, width: border.width, alignment: 1 });
		}
	};
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	<Container x={x.left} y={standard.height} {scale}>
		{#if showBuyBonus}
			<Container x={x.buyBonus} y={row} scale={HEIGHT / buttonFace}>
				{@render props.buttonBuyBonus({ anchor: 0.5 })}
			</Container>
		{/if}

		<Graphics draw={drawPanel} />

		{#if !stateUi.menuOpen}
			<Container x={x.menu} y={row} scale={BUTTON / buttonFace}>
				{@render props.buttonMenu({ anchor: 0.5 })}
			</Container>
		{/if}

		<!-- hovering either mute button opens a volume slider above the bar -->
		{#if showMuteButtons}
			<UiVolumeSlider
				x={x.muteMusic}
				y={row}
				bind:value={stateSound.volumeValueMusic}
				buttonSize={BUTTON}
				gap={(HEIGHT - BUTTON) * 0.5 + GAP}
			>
				<Container scale={BUTTON / buttonFace}>
					{@render props.buttonMuteMusic({ anchor: 0.5 })}
				</Container>
			</UiVolumeSlider>

			<UiVolumeSlider
				x={x.muteSounds}
				y={row}
				bind:value={stateSound.volumeValueSoundEffect}
				buttonSize={BUTTON}
				gap={(HEIGHT - BUTTON) * 0.5 + GAP}
			>
				<Container scale={BUTTON / buttonFace}>
					{@render props.buttonMuteSounds({ anchor: 0.5 })}
				</Container>
			</UiVolumeSlider>
		{/if}

		<Rectangle
			x={x.divider}
			y={row}
			anchor={{ x: 0, y: 0.5 }}
			width={DIVIDER.width}
			height={DIVIDER.height}
			borderRadius={DIVIDER.width * 0.5}
			backgroundColor={bar?.divider ?? outline}
		/>

		<Container x={x.balance} y={row - TEXT_LIFT.balance} scale={TEXT.balance}>
			{@render props.amountBalance({
				plain: { width: BALANCE_WIDTH / TEXT.balance, align: 'left' },
			})}
		</Container>

		<Graphics
			draw={(graphics) =>
				drawWell(
					graphics,
					{
						left: x.win - WIN_WELL.width * 0.5,
						width: WIN_WELL.width,
						height: WIN_WELL.height,
						radius: WIN_WELL.height * 0.5,
						fill: bar?.well.fill ?? 0x000000,
					},
					{ width: WIN_WELL.border, color: bar?.well.border ?? outline, ring: WIN_WELL.ring },
				)}
		/>

		<Container x={x.win} y={row - TEXT_LIFT.win} scale={TEXT.win}>
			{@render props.amountWin({
				plain: {
					width: (WIN_WELL.width - WIN_WELL.height * 0.5) / TEXT.win,
					align: 'center',
				},
			})}
		</Container>

		<!-- the bet's well runs on under the spin disc, which hides its right end -->
		<Graphics
			draw={(graphics) =>
				drawWell(graphics, {
					left: x.betWellLeft,
					width: x.betWellWidth,
					height: HEIGHT - (bar?.outlineWidth ?? 0) * 2 - BET_WELL.margin * 2,
					radius: BET_WELL.radius,
					fill: bar?.betWell ?? 0x000000,
				})}
		/>

		<Container x={x.decrease} y={row} scale={BET_BUTTON / buttonFace}>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>

		<Container x={x.bet} y={row - TEXT_LIFT.bet} scale={TEXT.bet}>
			{@render props.amountBet({
				plain: { width: BET_WELL.middle / TEXT.bet, align: 'center' },
			})}
		</Container>

		<Rectangle
			x={x.bet - BET_LEVEL.width * 0.5}
			y={row + BET_LEVEL_DROP}
			width={BET_LEVEL.width}
			height={BET_LEVEL.height}
			borderRadius={BET_LEVEL.height * 0.5}
			backgroundColor={bar?.betLevel.track ?? outline}
		/>
		{#if betLevel > 0}
			<Rectangle
				x={x.bet - BET_LEVEL.width * 0.5}
				y={row + BET_LEVEL_DROP}
				width={Math.max(BET_LEVEL.height, BET_LEVEL.width * betLevel)}
				height={BET_LEVEL.height}
				borderRadius={BET_LEVEL.height * 0.5}
				backgroundColor={bar?.betLevel.fill ?? 0xffffff}
			/>
		{/if}

		<Container x={x.increase} y={row} scale={BET_BUTTON / buttonFace}>
			{@render props.buttonIncrease({ anchor: 0.5 })}
		</Container>

		<Container x={x.spin} y={row} scale={SPIN / spinFace}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>

		<Container
			x={x.column}
			y={row - (COLUMN_BUTTON + GAP) * 0.5}
			scale={COLUMN_BUTTON / buttonFace}
		>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>

		<Container
			x={x.column}
			y={row + (COLUMN_BUTTON + GAP) * 0.5}
			scale={COLUMN_BUTTON / buttonFace}
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
		backgroundColor={0x000000}
		width={context.stateLayoutDerived.canvasSizes().width}
		height={context.stateLayoutDerived.canvasSizes().height}
		x={context.stateLayoutDerived.canvasSizes().width * 0.5}
		y={context.stateLayoutDerived.canvasSizes().height * 0.5}
		onpointerup={() => (stateUi.menuOpen = false)}
	/>

	<!-- menu items stack up above the bar from the menu button, which turns into the close button -->
	<MainContainer standard alignVertical="bottom">
		<Container x={x.left} y={standard.height} {scale}>
			<Container x={x.menu} y={row}>
				{#each menuButtons as button, index}
					<Container
						scale={BUTTON / buttonFace / 1.3}
						y={-HEIGHT * 0.5 -
							MENU_ITEM_LIFT -
							MENU_ITEM_SPACING * (menuButtons.length - 1 - index)}
					>
						{@render button({ anchor: 0.5 })}
					</Container>
				{/each}
				<Container scale={BUTTON / buttonFace}>
					{@render props.buttonMenuClose({ anchor: 0.5 })}
				</Container>
			</Container>
		</Container>
	</MainContainer>
{/if}
