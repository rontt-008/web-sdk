<script lang="ts">
	import { OptionsGrid } from 'components-shared';
	import { getContextLayout } from 'utils-layout';
	import { stateBet, stateConfig } from 'state-shared';
	import { numberToShortCurrencyString } from 'utils-shared/amount';

	import ButtonFace from './ButtonFace.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	const { stateLayoutDerived } = getContextLayout();
	const count = $derived(stateLayoutDerived.layoutType() === 'landscape' ? 15 : 18);
	// every RGS bet level if they fit, otherwise ones spread evenly from the lowest to the highest
	const options = $derived.by(() => {
		const levels = stateConfig.betAmountOptions;
		if (levels.length <= count) return levels;
		const indexes = Array.from({ length: count }, (_, i) =>
			Math.round((i * (levels.length - 1)) / (count - 1)),
		);
		return [...new Set(indexes)].map((index) => levels[index]);
	});

	// only the highest bet level is MAX
	const isMaxValue = (value: number) =>
		value === stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1];
</script>

<OptionsGrid
	value={stateBet.betAmount}
	{options}
	onchange={(value) => (stateBet.betAmount = value)}
>
	{#snippet option({ option })}
		<ButtonFace variant="control" height="2.25rem" selected={option === stateBet.betAmount}>
			{isMaxValue(option) ? i18nDerived.max() : numberToShortCurrencyString(option)}
		</ButtonFace>
	{/snippet}
</OptionsGrid>
