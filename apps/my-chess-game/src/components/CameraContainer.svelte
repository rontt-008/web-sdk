<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Container } from 'pixi-svelte';

	import { camera } from '../game/camera.svelte';

	// the part of the board scene inside is seen through the camera (camera.svelte.ts): zoomed about
	// its focus and shaken; put inside a MainContainer, so its units are the main layout's
	type Props = { children: Snippet; zIndex?: number };

	const props: Props = $props();
</script>

<Container
	x={camera.focusX.current + camera.shakeX.current}
	y={camera.focusY.current + camera.shakeY.current}
	pivot={{ x: camera.focusX.current, y: camera.focusY.current }}
	scale={camera.scale.current}
	zIndex={props.zIndex}
>
	{@render props.children()}
</Container>
