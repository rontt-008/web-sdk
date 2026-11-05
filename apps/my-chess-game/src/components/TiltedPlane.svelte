<script lang="ts">
	import * as PIXI from 'pixi.js';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { createContextParent, getContextParent } from 'pixi-svelte';

	import { getContext } from '../game/context';

	// Something lying tilted on the table (the board, the side panel): what's put inside, in its own units
	// (its top left corner at 0, 0, `size` across), is drawn each frame into a texture, which a
	// perspective mesh shows where `project` puts it (a point of it to the parent's units; see TILT,
	// tilt.ts). Under it, its front edge (its thickness, seen as it tips away) and a soft shadow on the
	// table.
	type Props = {
		children: Snippet;
		size: { width: number; height: number };
		project: (x: number, y: number) => { x: number; y: number };
		// room round it in the texture for what reaches past its edge
		pad?: number;
		// how many times the main layout's scale it's seen at, at most (the camera's zoom), for its detail
		detail?: number;
		// how far the solid thing reaches out past `size` on each side (a frame round it), in its own units,
		// for its front edge and shadow; the front edge, in the parent's units; and how dark the shadow is
		// (0: none)
		rim?: number;
		edge?: { depth: number; colour: number };
		shadow?: number;
		// how far the shadow falls from under it (away from the light), in the parent's units
		shadowOffset?: { x: number; y: number };
	};

	const props: Props = $props();
	const context = getContext();
	const parentContext = getContextParent();

	const MAX_PIXELS = 2048;
	const pad = $derived(props.pad ?? 0);

	const scene = new PIXI.Container();
	const plane = new PIXI.Container();
	scene.addChild(plane);

	const texture = PIXI.RenderTexture.create({ width: 1, height: 1, antialias: true });
	const mesh = new PIXI.PerspectiveMesh({ texture, verticesX: 16, verticesY: 16 });
	const shadow = new PIXI.Graphics();
	shadow.filters = [new PIXI.BlurFilter({ strength: 14, quality: 3 })];
	const edge = new PIXI.Graphics();

	parentContext.addToParent(shadow);
	parentContext.addToParent(edge);
	parentContext.addToParent(mesh);
	// what's put inside goes onto the plane, in its own units
	createContextParent(plane);

	// the texture's size, and its pixels following the size it's seen at
	$effect(() => {
		plane.position.set(pad, pad);
		const width = props.size.width + pad * 2;
		const height = props.size.height + pad * 2;
		const scale = context.stateLayoutDerived.mainLayout().scale;
		const density = scale * Math.min(window.devicePixelRatio || 1, 2) * (props.detail ?? 1);
		texture.source.resize(width, height, Math.min(MAX_PIXELS / Math.max(width, height), density));
	});

	// the mesh on its tilted quad (the texture's padding too, along the same plane), the front edge under
	// the near side, and the shadow under both
	$effect(() => {
		const { width, height } = props.size;
		const corners = [
			props.project(-pad, -pad),
			props.project(width + pad, -pad),
			props.project(width + pad, height + pad),
			props.project(-pad, height + pad),
		].flatMap(({ x, y }) => [x, y]);
		mesh.setCorners(...(corners as [number, number, number, number, number, number, number, number]));

		const rim = props.rim ?? 0;
		const tl = props.project(-rim, -rim);
		const tr = props.project(width + rim, -rim);
		const br = props.project(width + rim, height + rim);
		const bl = props.project(-rim, height + rim);
		const depth = props.edge?.depth ?? 0;
		edge.clear();
		if (props.edge) {
			edge.poly([bl.x, bl.y, br.x, br.y, br.x, br.y + depth, bl.x, bl.y + depth]).fill(props.edge.colour);
		}
		const { x: sx, y: sy } = props.shadowOffset ?? { x: 0, y: 0 };
		shadow.clear();
		// none for what casts its own (shadow 0)
		shadow.visible = (props.shadow ?? 0.45) > 0;
		if (!shadow.visible) return;
		shadow
			.poly([
				tl.x + sx,
				tl.y + 6 + sy,
				tr.x + sx,
				tr.y + 6 + sy,
				br.x + 4 + sx,
				br.y + depth + 10 + sy,
				bl.x - 4 + sx,
				bl.y + depth + 10 + sy,
			])
			.fill({ color: 0x000000, alpha: props.shadow ?? 0.45 });
	});

	onMount(() => {
		const app = context.stateApp.pixiApplication;
		if (!app) return;
		const render = () =>
			app.renderer.render({ container: scene, target: texture, clear: true, clearColor: [0, 0, 0, 0] });
		app.ticker.add(render, undefined, PIXI.UPDATE_PRIORITY.HIGH);
		return () => {
			app.ticker.remove(render);
			// after the mesh and what's inside have gone
			queueMicrotask(() => {
				texture.destroy(true);
				scene.destroy();
			});
		};
	});
</script>

{@render props.children()}
