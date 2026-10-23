<script lang="ts">
	import { Container, Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import Clouds from './Clouds.svelte';

	const context = getContext();

	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const layout = $derived(context.stateGameDerived.backgroundLayout());
</script>

<Rectangle {...canvas} backgroundColor={0x000000} zIndex={-3} />

<!-- in the picture's pixels: the picture, the clouds drifting across its sky, and the tree at its top
	left (static/assets/background-tree.webp, cut out of it) in front of them -->
<Container x={layout.x} y={layout.y} scale={layout.scale} zIndex={-2}>
	<Sprite key="background" />
	<Clouds width={layout.width} />
	<Sprite key="backgroundTree" />
</Container>
