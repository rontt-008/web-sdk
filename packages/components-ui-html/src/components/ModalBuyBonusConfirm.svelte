<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button, Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateBet, stateModal, stateUi, INFINITY_MARK, type BetModeData } from 'state-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import ButtonFace from './ButtonFace.svelte';
	import BaseTitle from './BaseTitle.svelte';
	import BaseContent from './BaseContent.svelte';
	import HeadingText from './HeadingText.svelte';
	import VolatilityMeter from './VolatilityMeter.svelte';
	import BaseScrollable from './BaseScrollable.svelte';
	import BaseButtonWrap from './BaseButtonWrap.svelte';
	import { stateBonus, stateBonusDerived } from '../stateBonus.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import type { EmitterEventModal } from '../types';

	type Props = {
		bonusArt?: Snippet<[BetModeData]>;
	};

	const props: Props = $props();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	const confirm = () => {
		stateBet.activeBetModeKey = stateBonus.selectedBetModeKey;

		if (stateBonusDerived.selectedBetModeData().type === 'buy') {
			eventEmitter.broadcast({ type: 'bet' });
		}

		if (stateBonusDerived.selectedBetModeData().type === 'activate') {
			stateUi.autoSpinsLossLimitText = INFINITY_MARK;
			stateUi.autoSpinsSingleWinLimitText = INFINITY_MARK;
		}
	};
</script>

{#if stateModal.modal?.name === 'buyBonusConfirm'}
	{@const betModeData = stateBonusDerived.selectedBetModeData()}
	<Popup zIndex={zIndex.dialog} onclose={() => (stateModal.modal = { name: 'buyBonus' })}>
		<BaseContent maxWidth="500px">
			<BaseTitle>
				{betModeData.text.title}
			</BaseTitle>
			{#if props.bonusArt}
				<div class="art">
					{@render props.bonusArt(betModeData)}
				</div>
			{/if}
			{#if betModeData.volatility}
				<VolatilityMeter value={betModeData.volatility} />
			{/if}
			<BaseScrollable type="column">
				<span class="dialog">{betModeData.text.dialog}</span>
			</BaseScrollable>
			<div class="price">
				<HeadingText fill="var(--ui-price, white)">
					{numberToCurrencyString(stateBet.betAmount * betModeData.costMultiplier)}
				</HeadingText>
			</div>
			<BaseButtonWrap type="max-width">
				<Button
					data-test="confirm-button"
					onclick={() => {
						confirm();
						eventEmitter.broadcast({ type: 'soundPressGeneral' });
						stateModal.modal = null;
					}}
				>
					<ButtonFace
						variant={betModeData.type === 'activate' ? 'activate' : 'primary'}
						height="3rem"
						fontSize="1.25rem"
					>
						{i18nDerived.confirm()}
					</ButtonFace>
				</Button>
			</BaseButtonWrap>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	/* the same window as on the bonus cards */
	.art {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 15rem;
		max-width: 100%;
		height: 7rem;
		overflow: hidden;
		background: var(--ui-card-art-bg, rgba(255, 255, 255, 0.08));
		border-radius: var(--ui-card-art-radius, 0.75rem);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
	}

	.dialog {
		line-height: 1.4;
		color: var(--ui-text-muted, white);
	}

	.price {
		font-size: 2rem;
	}
</style>
