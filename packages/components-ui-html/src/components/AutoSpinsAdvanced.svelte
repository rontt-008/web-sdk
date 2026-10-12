<script lang="ts">
	import { slide } from 'svelte/transition';
	import { stateBetDerived } from 'state-shared';
	import { DropdownToggle } from 'components-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';

	import AutoSpinsLossLimit from './AutoSpinsLossLimit.svelte';
	import AutoSpinsSingleWinLimit from './AutoSpinsSingleWinLimit.svelte';
	import type { EmitterEventModal } from '../types';
	import { i18nDerived } from '../i18n/i18nDerived';

	type Props = {
		ontoggle: (duration: number) => void;
	};

	const props: Props = $props();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();
	const SLIDE_DURATION = 100;

	let open = $state(false);

	$effect(() => {
		if (open) props.ontoggle(SLIDE_DURATION);
	});
</script>

<DropdownToggle
	{open}
	disabled={stateBetDerived.activeBetMode().type === 'activate'}
	onchange={(value) => {
		open = value;
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
	}}
>
	<span>{i18nDerived.advanced()}</span>
</DropdownToggle>

{#if open}
	<div class="advanced" transition:slide={{ duration: SLIDE_DURATION }}>
		<AutoSpinsLossLimit />
		<AutoSpinsSingleWinLimit />
	</div>
{/if}

<style lang="scss">
	.advanced {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem 1rem 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: var(--ui-control-radius, 10px);
	}
</style>
