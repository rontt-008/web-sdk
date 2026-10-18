<script lang="ts">
	import type { Snippet } from 'svelte';

	import HeadingText from './HeadingText.svelte';

	type Props = {
		// 'primary' for main actions (buy, confirm, start), 'activate' for switching a bet mode on
		// (like a booster), 'control' for options and +/- buttons
		variant: 'primary' | 'activate' | 'control';
		selected?: boolean;
		round?: boolean;
		// filling the bottom of a card, its bottom corners rounded like the card's (--ui-flush-radius,
		// set by the card); it only brightens when hovered
		flush?: boolean;
		width?: string;
		height: string;
		fontSize?: string;
		children: Snippet;
	};

	const {
		variant,
		selected = false,
		round = false,
		flush = false,
		width = '100%',
		height,
		fontSize = '1rem',
		children,
	}: Props = $props();
</script>

<!-- The inside of a <Button>: it reacts to the button being hovered, pressed or disabled. -->
<span
	class="face {variant}"
	class:selected
	class:round
	class:flush
	style:--width={width}
	style:--height={height}
	style:font-size={fontSize}
>
	{#if variant === 'control'}
		<span class="label">{@render children()}</span>
	{:else}
		<HeadingText fill="var(--label)">{@render children()}</HeadingText>
	{/if}
</span>

<style lang="scss">
	.face {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--width);
		height: var(--height);
		padding: 0 0.75rem;
		font-family: var(--ui-font-heading, inherit);
		font-weight: var(--ui-heading-weight, 800);
		text-transform: var(--ui-heading-transform, none);
		white-space: nowrap;
		transition:
			transform 120ms ease,
			filter 120ms ease,
			background 120ms ease;
	}

	.control {
		color: var(--ui-control-text, white);
		background: var(--ui-control-bg, #343741);
		border: var(--ui-control-border, none);
		border-radius: var(--ui-control-radius, 0.625rem);

		&.selected {
			color: var(--ui-selected-text, black);
			background: var(--ui-selected-bg, white);
		}
	}

	.primary {
		--background: var(--ui-accent-bg, white);
		--background-hovered: var(--ui-accent-bg-hovered, #eff0f3);
		--label: var(--ui-accent-text, black);
		--image: var(--ui-accent-border-image, none);
	}

	.activate {
		--background: var(--ui-activate-bg, #ffcf4a);
		--background-hovered: var(--ui-activate-bg-hovered, #ffd96e);
		--label: var(--ui-activate-text, black);
		--image: var(--ui-activate-border-image, none);
	}

	.primary,
	.activate {
		padding: 0 var(--ui-accent-inset, 0.75rem);
		background: var(--background);
		border: 0 solid transparent;
		border-radius: var(--ui-control-radius, 0.625rem);
		border-image: var(--image);
	}

	.round {
		padding: 0;
		border-radius: 50%;
	}

	.flush {
		border-radius: 0 0 var(--ui-flush-radius, 0) var(--ui-flush-radius, 0);
	}

	.label {
		letter-spacing: 0.02em;
	}

	:global(button:enabled:hover) > .face:not(.flush) {
		transform: scale(1.03);
	}

	:global(button:enabled:hover) > .control:not(.selected) {
		background: var(--ui-control-bg-hovered, #40444f);
	}

	:global(button:enabled:hover) > :is(.primary, .activate) {
		background: var(--background-hovered);
		filter: brightness(1.06);
	}

	:global(button:enabled:active) > .face {
		transform: scale(0.97);
		filter: brightness(0.9);
	}

	:global(button:enabled:active) > .flush {
		transform: none;
	}

	:global(button:disabled) > .face {
		filter: grayscale(0.8);
	}

	:global(button:focus-visible) {
		outline: none;
	}

	:global(button:focus-visible) > .face {
		outline: 2px solid var(--ui-accent-color, white);
		outline-offset: 2px;
	}
</style>
