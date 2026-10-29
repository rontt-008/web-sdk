<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();

	// the game's name, RuneFall, on a wooden sign over the bonus meter (static/assets/logo.webp, from
	// art-source/wood-frames.py; placed by logoLayout)
	const layout = $derived(context.stateGameDerived.logoLayout());
</script>

<MainContainer>
	{#if layout.height > 0}
		<Sprite key="logo" x={layout.x} y={layout.y} width={layout.width} height={layout.height} />
	{/if}
</MainContainer>
