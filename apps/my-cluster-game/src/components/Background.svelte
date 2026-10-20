<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();

	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	// the loaded picture (a texture), for its size
	const texture = $derived(
		context.stateApp.loadedAssets?.background as { width: number; height: number } | undefined,
	);

	// the picture keeps its shape on every screen (wide, tall or square): scaled to cover the screen,
	// centred on it, with the overflow cropped by the screen's edges
	const layout = $derived.by(() => {
		const imageWidth = texture?.width || canvas.width;
		const imageHeight = texture?.height || canvas.height;
		const scale = Math.max(canvas.width / imageWidth, canvas.height / imageHeight);
		const width = imageWidth * scale;
		const height = imageHeight * scale;
		return { x: (canvas.width - width) / 2, y: (canvas.height - height) / 2, width, height };
	});
</script>

<Rectangle {...canvas} backgroundColor={0x000000} zIndex={-3} />

<Sprite key="background" {...layout} zIndex={-2} />
