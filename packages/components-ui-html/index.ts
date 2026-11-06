import Modals from './src/components/Modals.svelte';
import GameVersion from './src/components/GameVersion.svelte';
import GlobalStyle from './src/components/GlobalStyle.svelte';
import HeadingText from './src/components/HeadingText.svelte';
// the pieces the menus are made of, for a game's own menus (Modals' children) to look the same
import BaseContent from './src/components/BaseContent.svelte';
import BaseTitle from './src/components/BaseTitle.svelte';
import BaseScrollable from './src/components/BaseScrollable.svelte';
import BaseButtonWrap from './src/components/BaseButtonWrap.svelte';
import ButtonFace from './src/components/ButtonFace.svelte';

import messagesMap from './src/i18n/messagesMap';
import { i18nDerived } from './src/i18n/i18nDerived';
import { stateBonus } from './src/stateBonus.svelte';
import { createBonusCard, type BonusCardState } from './src/bonusCard.svelte';

export * from './src/types';
export type { UiHtmlTheme } from './src/theme';
export { UI_HTML_THEME_CLEAN } from './src/theme';

export type { BonusCardState };
export {
	messagesMap,
	i18nDerived,
	Modals,
	GameVersion,
	GlobalStyle,
	HeadingText,
	BaseContent,
	BaseTitle,
	BaseScrollable,
	BaseButtonWrap,
	ButtonFace,
	stateBonus,
	createBonusCard,
};
