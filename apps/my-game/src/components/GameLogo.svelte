<script lang="ts">
	import { getContext } from '../game/context';
	import FloatingLogo from './FloatingLogo.svelte';
	import LogoCat from './LogoCat.svelte';

	// The floating logo with its Zs (see FloatingLogo), beside the board or above it
	const context = getContext();
	const layout = $derived(context.stateGameDerived.logoLayout());
</script>

<FloatingLogo x={layout.x} y={layout.y} width={layout.width} height={layout.height} />

<!-- narrow screens put the logo above the board, leaving no room under it -->
{#if context.stateGameDerived.isLogoBesideBoard()}
	<LogoCat />
{/if}
