<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseTitle from './BaseTitle.svelte';
	import BaseContent from './BaseContent.svelte';
	import BaseScrollable from './BaseScrollable.svelte';

	type Props = {
		// the game's pay table: its symbols, paylines and features; a placeholder when left out
		content?: Snippet;
		children: Snippet;
	};

	const props: Props = $props();
</script>

{#if stateModal.modal?.name === 'payTable'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="100%">
			{#if props.content}
				<BaseTitle>PAYTABLE</BaseTitle>
			{/if}
			<BaseScrollable type="column">
				{#if props.content}
					{@render props.content()}
				{:else}
					<span>ADD YOUR PAY TABLE</span>
				{/if}
				{@render props.children()}
			</BaseScrollable>
		</BaseContent>
	</Popup>
{/if}
