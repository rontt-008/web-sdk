<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	// Soft sunlight from the top-right corner of the screen: a warm glow and faint rays fanning down
	// and to the left (sun-glow.png and sun-rays.png, both lit from their top-right corner). They are
	// added onto the scene, so they only brighten it. The rays sway a few degrees about the corner and
	// the light slowly brightens and dims.
	// sizes are of the canvas's longer side
	const GLOW_SIZE = 0.5;
	const RAYS_SIZE = 1;
	const GLOW_ALPHA = 0.18;
	const RAYS_ALPHA = 0.16;
	const SWAY_ANGLE = (3 * Math.PI) / 180;
	// seconds for one full sway and one full brighten and dim
	const SWAY_PERIOD = 16;
	const BREATHE_PERIOD = 7;
	// how much of the light comes and goes
	const BREATHE = 0.2;

	const context = getContext();
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const size = $derived(Math.max(canvasSizes.width, canvasSizes.height));

	let time = $state(0);
	const breathe = $derived(1 - BREATHE * (0.5 + 0.5 * Math.sin((time * 2 * Math.PI) / BREATHE_PERIOD)));

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;

		const tick = () => (time += ticker.deltaMS / 1000);

		ticker.add(tick);
		return () => ticker.remove(tick);
	});
</script>

<Container x={canvasSizes.width} y={0}>
	<Sprite
		key="sunRays"
		anchor={{ x: 1, y: 0 }}
		width={size * RAYS_SIZE}
		height={size * RAYS_SIZE}
		rotation={Math.sin((time * 2 * Math.PI) / SWAY_PERIOD) * SWAY_ANGLE}
		alpha={RAYS_ALPHA * breathe}
		blendMode="add"
	/>
	<Sprite
		key="sunGlow"
		anchor={{ x: 1, y: 0 }}
		width={size * GLOW_SIZE}
		height={size * GLOW_SIZE}
		alpha={GLOW_ALPHA * breathe}
		blendMode="add"
	/>
</Container>
