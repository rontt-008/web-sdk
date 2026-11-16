<script lang="ts">
	import { Container, SpineProvider, SpineTrack } from 'pixi-svelte';

	import { getContext } from '../game/context';

	// The Crystal Hollows logo (the user's crystal_hollows_logo_idle.blend as a Spine skeleton,
	// art-source/logo-spine.py): the stone plaque with its 14 letters each floating on its own, a 4 s
	// loop, on wide screens at the top of the room left of the board (stateGame logoLayout; the free
	// spins sign goes below it). The skeleton's origin is the logo's middle; it is lazy, loaded by Game
	// when the screen is wide.
	const context = getContext();
	const layout = $derived(context.stateGameDerived.logoLayout());
	const shown = $derived(layout.shown && !!context.stateApp.loadedAssets.logo);
</script>

{#if shown}
	<Container x={layout.x} y={layout.y} scale={layout.scale}>
		<SpineProvider key="logo">
			<SpineTrack trackIndex={0} animationName="idle" loop />
		</SpineProvider>
	</Container>
{/if}
