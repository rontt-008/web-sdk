<script lang="ts">
	import { stateBet, stateBetDerived, stateReplay } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import UiLabel from './UiLabel.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	// The replayed bet, e.g. "BONUS $1.00", or with `realCost` what a mode costing more than 1x really
	// cost, e.g. "REAL COST · 100x $100.00" (nothing for a 1x mode). Not pressable: a replay has no bet menu.
	type Props = {
		realCost?: boolean;
		stacked?: boolean;
	};

	const props: Props = $props();
	// from the replay's response, or the mode's own cost when the response doesn't say
	const multiplier = $derived(
		stateReplay.costMultiplier > 1
			? stateReplay.costMultiplier
			: (stateBetDerived.activeBetMode()?.costMultiplier ?? 1),
	);
	const modeTitle = $derived(multiplier > 1 ? stateBetDerived.activeBetMode()?.text?.title : undefined);
	const label = $derived(
		props.realCost ? `REAL COST · ${multiplier}x` : modeTitle || i18nDerived.bet(),
	);
	const value = $derived(
		numberToCurrencyString(stateBet.betAmount * (props.realCost ? multiplier : 1)),
	);
</script>

{#if !props.realCost || multiplier > 1}
	<UiLabel tiled {label} {value} stacked={props.stacked} />
{/if}
