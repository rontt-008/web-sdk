import Modals from './src/components/Modals.svelte';
import GameVersion from './src/components/GameVersion.svelte';
import GlobalStyle from './src/components/GlobalStyle.svelte';
import HeadingText from './src/components/HeadingText.svelte';

import messagesMap from './src/i18n/messagesMap';
import { i18nDerived } from './src/i18n/i18nDerived';
import { stateBonus } from './src/stateBonus.svelte';

export * from './src/types';
export type { UiHtmlTheme } from './src/theme';
export { UI_HTML_THEME_CLEAN } from './src/theme';

export { messagesMap, i18nDerived, Modals, GameVersion, GlobalStyle, HeadingText, stateBonus };
