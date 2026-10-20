<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';

	import { startMockRgs } from './mockRgs';

	type Props = { balance: number; children: Snippet };

	const props: Props = $props();

	// started before the children mount, so the game's first request (authenticate) reaches it
	const stop = startMockRgs({ balance: props.balance });
	onDestroy(stop);
</script>

{@render props.children()}
