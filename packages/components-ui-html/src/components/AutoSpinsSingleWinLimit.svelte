<script lang="ts">
	import { stateUi, SINGLE_WIN_LIMIT_TEXT_OPTIONS } from 'state-shared';
	import { OptionsGrid } from 'components-shared';

	import ButtonFace from './ButtonFace.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
</script>

<span class="title">{i18nDerived.singleWinLimit()}</span>

<OptionsGrid
	miniSize
	value={stateUi.autoSpinsSingleWinLimitText}
	options={SINGLE_WIN_LIMIT_TEXT_OPTIONS}
	onchange={(value) => (stateUi.autoSpinsSingleWinLimitText = value)}
>
	{#snippet option({ option })}
		<ButtonFace
			variant="control"
			height="2.25rem"
			selected={option === stateUi.autoSpinsSingleWinLimitText}
		>
			<span class:infinity={option === '∞'} data-test="single-win-limit-options">
				{option}
			</span>
		</ButtonFace>
	{/snippet}
</OptionsGrid>

<style lang="scss">
	.title {
		line-height: 2rem;
		color: var(--ui-text-muted, white);
	}

	.infinity {
		font-size: 1.5rem;
		line-height: 1rem;
	}
</style>
