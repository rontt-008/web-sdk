<script lang="ts">
	import { Button, Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import ButtonFace from './ButtonFace.svelte';
	import BaseTitle from './BaseTitle.svelte';
	import BaseContent from './BaseContent.svelte';
	import BaseScrollable from './BaseScrollable.svelte';
	import BaseButtonWrap from './BaseButtonWrap.svelte';
	import BetMenuAmountToggle from './BetMenuAmountToggle.svelte';
	import BetMenuAmountGrid from './BetMenuAmountGrid.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	const confirm = () => {
		stateModal.modal = null;
	};
</script>

{#if stateModal.modal?.name === 'betAmountMenu'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="100%">
			<BaseTitle>
				{i18nDerived.betMenu()}
			</BaseTitle>
			<BaseScrollable type="column">
				<span class="subtitle">{i18nDerived.selectYourBet()}</span>
				<BetMenuAmountToggle />
				<BetMenuAmountGrid />
			</BaseScrollable>
			<BaseButtonWrap type="full-width">
				<Button data-test="confirm-button" onclick={confirm}>
					<ButtonFace variant="primary" height="3rem" fontSize="1.25rem">
						{i18nDerived.confirm()}
					</ButtonFace>
				</Button>
			</BaseButtonWrap>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.subtitle {
		color: var(--ui-text-muted, white);
	}
</style>
