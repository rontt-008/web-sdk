<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { onMount, onDestroy, type Snippet } from 'svelte';
	import { devicePixelRatio } from 'svelte/reactivity/window';

	import { getContextApp } from '../context.svelte';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContextApp();

	let wrap: HTMLDivElement;
	let initialised = $state(false);
	// The component can be destroyed and mounted again while its application is still initialising
	// (e.g. a story rendering twice), so each instance only touches its own application, and only
	// shares it once it is ready.
	let application: PIXI.Application<PIXI.Renderer<HTMLCanvasElement>> | undefined;
	let destroyed = false;

	const initialiseApplication = async () => {
		PIXI.Assets.reset();

		const app = new PIXI.Application<PIXI.Renderer<HTMLCanvasElement>>();
		application = app;
		await app.init({
			autoDensity: true,
			backgroundAlpha: 0,
			hello: true,
			multiView: false,
			antialias: true,
			clearBeforeRender: true,
			preference: 'webgpu',
			powerPreference: 'high-performance',
			resolution: devicePixelRatio.current,
			resizeTo: window,
		});

		// destroyed while initialising: a newer instance has its own application
		if (destroyed) {
			app.destroy();
			return false;
		}

		context.stateApp.pixiApplication = app;
		wrap.appendChild(app.canvas);

		// to prevent that you can't scroll the page with touch on the canvas. https://github.com/pixijs/pixijs/issues/4824
		// manipulation still lets the page scroll, but stops double-tap zoom on mobile
		app.renderer.events.autoPreventDefault = false;
		app.renderer.canvas.style.touchAction = 'manipulation';
		return true;
	};

	onMount(async () => {
		try {
			if (!initialised) initialised = await initialiseApplication();
		} catch (error) {
			console.error(error);
		}
	});

	onDestroy(() => {
		destroyed = true;
		// one still initialising is destroyed by initialiseApplication once it's ready
		if (initialised) application?.destroy();
	});
</script>

<div bind:this={wrap}>
	{#if initialised}
		{@render props.children()}
	{/if}
</div>
