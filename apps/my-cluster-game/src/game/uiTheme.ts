import { UI_THEME_CLEAN, LayoutDesktopBar, type UiTheme } from 'components-ui-pixi';
import { UI_HTML_THEME_CLEAN, type UiHtmlTheme } from 'components-ui-html';

// The same UI as Cat Hunt (apps/my-game/src/game/uiTheme.ts): black buttons and panels, a bar along
// the bottom on wide screens, the red swoosh buy bonus button and black menus.

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
	// dark panels behind the balance, win and bet amounts so they read on the background
	label: { ...UI_THEME_CLEAN.label, panel: BLACK, panelAlpha: 0.92 },
	// no outlines around the buttons and panels, and slightly rounded corners on the panels
	outlineWidth: 0,
	panelCornerRadius: 0.12,
	// on wide and almost square screens, a bar of panels along the bottom
	layouts: { desktop: LayoutDesktopBar, tablet: LayoutDesktopBar },
	// one round buy bonus button right of the spin button: the bonus logo in red with a thin black
	// outline, on solid near-black in a thin white ring, with no shadow
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
