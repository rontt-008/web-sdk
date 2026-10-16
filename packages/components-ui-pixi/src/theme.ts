import { getContext, setContext, type Component } from 'svelte';

import type { LayoutUiProps } from './types';

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

// the buttons the menu stacks above its close button, top first, without the ones the theme hides
export const getMenuButtons = (props: LayoutUiProps, theme: UiTheme | undefined) => [
	...(theme?.hidePayTable ? [] : [props.buttonPayTable]),
	props.buttonGameRules,
	props.buttonSettings,
	...(theme?.hideSoundSwitch ? [] : [props.buttonSoundSwitch]),
];
