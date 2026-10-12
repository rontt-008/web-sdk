<script lang="ts">
	import { getContextLayout } from 'utils-layout';
	import { stateUi, AUTO_SPINS_TEXT_OPTIONS } from 'state-shared';
	import { OptionsGrid } from 'components-shared';

	import ButtonFace from './ButtonFace.svelte';

	const { stateLayoutDerived } = getContextLayout();
	const AUTO_SPINS_TEXT_OPTIONS_PORTRAIT = AUTO_SPINS_TEXT_OPTIONS.filter(
		(value) => value !== '1000',
	);

	const options = $derived(
		stateLayoutDerived.layoutType() === 'landscape'
			? AUTO_SPINS_TEXT_OPTIONS_PORTRAIT
			: AUTO_SPINS_TEXT_OPTIONS,
	);
</script>

<OptionsGrid
	value={stateUi.autoSpinsText}
	{options}
	onchange={(value) => (stateUi.autoSpinsText = value)}
>
	{#snippet option({ option })}
		<ButtonFace variant="control" height="2.25rem" selected={option === stateUi.autoSpinsText}>
			<span class:infinity={option === '∞'} data-test="round-options">
				{option}
			</span>
		</ButtonFace>
	{/snippet}
</OptionsGrid>

<style lang="scss">
	.infinity {
		font-size: 1.5rem;
		line-height: 1rem;
	}
</style>
