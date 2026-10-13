<script lang="ts">
	import { stateBet, stateI18n, stateMeta, stateModal, type BetModeData } from 'state-shared';
	import { GlobalStyle, Modals, UI_HTML_THEME_CLEAN, stateBonus } from 'components-ui-html';

	import assets from '../game/assets';
	import { setContext } from '../game/context';
	import {
		setBetModeMeta,
		BONUS_MODE,
		SUPER_MODE,
		MYTHIC_MODE,
		MYSTERY_MODE,
		BOOSTER_MODE,
	} from '../game/betModes';
	import BonusCardArt from '../components/BonusCardArt.svelte';
	import GameInfo from '../components/GameInfo.svelte';

	type Props = {
		modal:
			| 'buyBonus'
			| 'buyBonusConfirm'
			| 'betAmountMenu'
			| 'autoSpin'
			| 'settings'
			| 'payTable'
			| 'gameRules';
		// made-up volatility to show the meter; the game's bet modes do not have it yet
		sampleVolatility?: boolean;
		// shows the super and mythic bonuses as levels of the bonus, on one card
		sampleLevels?: boolean;
	};

	const props: Props = $props();

	setContext();
	setBetModeMeta();
	// the menus show amounts straight away, before <StoryLocale> would switch the language on
	stateI18n.i18n.load('en', {});
	stateI18n.i18n.activate('en');

	if (props.sampleVolatility) {
		const SAMPLE_VOLATILITY = {
			[BOOSTER_MODE]: 2,
			[BONUS_MODE]: 3,
			[SUPER_MODE]: 4,
			[MYTHIC_MODE]: 5,
			[MYSTERY_MODE]: 4,
		};
		for (const [mode, volatility] of Object.entries(SAMPLE_VOLATILITY)) {
			stateMeta.betModeMeta[mode] = { ...stateMeta.betModeMeta[mode], volatility };
		}
	}

	if (props.sampleLevels) {
		for (const mode of [SUPER_MODE, MYTHIC_MODE]) {
			stateMeta.betModeMeta[mode] = { ...stateMeta.betModeMeta[mode], parent: BONUS_MODE };
		}
	}

	stateBet.betAmount = 1;
	stateBet.balanceAmount = 1000;
	stateBet.activeBetModeKey = 'BASE';
	stateBonus.selectedBetModeKey = BONUS_MODE;
	stateModal.modal = { name: props.modal };
</script>

<!-- the game's background stands in for the game behind the menu -->
<img class="background" src={assets.customBackground.src} alt="" />

{#snippet version()}0.0.0{/snippet}

<!-- the game's FS symbols on each bonus, as in the game -->
{#snippet bonusArt(betModeData: BetModeData)}
	<BonusCardArt {betModeData} />
{/snippet}

{#snippet payTable()}
	<GameInfo part="payTable" />
{/snippet}

{#snippet gameRules()}
	<GameInfo part="gameRules" />
{/snippet}

<GlobalStyle>
	<Modals theme={UI_HTML_THEME_CLEAN} {version} {bonusArt} {payTable} {gameRules} />
</GlobalStyle>

<style>
	.background {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
