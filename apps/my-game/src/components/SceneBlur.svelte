<script lang="ts" module>
	// how far past the screen's edges the scene is blurred from; the background reaches this far
	// (see Background) so the edges blur into picture rather than into empty space
	export const SCENE_BLUR_EDGE = 128;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { BlurFilter, Rectangle } from 'pixi.js';
	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import ParentFilterArea from './ParentFilterArea.svelte';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContext();

	// The game scene (background, board, logo, ...) drawn through a blur that comes in quickly while
	// stateGame.blurScene is on. The filter is only attached while there is some blur, so the scene
	// costs nothing extra the rest of the time.
	// Blurred at a quarter of the resolution: each pass samples `strength / quality` pixels apart, and
	// at full resolution a strong blur skips so many pixels between samples that it looks blocky.
	// Shrunk first, neighbouring samples are close (here about 1.5 pixels of the smaller copy), and
	// the result is smoothly stretched back up (and costs a sixteenth as much). The strength is in
	// screen pixels whatever the resolution.
	const BLUR_RESOLUTION = 0.25;
	const BLUR_STRENGTH = 24;
	const BLUR_DURATION = 250;

	const blur = new BlurFilter({
		strength: 0,
		quality: 4,
		kernelSize: 9,
		resolution: BLUR_RESOLUTION,
	});
	// Pixi's blur fades into the empty part of the texture it draws into, which leaves pale borders.
	// No padding and an area reaching past the screen (kept, not clipped to the screen) put that
	// fade out of sight.
	blur.repeatEdgePixels = true;
	blur.clipToViewport = false;
	const filterArea = $derived(
		new Rectangle(
			-SCENE_BLUR_EDGE,
			-SCENE_BLUR_EDGE,
			context.stateLayoutDerived.canvasSizes().width + SCENE_BLUR_EDGE * 2,
			context.stateLayoutDerived.canvasSizes().height + SCENE_BLUR_EDGE * 2,
		),
	);
	const strength = new Tween(0, { duration: BLUR_DURATION });

	$effect(() => {
		strength.target = context.stateGame.blurScene ? BLUR_STRENGTH : 0;
	});

	$effect(() => {
		blur.strength = strength.current;
	});
</script>

<Container filters={strength.current > 0 ? [blur] : []}>
	<ParentFilterArea area={filterArea} />
	{@render props.children()}
</Container>
