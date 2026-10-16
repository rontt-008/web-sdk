<script lang="ts">
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import LogoCat from './LogoCat.svelte';

	const context = getContext();
</script>

<Sprite key="gameLogo" anchor={0.5} {...context.stateGameDerived.logoLayout()} />

<!-- narrow screens put the logo above the board, leaving no room under it -->
{#if context.stateGameDerived.isLogoBesideBoard()}
	<LogoCat />
{/if}
