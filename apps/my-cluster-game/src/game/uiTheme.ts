import { UI_THEME_CLEAN, LayoutDesktopPanel, type UiTheme } from 'components-ui-pixi';
import { UI_HTML_THEME_CLEAN, type UiHtmlTheme } from 'components-ui-html';

// The UI chunky and charcoal, from the user's mock: near-black outlines, hard drop shadows under the
// buttons, panels and text, a faint highlight along their tops; on wide screens a panel right across
// the bottom with the win and the bet in recessed wells and a big spin disc. The menus are black.

const OUTLINE = 0x0a0a0c;
const PANEL = 0x232227;
const BUTTON = 0x34333a;
const WHITE = 0xffffff;
const CREAM = 0xf1ece1;
const LABEL = 0xb8b4c6;
const BLACK = 0x000000;

// outlines are drawn in a button's own units, before it is scaled to its size on the bar: these come
// out about 3 px around the small buttons and 4 px around the spin and buy bonus discs, as in the mock
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
		fillActive: CREAM,
		fillDisabled: 0x2a2930,
		icon: WHITE,
		iconActive: PANEL,
		iconDisabled: 0x77757f,
	},
	// a dark spin disc with a white arrow
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
		betLevel: { track: 0x2d2c33, fill: CREAM },
		win: 0xffd34d,
	},
	// on wide and almost square screens, the chunky panel right across the bottom
	layouts: { desktop: LayoutDesktopPanel, tablet: LayoutDesktopPanel },
	// the buy bonus button a disc at the bar's left end: the bonus logo in red with a thin black
	// outline, on charcoal
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
	// the rules (the info button) are to hold the symbol wins too
	hidePayTable: true,
};

// the menus (buy bonus, bet, auto play, rules) in the same black as the UI
const MENU_BLACK = 'rgba(0, 0, 0, 0.88)';

export const uiHtmlTheme: UiHtmlTheme = {
	...UI_HTML_THEME_CLEAN,
	backdrop: 'rgba(0, 0, 0, 0.65)',
	panel: { ...UI_HTML_THEME_CLEAN.panel, background: MENU_BLACK, solidBackground: '#0a0a0a' },
	card: { ...UI_HTML_THEME_CLEAN.card, background: MENU_BLACK },
	dock: { ...UI_HTML_THEME_CLEAN.dock, background: 'rgba(0, 0, 0, 0.8)' },
	control: {
		...UI_HTML_THEME_CLEAN.control,
		background: '#1c1c1c',
		backgroundHovered: '#2a2a2a',
		selectedText: '#000000',
	},
};
