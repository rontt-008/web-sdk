import UI from './src/components/UI.svelte';
import UiGameName from './src/components/UiGameName.svelte';
// a bottom bar of panels, for a theme's `layouts`
import LayoutDesktopBar from './src/components/LayoutDesktopBar.svelte';

import messagesMap from './src/i18n/messagesMap';
import { i18nDerived } from './src/i18n/i18nDerived';

export * from './src/types';
export type { UiTheme, UiLayoutType } from './src/theme';
export { UI_THEME_CLEAN } from './src/themeClean';

export { messagesMap, i18nDerived, UI, UiGameName, LayoutDesktopBar };
