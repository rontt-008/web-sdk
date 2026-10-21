<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		maxWidth: '100%' | '80%' | '500px';
		// false when the content draws its own panels, like the bonus cards
		panel?: boolean;
		// an opaque panel, for long reads the game showing through would get in the way of
		solid?: boolean;
		children: Snippet;
	};

	const props: Props = $props();
</script>

<div
	class="ui-popup-standard-content-wrap"
	class:panel={props.panel ?? true}
	class:solid={props.solid}
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

		&.solid {
			background: var(--ui-panel-bg-solid, rgb(0, 0, 0));
			border: var(--ui-panel-border-solid, var(--ui-panel-border, none));
			border-image: var(--ui-panel-border-image-solid, var(--ui-panel-border-image, none));
			box-shadow: var(--ui-panel-shadow-solid, var(--ui-panel-shadow, none));

			/* On narrow screens the window's close button, at the top right, sits over the right of
			   this tall panel and would cover the top of its scrollbar, so the panel starts below it. */
			@media (max-width: 40rem) {
				margin-top: 0.5rem;
				max-height: calc(100% - 2 * var(--space) - 2.5rem);
			}
		}
	}
</style>
