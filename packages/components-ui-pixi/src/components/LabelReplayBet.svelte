<script lang="ts">
	import { stateBet, stateReplayDerived } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import UiLabel from './UiLabel.svelte';

	// The replayed bet, e.g. "BASE BET $1.00" (with the mode for one costing more than 1x, e.g.
	// "BONUS · BASE BET"), or with `realCost` what such a mode really cost, e.g.
	// "TOTAL BET COST · 100x $100.00" (nothing for a 1x mode). Social mode says BASE PLAY and TOTAL
	// PLAY WORTH (see stateReplayDerived.words). Not pressable: a replay has no bet menu.
	type Props = {
		realCost?: boolean;
		stacked?: boolean;
	};

	const props: Props = $props();
	const words = $derived(stateReplayDerived.words());
	const multiplier = $derived(stateReplayDerived.costMultiplier());
	const label = $derived(
		props.realCost
			? `${words.totalCost.toUpperCase()} · ${multiplier}x`
			: [multiplier > 1 ? stateReplayDerived.modeName() : '', words.baseBet.toUpperCase()]
					.filter(Boolean)
					.join(' · '),
	);
	const value = $derived(
		numberToCurrencyString(stateBet.betAmount * (props.realCost ? multiplier : 1), { fixed: true }),
	);
</script>

{#if !props.realCost || multiplier > 1}
	<UiLabel tiled {label} {value} stacked={props.stacked} />
{/if}
