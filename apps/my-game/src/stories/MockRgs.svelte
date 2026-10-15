<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';

	import { startMockRgs } from './mockRgs';

	// maxWin: every round pays the mode's max win
	type Props = { balance: number; maxWin?: boolean; children: Snippet };

	const props: Props = $props();

	// started before the children mount, so the game's first request (authenticate) reaches it
	const stop = startMockRgs({ balance: props.balance, maxWin: props.maxWin });
	onDestroy(stop);
</script>

{@render props.children()}
