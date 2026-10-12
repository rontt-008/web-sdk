<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseContent from './BaseContent.svelte';
	import BaseTitle from './BaseTitle.svelte';
</script>

{#if stateModal.modal?.name === 'error'}
	<Popup zIndex={zIndex.modal} persistent onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="500px">
			{@const error = stateModal.modal?.error}
			<BaseTitle>Sorry, something went wrong.</BaseTitle>
			<div class="scrollY error-text">
				{#if error}
					{#if error?.error && error?.message}
						<span>{JSON.stringify(error.error || 'unknown')}</span>
						<p>{JSON.stringify(error.message || 'unknown')}</p>
					{:else}
						<p>{error}</p>
					{/if}
				{:else}
					<span>unknown error</span>
				{/if}
			</div>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.error-text {
		box-sizing: border-box;
		width: 100%;
		max-height: 100px;
		max-width: 480px;
		border-radius: var(--ui-control-radius, 8px);
		border: 1px solid var(--ui-danger, red);
		background: rgba(0, 0, 0, 0.2);
		color: var(--ui-text-muted, white);
		white-space: normal;
		overflow-wrap: anywhere;
		padding: 1rem;

		p {
			margin: 0.5rem 0 0;
		}
	}
</style>
