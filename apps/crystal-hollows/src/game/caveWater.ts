// The cave background's pool moving: the water of cave_water_idle.blend ('blender stuff' IDLE/, its
// scripts and layers in folders/cave_water_idle), redone as a WebGL shader so the game draws it live
// instead of playing its 360 rendered frames. It works as the .blend's materials do (build_scene.py),
// with the same settings (rig.py) and Blender's own noise, so a frame here matches the render:
// - three sets of ripples travel across the pool, laid out on its surface in perspective (smaller,
//   flatter and slower further back); they shift the picture of the water (its reflections and bright
//   spots) sideways and up and down and lighten its crests and darken its troughs;
// - glints of light ride their crests, brighter on the lighter water;
// - rings spread from the rocks standing in it, two per loop each;
// - the motion fades out towards the water's edges (the rocks, the shore), so they stay as drawn.
// Everything loops seamlessly every LOOP_SECONDS. Drawn over the still picture by CaveWater.svelte,
// only over the pool (AREA); the textures are cut by art-source/cave-water.py.
//
// No imports, so Node can load it to check it outside the game against the render.

// the picture, and the box of it the pool's textures cover, in its px (printed by cave-water.py)
export const PICTURE = { width: 1672, height: 941 };
export const AREA = { x: 191, y: 565, width: 1481, height: 285 };

// rig.py: FPS 30, LOOP 360
export const LOOP_SECONDS = 12;

// the pool in perspective: the rows (px from the top) of the horizon its surface runs towards and of
// its near edge, and how flat it is seen (screen px up-down per surface px at the near edge)
const HORIZON_ROW = 398;
const NEAR_ROW = 825;
const SLANT = 0.25;

// the sets of ripples: angle (degrees from coming straight towards the viewer; + = heading left),
// gap between crests, length along them, how far the pattern runs before it repeats, how many repeats
// it travels per loop; then how far it shifts the water sideways and up and down at the near edge (px
// per unit of ripple), how much it counts for the light and dark, and for the glints
const WAVES = [
	[0, 110, 220, 600, 1, 32, 8, 0.5, 0.2], // a broad swell rolling towards the viewer
	[38, 30, 90, 600, 1, 8, 4, 0.3, 0.5], // ripples crossing from the right
	[-52, 20, 60, 480, 1, 6, 3, 0.2, 0.8], // finer ripples crossing from the left
];
const SHADE = 0.3;
const GLINT_CUT = [0.25, 0.45];
const GLINT_STRENGTH = 0.45;
const GLINT_COLOUR = [0.8, 0.98, 1.0];

// rings: middle (px), half-width and half-height as it leaves the rock and when it has faded out,
// and when in the loop it starts (0-1)
const RINGS = [
	[1253, 722, 80, 12, 175, 38, 0.0], // the small rock in the middle
	[328, 643, 110, 9, 215, 32, 0.35], // the rock on the left
	[1440, 638, 140, 9, 250, 34, 0.65], // the rock on the right
	[865, 602, 100, 6, 165, 20, 0.15], // the rocks at the back
	[1080, 602, 75, 6, 135, 20, 0.8],
];
const RINGS_PER_LOOP = 2;
const RING_WIDTH = 2.5;
const RING_STRENGTH = 0.5;
const RING_COLOUR = [0.75, 0.97, 1.0];

// a GLSL float literal
const f = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
// rig.py's colours are as they look on screen; the light is added in linear, as in Blender
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const vec3 = (c: number[]) => `vec3(${c.map((x) => f(linear(x))).join(', ')})`;

export const VERTEX = `#version 300 es
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

const waves = WAVES.map(([angle, along, across, period, perLoop], i) => {
	const a = (angle * Math.PI) / 180;
	const args = [Math.sin(a), Math.cos(a), along, across, period, perLoop, 1.7 + 3.1 * i];
	return `float w${i} = wave(g, turn, ${args.map(f).join(', ')});`;
});
const sum = (k: number) => WAVES.map((w, i) => `w${i} * ${f(w[k])}`).join(' + ');
const rings = RINGS.map(
	([x, y, a0, b0, a1, b1, start]) =>
		`ring(px - vec2(${f(x)}, ${f(y)}), vec2(${f(a0)}, ${f(b0)}), vec2(${f(a1)}, ${f(b1)}), ${f(start)}, ringTime)`,
).join(' +\n\t\t\t');

// uPicture: the whole picture; uFill (the clean water, which the ripples shift without ever bringing
// the rocks' dark outlines out into the pool) and uMask (red: the water, green: how much it moves, 0
// at its edges) cover AREA; uLoop: how far through the loop (0-1). GLSL ES 3.00 (WebGL 2) for the
// noise's integer hash: the #version line tells Pixi so.
export const FRAGMENT = `#version 300 es
	precision highp float;
	precision highp int;
	in vec2 vUV;
	out vec4 finalColor;
	uniform sampler2D uPicture;
	uniform sampler2D uFill;
	uniform sampler2D uMask;
	uniform vec4 uArea;
	uniform vec2 uSize;
	uniform float uLoop;
	uniform vec4 uColor;

	const float TAU = 6.283185307179586;

	// Blender's Perlin noise (4D), as its Noise Texture node computes it
	uint rot(uint x, uint k) {
		return (x << k) | (x >> (32u - k));
	}
	uint hash(ivec4 key) {
		uint a = 0xdeadbeefu + (4u << 2u) + 13u;
		uint b = a;
		uint c = a;
		a += uint(key.x);
		b += uint(key.y);
		c += uint(key.z);
		a -= c; a ^= rot(c, 4u); c += b;
		b -= a; b ^= rot(a, 6u); a += c;
		c -= b; c ^= rot(b, 8u); b += a;
		a -= c; a ^= rot(c, 16u); c += b;
		b -= a; b ^= rot(a, 19u); a += c;
		c -= b; c ^= rot(b, 4u); b += a;
		a += uint(key.w);
		c ^= b; c -= rot(b, 14u);
		a ^= c; a -= rot(c, 11u);
		b ^= a; b -= rot(a, 25u);
		c ^= b; c -= rot(b, 16u);
		a ^= c; a -= rot(c, 4u);
		b ^= a; b -= rot(a, 14u);
		c ^= b; c -= rot(b, 24u);
		return c;
	}
	float corner(ivec4 cell, vec4 f, ivec4 o) {
		uint h = hash(cell + o) & 31u;
		vec4 p = f - vec4(o);
		float u = h < 24u ? p.x : p.y;
		float v = h < 16u ? p.y : p.z;
		float s = h < 8u ? p.z : p.w;
		return ((h & 1u) != 0u ? -u : u) + ((h & 2u) != 0u ? -v : v) + ((h & 4u) != 0u ? -s : s);
	}
	float square(ivec4 cell, vec4 f, vec4 e, int z, int w) {
		return mix(mix(corner(cell, f, ivec4(0, 0, z, w)), corner(cell, f, ivec4(1, 0, z, w)), e.x),
			mix(corner(cell, f, ivec4(0, 1, z, w)), corner(cell, f, ivec4(1, 1, z, w)), e.x), e.y);
	}
	float perlin(vec4 p) {
		vec4 i = floor(p);
		vec4 f = p - i;
		ivec4 cell = ivec4(i);
		vec4 e = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
		float w0 = mix(square(cell, f, e, 0, 0), square(cell, f, e, 1, 0), e.z);
		float w1 = mix(square(cell, f, e, 0, 1), square(cell, f, e, 1, 1), e.z);
		return mix(w0, w1, e.w);
	}
	// the Noise Texture (fBM, detail 2, roughness 0.5, lacunarity 2, normalized), as -1 .. 1
	float noise(vec4 p) {
		return 0.8344 * (perlin(p) + 0.5 * perlin(2.0 * p) + 0.25 * perlin(4.0 * p)) / 1.75;
	}

	// one set of ripples at g (the surface position across and away, in surface px), travelling
	// towards the viewer turned by its angle; the pattern is read round a circle through two of the
	// noise's dimensions, so it repeats every period along its way and comes back each loop. -1 .. 1
	float wave(vec2 g, float turn, float sina, float cosa, float along, float across, float period,
			float perLoop, float seed) {
		float way = g.x * sina + g.y * cosa;
		float side = g.x * cosa - g.y * sina;
		float phase = way * (TAU / period) + turn * perLoop;
		float r = period / (TAU * along);
		return noise(vec4(side / across, cos(phase) * r, sin(phase) * r, seed));
	}

	// a ring spreading from a rock (d: px from its middle): fast, then slowing, fading as it goes
	float ring(vec2 d, vec2 from, vec2 to, float start, float time) {
		float life = fract(time + start);
		vec2 size = from + (1.0 - (1.0 - life) * (1.0 - life)) * (to - from);
		float rho = sqrt(dot(d / size, d / size) + 1e-6);
		float dist = length(d) * abs(1.0 - 1.0 / rho);
		float fade = pow(1.0 - life, 1.5) * smoothstep(0.0, 0.08, life);
		return (1.0 - smoothstep(0.0, ${f(RING_WIDTH)}, dist)) * fade;
	}

	vec3 toLinear(vec3 c) {
		return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
	}
	vec3 toScreen(vec3 c) {
		return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
	}

	void main() {
		vec2 water = texture(uMask, vUV).rg;
		// not water: the still picture under it shows
		if (water.r <= 0.0) discard;
		float edges = water.g;
		vec2 px = uArea.xy + vUV * uArea.zw;
		vec3 picture = toLinear(texture(uPicture, px / uSize).rgb);

		// where on the pool's surface, and how big a surface px is on screen there
		float below = max(px.y - ${f(HORIZON_ROW)}, 1.0);
		float scale = below / ${f(NEAR_ROW - HORIZON_ROW)};
		vec2 g = vec2((px.x - uSize.x * 0.5) / scale, ${f((NEAR_ROW - HORIZON_ROW) ** 2 / SLANT)} / below);
		float turn = uLoop * TAU;
		${waves.join('\n\t\t')}

		// the water shifted by the ripples, lighter on their crests, darker in their troughs; along
		// the waterline, where it doesn't move, the picture as it is
		float amp = edges * scale;
		vec2 shift = vec2(${sum(5)}, -(${sum(6)})) * amp / uArea.zw;
		vec3 moved = toLinear(texture(uFill, vUV + shift).rgb) * (1.0 + (${sum(7)}) * edges * ${f(SHADE)});
		vec3 colour = mix(picture, mix(picture, moved, edges), water.r);

		// glints on the crests
		float glint = smoothstep(${f(GLINT_CUT[0])}, ${f(GLINT_CUT[1])}, ${sum(8)});
		vec3 fill = toLinear(texture(uFill, vUV).rgb);
		float lighter = max(max(fill.r, fill.g), fill.b) * 0.7 + 0.3;
		colour += ${vec3(GLINT_COLOUR)} * (glint * lighter * edges * ${f(GLINT_STRENGTH)});

		// rings from the rocks
		float ringTime = uLoop * ${f(RINGS_PER_LOOP)};
		float rings = ${rings};
		colour += ${vec3(RING_COLOUR)} * (rings * water.r * ${f(RING_STRENGTH)});

		finalColor = vec4(toScreen(clamp(colour, 0.0, 1.0)), 1.0) * uColor;
	}
`;
