import { getContext, setContext, type Component } from 'svelte';

import type { LayoutUiProps } from './types';
import { UI_BASE_SIZE } from './constants';

export type UiLayoutType = 'desktop' | 'portrait' | 'landscape' | 'tablet';

// Optional look for the UI. Without a theme the UI keeps its default placeholder design.
export type UiTheme = {
	// round buttons (menu, auto spin, turbo, +/-, ...) drawn with icons
	button: {
		fill: number;
		fillHovered: number;
		fillPressed: number;
		fillActive: number;
		fillDisabled: number;
		icon: number;
		iconActive: number;
		iconDisabled: number;
		// size of the visible circle relative to the button's hit area
		scale: number;
	};
	spin: {
		fill: number;
		fillHovered: number;
		fillPressed: number;
		fillDisabled: number;
		icon: number;
		// defaults to `outline`
		outline?: number;
		scale: number;
	};
	label: {
		panel: number;
		panelAlpha: number;
		label: number;
		value: number;
	};
	// corners of the panels (the balance, win and bet, and the bar's panels) and the buy bonus pill, as
	// a share of their height: 0.5 (the default) for round ends, 0 for square corners
	panelCornerRadius?: number;
	// around the round buttons, and the balance, win and bet panels
	outline: number;
	outlineDisabled: number;
	outlineWidth: number;
	outlineAlpha: number;
	fontFamily: string;
	// replace the default layout for some screen types
	layouts?: Partial<Record<UiLayoutType, Component<LayoutUiProps>>>;
	// screen types where the game shows its own buy bonus controls instead of the UI's button
	hideBuyBonusOn?: UiLayoutType[];
	// the buy bonus button as a pill with its name on it, as tall as the round buttons' circle, instead
	// of a round button with an icon. It is greyed out and turns `button.fillActive` (with
	// `button.iconActive` text) like the round buttons do.
	buyBonusPill?: {
		// relative to its height
		width: number;
		fill: number;
		fillHovered: number;
		fillPressed: number;
		text: number;
	};
	// no pay table button in the menu, for a game whose rules (the info button) cover the pay table
	hidePayTable?: boolean;
	// no sound on/off button in the menu, for a game with `muteButtons` beside the menu button (the
	// replay keeps it, as it has no mute buttons)
	hideSoundSwitch?: boolean;
	// mute music and mute sounds buttons beside the menu button (compact desktop, portrait, landscape
	// and tablet layouts)
	muteButtons?: boolean;
};

const KEY = Symbol('uiTheme');

export const setUiTheme = (theme: UiTheme | undefined) => setContext(KEY, theme);
export const getUiTheme = () => getContext<UiTheme | undefined>(KEY);

// corner radius of a panel this tall (see panelCornerRadius)
export const getPanelCornerRadius = (theme: UiTheme | undefined, height: number) =>
	height * (theme?.panelCornerRadius ?? 0.5);

// how much wider than a round button the buy bonus button is (see buyBonusPill), for the layouts to
// make room for it
export const getBuyBonusExtraWidth = (theme: UiTheme | undefined) =>
	UI_BASE_SIZE * (theme?.button.scale ?? 1) * ((theme?.buyBonusPill?.width ?? 1) - 1);

// the buttons the menu stacks above its close button, top first, without the ones the theme hides
export const getMenuButtons = (props: LayoutUiProps, theme: UiTheme | undefined) => [
	...(theme?.hidePayTable ? [] : [props.buttonPayTable]),
	props.buttonGameRules,
	props.buttonSettings,
	...(theme?.hideSoundSwitch ? [] : [props.buttonSoundSwitch]),
];
