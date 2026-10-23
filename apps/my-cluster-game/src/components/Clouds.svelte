<script lang="ts">
	import _ from 'lodash';
	import { Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	type Props = {
		// the background picture's width, which they cross
		width: number;
	};

	// A few clouds drifting slowly right across the sky of the background, in the picture's pixels
	// (see Background): each a different one of the clouds in static/assets/sprites/clouds, at a
	// random size, height and speed. Farther ones are smaller, slower, fainter and lower, nearer the
	// horizon, and behind nearer ones. Past the right edge, a cloud makes way for another from the left.
	const KEYS = ['cloud_1', 'cloud_2', 'cloud_3', 'cloud_4', 'cloud_5'];
	const COUNT = 4;
	// from far to near
	const SCALE = { far: 0.3, near: 0.6 };
	const SPEED = { far: 5, near: 11 };
	const ALPHA = { far: 0.8, near: 1 };
	// where a cloud's bottom is, give or take the jitter; never below the lowest, above the hills
	const BOTTOM = { far: 224, near: 121, jitter: 25, lowest: 228 };
	// no cloud is drawn taller than this, so the wide cloud bank isn't huge
	const MAX_HEIGHT = 150;
	// a new cloud starts up to this far left of the picture, so they don't come in evenly
	const ENTRY_GAP = 300;

	type Cloud = {
		key: string;
		x: number;
		y: number;
		scale: number;
		speed: number;
		alpha: number;
		depth: number;
	};

	const props: Props = $props();
	const context = getContext();

	const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

	// a cloud other than the others, coming in from the left, or centred on `centre` to start with
	const spawn = (others: Cloud[], centre?: number): Cloud => {
		const key = _.sample(KEYS.filter((key) => !others.some((other) => other.key === key)))!;
		const texture = context.stateApp.loadedAssets?.[key] as { width: number; height: number };
		const depth = Math.random();
		const scale = Math.min(lerp(SCALE.far, SCALE.near, depth), MAX_HEIGHT / texture.height);
		const width = texture.width * scale;
		const bottom = Math.min(
			BOTTOM.lowest,
			lerp(BOTTOM.far, BOTTOM.near, depth) + _.random(-BOTTOM.jitter, BOTTOM.jitter, true),
		);
		return {
			key,
			x: centre === undefined ? -width - _.random(0, ENTRY_GAP, true) : centre - width / 2,
			y: bottom - texture.height * scale,
			scale,
			speed: lerp(SPEED.far, SPEED.near, depth),
			alpha: lerp(ALPHA.far, ALPHA.near, depth),
			depth,
		};
	};

	// spread across the sky to start with
	const clouds = $state<Cloud[]>([]);
	for (let i = 0; i < COUNT; i++) clouds.push(spawn(clouds, ((i + Math.random()) / COUNT) * props.width));

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;

		const tick = () => {
			const seconds = ticker.deltaMS / 1000;
			clouds.forEach((cloud, index) => {
				cloud.x += cloud.speed * seconds;
				if (cloud.x > props.width) clouds[index] = spawn(clouds.filter((other) => other !== cloud));
			});
		};

		ticker.add(tick);
		return () => ticker.remove(tick);
	});
</script>

<Container sortableChildren>
	{#each clouds as cloud}
		<Sprite
			key={cloud.key}
			x={cloud.x}
			y={cloud.y}
			scale={cloud.scale}
			alpha={cloud.alpha}
			zIndex={cloud.depth}
		/>
	{/each}
</Container>
