<script lang="ts">
	import { OptionsGrid } from 'components-shared';
	import { getContextLayout } from 'utils-layout';
	import { stateBet, stateConfig } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import ButtonFace from './ButtonFace.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	const { stateLayoutDerived } = getContextLayout();
	const count = $derived(stateLayoutDerived.layoutType() === 'landscape' ? 15 : 18);
	const options = $derived(
		[
			...stateConfig.betMenuOptions.slice(0, count - 1),
			...stateConfig.betMenuOptions.slice(-1),
		].filter((value, index, array) => array.indexOf(value) === index),
	); //always includes last, and without duplicate

	const isMaxValue = (value: number) => value === options[options.length - 1];
	// in the player's currency, like every other amount: ¥10, CA$0.50 or 5.00 SC
	const formatValue = (value: number) => numberToCurrencyString(value);
</script>

<OptionsGrid
	value={stateBet.betAmount}
	{options}
	onchange={(value) => (stateBet.betAmount = value)}
>
	{#snippet option({ option })}
		<ButtonFace variant="control" height="2.25rem" selected={option === stateBet.betAmount}>
			{isMaxValue(option) ? i18nDerived.max() : formatValue(option)}
		</ButtonFace>
	{/snippet}
</OptionsGrid>
