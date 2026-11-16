<script lang="ts">
	import { Container, Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import CaveWater from './CaveWater.svelte';

	const context = getContext();

	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const layout = $derived(context.stateGameDerived.backgroundLayout());
</script>

<Rectangle {...canvas} backgroundColor={0x000000} zIndex={-3} />

<!-- the cave (cave_water_idle.blend's picture) covering the screen, in its own px, with its pool
	moving as in the .blend; the same in the base game and the free spins -->
<Container x={layout.x} y={layout.y} scale={layout.scale} zIndex={-2}>
	<Sprite key="background" />
	<CaveWater />
</Container>
