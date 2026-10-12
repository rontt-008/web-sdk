<script lang="ts">
	import { stateBet, stateConfig } from 'state-shared';
	import { Button, OptionsToggle } from 'components-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import ButtonFace from './ButtonFace.svelte';
	import HeadingText from './HeadingText.svelte';
	import type { EmitterEventModal } from '../types';

	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	const iconSize = '2.75rem';
</script>

<OptionsToggle
	value={stateBet.betAmount}
	options={stateConfig.betAmountOptions}
	onchange={(value) => {
		stateBet.betAmount = value;
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
	}}
>
	{#snippet children({ disabledDown, disabledUp, toggleDown, toggleUp })}
		<div class="toggle-wrap">
			<Button data-test="down-button" disabled={disabledDown} onclick={toggleDown}>
				<ButtonFace variant="control" round width={iconSize} height={iconSize} fontSize="1.75rem">
					−
				</ButtonFace>
			</Button>

			<span class="amount">
				<HeadingText>{numberToCurrencyString(stateBet.betAmount)}</HeadingText>
			</span>

			<Button data-test="up-button" disabled={disabledUp} onclick={toggleUp}>
				<ButtonFace variant="control" round width={iconSize} height={iconSize} fontSize="1.75rem">
					+
				</ButtonFace>
			</Button>
		</div>
	{/snippet}
</OptionsToggle>

<style lang="scss">
	.toggle-wrap {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.75rem;
	}

	.amount {
		min-width: 7rem;
		text-align: center;
		font-size: 1.75rem;
	}
</style>
