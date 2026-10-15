import { UI_FONT_FAMILY } from 'constants-shared/fonts';

import type { UiTheme } from './theme';
import LayoutDesktopCompact from './components/LayoutDesktopCompact.svelte';

const CHARCOAL = 0x1f2128;
const WHITE = 0xffffff;

// Neutral, flat look that sits on top of any game art: charcoal round buttons with white icons, a
// white spin button, and charcoal panels for balance, win and bet, all with a thin faint outline.
// Spread it and override colours to give a game its own accent, e.g. { ...UI_THEME_CLEAN, spin: {...} }.
export const UI_THEME_CLEAN: UiTheme = {
	button: {
		fill: CHARCOAL,
		fillHovered: 0x2e313a,
		fillPressed: 0x15161b,
		fillActive: WHITE,
		fillDisabled: 0x45474e,
		icon: WHITE,
		iconActive: CHARCOAL,
		iconDisabled: 0x8b8e96,
		scale: 0.85,
	},
	spin: {
		fill: WHITE,
		fillHovered: 0xeff0f3,
		fillPressed: 0xd6d8dd,
		fillDisabled: 0x8b8e96,
		icon: CHARCOAL,
		scale: 1.3,
	},
	label: {
		panel: CHARCOAL,
		panelAlpha: 0.85,
		label: 0xb9bdc7,
		value: WHITE,
	},
	outline: WHITE,
	outlineDisabled: 0x6b6e76,
	outlineWidth: 3,
	outlineAlpha: 0.3,
	fontFamily: UI_FONT_FAMILY,
	layouts: { desktop: LayoutDesktopCompact },
};
