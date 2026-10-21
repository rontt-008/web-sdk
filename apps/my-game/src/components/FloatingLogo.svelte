<script lang="ts">
	import _ from 'lodash';
	import { Container, Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';

	type Props = {
		// the logo's middle and size
		x: number;
		y: number;
		width: number;
		height: number;
	};

	const props: Props = $props();

	// The game logo, beside the board (see GameLogo) and on the loading screen. It floats gently,
	// bobbing and swaying a little as if breathing, and the cat asleep on it lets out Zs, big and
	// small in turn: each rises from just above its head, drifting up and to the right, growing,
	// wobbling and fading as it goes. They move with the logo.
	//   bob: how far up and down (of the logo's height); sway: how far it tilts; periods in seconds
	const FLOAT = { bob: 0.012, bobPeriod: 3.6, sway: (0.8 * Math.PI) / 180, swayPeriod: 5.4 };
	// in the logo's size: where they start (across and down the image), how far they rise and drift
	// right and how much they wobble; a new one every so many seconds, each lasting so long; their
	// letter sizes (of the logo's height)
	const ZZZ = {
		from: { x: 0.52, y: 0.1 },
		rise: 0.32,
		drift: 0.26,
		wobble: 0.03,
		every: 0.8,
		life: 2.8,
		sizes: { big: 0.28, small: 0.2 },
	};
	// the logo's own letters: cream with a dark brown outline
	const zStyle = (fontSize: number) => ({
		fontFamily: 'Titan One',
		fontSize,
		fill: 0xfff6e2,
		stroke: { color: 0x4a1c00, width: fontSize * 0.17, join: 'round' as const },
	});

	type Z = { id: number; born: number; big: boolean; tilt: number };

	const context = getContext();
	const styles = $derived({
		big: zStyle(props.height * ZZZ.sizes.big),
		small: zStyle(props.height * ZZZ.sizes.small),
	});

	let time = $state(0);
	let zs = $state<Z[]>([]);
	let nextZ = 0;
	let made = 0;
	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => {
			time += ticker.deltaMS / 1000;
			if (time < nextZ) return;
			nextZ = time + ZZZ.every;
			zs = [
				...zs.filter((z) => time - z.born < ZZZ.life),
				{ id: made, born: time, big: made % 2 === 0, tilt: _.random(-0.2, 0.2, true) },
			];
			made++;
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	const float = $derived({
		y: Math.sin((2 * Math.PI * time) / FLOAT.bobPeriod) * FLOAT.bob * props.height,
		rotation: Math.sin((2 * Math.PI * time) / FLOAT.swayPeriod) * FLOAT.sway,
	});

	// a Z part way through its life (0 to 1), about the logo's middle
	const zLook = (z: Z) => {
		const age = Math.min(1, (time - z.born) / ZZZ.life);
		return {
			x:
				(ZZZ.from.x - 0.5 + ZZZ.drift * age + ZZZ.wobble * Math.sin(3 * Math.PI * age)) *
				props.width,
			y: (ZZZ.from.y - 0.5 - ZZZ.rise * age) * props.height,
			scale: 0.6 + 0.4 * age,
			alpha: Math.min(1, age / 0.15) * (age > 0.6 ? 1 - (age - 0.6) / 0.4 : 1),
			rotation: z.tilt + 0.25 * Math.sin(2 * Math.PI * age),
		};
	};
</script>

<Container x={props.x} y={props.y + float.y} rotation={float.rotation}>
	<Sprite key="gameLogo" anchor={0.5} width={props.width} height={props.height} />
	{#each zs as z (z.id)}
		{@const look = zLook(z)}
		<Text
			text={z.big ? 'Z' : 'z'}
			anchor={0.5}
			x={look.x}
			y={look.y}
			scale={look.scale}
			alpha={look.alpha}
			rotation={look.rotation}
			style={z.big ? styles.big : styles.small}
		/>
	{/each}
</Container>
