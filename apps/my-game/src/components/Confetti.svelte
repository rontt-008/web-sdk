<script lang="ts">
	import _ from 'lodash';
	import type { ComponentProps } from 'svelte';
	import type { Graphics as PixiGraphics } from 'pixi.js';
	import { Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';

	// Paw prints, little stars and paper bits falling over the whole screen, swaying and tumbling,
	// for the win screens. New pieces keep coming while `active`; once it turns off the ones already
	// falling finish their fall.
	type Props = {
		active: boolean;
		// how many pieces are falling at once
		count: number;
	};

	const props: Props = $props();
	const context = getContext();

	// the paw's pink and cream, the titles' yellow and a soft lilac like the ball of yarn
	const COLORS = [0xffb3c7, 0xfff4d6, 0xffd45a, 0xc9b6ff, 0xffffff];
	// sizes and speeds are shares of the screen's shorter side (per second for speeds)
	const SIZE = { min: 0.024, max: 0.04 };
	const FALL_SPEED = { min: 0.22, max: 0.38 };
	const SWAY = 0.03;

	type Kind = 'paw' | 'star' | 'paper';
	type Piece = {
		kind: Kind;
		x: number;
		y: number;
		size: number;
		speed: number;
		color: number;
		rotation: number;
		spinSpeed: number;
		swayPhase: number;
		swaySpeed: number;
		// tumbling: the piece turns edge-on and back, like paper falling
		flipPhase: number;
		flipSpeed: number;
	};

	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const unit = $derived(Math.min(canvas.width, canvas.height));

	// a new piece just above the screen, or anywhere above it when the first ones are dropped in,
	// so they don't all arrive in one row
	const spawn = (spreadAbove: boolean): Piece => ({
		kind: _.sample(['paw', 'paw', 'star', 'paper', 'paper'] as Kind[])!,
		x: _.random(0, canvas.width, true),
		y: -_.random(0, spreadAbove ? canvas.height : unit * 0.1, true) - unit * 0.05,
		size: _.random(SIZE.min, SIZE.max, true) * unit,
		speed: _.random(FALL_SPEED.min, FALL_SPEED.max, true) * unit,
		color: _.sample(COLORS)!,
		rotation: _.random(0, Math.PI * 2, true),
		spinSpeed: _.random(-2, 2, true),
		swayPhase: _.random(0, Math.PI * 2, true),
		swaySpeed: _.random(1, 2.5, true),
		flipPhase: _.random(0, Math.PI * 2, true),
		flipSpeed: _.random(2, 5, true),
	});

	// moved every frame without reactivity; `time` changing is what redraws them
	let pieces: Piece[] = [];
	let time = $state(0);

	$effect(() => {
		if (props.active && pieces.length === 0) {
			pieces = Array.from({ length: props.count }, () => spawn(true));
		}
	});

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;

		const tick = () => {
			if (pieces.length === 0) return;
			const seconds = ticker.deltaMS / 1000;
			const bottom = canvas.height + unit * 0.05;
			pieces = pieces.flatMap((piece) => {
				piece.y += piece.speed * seconds;
				piece.rotation += piece.spinSpeed * seconds;
				if (piece.y < bottom) return [piece];
				// fallen past the bottom: another drops in at the top while it's still raining
				return props.active ? [spawn(false)] : [];
			});
			time += seconds;
		};

		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	// a paw print: the big pad below and four toes fanned above it
	const drawPaw = (graphics: PixiGraphics, size: number) => {
		graphics.ellipse(0, size * 0.25, size * 0.42, size * 0.34);
		graphics.circle(-size * 0.46, -size * 0.18, size * 0.15);
		graphics.circle(-size * 0.17, -size * 0.42, size * 0.16);
		graphics.circle(size * 0.17, -size * 0.42, size * 0.16);
		graphics.circle(size * 0.46, -size * 0.18, size * 0.15);
	};

	const draw: ComponentProps<typeof Graphics>['draw'] = (graphics) => {
		// read so the drawing follows the ticker
		const now = time;
		for (const piece of pieces) {
			const x = piece.x + Math.sin(piece.swayPhase + now * piece.swaySpeed) * SWAY * unit;
			const flip = Math.cos(piece.flipPhase + now * piece.flipSpeed);
			graphics.save();
			graphics.translateTransform(x, piece.y);
			graphics.rotateTransform(piece.rotation);
			// paw prints and stars only tilt a little as they tumble, paper turns right over
			graphics.scaleTransform(piece.kind === 'paper' ? flip : 0.75 + 0.25 * flip, 1);
			if (piece.kind === 'paw') drawPaw(graphics, piece.size);
			if (piece.kind === 'star') graphics.star(0, 0, 5, piece.size * 0.6, piece.size * 0.28);
			if (piece.kind === 'paper') {
				graphics.roundRect(-piece.size * 0.3, -piece.size * 0.45, piece.size * 0.6, piece.size * 0.9, 2);
			}
			graphics.fill({ color: piece.color });
			graphics.restore();
		}
	};
</script>

<Graphics {draw} />
