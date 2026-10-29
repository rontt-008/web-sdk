import { UI_BASE_SIZE } from './constants';
import { getBuyBonusExtraWidth, type UiLayoutType, type UiTheme } from './theme';

// The measurements of the desktop bar (see LayoutDesktopBar): one centred bar along the bottom of
// the standard layout, four panels with their buttons drawn as bare icons, the spin button over the
// end of the last one and the buy bonus button after it:
// (menu, mute music, mute sounds) (balance      win) (bet ⌃⌄) (turbo, auto spin  SPIN) BUY BONUS
// Sizes are before the whole bar (and the menu over it) is scaled by `scale`. A theme can make it
// more compact, or set turbo apart from the panels (see UiTheme.desktopBar).
const BAR_SCALE = 1.18;
// from the bottom of the screen to the middle of the bar
const BAR_OFFSET = 70;
export const PANEL_HEIGHT = 96;
const PANEL_GAP = 10;
// an icon at a panel's end sits as far in as the middle of a rounded end; text keeps this far from
// the end
const PANEL_END = PANEL_HEIGHT * 0.5;
const TEXT_INSET = 32;
export const ICON_SCALE = 0.62;
// between neighbouring icons
const ICON_STEP = 88;
export const ARROW_SCALE = 0.4;
export const SPIN_SCALE = 0.68;
// between the spin button and the round notch it sits in at the end of the last panel
const NOTCH_GAP = 6;
// a turbo button apart from the panels (see UiTheme.desktopBar.turboApart) is this much as wide as
// they are tall
const TURBO_APART_SIZE = 0.85;
// the boxes the balance, win and bet values shrink to fit
const LABEL_WIDTH = { balance: 200, win: 170, bet: 180 };
const GAP = { small: 16, medium: 20, large: 30 };

type DesktopBarOptions = {
	theme: UiTheme | undefined;
	layoutType: UiLayoutType;
	// the standard layout's size
	standard: { width: number; height: number };
};

// a panel's left end and width; `notch` is the radius of a round notch cut out of its right end
type Panel = { left: number; width: number; notch?: number };

// where everything on the bar goes: x of each panel's left end and width, and of each thing on
// them, from the bar's left end; the bar's left end and middle (y) in the standard layout
export const getDesktopBar = ({ theme, layoutType, standard }: DesktopBarOptions) => {
	const scale = theme?.desktopBar?.scale?.[layoutType] ?? BAR_SCALE;
	const labelWidth = theme?.desktopBar?.labelWidth ?? LABEL_WIDTH;
	const panelGap = theme?.desktopBar?.panelGap ?? PANEL_GAP;
	const labelGap = theme?.desktopBar?.labelGap ?? GAP.large;
	const buttonWidth = UI_BASE_SIZE * (theme?.button.scale ?? 1);
	const iconRadius = buttonWidth * ICON_SCALE * 0.5;
	const arrowRadius = buttonWidth * ARROW_SCALE * 0.5;
	const spinRadius = UI_BASE_SIZE * (theme?.spin.scale ?? 1) * SPIN_SCALE * 0.5;
	// the buy bonus button is as tall as the panels
	const buyBonusScale = PANEL_HEIGHT / buttonWidth;
	const buyBonusWidth = (buttonWidth + getBuyBonusExtraWidth(theme)) * buyBonusScale;
	const showBuyBonus = !theme?.hideBuyBonusOn?.includes(layoutType);
	const showMuteButtons = !!theme?.muteButtons;
	const turboApart = !!theme?.desktopBar?.turboApart;
	const turboApartWidth = PANEL_HEIGHT * TURBO_APART_SIZE;

	// the menu and mute buttons: a panel of their own, or with turbo apart the start of the
	// balance's panel
	const controlsLeft = turboApart ? turboApartWidth + GAP.large : 0;
	const menu = controlsLeft + PANEL_END;
	const muteMusic = menu + ICON_STEP;
	const muteSounds = muteMusic + ICON_STEP;
	const lastControl = showMuteButtons ? muteSounds : menu;
	const controls = { left: controlsLeft, width: lastControl + PANEL_END - controlsLeft };

	const infoLeft = turboApart ? controlsLeft : controls.left + controls.width + panelGap;
	const balance = turboApart ? lastControl + iconRadius + GAP.large : infoLeft + TEXT_INSET;
	const win = balance + labelWidth.balance + labelGap + labelWidth.win;
	const info = { left: infoLeft, width: win + TEXT_INSET - infoLeft };

	const betLeft = info.left + info.width + panelGap;
	const bet = betLeft + TEXT_INSET;
	const betArrows = bet + labelWidth.bet + GAP.small + arrowRadius;
	const betPanel = { left: betLeft, width: betArrows + PANEL_END - betLeft };

	const playLeft = betPanel.left + betPanel.width + panelGap;
	const turbo = turboApart ? turboApartWidth * 0.5 : playLeft + PANEL_END;
	const autoSpin = turboApart ? playLeft + PANEL_END : turbo + ICON_STEP;
	const spin = autoSpin + iconRadius + GAP.small + spinRadius;
	// runs to the middle of the spin button, with a round notch (this radius) cut out around it
	const play = { left: playLeft, width: spin - playLeft, notch: spinRadius + NOTCH_GAP };

	const buyBonus = spin + spinRadius + GAP.medium + buyBonusWidth * 0.5;
	const width = showBuyBonus ? buyBonus + buyBonusWidth * 0.5 : spin + spinRadius;

	return {
		left: (standard.width - width * scale) * 0.5,
		y: standard.height - BAR_OFFSET * scale,
		width,
		scale,
		labelWidth,
		panelGap,
		panels: (turboApart ? [info, betPanel, play] : [controls, info, betPanel, play]) as Panel[],
		showBuyBonus,
		showMuteButtons,
		turboApart,
		// how much a turbo button apart from the panels is scaled
		turboScale: turboApartWidth / buttonWidth,
		buyBonusScale,
		menu,
		muteMusic,
		muteSounds,
		balance,
		win,
		bet,
		betArrows,
		turbo,
		autoSpin,
		spin,
		buyBonus,
	};
};

// Where the desktop bar is in the standard layout (drawn at its bottom): its two ends and the top
// and bottom of its panels. For games to place things on or around it.
export const getDesktopBarBounds = (options: DesktopBarOptions) => {
	const bar = getDesktopBar(options);
	const halfHeight = (PANEL_HEIGHT * bar.scale) / 2;
	return {
		left: bar.left,
		right: bar.left + bar.width * bar.scale,
		top: bar.y - halfHeight,
		bottom: bar.y + halfHeight,
	};
};
