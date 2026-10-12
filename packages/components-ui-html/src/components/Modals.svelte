<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { BetModeData } from 'state-shared';

	import ModalError from './ModalError.svelte';
	import ModalBetMenu from './ModalBetMenu.svelte';
	import ModalBuyBonus from './ModalBuyBonus.svelte';
	import ModalBuyBonusConfirm from './ModalBuyBonusConfirm.svelte';
	import ModalAutoSpin from './ModalAutoSpin.svelte';
	import ModalAutoSpinMessage from './ModalAutoSpinMessage.svelte';
	import ModalPayTable from './ModalPayTable.svelte';
	import ModalGameRules from './ModalGameRules.svelte';
	import ModalSettings from './ModalSettings.svelte';
	import { UI_HTML_THEME_CLEAN, uiHtmlThemeStyle, type UiHtmlTheme } from '../theme';

	type Props = {
		version: Snippet;
		// the look of every menu; UI_HTML_THEME_CLEAN when left out
		theme?: UiHtmlTheme;
		// a picture for each bonus in the buy bonus menu and its confirm dialog
		bonusArt?: Snippet<[BetModeData]>;
		// bet modes the buy bonus menu leaves out, e.g. ones the game switches on elsewhere
		hiddenBetModes?: string[];
	};

	const props: Props = $props();
</script>

<div class="ui-html-theme" style={uiHtmlThemeStyle(props.theme ?? UI_HTML_THEME_CLEAN)}>
	<ModalError />
	<ModalBetMenu />
	<ModalBuyBonus bonusArt={props.bonusArt} hiddenBetModes={props.hiddenBetModes} />
	<ModalBuyBonusConfirm bonusArt={props.bonusArt} />
	<ModalAutoSpin />
	<ModalAutoSpinMessage />
	<ModalPayTable>
		{@render props.version()}
	</ModalPayTable>
	<ModalGameRules>
		{@render props.version()}
	</ModalGameRules>
	<ModalSettings />
</div>

<style lang="scss">
	/* 16px on desktops, smaller on phones and small players so the menus fit the screen */
	:global(html) {
		font-size: clamp(8px, min(100vw / 26, 100vh / 30), 16px);
	}

	/* only carries the theme's custom properties down to the menus */
	.ui-html-theme {
		display: contents;
	}
</style>
