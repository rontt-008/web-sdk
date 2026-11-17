<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onDestroy, untrack } from 'svelte';
	import type * as PIXI from 'pixi.js';
	import { cubicOut, sineInOut } from 'svelte/easing';
	import { Container, Graphics, SpineProvider, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { BAT_FEET, BAT_LOOP_BOUNDS } from '../game/constants';
	import { stateBatPerch, type BatFeet } from '../game/batPerch.svelte';
	import BatSpine from './BatSpine.svelte';

	type Props = {
		// it lets go of the sign and flies home (onleft once it is there)
		leaving: boolean;
		// roars asked for (the bat's `attack`): one each time this goes up; onsnap at its snap
		roars: number;
		// seconds after it appears that it roars by itself (the free spins won: as it comes up)
		roarAt?: number;
		onarrived?: () => void;
		onsnap?: () => void;
		onleft?: () => void;
		// what is written on the sign's panel, round the panel's middle (its size given)
		panel: Snippet<[{ width: number; height: number }]>;
	};

	const props: Props = $props();
	const context = getContext();

	// The free spins screens' crystal bat bringing up a stone sign with the news on it (the user,
	// 2026-11-17: "using the bats animation can you make a animation/custom screen for these
	// screenshots"; then "make the bat be holding the sign and also make the bat fly down to the floor
	// and 'fish it up' so it looks like the bat pulls up the board from the edge").
	// The bat right of the board takes off (from where it hovers, or from off the screen on the right where
	// it isn't shown) and dives to the bottom edge of the screen, dips to grab two ropes tied to the sign
	// lying below the edge, and heaves it up, flapping and swaying, the sign swinging under it, to the
	// middle. The ropes run from its feet (the tips of its legs' bones, every frame: BatSpine) to two knots
	// on the sign's top rocks; the sign hangs from them, a pendulum from its feet, swinging as the bat moves.
	// There it hovers, flapping (its `fly` loop), and roars when asked (its `attack`: it rears back
	// flushing red and lunges with a snap, the sign jolting with it). Told to leave, it lets go: the sign
	// falls away down the screen with its ropes and the bat flies back to where it hovers (or off the
	// screen). Drawn in the main layout's units.

	// the sign's picture (the free spins sign, art-source/stone-frames.py): its height over its width, its
	// panel inside it, and the ropes' knots on its top rocks (± hooks.x of its width from its middle,
	// hooks.y of its height down), fractions of it
	const SIGN = {
		aspect: 0.6548,
		inner: { x: 0.086, y: 0.1942, width: 0.8106, height: 0.6499 },
		hooks: { x: 0.3, y: 0.085 },
	};
	// the ropes: from the feet down to the sign's top, `drop` of the sign's width; drawn in rope brown
	// over a dark edge with a light strand along it, `width` units, tied in knots `knot` units across
	const ROPE = { drop: 0.08, width: 5, colour: 0x8f6a44, light: 0xd1ab7c, dark: 0x22160d, knot: 9 };
	// The sign's width: at most `width` of the main layout's width and maxWidth units, and the whole (the
	// top of the bat's wings to the sign's bottom) inside the height between `top` and `bottom` of it (the
	// bottom leaving room for PRESS ANYWHERE TO CONTINUE); the bat's wingspan `bat` of the sign's width.
	// (2026-11-17, the user: "move this animation slightly up": top 0.03 -> 0.01, bottom 0.15 -> 0.22)
	const FIT = { width: 0.92, maxWidth: 760, top: 0.01, bottom: 0.22, bat: 0.75 };
	// Fetching it (seconds): diving to the floor (`down`; its feet `floor` of the screen's height above
	// the screen's bottom edge), the grab (a dip of `dip` of the height), and pulling it up (`up`), its
	// wingbeats heaving it (rate a second, size of the height) and swaying it side to side (units), less
	// as it nears the top; from `scale` of its size, `rise` of the height higher, when it comes from off
	// the screen.
	const FETCH = {
		down: 0.7,
		grab: 0.24,
		up: 1.05,
		floor: 0.03,
		dip: 0.035,
		heave: { rate: 2.4, size: 0.012 },
		sway: { rate: 0.8, size: 16 },
		scale: 0.8,
		rise: 0.12,
	};
	// going: over `seconds`, rising `rise` of the screen's height on the way; the sign falling at gravity
	// (units/s²), turning as it goes
	const LEAVE = { seconds: 0.8, rise: 0.06, gravity: 2600, spin: 0.6 };
	// hovering, it drifts about its place (units, seconds a sway), and it leans into its flight (radians per
	// unit/s, at most max)
	const HOVER = { x: 7, y: 6, xPeriod: 5.3, yPeriod: 3.7 };
	const LEAN = { perSpeed: 0.00012, max: 0.22 };
	// the sign's swing from the feet: its own pace (rad/s), how quickly it settles, how much the feet's
	// moves push it, the kick of its arrival and of the roar's snap (rad/s)
	const SWING = { omega: (2 * Math.PI) / 1.5, damping: 2.2, push: 0.35, arrive: 0.2, snap: 0.45 };
	// the roar's snap, seconds into it (bat_attack: its jaws snap at frames 51-56 of 60 fps)
	const SNAP_AT = 0.87;

	const B = BAT_LOOP_BOUNDS;
	// the feet at rest, from the middle of the bat's box (leg_L's and leg_R's tips; BAT_FEET between them)
	const FEET_AT_REST: BatFeet = {
		...BAT_FEET,
		left: { x: BAT_FEET.x - 67, y: BAT_FEET.y + 20 },
		right: { x: BAT_FEET.x + 67, y: BAT_FEET.y - 20 },
	};

	const layout = $derived.by(() => {
		const main = context.stateLayoutDerived.mainLayout();
		const canvas = context.stateLayoutDerived.canvasSizes();
		// per unit of the sign's width: the bat's scale, the height above its feet (the top of its box over
		// them) and below them (the ropes and the sign)
		const batScale = FIT.bat / B.width;
		const above = (BAT_FEET.y + B.height / 2) * batScale;
		const below = ROPE.drop + SIGN.aspect;
		const room = main.height * (1 - FIT.top - FIT.bottom);
		const width = Math.min(main.width * FIT.width, FIT.maxWidth, room / (above + below));
		const feetY = main.height * FIT.top + (room - width * (above + below)) / 2 + width * above;
		const scale = width * batScale;
		// the screen's edges, in these units (the canvas reaches past the main layout's)
		const bottom = main.height / 2 + canvas.height / 2 / main.scale;
		const middle = main.width / 2 - BAT_FEET.x * scale;
		return {
			screenHeight: main.height,
			width,
			height: width * SIGN.aspect,
			drop: width * ROPE.drop,
			scale,
			// the bat's box's middle hovering (its feet over the screen's middle) and at the floor
			bat: { x: middle, y: feetY - BAT_FEET.y * scale },
			floor: { x: middle, y: bottom - main.height * FETCH.floor - BAT_FEET.y * scale },
			right: main.width / 2 + canvas.width / 2 / main.scale,
		};
	});

	const panelBox = $derived({
		x: (SIGN.inner.x + SIGN.inner.width / 2 - 0.5) * layout.width,
		y: (SIGN.inner.y + SIGN.inner.height / 2) * layout.height,
		width: SIGN.inner.width * layout.width,
		height: SIGN.inner.height * layout.height,
	});

	// off the screen on the right, a little higher (where it comes from and goes to without the side bat)
	const offScreen = () => ({
		x: layout.right + layout.width * FIT.bat * 0.6,
		y: layout.bat.y - layout.screenHeight * FETCH.rise,
		scale: layout.scale * FETCH.scale,
	});
	const home = () =>
		stateBatPerch.shown
			? { x: stateBatPerch.x, y: stateBatPerch.y, scale: stateBatPerch.scale }
			: offScreen();

	const from = home();
	stateBatPerch.away = true;

	let bat = $state({ ...from, rotation: 0 });
	// the sign's top middle and its turn; shown once the bat has the ropes
	let sign = $state({ x: 0, y: 0, rotation: 0, shown: false });
	// the ropes: [x1, y1, x2, y2] from a foot to a knot each, in the main layout's units
	let ropes = $state<number[][]>([]);
	// where its feet are in its own box (BatSpine says each frame; at rest till then)
	let feet: BatFeet = FEET_AT_REST;

	type Phase = 'down' | 'grab' | 'up' | 'hover' | 'leave' | 'home';
	let time = 0;
	let phase: Phase = 'down';
	let phaseAt = 0;
	let attached = false;
	let speed = 0;
	let swing = { angle: 0, rate: 0 };
	let grip = { x: 0, y: 0, vx: 0, ax: 0 };
	let departure = { at: 0, from, sign: { x: 0, y: 0, vx: 0 }, spread: 0, spin: 0 };
	// the roars it has done (BatSpine plays one each time this goes up), when the last began, and whether
	// its snap has come
	let roars = $state(0);
	let roar = { at: Infinity, snapped: true };

	const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
	const turn = (x: number, y: number, angle: number) => ({
		x: x * Math.cos(angle) - y * Math.sin(angle),
		y: x * Math.sin(angle) + y * Math.cos(angle),
	});
	const to = (next: Phase) => {
		phase = next;
		phaseAt = time;
	};

	const startRoar = () => {
		roars += 1;
		roar = { at: time, snapped: false };
	};

	let asked = props.roars;
	$effect(() => {
		if (props.roars === asked) return;
		asked = props.roars;
		untrack(startRoar);
	});

	$effect(() => {
		if (!props.leaving) return;
		untrack(() => {
			if (phase === 'leave' || phase === 'home') return;
			departure = {
				at: time,
				from: { x: bat.x, y: bat.y, scale: bat.scale },
				sign: { x: sign.x, y: sign.y, vx: grip.vx },
				spread: Math.hypot(feet.right.x - feet.left.x, feet.right.y - feet.left.y) * bat.scale,
				spin: swing.rate + (Math.random() < 0.5 ? -1 : 1) * LEAVE.spin,
			};
			to('leave');
		});
	});

	const tick = (dt: number) => {
		time += dt;
		const since = time - phaseAt;
		if (props.roarAt !== undefined && roars === 0 && time >= props.roarAt) startRoar();
		if (!roar.snapped && time >= roar.at + SNAP_AT) {
			roar.snapped = true;
			swing.rate += SWING.snap * (Math.random() < 0.5 ? -1 : 1);
			props.onsnap?.();
		}

		// the bat
		const H = layout.screenHeight;
		const hover = {
			x: layout.bat.x + HOVER.x * Math.sin((2 * Math.PI * time) / HOVER.xPeriod),
			y: layout.bat.y + HOVER.y * Math.sin((2 * Math.PI * time) / HOVER.yPeriod + 1),
			scale: layout.scale,
		};
		let next = hover;
		if (phase === 'down') {
			// diving to the floor: across first, then down, slowing as it gets there
			const p = Math.min(1, since / FETCH.down);
			next = {
				x: lerp(from.x, layout.floor.x, cubicOut(p)),
				y: lerp(from.y, layout.floor.y, sineInOut(p)),
				scale: lerp(from.scale, layout.scale, p),
			};
			if (p >= 1) to('grab');
		} else if (phase === 'grab') {
			// dipping to the ropes below the edge, taking hold of them at the bottom of the dip
			const q = Math.min(1, since / FETCH.grab);
			next = {
				...layout.floor,
				y: layout.floor.y + Math.sin(Math.PI * q) * FETCH.dip * H,
				scale: layout.scale,
			};
			if (q >= 0.5 && !attached) {
				attached = true;
				swing = { angle: 0, rate: 0 };
			}
			if (q >= 1) to('up');
		} else if (phase === 'up') {
			// heaving it up, a pull with each wingbeat, swaying, easing in and out
			const u = Math.min(1, since / FETCH.up);
			const e = sineInOut(u);
			next = {
				x:
					lerp(layout.floor.x, hover.x, e) +
					FETCH.sway.size * Math.sin(2 * Math.PI * FETCH.sway.rate * since) * (1 - u),
				y:
					lerp(layout.floor.y, hover.y, e) -
					FETCH.heave.size * H * Math.sin(2 * Math.PI * FETCH.heave.rate * since) * (1 - u),
				scale: layout.scale,
			};
			if (u >= 1) {
				to('hover');
				swing.rate += SWING.arrive;
				props.onarrived?.();
			}
		} else if (phase === 'leave' || phase === 'home') {
			const q = Math.min(1, (time - departure.at) / LEAVE.seconds);
			const target = home();
			next = {
				x: lerp(departure.from.x, target.x, sineInOut(q)),
				y: lerp(departure.from.y, target.y, sineInOut(q)) - Math.sin(Math.PI * q) * LEAVE.rise * H,
				scale: lerp(departure.from.scale, target.scale, sineInOut(q)),
			};
			if (q >= 1 && phase === 'leave') {
				to('home');
				stateBatPerch.away = false;
				props.onleft?.();
			}
		}
		speed += ((next.x - bat.x) / dt - speed) * Math.min(1, dt * 10);
		const rotation = Math.max(-LEAN.max, Math.min(LEAN.max, speed * LEAN.perSpeed));
		bat = { ...next, rotation };

		// its feet on the screen (through its box: scaled and turned round the middle)
		const onScreen = (point: { x: number; y: number }) => {
			const turned = turn(point.x * next.scale, point.y * next.scale, rotation);
			return { x: next.x + turned.x, y: next.y + turned.y };
		};
		const mid = onScreen(feet);
		const vx = (mid.x - grip.x) / dt;
		const ax = (vx - grip.vx) / dt;
		grip = { x: mid.x, y: mid.y, vx, ax: grip.ax + (ax - grip.ax) * Math.min(1, dt * 12) };

		// the knots on the sign whose top's middle is `top`, turned by `angle`
		const knots = (top: { x: number; y: number }, angle: number) =>
			[-1, 1].map((side) => {
				const at = turn(side * SIGN.hooks.x * layout.width, SIGN.hooks.y * layout.height, angle);
				return { x: top.x + at.x, y: top.y + at.y };
			});

		if (phase === 'leave' || phase === 'home') {
			// let go: falling away, turning, its ropes with it (their ends where the feet held them)
			if (attached) {
				const t = time - departure.at;
				swing.angle += departure.spin * dt;
				const top = {
					x: departure.sign.x + departure.sign.vx * t,
					y: departure.sign.y + 0.5 * LEAVE.gravity * t * t,
				};
				sign = { ...top, rotation: swing.angle, shown: true };
				const tied = knots(top, swing.angle);
				ropes = [-1, 1].map((side, k) => {
					const end = turn((side * departure.spread) / 2, -layout.drop, swing.angle);
					return [top.x + end.x, top.y + end.y, tied[k].x, tied[k].y];
				});
			}
		} else if (attached) {
			// hanging from the feet: a pendulum, pushed by how they move
			const length = layout.drop + layout.height * 0.55;
			const accel =
				-SWING.omega * SWING.omega * Math.sin(swing.angle) -
				SWING.damping * swing.rate +
				(SWING.push * grip.ax) / length;
			swing.rate += accel * dt;
			swing.angle += swing.rate * dt;
			const hang = turn(0, layout.drop, swing.angle);
			const top = { x: mid.x + hang.x, y: mid.y + hang.y };
			sign = { ...top, rotation: swing.angle, shown: true };
			const tied = knots(top, swing.angle);
			const left = onScreen(feet.left);
			const right = onScreen(feet.right);
			ropes = [
				[left.x, left.y, tied[0].x, tied[0].y],
				[right.x, right.y, tied[1].x, tied[1].y],
			];
		}
	};

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const step = () => tick(Math.min(0.05, Math.max(0.001, ticker.deltaMS / 1000)));
		ticker.add(step);
		return () => ticker.remove(step);
	});

	onDestroy(() => {
		stateBatPerch.away = false;
	});

	// the ropes: a dark edge, the rope, a light strand along it; a knot where each is tied to the sign
	const drawRopes = (graphics: PIXI.Graphics) => {
		if (!context.stateApp.loadedAssets.bat) return;
		for (const [x1, y1, x2, y2] of ropes) {
			graphics
				.moveTo(x1, y1)
				.lineTo(x2, y2)
				.stroke({ width: ROPE.width + 2.6, color: ROPE.dark, cap: 'round' });
			graphics.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: ROPE.width, color: ROPE.colour, cap: 'round' });
			const length = Math.hypot(x2 - x1, y2 - y1) || 1;
			const nx = (-(y2 - y1) / length) * ROPE.width * 0.22;
			const ny = ((x2 - x1) / length) * ROPE.width * 0.22;
			graphics
				.moveTo(x1 + nx, y1 + ny)
				.lineTo(x2 + nx, y2 + ny)
				.stroke({ width: ROPE.width * 0.32, color: ROPE.light, cap: 'round' });
			graphics.circle(x2, y2, ROPE.knot / 2 + 1.3).fill(ROPE.dark);
			graphics.circle(x2, y2, ROPE.knot / 2).fill(ROPE.colour);
			graphics.circle(x2 - ROPE.knot * 0.12, y2 - ROPE.knot * 0.14, ROPE.knot * 0.18).fill(ROPE.light);
		}
	};
</script>

<!-- the sign, hanging by its ropes from the bat's feet (its top's middle at sign.x, sign.y) -->
<Container x={sign.x} y={sign.y} rotation={sign.rotation} visible={sign.shown}>
	<Sprite key="freeSpinsSign" x={-layout.width / 2} width={layout.width} height={layout.height} />
	<Container x={panelBox.x} y={panelBox.y}>
		{@render props.panel({ width: panelBox.width, height: panelBox.height })}
	</Container>
</Container>

<!-- the ropes, from its feet (under the bat, so its claws hold them) to the knots on the sign -->
<Graphics draw={drawRopes} />

<!-- the bat in front of them (once it is loaded) -->
<Container x={bat.x} y={bat.y} scale={bat.scale} rotation={bat.rotation}>
	{#if context.stateApp.loadedAssets.bat}
		<SpineProvider key="bat" x={-(B.x + B.width / 2)} y={-(B.y + B.height / 2)}>
			<BatSpine attacks={roars} onfeet={(at) => (feet = at)} />
		</SpineProvider>
	{/if}
</Container>
