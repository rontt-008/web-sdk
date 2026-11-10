<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { onMount } from 'svelte';
	import { getContextParent } from 'pixi-svelte';

	import { getContext } from '../game/context';

	// Chess pieces raining down the screen behind a big win's card, tumbling as they fall: pawns mostly,
	// then knights, bishops, rooks and queens of both colours, more of them the bigger the win (`count`,
	// as it is when the rain is put up). They fall while `emit`; once it's off, those on their way fall
	// out and no more come. Drawn straight in pixi (a sprite each, moved on the ticker), in the main
	// layout's units (put it inside a MainContainer), over the whole screen.
	type Props = {
		emit: boolean;
		count: number;
	};

	const props: Props = $props();
	const context = getContext();

	// what falls, the commoner the more often it's listed
	const KEYS = ['wP', 'bP', 'wP', 'bP', 'wN', 'bN', 'wB', 'bB', 'wR', 'bR', 'wQ', 'bQ'];
	// a piece's size, how fast it falls and turns, and how far it sways, in the main layout's units and
	// seconds
	const SIZE = { min: 46, max: 96 };
	const FALL = { min: 300, max: 620 };
	const SPIN = 1.6;
	const SWAY = { reach: 26, pace: 1.3 };
	// the first ones come in one after another over this long, in seconds
	const START = 1.5;

	const random = (min: number, max: number) => min + Math.random() * (max - min);

	const layer = new PIXI.Container();
	getContextParent().addToParent(layer);

	type Faller = { sprite: PIXI.Sprite; x: number; speed: number; spin: number; phase: number; falling: boolean };

	onMount(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const assets = context.stateApp.loadedAssets as Record<string, PIXI.Texture | undefined>;
		const fallers: Faller[] = [];
		for (let index = 0; index < props.count; index++) {
			const texture = assets[KEYS[index % KEYS.length]];
			if (!texture) continue;
			const sprite = new PIXI.Sprite(texture);
			sprite.anchor.set(0.5);
			sprite.visible = false;
			layer.addChild(sprite);
			fallers.push({ sprite, x: 0, speed: 0, spin: 0, phase: 0, falling: false });
		}

		// a piece starts (again) from above the screen, somewhere across it, `delay` seconds up
		const drop = (faller: Faller, bounds: { left: number; right: number; top: number }, delay = 0) => {
			const size = random(SIZE.min, SIZE.max);
			faller.sprite.width = size;
			faller.sprite.height = size;
			faller.x = random(bounds.left, bounds.right);
			faller.speed = random(FALL.min, FALL.max);
			faller.sprite.y = bounds.top - size - delay * faller.speed;
			faller.sprite.rotation = random(0, Math.PI * 2);
			faller.spin = random(-SPIN, SPIN);
			faller.phase = random(0, Math.PI * 2);
			faller.sprite.visible = true;
			faller.falling = true;
		};

		let time = 0;
		let started = false;
		const tick = () => {
			const seconds = Math.min(0.1, ticker.deltaMS / 1000);
			time += seconds;
			const bounds = context.stateGameDerived.screenBounds();
			if (props.emit && !started) {
				started = true;
				fallers.forEach((faller, index) => drop(faller, bounds, (index / fallers.length) * START));
			}
			for (const faller of fallers) {
				if (!faller.falling) continue;
				faller.sprite.y += faller.speed * seconds;
				faller.sprite.x = faller.x + Math.sin(time * SWAY.pace + faller.phase) * SWAY.reach;
				faller.sprite.rotation += faller.spin * seconds;
				if (faller.sprite.y > bounds.bottom + SIZE.max) {
					if (props.emit) drop(faller, bounds);
					else {
						faller.falling = false;
						faller.sprite.visible = false;
					}
				}
			}
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});
</script>
