<script lang="ts">
	import { Tween } from 'svelte/motion';

	import { stateBet } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import UiLabel from './UiLabel.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import type { UiLabelOptions } from '../types';

	const props: UiLabelOptions = $props();
	const winBookEventAmountTween = new Tween(stateBet.winBookEventAmount);
	const label = $derived(i18nDerived.win());
	const value = $derived(
		bookEventAmountToCurrencyString(winBookEventAmountTween.current, {
			counting: winBookEventAmountTween.current !== winBookEventAmountTween.target,
		}),
	);

	$effect(() => {
		winBookEventAmountTween.set(stateBet.winBookEventAmount);
	});
</script>

<UiLabel tiled {label} {value} stacked={props.stacked} plain={props.plain} />
