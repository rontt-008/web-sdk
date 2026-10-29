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
		// defaults to 1.3 times `outlineWidth`
		outlineWidth?: number;
		scale: number;
		// instead of the flat face: a `fill` disc, softly shaded, in a rim of this colour and width (a
		// share of the diameter) with a sync icon that turns once each spin. It brightens on hover
		// rather than using `fillHovered`, and keeps the sync icon while the reels spin.
		rim?: { color: number; width: number };
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
	// a chunky look: instead of the soft drop shadow, a hard one of this colour straight down under the
	// round buttons and their icons, and the amounts' text; and a faint line of `highlight` along the
	// top inside of the buttons
	shadow?: { color: number; highlight?: { color: number; alpha: number } };
	// the look of LayoutDesktopPanel's own parts (its panel is `label.panel`, outlined in `outline`)
	panelBar?: {
		// around the panel
		outlineWidth: number;
		// the line between the menu (and sound) buttons and the balance
		divider: number;
		// the recessed wells the win and the bet sit in
		well: { fill: number; border: number };
		betWell: number;
		// the line under the bet: how far up the bet levels it is
		betLevel: { track: number; fill: number };
		// the win's amount while there is a win (otherwise `label.value`)
		win?: number;
	};
	// replace the default layout for some screen types
	layouts?: Partial<Record<UiLayoutType, Component<LayoutUiProps>>>;
	// the proportions of the desktop bar (LayoutDesktopBar), for a more compact one
	desktopBar?: {
		// the whole bar's size on the screen types it is on (1.18 by default): the tablet's standard
		// layout is square (1920 x 1920), so a bar that suits the desktop looks small there
		scale?: Partial<Record<UiLayoutType, number>>;
		// the boxes the balance, win and bet values shrink to fit (200, 170 and 180 by default)
		labelWidth?: { balance: number; win: number; bet: number };
		// between the panels (10 by default)
		panelGap?: number;
		// between the balance and the win (30 by default)
		labelGap?: number;
		// turbo as a round button of its own at the bar's left end, the menu (and the mute buttons) at
		// the start of the balance's panel, and auto spin alone beside the spin button:
		// TURBO (menu, mute music, mute sounds, balance   win) (bet ⌃⌄) (auto spin  SPIN) BUY BONUS
		turboApart?: boolean;
	};
	// screen types where the game shows its own buy bonus controls instead of the UI's button
	hideBuyBonusOn?: UiLayoutType[];
	// the buy bonus button in its own colours, so it stands out from the other round buttons. It is
	// greyed out and turns `button.fillActive` (with a `button.iconActive` icon) like they do.
	buyBonus?: {
		fill: number;
		fillHovered: number;
		fillPressed: number;
		// how see-through those fills are (1 = solid, the default)
		fillAlpha?: number;
		// false: no drop shadow under it
		shadow?: boolean;
		// the icon's (or the name's) colour
		icon: number;
		// a pill this wide (relative to its height) with the button's name on it, instead of a round
		// button with an icon
		pillWidth?: number;
		// a game's own icon instead of the gift: the key of a sprite the game loads, square white art on
		// a transparent background (it is tinted `icon`)
		sprite?: string;
		// an outline around that icon: the key of the same art grown by the outline's width, drawn
		// behind it in `color` (not while the button is switched on or greyed out)
		spriteOutline?: { key: string; color: number };
		// a solid ring around the button, instead of the UI's outline (greyed out like it)
		ring?: { color: number; width: number };
	};
	// no pay table button in the menu, for a game whose rules (the info button) cover the pay table
	hidePayTable?: boolean;
	// no sound on/off button in the menu, for a game with `muteButtons` beside the menu button (the
	// replay keeps it, as it has no mute buttons)
	hideSoundSwitch?: boolean;
	// no settings button (the volumes) in the menu, for a game whose mute buttons have volume sliders
	hideSettings?: boolean;
	// mute music and mute sounds buttons beside the menu button (compact desktop, portrait, landscape
	// and tablet layouts)
	muteButtons?: boolean;
	// false: holding the space bar doesn't spin again and again, so the space bar does exactly what the
	// spin button does
	spaceHoldSpins?: boolean;
};

const KEY = Symbol('uiTheme');

export const setUiTheme = (theme: UiTheme | undefined) => setContext(KEY, theme);
export const getUiTheme = () => getContext<UiTheme | undefined>(KEY);

// corner radius of a panel this tall (see panelCornerRadius)
export const getPanelCornerRadius = (theme: UiTheme | undefined, height: number) =>
	height * (theme?.panelCornerRadius ?? 0.5);

// how much wider than a round button the buy bonus button is (see buyBonus.pillWidth), for the
// layouts to make room for it
export const getBuyBonusExtraWidth = (theme: UiTheme | undefined) =>
	UI_BASE_SIZE * (theme?.button.scale ?? 1) * ((theme?.buyBonus?.pillWidth ?? 1) - 1);

// the buttons the menu stacks above its close button, top first, without the ones the theme hides
export const getMenuButtons = (props: LayoutUiProps, theme: UiTheme | undefined) => [
	...(theme?.hidePayTable ? [] : [props.buttonPayTable]),
	props.buttonGameRules,
	...(theme?.hideSettings ? [] : [props.buttonSettings]),
	...(theme?.hideSoundSwitch ? [] : [props.buttonSoundSwitch]),
];

// whether the theme hides everything in the menu but the game rules, so the menu button can open
// them straight away
export const isMenuOnlyGameRules = (theme: UiTheme | undefined) =>
	!!theme?.hidePayTable && !!theme?.hideSettings && !!theme?.hideSoundSwitch;
