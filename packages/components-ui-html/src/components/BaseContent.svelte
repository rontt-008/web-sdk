<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		maxWidth: '100%' | '500px';
		// false when the content draws its own panels, like the bonus cards
		panel?: boolean;
		children: Snippet;
	};

	const props: Props = $props();
</script>

<div
	class="ui-popup-standard-content-wrap"
	class:panel={props.panel ?? true}
	style="--maxWidth: {props.maxWidth}; --zIndex: {100}"
>
	{@render props.children()}
</div>

<style lang="scss">
	.ui-popup-standard-content-wrap {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: var(--zIndex);
		max-width: var(--maxWidth);
		gap: 1rem;
	}

	.panel {
		--space: calc(1rem + var(--ui-panel-outset, 0rem));

		box-sizing: border-box;
		min-height: 0;
		max-width: min(var(--maxWidth), calc(100% - 2 * var(--space)));
		max-height: calc(100% - 2 * var(--space) - 2rem);
		padding: 1.5rem 1.75rem;
		background: var(--ui-panel-bg, rgba(0, 0, 0, 0.5));
		border: var(--ui-panel-border, none);
		border-radius: var(--ui-panel-radius, 1rem);
		border-image: var(--ui-panel-border-image, none);
		box-shadow: var(--ui-panel-shadow, none);
	}
</style>
