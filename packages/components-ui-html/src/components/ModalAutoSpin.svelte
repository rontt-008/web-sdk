<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';
	import { scrollIntoView } from 'utils-shared/scroll';

	import BaseContent from './BaseContent.svelte';
	import BaseTitle from './BaseTitle.svelte';
	import BaseScrollable from './BaseScrollable.svelte';
	import BaseButtonWrap from './BaseButtonWrap.svelte';
	import AutoSpinsOptions from './AutoSpinsOptions.svelte';
	import AutoSpinsAdvanced from './AutoSpinsAdvanced.svelte';
	import AutoSpinsStartButton from './AutoSpinsStartButton.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
</script>

{#if stateModal.modal?.name === 'autoSpin'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="100%">
			<BaseTitle>
				{i18nDerived.autoSpins()}
			</BaseTitle>
			<BaseScrollable type="column">
				{#snippet children({ element })}
					<div class="subtitle" data-test="number-of-rounds">{i18nDerived.numberOfRounds()}</div>
					<AutoSpinsOptions />
					<AutoSpinsAdvanced
						ontoggle={(duration) => {
							if (element) {
								scrollIntoView({ element, duration });
							}
						}}
					/>
				{/snippet}
			</BaseScrollable>
			<BaseButtonWrap type="full-width">
				<AutoSpinsStartButton />
			</BaseButtonWrap>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.subtitle {
		color: var(--ui-text-muted, white);
	}
</style>
