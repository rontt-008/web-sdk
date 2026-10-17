<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';

	import { startMockRgs, type MockRounds } from './mockRgs';

	// rounds: which rounds it answers with, by the real odds, only max wins or only top wins
	type Props = { balance: number; rounds?: MockRounds; children: Snippet };

	const props: Props = $props();

	// started before the children mount, so the game's first request (authenticate) reaches it
	const stop = startMockRgs({ balance: props.balance, rounds: props.rounds });
	onDestroy(stop);
</script>

{@render props.children()}
