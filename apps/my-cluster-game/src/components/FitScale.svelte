<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		// kept clear of the window's edges, in px
		margin?: number;
		children: Snippet;
	};

	const props: Props = $props();

	// Its content at its own size, or smaller when the window can't hold it (a popout, a phone held
	// sideways): scaled down to fit, the room it takes in the layout shrinking with it.
	let inner: HTMLDivElement;
	let size = $state({ width: 0, height: 0 });
	let scale = $state(1);

	$effect(() => {
		const update = () => {
			const margin = props.margin ?? 16;
			const width = inner.offsetWidth;
			const height = inner.offsetHeight;
			size = { width, height };
			scale = Math.min(
				1,
				(window.innerWidth - margin * 2) / (width || 1),
				(window.innerHeight - margin * 2) / (height || 1),
			);
		};
		const observer = new ResizeObserver(update);
		observer.observe(inner);
		window.addEventListener('resize', update);
		update();
		return () => {
			observer.disconnect();
			window.removeEventListener('resize', update);
		};
	});
</script>

<div class="fit" style:width="{size.width * scale}px" style:height="{size.height * scale}px">
	<div class="inner" bind:this={inner} style:transform="scale({scale})">
		{@render props.children()}
	</div>
</div>

<style lang="scss">
	.fit {
		position: relative;
	}

	.inner {
		position: absolute;
		left: 0;
		top: 0;
		width: max-content;
		transform-origin: 0 0;
	}
</style>
