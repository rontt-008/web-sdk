import type { UiLayoutType, UiTheme } from './theme';

// The measurements of the chunky panel bar (see LayoutDesktopPanel): centred along the bottom of the
// standard layout and only as wide as what is on it:
// (BUY BONUS) [menu, mute music, mute sounds | balance     (win)     (- bet + ) (SPIN] auto spin
//                                                                                  turbo
// Sizes are before the whole bar is scaled by SCALE (the tablet's standard layout is square, 1920 x
// 1920, so it is bigger there).
const SCALE: Partial<Record<UiLayoutType, number>> = { desktop: 1.05, tablet: 1.3 };
// from the bottom of the screen to the bar
const BOTTOM = 14;
// the panel, and the buy bonus disc
export const HEIGHT = 124;
// between the disc, the panel and the column of auto spin and turbo, which keeps clear of the spin
// disc hanging over the panel's end
export const GAP = 12;
const COLUMN_GAP = 28;
// from the panel's edge to its first button
const PADDING = 20;
export const BUTTON = 56;
export const COLUMN_BUTTON = 52;
export const BET_BUTTON = 54;
export const SPIN = 156;
// the spin disc reaches this far past the panel's end
const SPIN_OVERHANG = 30;
export const DIVIDER = { width: 3, height: 62, before: 16, after: 14 };
// the balance's text box, the win's well (with this much room either side of it) and the bet's
// well (with the room the spin disc covers: it covers 122, the rest is the gap before it)
export const BALANCE_WIDTH = 185;
export const WIN_WELL = { width: 204, height: 72, border: 3, ring: 3, gap: 20 };
export const BET_WELL = { margin: 6, padding: 12, middle: 190, spin: 146, radius: 44 };
// the middle of the panel, up from the bottom of the standard layout
export const ROW = -(BOTTOM + HEIGHT * 0.5);

type DesktopPanelOptions = {
	theme: UiTheme | undefined;
	layoutType: UiLayoutType;
	// the standard layout's size
	standard: { width: number; height: number };
};

// where everything on the bar goes (`x`), from the bar's left end, and where that is (`x.left`): the
// bar centred in the standard layout
export const getDesktopPanel = ({ theme, layoutType, standard }: DesktopPanelOptions) => {
	const scale = SCALE[layoutType] ?? SCALE.desktop!;
	const showBuyBonus = !theme?.hideBuyBonusOn?.includes(layoutType);
	const showMuteButtons = !!theme?.muteButtons;

	const border = theme?.panelBar?.outlineWidth ?? 0;
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
		scale,
		width,
		showBuyBonus,
		showMuteButtons,
		x: {
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
		},
	};
};

// the bar's two ends and the top and bottom of its panel, in the standard layout
export const getDesktopPanelBounds = (options: DesktopPanelOptions) => {
	const panel = getDesktopPanel(options);
	const bottom = options.standard.height;
	return {
		left: panel.x.left,
		right: panel.x.left + panel.width * panel.scale,
		top: bottom + (ROW - HEIGHT * 0.5) * panel.scale,
		bottom: bottom + (ROW + HEIGHT * 0.5) * panel.scale,
	};
};
