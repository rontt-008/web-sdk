import {
	UI_THEME_CLEAN,
	LayoutDesktopPanel,
	LayoutPortraitBar,
	LayoutLandscapeBar,
	type UiTheme,
} from 'components-ui-pixi';
import { UI_HTML_THEME_CLEAN, type UiHtmlTheme } from 'components-ui-html';
import { LOADING_BAR_THEME_CLEAN, type LoadingBarTheme } from 'components-pixi';

// the logo's colours: a wooden sign with a dark brown outline, cream and orange lettering
const DARK_BROWN = 0x4a1c00;
const CREAM = 0xfff6e2;

// loading bar like a little wooden sign under the logo, filling with the orange of "Evening" while a
// cream paw walks along it
export const loadingBarTheme: LoadingBarTheme = {
	...LOADING_BAR_THEME_CLEAN,
	outline: DARK_BROWN,
	outlineWidth: 4,
	rim: 0xb5652b,
	rimWidth: 6,
	track: 0x3d1c08,
	trackAlpha: 1,
	fill: 0xffb53d,
	fillShade: 0xe9831c,
	shine: CREAM,
	shineAlpha: 0.55,
	shadowAlpha: 0.3,
	marker: 'paw',
	markerFill: CREAM,
	markerOutline: DARK_BROWN,
	// same size and outline as "PRESS ANYWHERE TO CONTINUE"
	percent: {
		fontFamily: 'Titan One',
		fontSize: 26,
		fill: CREAM,
		stroke: DARK_BROWN,
		strokeWidth: 4.5,
	},
};

// The UI chunky and charcoal, the same as RuneFall's (apps/my-cluster-game): near-black outlines,
// hard drop shadows under the buttons, panels and text, a faint highlight along their tops; on wide
// screens a panel right across the bottom with the win and the bet in recessed wells and a big spin
// disc. The menus are black.

const OUTLINE = 0x0a0a0c;
const PANEL = 0x232227;
const BUTTON = 0x34333a;
const WHITE = 0xffffff;
const UI_CREAM = 0xf1ece1;
const LABEL = 0xb8b4c6;
const BLACK = 0x000000;

// outlines are drawn in a button's own units, before it is scaled to its size on the bar: these come
// out about 3 px around the small buttons and 4 px around the spin and buy bonus discs
const BUTTON_OUTLINE = 6.8;
const SPIN_OUTLINE = 5;
const BUY_BONUS_OUTLINE = 4.1;

export const uiTheme: UiTheme = {
	...UI_THEME_CLEAN,
	button: {
		...UI_THEME_CLEAN.button,
		fill: BUTTON,
		fillHovered: 0x403f47,
		fillPressed: 0x2a2930,
		fillActive: UI_CREAM,
		fillDisabled: 0x2a2930,
		icon: WHITE,
		iconActive: PANEL,
		iconDisabled: 0x77757f,
	},
	// a dark spin disc with a white sync icon that turns on each spin
	spin: {
		...UI_THEME_CLEAN.spin,
		fill: 0x26252a,
		fillHovered: 0x302f35,
		fillPressed: 0x1d1c20,
		fillDisabled: 0x3a3940,
		icon: WHITE,
		outline: OUTLINE,
		outlineWidth: SPIN_OUTLINE,
	},
	// the panels charcoal, greyish lilac labels over white amounts
	label: { panel: PANEL, panelAlpha: 1, label: LABEL, value: WHITE },
	outline: OUTLINE,
	outlineDisabled: OUTLINE,
	outlineWidth: BUTTON_OUTLINE,
	outlineAlpha: 1,
	panelCornerRadius: 0.21,
	shadow: { color: BLACK, highlight: { color: WHITE, alpha: 0.09 } },
	panelBar: {
		outlineWidth: 4,
		divider: 0x36353c,
		well: { fill: 0x111014, border: 0x2e2d33 },
		betWell: 0x131216,
		betLevel: { track: 0x2d2c33, fill: UI_CREAM },
		win: 0xffd34d,
	},
	// on wide and almost square screens, the chunky panel right across the bottom; on tall ones (a
	// phone held upright) a panel of the amounts over the spin row, and a pill of menu and sound; on
	// small wide ones (a phone held sideways, the miniplayer) a bar right across the bottom and the
	// spin buttons in a column on the right
	layouts: {
		desktop: LayoutDesktopPanel,
		tablet: LayoutDesktopPanel,
		portrait: LayoutPortraitBar,
		landscape: LayoutLandscapeBar,
	},
	// the buy bonus button a disc at the bar's left end: the bonus logo in red with a thin black
	// outline, on charcoal; it opens the buy menu, which has the bonuses, the feature spin and the
	// booster
	buyBonus: {
		fill: 0x2c2b31,
		fillHovered: 0x37363d,
		fillPressed: PANEL,
		icon: 0xd3140c,
		sprite: 'buyBonusLogo',
		spriteOutline: { key: 'buyBonusLogoOutline', color: BLACK },
		ring: { color: OUTLINE, width: BUY_BONUS_OUTLINE },
	},
	// mute music and mute sounds buttons beside the menu button, instead of the menu's sound switch
	muteButtons: true,
	// the space bar does exactly what the spin button does (Engine's guideline 228)
	spaceHoldSpins: false,
	hideSoundSwitch: true,
	// no settings menu: the mute buttons have volume sliders
	hideSettings: true,
	// the rules (the info button) hold the symbol wins and paylines too
	hidePayTable: true,
};

// the menus (buy bonus, bet, auto play, settings, rules) black
const MENU_BLACK = 'rgba(0, 0, 0, 0.88)';

export const uiHtmlTheme: UiHtmlTheme = {
	...UI_HTML_THEME_CLEAN,
	backdrop: 'rgba(0, 0, 0, 0.65)',
	// the rules (the only solid panel) draw their own cards, so they have no panel behind them
	panel: {
		...UI_HTML_THEME_CLEAN.panel,
		background: MENU_BLACK,
		solidBackground: 'transparent',
		solidBorder: 'none',
		solidShadow: 'none',
		solidBorderImage: 'none',
	},
	card: { ...UI_HTML_THEME_CLEAN.card, background: MENU_BLACK },
	dock: { ...UI_HTML_THEME_CLEAN.dock, background: 'rgba(0, 0, 0, 0.8)' },
	control: {
		...UI_HTML_THEME_CLEAN.control,
		background: '#1c1c1c',
		backgroundHovered: '#2a2a2a',
		selectedText: '#000000',
	},
};
