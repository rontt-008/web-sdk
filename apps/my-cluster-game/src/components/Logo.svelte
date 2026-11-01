<script lang="ts">
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import LogoArt from './LogoArt.svelte';

	const context = getContext();

	// the game's logo (LogoArt) over the bonus meter, placed by logoLayout
	const layout = $derived(context.stateGameDerived.logoLayout());
</script>

<MainContainer>
	{#if layout.height > 0}
		<LogoArt x={layout.x} y={layout.y} width={layout.width} />
	{/if}
</MainContainer>
