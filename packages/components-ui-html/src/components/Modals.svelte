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
		// the game's own card for each bonus in the buy bonus menu, instead of the default one; it
		// gets the bonus's levels (the bet mode, then the modes whose parent it is) and whether another
		// card has levels, and does what the default card does with createBonusCard
		bonusCard?: Snippet<[{ levels: BetModeData[]; levelRow: boolean }]>;
		// played over the game once a bonus is bought (confirmed), before it starts; it gets the
		// bonus and calls start when the bonus should begin (it begins anyway after 5 seconds)
		bonusBought?: Snippet<[{ betModeData: BetModeData; start: () => void }]>;
		// a CANCEL button joined to the left of CONFIRM in the buy bonus confirm dialog
		cancelButton?: boolean;
		// the game's own buy bonus confirm dialog, instead of the default one (in the same popup); it
		// gets the bonus and what its CONFIRM and CANCEL do
		bonusConfirm?: Snippet<[{ betModeData: BetModeData; confirm: () => void; cancel: () => void }]>;
		// bet modes the buy bonus menu leaves out, e.g. ones the game switches on elsewhere
		hiddenBetModes?: string[];
		// the game's pay table (symbols, paylines) and rules (features, RTP); placeholders when left out
		payTable?: Snippet;
		gameRules?: Snippet;
	};

	const props: Props = $props();
</script>

<div class="ui-html-theme" style={uiHtmlThemeStyle(props.theme ?? UI_HTML_THEME_CLEAN)}>
	<ModalError />
	<ModalBetMenu />
	<ModalBuyBonus
		bonusArt={props.bonusArt}
		bonusCard={props.bonusCard}
		hiddenBetModes={props.hiddenBetModes}
	/>
	<ModalBuyBonusConfirm
		bonusArt={props.bonusArt}
		bonusBought={props.bonusBought}
		cancelButton={props.cancelButton}
		bonusConfirm={props.bonusConfirm}
	/>
	<ModalAutoSpin />
	<ModalAutoSpinMessage />
	<ModalPayTable content={props.payTable}>
		{@render props.version()}
	</ModalPayTable>
	<ModalGameRules content={props.gameRules}>
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
