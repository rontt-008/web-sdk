<script lang="ts" module>
	// The user's info card (static/assets/info-card.webp, from art-source/wood-frames.py): a dark
	// slate in a frame of logs with maple leaves, in its pixels: its size, and the slate inside the
	// logs, where its text goes.
	export const INFO_CARD_ART = {
		width: 804,
		height: 995,
		slate: { left: 121, top: 129, right: 686, bottom: 898 },
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
		// what is on the slate, laid out in the slate's size from its top left corner
		children?: Snippet<[{ width: number; height: number }]>;
	};

	const props: Props = $props();

	const size = $derived(props.width / INFO_CARD_ART.width);
	const height = $derived(INFO_CARD_ART.height * size);
	const slate = $derived({
		x: INFO_CARD_ART.slate.left * size,
		y: INFO_CARD_ART.slate.top * size,
		width: (INFO_CARD_ART.slate.right - INFO_CARD_ART.slate.left) * size,
		height: (INFO_CARD_ART.slate.bottom - INFO_CARD_ART.slate.top) * size,
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
		<Container x={slate.x} y={slate.y}>
			{@render props.children({ width: slate.width, height: slate.height })}
		</Container>
	{/if}
</Container>
