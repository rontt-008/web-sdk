import { UI_THEME_CLEAN, type UiTheme } from 'components-ui-pixi';
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
	percent: { fontFamily: 'Titan One', fontSize: 26, fill: CREAM, stroke: DARK_BROWN, strokeWidth: 4.5 },
};

export const uiTheme: UiTheme = {
	...UI_THEME_CLEAN,
	// darker panels behind the balance, win and bet (BOOSTER) amounts so they read on the background
	label: { ...UI_THEME_CLEAN.label, panelAlpha: 0.82 },
	// the buy bonus and booster buttons under the logo replace the UI's buy bonus button here
	hideBuyBonusOn: ['desktop', 'landscape'],
	// mute music and mute sounds buttons beside the menu button
	muteButtons: true,
};
