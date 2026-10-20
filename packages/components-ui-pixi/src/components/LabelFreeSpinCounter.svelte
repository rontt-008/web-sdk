<script lang="ts">
	import { stateUi } from 'state-shared';

	import UiLabel from './UiLabel.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import type { UiLabelOptions } from '../types';

	const props: UiLabelOptions = $props();
	const label = $derived(i18nDerived.freeSpins());
	const value = $derived(`${stateUi.freeSpinCounterCurrent} / ${stateUi.freeSpinCounterTotal}`);
</script>

<UiLabel tiled {label} {value} stacked={props.stacked} plain={props.plain} />
