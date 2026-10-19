<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		onclick: () => void;
		disabled?: boolean;
		// light and see-through, for the action nobody should take by accident (CANCEL)
		quiet?: boolean;
		// a cat's paw before the label
		paw?: boolean;
		'data-test'?: string;
		children: Snippet;
	};

	const props: Props = $props();
</script>

<!-- A button on a towel (TowelCloth), in its colours, with dashed stitches round it. Its height and
	 text size come from --towel-button-height and --towel-button-font. -->
<button
	class="towel-button"
	class:quiet={props.quiet}
	onclick={props.onclick}
	disabled={props.disabled}
	data-test={props['data-test']}
>
	{#if props.paw}
		<svg class="paw" viewBox="0 0 20 18" aria-hidden="true">
			<ellipse cx="10" cy="13.5" rx="5" ry="4" />
			<ellipse cx="2" cy="7.5" rx="2" ry="2.5" />
			<ellipse cx="6.5" cy="2.5" rx="2" ry="2.5" />
			<ellipse cx="13.5" cy="2.5" rx="2" ry="2.5" />
			<ellipse cx="18" cy="7.5" rx="2" ry="2.5" />
		</svg>
	{/if}
	{@render props.children()}
</button>

<style lang="scss">
	.towel-button {
		box-sizing: border-box;
		height: var(--towel-button-height, 3rem);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		padding: 0 0.75rem;
		border: 0;
		border-radius: 0.625rem;
		background: var(--button);
		color: var(--button-text);
		font-family: inherit;
		font-size: var(--towel-button-font, 1.0625rem);
		font-weight: 800;
		letter-spacing: 0.06em;
		/* a long label, like NOT ENOUGH BALANCE, goes onto two lines inside the button */
		line-height: 1.1;
		text-align: center;
		text-wrap: balance;
		text-transform: uppercase;
		cursor: pointer;
		outline: 2px dashed var(--button-dash);
		outline-offset: -6px;
		transition: background 120ms ease;

		&:enabled:hover {
			background: var(--button-hovered);
		}

		/* not faded itself: the towel it is on fades (ClotheslineCard) */
		&:disabled {
			cursor: not-allowed;
		}

		&:focus-visible {
			outline-style: solid;
		}

		&.quiet {
			background: rgba(255, 255, 255, 0.35);
			color: var(--ink);
			outline-color: color-mix(in srgb, var(--ink) 35%, transparent);

			&:enabled:hover {
				background: rgba(255, 255, 255, 0.5);
			}
		}
	}

	.paw {
		flex: none;
		width: 1.25rem;
		height: 1.125rem;
		fill: currentColor;
	}
</style>
