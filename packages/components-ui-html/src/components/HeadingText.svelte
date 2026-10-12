<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		// a colour or a gradient; defaults to the theme's heading colour
		fill?: string;
		children: Snippet;
	};

	const props: Props = $props();
</script>

<!--
	The text twice in the same grid cell: the theme's outline drawn as a thick stroke behind, and the
	fill on top. A gradient fill clips to the text, and a stroke on that same text would cover it.
-->
<span class="heading-text" style:--fill={props.fill ?? 'var(--ui-heading, white)'}>
	<span class="outline" aria-hidden="true">{@render props.children()}</span>
	<span class="fill">{@render props.children()}</span>
</span>

<style lang="scss">
	.heading-text {
		display: inline-grid;
		font-family: var(--ui-font-heading, inherit);
		font-weight: var(--ui-heading-weight, 800);
		text-transform: var(--ui-heading-transform, none);
		letter-spacing: 0.02em;
		line-height: 1.15;
	}

	.outline,
	.fill {
		grid-area: 1 / 1;
	}

	.outline {
		color: var(--ui-outline, transparent);
		-webkit-text-stroke: 0.22em var(--ui-outline, transparent);
		text-shadow: 0 0.09em 0 var(--ui-outline, transparent);
	}

	.fill {
		background: var(--fill);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
</style>
