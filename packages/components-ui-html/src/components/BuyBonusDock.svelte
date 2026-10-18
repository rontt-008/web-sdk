<script lang="ts">
	import { stateBet, stateConfig } from 'state-shared';
	import { Button, OptionsToggle } from 'components-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import ButtonFace from './ButtonFace.svelte';
	import SignIcon from './SignIcon.svelte';
	import HeadingText from './HeadingText.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import type { EmitterEventModal } from '../types';

	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	const BUTTON_SIZE = '2.4rem';
</script>

<!-- the balance, and the bet the bonus prices are worked out from -->
<div class="dock">
	<div class="balance">
		<span class="label">{i18nDerived.balance()}</span>
		<span class="balance-value">{numberToCurrencyString(stateBet.balanceAmount)}</span>
	</div>

	<OptionsToggle
		value={stateBet.betAmount}
		options={stateConfig.betAmountOptions}
		onchange={(value) => {
			stateBet.betAmount = value;
			eventEmitter.broadcast({ type: 'soundPressGeneral' });
		}}
	>
		{#snippet children({ disabledDown, disabledUp, toggleDown, toggleUp })}
			<div class="bet">
				<Button data-test="down-button" disabled={disabledDown} onclick={toggleDown}>
					<ButtonFace
						variant="control"
						round
						width={BUTTON_SIZE}
						height={BUTTON_SIZE}
						fontSize="1.4rem"
					>
						<SignIcon sign="minus" />
					</ButtonFace>
				</Button>

				<div class="amount">
					<span class="label">{i18nDerived.bet()}</span>
					<span class="value">
						<HeadingText>{numberToCurrencyString(stateBet.betAmount)}</HeadingText>
					</span>
				</div>

				<Button data-test="up-button" disabled={disabledUp} onclick={toggleUp}>
					<ButtonFace
						variant="control"
						round
						width={BUTTON_SIZE}
						height={BUTTON_SIZE}
						fontSize="1.4rem"
					>
						<SignIcon sign="plus" />
					</ButtonFace>
				</Button>
			</div>
		{/snippet}
	</OptionsToggle>
</div>

<style lang="scss">
	.dock {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
	}

	.label {
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		color: var(--ui-dock-label, white);
		font-family: var(--ui-font-heading, inherit);
		font-weight: var(--ui-heading-weight, 800);
		text-transform: var(--ui-heading-transform, none);
	}

	.balance {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.balance-value {
		font-family: var(--ui-font-heading, inherit);
		font-weight: var(--ui-heading-weight, 800);
		font-size: 0.95rem;
	}

	.bet {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 0.5rem 0.6rem;
		background: var(--ui-dock-bg, rgba(0, 0, 0, 0.6));
		border: var(--ui-dock-border, none);
		border-radius: var(--ui-dock-radius, 1rem);
		box-shadow: var(--ui-dock-shadow, none);
	}

	.amount {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 6rem;
	}

	.value {
		font-size: 1.3rem;
		white-space: nowrap;
	}
</style>
