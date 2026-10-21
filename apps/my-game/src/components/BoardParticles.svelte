<script lang="ts">
	import _ from 'lodash';
	import { onDestroy } from 'svelte';
	import { Container, Graphics, Sprite } from 'pixi.js';
	import { getContextParent } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { BOARD_SIZES, SYMBOL_SIZE } from '../game/constants';

	// Soft see-through motes drifting slowly up around the board, swaying side to side and
	// twinkling. They float over the frame and the wood behind the symbols, under the symbols.
	// Each is a sprite of one mote drawn once (a dot in a fainter halo), moved every frame without
	// reactivity: redrawing them all as shapes every frame cost the phone a lot.
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
	// a fainter halo around each mote (its radius, of the mote's)
	const HALO = { radius: 2, alpha: 0.25 };
	// rising speed in pixels per second
	const RISE_SPEED = { min: SYMBOL_SIZE * 0.08, max: SYMBOL_SIZE * 0.25 };
	const SWAY = SYMBOL_SIZE * 0.15;
	// the mote is drawn this big (radius, in pixels) for its sprite, which is then sized down
	const DRAWN_RADIUS = 16;

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

	// one mote, white (each sprite is tinted), the halo under the dot
	const shape = new Graphics()
		.circle(0, 0, DRAWN_RADIUS * HALO.radius)
		.fill({ color: 0xffffff, alpha: HALO.alpha })
		.circle(0, 0, DRAWN_RADIUS)
		.fill({ color: 0xffffff, alpha: 1 });
	const texture = context.stateApp.pixiApplication!.renderer.generateTexture({
		target: shape,
		antialias: true,
	});
	shape.destroy();

	// a layer placed as the board is (see BoardContainer), holding a sprite for each mote
	const layer = new Container();
	getContextParent().addToParent(layer);
	$effect(() => {
		const board = context.stateGameDerived.boardLayout();
		layer.position.set(board.x, board.y);
		layer.pivot.set(board.pivot.x, board.pivot.y);
	});

	const motes = Array.from({ length: COUNT }, () => spawn());
	const sprites = motes.map(() => {
		const sprite = new Sprite({ texture, anchor: 0.5, tint: COLOR });
		layer.addChild(sprite);
		return sprite;
	});
	// as wide as its halo
	const size = (mote: Mote) => mote.radius * HALO.radius * 2;
	motes.forEach((mote, index) => sprites[index].setSize(size(mote)));

	let time = 0;
	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;

		const tick = () => {
			const seconds = ticker.deltaMS / 1000;
			time += seconds;
			motes.forEach((mote, index) => {
				mote.y -= mote.speed * seconds;
				const sprite = sprites[index];
				// past the top: start again from the bottom
				if (mote.y < AREA.top) {
					motes[index] = mote = spawn(AREA.bottom);
					sprite.setSize(size(mote));
				}
				const twinkle = 0.6 + 0.4 * Math.sin(mote.twinklePhase + time * mote.twinkleSpeed);
				const edge = Math.min(mote.y - AREA.top, AREA.bottom - mote.y) / EDGE_FADE;
				sprite.x = mote.x + Math.sin(mote.swayPhase + time * mote.swaySpeed) * SWAY;
				sprite.y = mote.y;
				sprite.alpha = mote.alpha * twinkle * _.clamp(edge, 0, 1);
			});
		};

		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	// the layer goes with the component (see addToParent); its sprites and the mote's texture too
	onDestroy(() => {
		sprites.forEach((sprite) => sprite.destroy());
		texture.destroy(true);
	});
</script>
