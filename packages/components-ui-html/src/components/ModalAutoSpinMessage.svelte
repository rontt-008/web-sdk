<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseContent from './BaseContent.svelte';
	import BaseTitle from './BaseTitle.svelte';
	import BaseScrollable from './BaseScrollable.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	const messageMap = $derived({
		lossLimitReached: i18nDerived.lossLimitReached(),
		singleWinLimitReached: i18nDerived.singleWinLimitReached(),
		insufficientFunds: i18nDerived.insufficientFunds(),
	});
</script>

{#if stateModal.modal?.name === 'autoSpinMessage'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="500px">
			<BaseTitle>
				{i18nDerived.notification()}
			</BaseTitle>
			<BaseScrollable type="column">
				<span class="text" data-test="auto-spin-stop-info">{i18nDerived.autoSpinsStopInfo()}</span>
				<div class="scrollY info-text" data-test="auto-spin-stop-content">
					{messageMap[stateModal.modal.message]}
				</div>
			</BaseScrollable>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.text {
		text-align: center;
		color: var(--ui-text-muted, white);
	}

	.info-text {
		box-sizing: border-box;
		width: 100%;
		text-align: center;
		max-height: 100px;
		max-width: 480px;
		border-radius: var(--ui-control-radius, 8px);
		background: rgba(0, 0, 0, 0.2);
		font-family: var(--ui-font-heading, inherit);
		font-weight: var(--ui-heading-weight, 800);
		white-space: normal;
		padding: 1rem;
	}
</style>
