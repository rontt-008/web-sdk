<script lang="ts">
	import _ from 'lodash';
	import type { ComponentProps } from 'svelte';
	import { Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { BOARD_SIZES, SYMBOL_SIZE } from '../game/constants';
	import BoardContainer from './BoardContainer.svelte';

	// Soft see-through motes drifting slowly up around the board, swaying side to side and
	// twinkling. They float over the frame and the wood behind the symbols, under the symbols.
	const COUNT = 40;
	// the area they float in: the board plus this much around it
	const MARGIN = SYMBOL_SIZE * 1.5;
	const AREA = {
		top: -MARGIN,
		bottom: BOARD_SIZES.height + MARGIN,
		left: -MARGIN,
		right: BOARD_SIZES.width + MARGIN,
	};
	// they fade in over this distance from the bottom of the area and out towards the top
	const EDGE_FADE = SYMBOL_SIZE * 0.8;
	const COLOR = 0xfff1c8;
	// kept small: larger motes read as blobs rather than specks
	const RADIUS = { min: SYMBOL_SIZE * 0.015, max: SYMBOL_SIZE * 0.03 };
	const ALPHA = { min: 0.25, max: 0.6 };
	// a fainter halo around each mote
	const HALO = { radius: 2, alpha: 0.25 };
	// rising speed in pixels per second
	const RISE_SPEED = { min: SYMBOL_SIZE * 0.08, max: SYMBOL_SIZE * 0.25 };
	const SWAY = SYMBOL_SIZE * 0.15;

	type Mote = {
		x: number;
		y: number;
		radius: number;
		alpha: number;
		speed: number;
		swayPhase: number;
		swaySpeed: number;
		twinklePhase: number;
		twinkleSpeed: number;
	};

	const context = getContext();

	const spawn = (y = _.random(AREA.top, AREA.bottom, true)): Mote => ({
		x: _.random(AREA.left, AREA.right, true),
		y,
		radius: _.random(RADIUS.min, RADIUS.max, true),
		alpha: _.random(ALPHA.min, ALPHA.max, true),
		speed: _.random(RISE_SPEED.min, RISE_SPEED.max, true),
		swayPhase: _.random(0, Math.PI * 2, true),
		swaySpeed: _.random(0.3, 0.9, true),
		twinklePhase: _.random(0, Math.PI * 2, true),
		twinkleSpeed: _.random(1, 3, true),
	});

	// moved every frame without reactivity; `time` changing is what redraws them
	const motes = Array.from({ length: COUNT }, () => spawn());
	let time = $state(0);

	const draw: ComponentProps<typeof Graphics>['draw'] = (graphics) => {
		for (const mote of motes) {
			const x = mote.x + Math.sin(mote.swayPhase + time * mote.swaySpeed) * SWAY;
			const twinkle = 0.6 + 0.4 * Math.sin(mote.twinklePhase + time * mote.twinkleSpeed);
			const edge = Math.min(mote.y - AREA.top, AREA.bottom - mote.y) / EDGE_FADE;
			const alpha = mote.alpha * twinkle * _.clamp(edge, 0, 1);
			graphics
				.circle(x, mote.y, mote.radius * HALO.radius)
				.fill({ color: COLOR, alpha: alpha * HALO.alpha });
			graphics.circle(x, mote.y, mote.radius).fill({ color: COLOR, alpha });
		}
	};

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;

		const tick = () => {
			const seconds = ticker.deltaMS / 1000;
			motes.forEach((mote, index) => {
				mote.y -= mote.speed * seconds;
				// past the top: start again from the bottom
				if (mote.y < AREA.top) motes[index] = spawn(AREA.bottom);
			});
			time += seconds;
		};

		ticker.add(tick);
		return () => ticker.remove(tick);
	});
</script>

<BoardContainer>
	<Graphics {draw} />
</BoardContainer>
