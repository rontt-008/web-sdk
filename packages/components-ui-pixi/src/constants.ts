import { WHITE } from 'constants-shared/colors';

export const UI_BASE_SIZE = 150;

export const UI_BASE_FONT_SIZE = UI_BASE_SIZE * 0.3;

// pill behind a label and its value, when a theme is used
export const UI_THEMED_LABEL_SIZES = {
	width: UI_BASE_FONT_SIZE * 8,
	height: UI_BASE_FONT_SIZE * 2.4,
};

export const UI_TEXT_STYLES = {
	labelStyle: {
		fontSize: UI_BASE_FONT_SIZE,
		fill: WHITE,
	},
	amountStyle: {
		fontSize: UI_BASE_FONT_SIZE,
		fill: WHITE,
	},
};

// desktop
export const DESKTOP_BASE_SIZE = UI_BASE_SIZE * 0.9;

export const DESKTOP_BACKGROUND_WIDTH_LIST = [
	DESKTOP_BASE_SIZE * (188 / 116),
	800,
	350,
	DESKTOP_BASE_SIZE * (340 / 116),
];

// portrait
export const PORTRAIT_BASE_SIZE = UI_BASE_SIZE * 1.32;

// the win sits this far up from the bottom of the standard layout, at the top of the portrait UI
export const PORTRAIT_WIN_OFFSET = 670;

// how far up from the bottom of the standard layout the portrait UI reaches (the top of the win's
// panel), for a game to fit its board just above it
export const PORTRAIT_UI_HEIGHT = PORTRAIT_WIN_OFFSET + UI_BASE_FONT_SIZE * 0.35;

// landscape
export const LANDSCAPE_BASE_SIZE = UI_BASE_SIZE * 1.1;

export const LANDSCAPE_BACKGROUND_WIDTH_LIST = [
	LANDSCAPE_BASE_SIZE * (188 / 116),
	1000,
	LANDSCAPE_BASE_SIZE * (373 / 116),
];

// desktop
export const TABLET_BASE_SIZE = UI_BASE_SIZE * 1.2;

export const TABLET_BACKGROUND_WIDTH_LIST = [
	TABLET_BASE_SIZE * (188 / 116),
	650,
	350,
	TABLET_BASE_SIZE * (340 / 116),
];
