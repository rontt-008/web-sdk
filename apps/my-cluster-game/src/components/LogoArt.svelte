<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { LOGO_ART } from '../game/stateGame.svelte';
	import { LOGO_IDLE } from '../game/logoIdle';

	type Props = {
		// its top left corner
		x: number;
		y: number;
		// its height follows, keeping its shape (LOGO_ART)
		width: number;
	};

	const props: Props = $props();
	const context = getContext();

	// The game's name, RuneFall, on a wooden sign, its letters bobbing, rocking and swelling on the
	// user's Blender loop (art-source/logo-idle.py): the sign and each letter are pieces of the
	// logoIdle atlas, the letters moved here rather than played as frames, so they stay as sharp as
	// the art. Drawn in the game (Logo) and on the start screen (LoadingScreen).

	// where the loop is, in frames
	let frame = $state(0);

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;

		const tick = () => {
			frame = (frame + (ticker.deltaMS / 1000) * LOGO_IDLE.frameRate) % LOGO_IDLE.frames;
		};

		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	// a channel of a letter's pose where the loop is, between the frames either side
	const at = (channel: number | number[]) => {
		if (typeof channel === 'number') return channel;
		const index = Math.floor(frame);
		const next = channel[(index + 1) % channel.length];
		return channel[index] + (next - channel[index]) * (frame - index);
	};
</script>

<Container x={props.x} y={props.y} scale={props.width / LOGO_ART.width}>
	<Sprite key={LOGO_IDLE.sign} />
	{#each LOGO_IDLE.letters as letter}
		<Sprite
			key={letter.key}
			anchor={letter.anchor}
			x={letter.x + at(letter.moveX)}
			y={letter.y + at(letter.moveY)}
			rotation={at(letter.rotation)}
			scale={{ x: at(letter.scaleX), y: at(letter.scaleY) }}
		/>
	{/each}
</Container>
