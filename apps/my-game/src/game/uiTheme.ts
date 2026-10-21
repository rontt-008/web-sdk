import {
	UI_THEME_CLEAN,
	LayoutDesktopBar,
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

// the UI is black instead of the clean theme's charcoal
const BLACK = 0x000000;

export const uiTheme: UiTheme = {
	...UI_THEME_CLEAN,
	button: {
		...UI_THEME_CLEAN.button,
		fill: BLACK,
		fillHovered: 0x262626,
		fillPressed: 0x141414,
		iconActive: BLACK,
	},
	// a dark grey spin button with a white icon, a little lighter than the black panels around it
	spin: {
		...UI_THEME_CLEAN.spin,
		fill: 0x2b2b2b,
		fillHovered: 0x3a3a3a,
		fillPressed: 0x1f1f1f,
		fillDisabled: 0x45474e,
		icon: 0xffffff,
	},
	// dark panels behind the balance, win and bet (BOOSTER) amounts so they read on the background
	label: { ...UI_THEME_CLEAN.label, panel: BLACK, panelAlpha: 0.92 },
	// no outlines around the buttons and panels, and slightly rounded corners on the panels
	outlineWidth: 0,
	panelCornerRadius: 0.12,
	// on wide and almost square screens, a bar of panels along the bottom; on tall ones (a phone held
	// upright) a panel of the amounts over the spin row, and a pill of menu and sound; on small wide
	// ones (a phone held sideways, the miniplayer) a bar right across the bottom and the spin buttons
	// in a column on the right
	layouts: {
		desktop: LayoutDesktopBar,
		tablet: LayoutDesktopBar,
		portrait: LayoutPortraitBar,
		landscape: LayoutLandscapeBar,
	},
	// one round buy bonus button right of the spin button: the bonus logo in red with a thin black
	// outline, on solid near-black in a thin white ring, with no shadow; it opens the buy menu, which
	// has the bonuses, the feature spin and the booster
	buyBonus: {
		fill: 0x0c0c0c,
		fillHovered: 0x1f1f1f,
		fillPressed: 0x050505,
		shadow: false,
		icon: 0xb50208,
		sprite: 'buyBonusLogo',
		spriteOutline: { key: 'buyBonusLogoOutline', color: BLACK },
		ring: { color: 0xffffff, width: 3 },
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

// the menus (buy bonus, bet, auto play, settings, rules) in the same black as the UI
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
