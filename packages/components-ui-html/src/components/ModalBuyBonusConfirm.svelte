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
		// played over the game once a bonus is bought, before it starts; it calls start when done
		bonusBought?: Snippet<[{ betModeData: BetModeData; start: () => void }]>;
		// a CANCEL button joined to the left of CONFIRM, going back to the buy bonus menu
		cancelButton?: boolean;
		// the game's own dialog instead of the default one, in the same popup: it gets the bonus and
		// what its CONFIRM and CANCEL buttons do
		bonusConfirm?: Snippet<[{ betModeData: BetModeData; confirm: () => void; cancel: () => void }]>;
	};

	const props: Props = $props();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	// the bonus just bought, while bonusBought plays
	let bought = $state<BetModeData | null>(null);
	let startAnyway: ReturnType<typeof setTimeout> | undefined;
	const BOUGHT_MAX_MS = 5000;

	const start = () => {
		if (!bought) return;
		clearTimeout(startAnyway);
		bought = null;
		eventEmitter.broadcast({ type: 'bet' });
	};

	const confirm = () => {
		stateBet.activeBetModeKey = stateBonus.selectedBetModeKey;

		if (stateBonusDerived.selectedBetModeData().type === 'buy') {
			if (props.bonusBought) {
				bought = stateBonusDerived.selectedBetModeData();
				// the bonus starts even if bonusBought never calls start
				startAnyway = setTimeout(start, BOUGHT_MAX_MS);
			} else {
				eventEmitter.broadcast({ type: 'bet' });
			}
		}

		if (stateBonusDerived.selectedBetModeData().type === 'activate') {
			stateUi.autoSpinsLossLimitText = INFINITY_MARK;
			stateUi.autoSpinsSingleWinLimitText = INFINITY_MARK;
		}
	};

	// the dialog's CONFIRM: buys the bonus or switches the mode on, and closes
	const confirmAndClose = () => {
		confirm();
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = null;
	};

	// its CANCEL: back to the buy bonus menu
	const cancel = () => {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'buyBonus' };
	};
</script>

{#if stateModal.modal?.name === 'buyBonusConfirm'}
	{@const betModeData = stateBonusDerived.selectedBetModeData()}
	<Popup zIndex={zIndex.dialog} onclose={() => (stateModal.modal = { name: 'buyBonus' })}>
		{#if props.bonusConfirm}
			{@render props.bonusConfirm({ betModeData, confirm: confirmAndClose, cancel })}
		{:else}
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
				{#snippet confirmButton(join?: 'right')}
					<Button data-test="confirm-button" onclick={confirmAndClose}>
						<!-- joined to the gold CANCEL, it is always the blue one, also for switching a mode on -->
						<ButtonFace
							variant={betModeData.type === 'activate' && !join ? 'activate' : 'primary'}
							{join}
							height="3rem"
							fontSize="1.25rem"
						>
							{i18nDerived.confirm()}
						</ButtonFace>
					</Button>
				{/snippet}

				{#if props.cancelButton}
					<!-- CANCEL and CONFIRM joined into one -->
					<div class="joined">
						<Button data-test="cancel-button" onclick={cancel}>
							<ButtonFace variant="activate" join="left" height="3rem" fontSize="1.25rem">
								{i18nDerived.cancel()}
							</ButtonFace>
						</Button>
						{@render confirmButton('right')}
					</div>
				{:else}
					<BaseButtonWrap type="max-width">
						{@render confirmButton()}
					</BaseButtonWrap>
				{/if}
			</BaseContent>
		{/if}
	</Popup>
{/if}

{#if bought && props.bonusBought}
	<!-- over the game, taking the clicks, until the bonus starts -->
	<div class="bought" style:z-index={zIndex.dialog}>
		{@render props.bonusBought({ betModeData: bought, start })}
	</div>
{/if}

<style lang="scss">
	.bought {
		position: fixed;
		inset: 0;
	}

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

	.joined {
		display: flex;
		width: 100%;
		max-width: 22rem;

		/* the two halves side by side, without the browser's own button border between them */
		> :global(button) {
			flex: 1 1 0;
			min-width: 0;
			border: 0;
		}
	}
</style>
