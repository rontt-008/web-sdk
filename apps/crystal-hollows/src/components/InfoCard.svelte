<script lang="ts" module>
	// The user's info card (static/assets/info-card.webp, from art-source/stone-frames.py): a tall frame of
	// blue stones round a dark blue panel, its height over its width and the panel inside it (fractions of
	// it, as stone-frames.py prints them), where what it shows goes.
	export const INFO_CARD_ART = {
		aspect: 1.4416,
		panel: { x: 0.1079, y: 0.1171, width: 0.7812, height: 0.7944 },
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Container, Sprite } from 'pixi-svelte';

	type Props = {
		// its middle
		x: number;
		y: number;
		// its height follows, keeping its shape
		width: number;
		alpha?: number;
		scale?: number;
		// what is on the panel, laid out in the panel's size from its top left corner
		children?: Snippet<[{ width: number; height: number }]>;
	};

	const props: Props = $props();

	const height = $derived(props.width * INFO_CARD_ART.aspect);
	const panel = $derived({
		x: props.width * INFO_CARD_ART.panel.x,
		y: height * INFO_CARD_ART.panel.y,
		width: props.width * INFO_CARD_ART.panel.width,
		height: height * INFO_CARD_ART.panel.height,
	});
</script>

<Container
	x={props.x}
	y={props.y}
	pivot={{ x: props.width / 2, y: height / 2 }}
	alpha={props.alpha ?? 1}
	scale={props.scale ?? 1}
>
	<Sprite key="infoCard" width={props.width} {height} />
	{#if props.children}
		<Container x={panel.x} y={panel.y}>
			{@render props.children({ width: panel.width, height: panel.height })}
		</Container>
	{/if}
</Container>
