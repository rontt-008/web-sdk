<script lang="ts">
	import _ from 'lodash';
	import type { Snippet } from 'svelte';
	import type * as PIXI from 'pixi.js';
	import { BlurFilter } from 'pixi.js';
	import { Container, Graphics, Sprite } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { BLUR_RESOLUTION } from '../game/constants';

	type Props = {
		// 0 to 1: how many leaves whirl round the middle and how fast, how strong the glow, how big
		// the bursts
		power: number;
		// a count: each time it goes up, leaves burst out of the middle with a ring of light
		bursts: number;
		// the middle, in the main layout (its middle if not given)
		centre?: { x: number; y: number };
		// how dark the screen behind it is
		dim?: number;
		// what it celebrates: drawn over the glow and the leaves behind, under the ones in front
		children?: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	// The game's own backdrop for its big moments (a big win, the free spins' screens), in place of
	// the sample's rays: the screen darkens, a warm glow rises behind the middle, and autumn leaves
	// whirl round it on a tilted ring, those going round the back smaller and dimmed; a burst throws a
	// flurry of leaves out of the middle with a ring of light. All of it under what is shown
	// (children), so its words are never covered. All in game time (quicker in turbo). Times in seconds; sizes in the screen's
	// height on a wide screen, no more than 1.2 widths on a tall one (unit), as the gale's leaves.
	const GLOW = {
		colour: 0xffa63d,
		// its radius, and how strong, from no power to full; it breathes this much, this often
		radius: { min: 0.22, max: 0.38 },
		alpha: { min: 0.045, max: 0.09 },
		breathe: 0.07,
		period: 2.6,
		rings: 6,
		blur: 0.07,
	};
	const WHIRL = {
		// how many leaves whirl round, from no power to full
		count: { min: 10, max: 46 },
		// the ring's half width (in the screen's half width, no more than this in units), how flat it
		// is, and how far in or out each leaf goes
		span: { screen: 0.96, unit: 0.95 },
		flat: 0.36,
		reach: { min: 0.55, max: 1 },
		// how fast round (radians a second), faster with power
		speed: { min: 0.35, max: 0.7 },
		boost: 1.2,
		bob: 0.03,
		spin: { min: 1, max: 3.5 },
		flipRate: { min: 0.4, max: 1.2 },
		size: { min: 0.05, max: 0.085 },
		// those round the back: smaller and dimmer
		back: { size: 0.75, tint: 0x8a7464 },
		fade: 2.5,
	};
	const BURST = {
		count: { min: 12, max: 34 },
		// how fast they leave the middle, slowing (a share a second) and falling as they go
		speed: { min: 0.45, max: 1.25 },
		drag: 2.2,
		fall: 0.35,
		spin: { min: 5, max: 13 },
		flipRate: { min: 1.5, max: 3.5 },
		size: { min: 0.045, max: 0.085 },
		life: { min: 1.2, max: 1.8 },
		// the ring of light: out to this far (more with power) in this long
		ring: {
			colour: 0xffe3ad,
			alpha: 0.65,
			width: 0.012,
			reach: { min: 0.4, max: 0.75 },
			life: 0.7,
		},
	};
	const KEYS = ['leafGreen', 'leafBrown', 'leafRed', 'leafYellow'];

	type Whirler = {
		key: string;
		angle: number;
		reach: number;
		speed: number;
		bobRate: number;
		spin: number;
		flipRate: number;
		phase: number;
		size: number;
		alpha: number;
		x: number;
		y: number;
		depth: number;
		rotation: number;
		flip: number;
	};
	type Flier = {
		key: string;
		born: number;
		life: number;
		vx: number;
		vy: number;
		spin: number;
		flipRate: number;
		size: number;
		x: number;
		y: number;
		rotation: number;
		flip: number;
		alpha: number;
	};
	type Ring = { born: number; reach: number };

	const TAU = Math.PI * 2;
	const between = ({ min, max }: { min: number; max: number }) => _.random(min, max, true);
	const lerp = ({ min, max }: { min: number; max: number }, t: number) => min + (max - min) * t;

	const screen = $derived(context.stateLayoutDerived.canvasSizes());
	const unit = $derived(Math.min(screen.height, screen.width * 1.2));
	const power = $derived(Math.max(0, Math.min(1, props.power)));
	// the middle on the screen
	const middle = $derived.by(() => {
		const main = context.stateLayoutDerived.mainLayout();
		const centre = props.centre ?? { x: main.width / 2, y: main.height / 2 };
		return {
			x: main.x + (centre.x - main.width / 2) * main.scale,
			y: main.y + (centre.y - main.height / 2) * main.scale,
		};
	});

	let clock = 0;
	// counts up each frame, so the glow and rings redraw
	let frame = $state(0);
	const whirlers = $state<Whirler[]>(
		_.times(WHIRL.count.max, () => ({
			key: _.sample(KEYS)!,
			angle: Math.random() * TAU,
			reach: between(WHIRL.reach),
			speed: between(WHIRL.speed),
			bobRate: _.random(0.5, 1.2, true),
			spin: between(WHIRL.spin) * _.sample([-1, 1])!,
			flipRate: between(WHIRL.flipRate),
			phase: Math.random() * TAU,
			size: between(WHIRL.size),
			alpha: 0,
			x: 0,
			y: 0,
			depth: 0,
			rotation: Math.random() * TAU,
			flip: 1,
		})),
	);
	const fliers = $state<Flier[]>([]);
	let rings: Ring[] = [];

	const burst = () => {
		const count = Math.round(lerp(BURST.count, power));
		fliers.push(
			..._.times(count, () => {
				const angle = Math.random() * TAU;
				const speed = between(BURST.speed) * unit * (0.7 + 0.5 * power);
				return {
					key: _.sample(KEYS)!,
					born: clock,
					life: between(BURST.life),
					vx: Math.cos(angle) * speed,
					vy: Math.sin(angle) * speed * 0.8,
					spin: between(BURST.spin) * _.sample([-1, 1])!,
					flipRate: between(BURST.flipRate),
					size: between(BURST.size),
					x: middle.x,
					y: middle.y,
					rotation: Math.random() * TAU,
					flip: 1,
					alpha: 1,
				};
			}),
		);
		rings.push({ born: clock, reach: lerp(BURST.ring.reach, power) });
	};

	// a burst each time the count goes up (once, if it went up by more at once)
	let burstsSeen = 0;
	$effect(() => {
		const bursts = props.bursts;
		if (bursts > burstsSeen) burst();
		burstsSeen = bursts;
	});

	const step = (seconds: number) => {
		clock += seconds;
		const active = Math.round(lerp(WHIRL.count, power));
		const halfWidth = Math.min(screen.width * 0.5 * WHIRL.span.screen, unit * WHIRL.span.unit);
		const speedUp = 1 + WHIRL.boost * power;
		whirlers.forEach((leaf, index) => {
			const target = index < active ? 1 : 0;
			leaf.alpha += (target - leaf.alpha) * Math.min(1, seconds * WHIRL.fade);
			leaf.angle += leaf.speed * speedUp * seconds;
			const rx = leaf.reach * halfWidth;
			const ry = rx * WHIRL.flat;
			leaf.depth = Math.sin(leaf.angle);
			leaf.x = middle.x + rx * Math.cos(leaf.angle);
			leaf.y =
				middle.y +
				ry * leaf.depth +
				WHIRL.bob * unit * Math.sin(clock * leaf.bobRate * TAU + leaf.phase);
			leaf.rotation += leaf.spin * seconds;
			leaf.flip = Math.cos(clock * leaf.flipRate * TAU + leaf.phase);
		});
		const drag = Math.exp(-BURST.drag * seconds);
		for (const leaf of fliers) {
			leaf.vx *= drag;
			leaf.vy = leaf.vy * drag + BURST.fall * unit * seconds;
			leaf.x += leaf.vx * seconds;
			leaf.y += leaf.vy * seconds;
			leaf.rotation += leaf.spin * seconds;
			leaf.flip = Math.cos((clock - leaf.born) * leaf.flipRate * TAU);
			const age = (clock - leaf.born) / leaf.life;
			leaf.alpha = age < 0.55 ? 1 : Math.max(0, 1 - (age - 0.55) / 0.45);
		}
		_.remove(fliers, (leaf) => clock - leaf.born >= leaf.life);
		rings = rings.filter((ring) => clock - ring.born < BURST.ring.life);
		frame++;
	};

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => step((ticker.deltaMS / 1000) * stateBetDerived.timeScale());
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	// the glow, softened, at BLUR_RESOLUTION of the screen's resolution, its strength to match
	const glowBlur = new BlurFilter({ quality: 4, resolution: BLUR_RESOLUTION });
	$effect(() => {
		glowBlur.resolution =
			(context.stateApp.pixiApplication?.renderer.resolution ?? 1) * BLUR_RESOLUTION;
		glowBlur.strength = GLOW.blur * unit * BLUR_RESOLUTION;
	});

	const drawGlow = (graphics: PIXI.Graphics) => {
		frame;
		const breathe = 1 + GLOW.breathe * Math.sin((clock / GLOW.period) * TAU);
		const radius = lerp(GLOW.radius, power) * unit * breathe;
		const alpha = lerp(GLOW.alpha, power);
		// rings stacked from the outside in, so it is brightest in the middle
		for (let i = 0; i < GLOW.rings; i++) {
			graphics
				.circle(middle.x, middle.y, radius * (1 - i / GLOW.rings))
				.fill({ color: GLOW.colour, alpha });
		}
	};

	const drawRings = (graphics: PIXI.Graphics) => {
		frame;
		const { ring } = BURST;
		for (const { born, reach } of rings) {
			const t = (clock - born) / ring.life;
			const eased = 1 - (1 - t) ** 3;
			graphics
				.circle(middle.x, middle.y, Math.max(1, eased * reach * unit))
				.stroke({
					color: ring.colour,
					alpha: ring.alpha * (1 - t),
					width: ring.width * unit * (1 - t * 0.6),
				});
		}
	};
</script>

{#snippet leaf(
	key: string,
	x: number,
	y: number,
	rotation: number,
	flip: number,
	size: number,
	alpha: number,
	tint: number,
)}
	<Sprite
		{key}
		{x}
		{y}
		anchor={0.5}
		{rotation}
		width={size * unit * Math.max(0.15, Math.abs(flip))}
		height={size * unit}
		{alpha}
		visible={alpha > 0.01}
		{tint}
	/>
{/snippet}

<Graphics
	draw={(graphics) =>
		graphics
			.rect(0, 0, screen.width, screen.height)
			.fill({ color: 0x000000, alpha: props.dim ?? 0.6 })}
/>

<Container filters={[glowBlur]}>
	<Graphics draw={drawGlow} />
</Container>

<!-- the leaves whirling round (those round the back smaller and dimmed), then the bursts, each in
their own container so leaves added later stay in it, under what is shown -->
<Container>
	{#each whirlers as whirler}
		{@render leaf(
			whirler.key,
			whirler.x,
			whirler.y,
			whirler.rotation,
			whirler.flip,
			whirler.size * (whirler.depth < 0 ? WHIRL.back.size : 1 + 0.2 * whirler.depth),
			whirler.alpha,
			whirler.depth < 0 ? WHIRL.back.tint : 0xffffff,
		)}
	{/each}
</Container>
<Container>
	{#each fliers as flier}
		{@render leaf(
			flier.key,
			flier.x,
			flier.y,
			flier.rotation,
			flier.flip,
			flier.size,
			flier.alpha,
			0xffffff,
		)}
	{/each}
</Container>

<Graphics draw={drawRings} />

{@render props.children?.()}
