<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal, stateMetaDerived, type BetModeData } from 'state-shared';

	import BonusCards from './BonusCards.svelte';
	import HeadingText from './HeadingText.svelte';
	import BuyBonusDock from './BuyBonusDock.svelte';
	import BonusContentWrap from './BonusContentWrap.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	type Props = {
		bonusArt?: Snippet<[BetModeData]>;
		hiddenBetModes?: string[];
	};

	const props: Props = $props();

	// one card per bet mode of its own, holding it and its levels (the modes whose parent it is)
	const toGroups = (list: BetModeData[]) =>
		list
			.filter((item) => !item.parent)
			.map((item) => [item, ...list.filter((level) => level.parent === item.mode)]);

	const shown = $derived(
		stateMetaDerived.betModeMetaList().filter((item) => !props.hiddenBetModes?.includes(item.mode)),
	);

	const activateGroups = $derived(toGroups(shown.filter((item) => item.type === 'activate')));

	const buyGroups = $derived(toGroups(shown.filter((item) => item.type === 'buy')));

	// every card keeps room for a level slider when one has it, so the prices line up
	const levelRow = $derived([...activateGroups, ...buyGroups].some((group) => group.length > 1));
</script>

{#if stateModal.modal?.name === 'buyBonus'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BonusContentWrap cardCount={activateGroups.length + buyGroups.length}>
			{#snippet heading()}
				<HeadingText>{i18nDerived.buyBonus()}</HeadingText>
			{/snippet}

			{#snippet dock()}
				<BuyBonusDock />
			{/snippet}

			{#snippet bonusCardsActivate()}
				<BonusCards groups={activateGroups} {levelRow} bonusArt={props.bonusArt} />
			{/snippet}

			{#snippet bonusCardsBuy()}
				<BonusCards groups={buyGroups} {levelRow} bonusArt={props.bonusArt} />
			{/snippet}
		</BonusContentWrap>
	</Popup>
{/if}
