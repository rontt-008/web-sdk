<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseTitle from './BaseTitle.svelte';
	import BaseContent from './BaseContent.svelte';
	import BaseScrollable from './BaseScrollable.svelte';

	type Props = {
		// the game's rules: how its features work, its RTP and max win; a placeholder when left out
		content?: Snippet;
		children: Snippet;
	};

	const props: Props = $props();
</script>

{#if stateModal.modal?.name === 'gameRules'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="80%" solid>
			<BaseScrollable type="column">
				{#if props.content}
					<!-- at the top of the rules, scrolling away with them -->
					<BaseTitle>GAME RULES</BaseTitle>
					{@render props.content()}
				{:else}
					<span>ADD YOUR GAME RULES</span>
				{/if}
				{@render props.children()}
			</BaseScrollable>
		</BaseContent>
	</Popup>
{/if}
