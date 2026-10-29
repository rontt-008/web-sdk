<script lang="ts" module>
	// Material Symbols "sync", in its 960 box (0,-960 to 960,0)
	const SYNC_PATH =
		'M160-160v-80h110l-16-14q-52-46-73-105t-21-119q0-111 66.5-197.5T400-790v84q-72 26-116 88.5T240-478q0 45 17 87.5t53 78.5l10 10v-98h80v240H160Zm400-10v-84q72-26 116-88.5T720-482q0-45-17-87.5T650-648l-10-10v98h-80v-240h240v80H690l16 14q49 49 71.5 106.5T800-482q0 111-66.5 197.5T560-170Z';
	const SYNC_BOX = 960;
</script>

<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Container, Graphics } from 'pixi-svelte';

	type Props = {
		center: { x: number; y: number };
		diameter: number;
		// the disc, and the rim round it
		fill: number;
		rim: number;
		// the rim's width, as a share of the diameter
		rimWidth: number;
		iconColor: number;
		// the icon's turn, in degrees
		rotation: number;
		hovered?: boolean;
		pressed?: boolean;
	};

	const props: Props = $props();

	// shares of the diameter, from the design's 166px button: a 34px blur 14px down, a 92px icon
	const SHADOW_OFFSET = 14 / 166;
	const SHADOW_BLUR = 34 / 166;
	const SHADOW_ALPHA = 0.6;
	const SHADOW_LAYERS = 8;
	const ICON_SIZE = 92 / 166;
	// the CSS brightness(1.12) on hover
	const HOVER_BRIGHTNESS = 1.12;

	const brighten = (color: number, factor: number) => {
		const channel = (shift: number) =>
			Math.min(255, Math.round(((color >> shift) & 0xff) * factor)) << shift;
		return channel(16) | channel(8) | channel(0);
	};

	const radius = $derived(props.diameter * 0.5);
	const discRadius = $derived(radius - props.diameter * props.rimWidth);
	const brightness = $derived(props.hovered ? HOVER_BRIGHTNESS : 1);

	// a soft drop shadow (stacked faint circles instead of a blur filter), the rim, then the disc
	// with a faint light edge along its top and a dark shade inside its bottom edge
	const draw = (g: PIXI.Graphics) => {
		const blur = props.diameter * SHADOW_BLUR;
		const shadowY = props.diameter * SHADOW_OFFSET;
		for (let i = 0; i < SHADOW_LAYERS; i++) {
			g.circle(0, shadowY, radius - blur * 0.5 + (blur * (i + 1)) / SHADOW_LAYERS);
			g.fill({ color: 0x000000, alpha: SHADOW_ALPHA / SHADOW_LAYERS });
		}

		g.circle(0, 0, radius);
		g.fill({ color: brighten(props.rim, brightness) });
		g.circle(0, 0, discRadius);
		g.fill({ color: brighten(props.fill, brightness) });

		// inset 0 2px 0 rgba(255,255,255,.1)
		const light = props.diameter * (2 / 166);
		const lightRadius = discRadius - light * 0.5;
		g.moveTo(Math.cos(Math.PI * 1.1) * lightRadius, Math.sin(Math.PI * 1.1) * lightRadius);
		g.arc(0, 0, lightRadius, Math.PI * 1.1, Math.PI * 1.9);
		g.stroke({ width: light, color: 0xffffff, alpha: 0.1, cap: 'round' });

		// inset 0 -6px 16px rgba(0,0,0,.6): rings fading inwards, narrowing towards the sides
		const shade = props.diameter * (16 / 166);
		const rings = 6;
		for (let i = 0; i < rings; i++) {
			const r = discRadius - (shade * (i + 0.5)) / rings;
			const spread = Math.PI * (0.45 - (0.3 * i) / rings);
			const start = Math.PI * 0.5 - spread;
			g.moveTo(Math.cos(start) * r, Math.sin(start) * r);
			g.arc(0, 0, r, start, Math.PI * 0.5 + spread);
			g.stroke({
				width: shade / rings + 1,
				color: 0x000000,
				alpha: 0.32 * (1 - i / rings),
				cap: 'round',
			});
		}
	};

	const drawIcon = (g: PIXI.Graphics) => {
		const color = `#${props.iconColor.toString(16).padStart(6, '0')}`;
		g.svg(`<svg><path d="${SYNC_PATH}" fill="${color}"/></svg>`);
	};
</script>

<!-- the spin button's rimmed face: shrinks a little while pressed, brightens under the pointer, and
its sync icon turns to `rotation` -->
<Container x={props.center.x} y={props.center.y} scale={props.pressed ? 0.97 : 1}>
	<Graphics {draw} />
	<Container
		rotation={(props.rotation * Math.PI) / 180}
		scale={(props.diameter * ICON_SIZE) / SYNC_BOX}
	>
		<Graphics x={-SYNC_BOX * 0.5} y={SYNC_BOX * 0.5} draw={drawIcon} />
	</Container>
</Container>
