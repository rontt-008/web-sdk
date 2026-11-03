<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		// the frame's width, a CSS length
		width: string;
		// at least as tall as the art (for the cards), or as tall as what is on it (the confirm)
		natural?: boolean;
		children: Snippet;
	};

	const props: Props = $props();

	// The user's info card (static/assets/info-card.webp, from art-source/wood-frames.py): a dark slate
	// in a frame of logs with maple leaves, 804 x 995, the slate 122-687 x 130-898. Drawn as a border
	// image, so the frame keeps its look whatever is on the slate, which stretches to hold it.
	const ART = { width: 804, height: 995 };
	const SLICE = { top: 130, right: 116, bottom: 96, left: 122 };
	const INFO_CARD = new URL('../../assets/info-card.webp', import.meta.url).href;
	const share = (px: number) => `calc(var(--slate-width) * ${px / ART.width})`;
</script>

<div
	class="slate"
	style:--slate-width={props.width}
	style:border-image-source="url({INFO_CARD})"
	style:border-width="{share(SLICE.top)} {share(SLICE.right)} {share(SLICE.bottom)} {share(SLICE.left)}"
	style:min-height={props.natural ? share(ART.height) : undefined}
>
	{@render props.children()}
</div>

<style lang="scss">
	.slate {
		box-sizing: border-box;
		width: var(--slate-width);
		display: flex;
		flex-direction: column;
		border-style: solid;
		border-image-slice: 130 116 96 122 fill;
		border-image-repeat: stretch;
		filter: drop-shadow(0 0.5rem 0.6rem rgba(0, 0, 0, 0.55));
	}
</style>
