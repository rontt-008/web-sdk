<script lang="ts">
	import { stateBet, stateI18n, stateMeta, stateModal, type BetModeData } from 'state-shared';
	import { GlobalStyle, Modals, UI_HTML_THEME_CLEAN, stateBonus } from 'components-ui-html';

	import assets from '../game/assets';
	import { setContext, getContext } from '../game/context';
	import {
		setBetModeMeta,
		BONUS_MODE,
		SUPER_MODE,
		MYSTERY_MODE,
		BOOSTER_MODE,
	} from '../game/betModes';
	import BonusCardArt from '../components/BonusCardArt.svelte';
	import ClotheslineCard from '../components/ClotheslineCard.svelte';
	import BonusRip from '../components/BonusRip.svelte';
	import ConfirmTowel from '../components/ConfirmTowel.svelte';
	import GameInfo from '../components/GameInfo.svelte';

	type Props = {
		modal:
			| 'buyBonus'
			| 'buyBonusConfirm'
			| 'betAmountMenu'
			| 'autoSpin'
			| 'settings'
			| 'gameRules';
		// made-up volatility to show the meter; the game's bet modes do not have it yet
		sampleVolatility?: boolean;
		// shows the super bonus as a level of the bonus, on one card
		sampleLevels?: boolean;
	};

	const props: Props = $props();

	setContext();
	setBetModeMeta();

	// a bonus's button opens its confirm dialog, as in the game
	getContext().eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateModal.modal = { name: 'buyBonusConfirm' };
		},
	});
	// the menus show amounts straight away, before <StoryLocale> would switch the language on
	stateI18n.i18n.load('en', {});
	stateI18n.i18n.activate('en');

	if (props.sampleVolatility) {
		const SAMPLE_VOLATILITY = {
			[BOOSTER_MODE]: 2,
			[BONUS_MODE]: 3,
			[SUPER_MODE]: 4,
			[MYSTERY_MODE]: 4,
		};
		for (const [mode, volatility] of Object.entries(SAMPLE_VOLATILITY)) {
			stateMeta.betModeMeta[mode] = { ...stateMeta.betModeMeta[mode], volatility };
		}
	}

	if (props.sampleLevels) {
		stateMeta.betModeMeta[SUPER_MODE] = { ...stateMeta.betModeMeta[SUPER_MODE], parent: BONUS_MODE };
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

{#snippet gameRules()}
	<GameInfo />
{/snippet}

<!-- the bonuses as dish towels on a washing line, as in the game -->
{#snippet bonusCard({ levels, levelRow }: { levels: BetModeData[]; levelRow: boolean })}
	<ClotheslineCard {levels} {levelRow} />
{/snippet}

<!-- confirmed on its towel, bigger, as in the game -->
{#snippet bonusConfirm({
	betModeData,
	confirm,
	cancel,
}: {
	betModeData: BetModeData;
	confirm: () => void;
	cancel: () => void;
})}
	<ConfirmTowel {betModeData} onconfirm={confirm} oncancel={cancel} />
{/snippet}

<!-- a bonus once bought rips, as in the game (nothing starts it here) -->
{#snippet bonusBought({ betModeData, start }: { betModeData: BetModeData; start: () => void })}
	<BonusRip {betModeData} onstart={start} />
{/snippet}

<GlobalStyle>
	<Modals
		theme={UI_HTML_THEME_CLEAN}
		{version}
		{bonusArt}
		{bonusCard}
		{bonusBought}
		{bonusConfirm}
		{gameRules}
	/>
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
