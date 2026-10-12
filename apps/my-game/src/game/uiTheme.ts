import { UI_THEME_CLEAN, type UiTheme } from 'components-ui-pixi';

export const uiTheme: UiTheme = {
	...UI_THEME_CLEAN,
	// darker panels behind the balance, win and bet (BOOSTER) amounts so they read on the background
	label: { ...UI_THEME_CLEAN.label, panelAlpha: 0.82 },
	// the buy bonus and booster buttons under the logo replace the UI's buy bonus button here
	hideBuyBonusOn: ['desktop', 'landscape'],
	// mute music and mute sounds buttons beside the menu button
	muteButtons: true,
};
