<script lang="ts">
	// The background's pool moving, as in cave_water_idle.blend (see ../game/caveWater.ts): the shader
	// draws the water at the picture's own px into a texture, at the render's 30 frames a second, and
	// that is shown over the still picture (in the picture's px, see Background), so it costs the same
	// on any screen. Only the water is drawn; the rest of the texture stays clear. WebGL 2 only (the
	// game asks for WebGL): anything else gets the still pool.
	import { onDestroy } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { getContextParent } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { AREA, FRAGMENT, LOOP_SECONDS, PICTURE, VERTEX } from '../game/caveWater';

	const FPS = 30; // the render's
	const FRAMES = LOOP_SECONDS * FPS;

	const context = getContext();
	const parent = getContextParent();
	const app = context.stateApp.pixiApplication;
	const assets = context.stateApp.loadedAssets;
	const picture = assets?.background as PIXI.Texture | undefined;
	const fill = assets?.backgroundWater as PIXI.Texture | undefined;
	const mask = assets?.backgroundWaterMask as PIXI.Texture | undefined;

	const renderer = app?.renderer;
	const webgl2 =
		renderer?.type === PIXI.RendererType.WEBGL &&
		(renderer as PIXI.WebGLRenderer).context.webGLVersion === 2;

	const shader =
		webgl2 && picture && fill && mask
			? PIXI.Shader.from({
					gl: { vertex: VERTEX, fragment: FRAGMENT },
					resources: {
						uPicture: picture.source,
						uFill: fill.source,
						uMask: mask.source,
						waterUniforms: {
							uArea: {
								value: new Float32Array([AREA.x, AREA.y, AREA.width, AREA.height]),
								type: 'vec4<f32>',
							},
							uSize: { value: new Float32Array([PICTURE.width, PICTURE.height]), type: 'vec2<f32>' },
							uLoop: { value: 0, type: 'f32' },
						},
					},
				})
			: undefined;

	let mesh: PIXI.Mesh<PIXI.MeshGeometry, PIXI.Shader> | undefined;
	let target: PIXI.RenderTexture | undefined;
	let sprite: PIXI.Sprite | undefined;

	if (shader) {
		const { width, height } = AREA;
		const geometry = new PIXI.MeshGeometry({
			positions: new Float32Array([0, 0, width, 0, width, height, 0, height]),
			uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
			indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
		});
		mesh = new PIXI.Mesh({ geometry, shader });
		target = PIXI.RenderTexture.create({ width, height, resolution: 1 });
		sprite = new PIXI.Sprite({ texture: target, x: AREA.x, y: AREA.y });
		parent.addToParent(sprite);
	}

	let seconds = 0;
	let drawn = -1;

	const draw = () => {
		if (!app || !shader || !mesh || !target) return;
		const frame = Math.floor(seconds * FPS) % FRAMES;
		if (frame === drawn) return;
		drawn = frame;
		shader.resources.waterUniforms.uniforms.uLoop = frame / FRAMES;
		app.renderer.render({ container: mesh, target, clear: true, clearColor: [0, 0, 0, 0] });
	};

	$effect(() => {
		const ticker = app?.ticker;
		if (!shader || !ticker) return;
		const tick = () => {
			seconds = (seconds + ticker.deltaMS / 1000) % LOOP_SECONDS;
			draw();
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	// (the sprite is destroyed by addToParent)
	onDestroy(() => {
		target?.destroy(true);
		mesh?.destroy();
	});
</script>
