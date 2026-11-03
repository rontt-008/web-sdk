<script lang="ts" module>
	// The lake in the background moving (in the picture's pixels, see Background): the picture itself,
	// drawn again over the lake with its pixels nudged side to side (and a touch up and down) by bands
	// of ripples drifting across it, so its reflections waver, with a little light on their crests.
	// Far off the ripples are small and close together, near they are bigger and wider apart. How much
	// each pixel moves is static/assets/background-water.png (art-source/water.py): none on the far
	// shore and the bushes and stones in front, so they stay still, fading in over a few pixels.

	// the lake's box in the picture's px (AREA in art-source/water.py)
	const AREA = { x: 360, y: 520, width: 1312, height: 225 };
	const PICTURE = { width: 1672, height: 941 };

	const VERTEX = `
		in vec2 aPosition;
		in vec2 aUV;
		out vec2 vUV;
		uniform mat3 uProjectionMatrix;
		uniform mat3 uWorldTransformMatrix;
		uniform mat3 uTransformMatrix;
		void main() {
			mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
			gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
			vUV = aUV;
		}
	`;

	// uArea: the lake's box (x, y, width, height), uSize the picture's, in its px
	const FRAGMENT = `
		precision highp float;
		in vec2 vUV;
		out vec4 finalColor;
		uniform sampler2D uPicture;
		uniform sampler2D uRipple;
		uniform vec4 uArea;
		uniform vec2 uSize;
		uniform float uTime;
		uniform vec4 uColor;

		// radians a px down the water between ripple bands, far off and near
		const float BANDS_FAR = 0.9;
		const float BANDS_NEAR = 0.3;
		// how far a pixel moves (px), far off and near
		const vec2 ACROSS = vec2(1.0, 3.0);
		const vec2 DOWN = vec2(0.2, 0.7);

		void main() {
			float ripple = texture(uRipple, vUV).r;
			vec2 px = uArea.xy + vUV * uArea.zw;
			float near = vUV.y;
			float y = vUV.y * uArea.w;
			// the bands' phase down the water, their spacing growing from far to near
			float phase = BANDS_FAR * y + (BANDS_NEAR - BANDS_FAR) * y * y / (2.0 * uArea.w);
			float wave = 0.65 * sin(phase - uTime * 1.6 + 1.8 * sin(px.x * 0.006 + uTime * 0.35))
				+ 0.35 * sin(phase * 1.83 + uTime * 1.1 + px.x * 0.011);
			float across = wave * ripple * mix(ACROSS.x, ACROSS.y, near);
			float down = sin(phase * 0.7 + px.x * 0.02 - uTime * 0.9) * ripple * mix(DOWN.x, DOWN.y, near);
			vec4 colour = texture(uPicture, (px + vec2(across, down)) / uSize);
			// a little light on the crests, more where the water is bright (the sunset's reflection)
			float light = dot(colour.rgb, vec3(0.299, 0.587, 0.114));
			colour.rgb *= 1.0 + ripple * max(wave, 0.0) * (0.04 + 0.08 * smoothstep(0.5, 0.8, light));
			finalColor = colour * smoothstep(0.0, 0.08, ripple) * uColor;
		}
	`;
</script>

<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { getContextParent } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
	const parent = getContextParent();

	const picture = context.stateApp.loadedAssets?.background as PIXI.Texture | undefined;
	const ripple = context.stateApp.loadedAssets?.backgroundWater as PIXI.Texture | undefined;
	const app = context.stateApp.pixiApplication;
	// the shader is WebGL's (the game asks for WebGL; the rare WebGPU screen gets the still lake)
	const shader =
		picture && ripple && app?.renderer.type === PIXI.RendererType.WEBGL
			? PIXI.Shader.from({
					gl: { vertex: VERTEX, fragment: FRAGMENT },
					resources: {
						uPicture: picture.source,
						uRipple: ripple.source,
						waterUniforms: {
							uArea: {
								value: new Float32Array([AREA.x, AREA.y, AREA.width, AREA.height]),
								type: 'vec4<f32>',
							},
							uSize: { value: new Float32Array([PICTURE.width, PICTURE.height]), type: 'vec2<f32>' },
							uTime: { value: 0, type: 'f32' },
						},
					},
				})
			: undefined;

	if (shader) {
		const { x, y, width, height } = AREA;
		const geometry = new PIXI.MeshGeometry({
			positions: new Float32Array([x, y, x + width, y, x + width, y + height, x, y + height]),
			uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
			indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
		});
		parent.addToParent(new PIXI.Mesh({ geometry, shader }));
	}

	$effect(() => {
		const ticker = app?.ticker;
		if (!shader || !ticker) return;
		const tick = () => {
			shader.resources.waterUniforms.uniforms.uTime += ticker.deltaMS / 1000;
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});
</script>
