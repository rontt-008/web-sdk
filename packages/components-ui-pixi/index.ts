import UI from './src/components/UI.svelte';
import UiGameName from './src/components/UiGameName.svelte';
// a bottom bar of panels, for a theme's `layouts`
import LayoutDesktopBar from './src/components/LayoutDesktopBar.svelte';
// for tall screens: a panel of amounts, the spin row and a pill of menu and sound, for a theme's
// `layouts`
import LayoutPortraitBar from './src/components/LayoutPortraitBar.svelte';
// for small wide screens: a bar along the bottom and a column of spin buttons, for a theme's
// `layouts`
import LayoutLandscapeBar from './src/components/LayoutLandscapeBar.svelte';

import messagesMap from './src/i18n/messagesMap';
import { i18nDerived } from './src/i18n/i18nDerived';

export * from './src/types';
export type { UiTheme, UiLayoutType } from './src/theme';
export { UI_THEME_CLEAN } from './src/themeClean';
export { PORTRAIT_UI_HEIGHT } from './src/constants';
// where LayoutDesktopBar's bar is, for games to place things on or around it
export { getDesktopBarBounds } from './src/desktopBar';
// where LayoutLandscapeBar's bar and spin buttons are, for games to fit their board around them
export { getLandscapeBarBounds } from './src/landscapeBar';

export {
	messagesMap,
	i18nDerived,
	UI,
	UiGameName,
	LayoutDesktopBar,
	LayoutPortraitBar,
	LayoutLandscapeBar,
};
