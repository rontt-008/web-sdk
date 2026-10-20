<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		// yellow cloth, for switching a mode on (the booster, the feature spin); blue for buying
		activate?: boolean;
		// the bigger towel of the buy bonus confirm dialog
		large?: boolean;
		// inside the cloth, under its stripes and stitches (a pattern, a mark)
		behind?: Snippet;
		// over the towel, past its edges (a stamp)
		over?: Snippet;
		// what is on the towel; it lays itself out
		children: Snippet;
	};

	const props: Props = $props();
</script>

<!--
	A woven dish towel pegged up by two clothes pegs: fine threads both ways over its colour, a
	scalloped hem, stripes across the bottom and dashed stitches round the edge. Its colours are set
	here for everything on it (--ink, --button, ...): ClotheslineCard (the buy bonus menu) and
	ConfirmTowel (its confirm dialog).
-->
<div class="towel-cloth" class:activate={props.activate} class:large={props.large}>
	<div class="shadow">
		<div class="cloth">
			{@render props.behind?.()}
			<div class="hem-stripe" aria-hidden="true"></div>
			<div class="stitches" aria-hidden="true"></div>
			<div class="content">
				{@render props.children()}
			</div>
		</div>
	</div>
	{@render props.over?.()}
	<div class="peg left" aria-hidden="true"></div>
	<div class="peg right" aria-hidden="true"></div>
</div>

<style lang="scss">
	.towel-cloth {
		/* blue cloth for buying */
		--cloth-top: #8ed8fa;
		--cloth-bottom: #5bbdeb;
		--weave-dark: rgba(0, 40, 60, 0.07);
		--weave-light: rgba(255, 255, 255, 0.12);
		--ink: #06324a;
		--ink-soft: rgba(6, 50, 74, 0.88);
		--ink-faint: rgba(6, 50, 74, 0.7);
		--stitch: rgba(6, 50, 74, 0.28);
		--stripe: #1d5f8a;
		--stripe-opacity: 0.7;
		--patch-in: #0e2c3b;
		--patch-out: #071219;
		--patch-ring: rgba(6, 50, 74, 0.3);
		--patch-dash: rgba(143, 224, 255, 0.5);
		--button: #062230;
		--button-hovered: #0a3044;
		--button-text: #8fe0ff;
		--button-dash: rgba(143, 224, 255, 0.5);

		/* sizes of the towel in the menu */
		--scallop: 0.4375rem;
		--scallop-every: 1.3125rem;
		--stripe-bottom: 1rem;
		--stripe-height: 0.8125rem;
		--stitch-inset: 0.4375rem;
		--stitch-bottom: 1.125rem;
		--peg-top: -1.125rem;
		--peg-inset: 1.625rem;
		--peg-width: 0.875rem;
		--peg-height: 2.5rem;
		--drop-shadow: 0 1rem 1.1rem rgba(0, 0, 0, 0.55);

		position: relative;
		color: var(--ink);

		/* yellow cloth for switching on */
		&.activate {
			--cloth-top: #f7cf63;
			--cloth-bottom: #edb63a;
			--weave-dark: rgba(90, 55, 0, 0.06);
			--weave-light: rgba(255, 255, 255, 0.1);
			--ink: #3a2600;
			--ink-soft: rgba(58, 38, 0, 0.85);
			--ink-faint: rgba(58, 38, 0, 0.7);
			--stitch: rgba(90, 55, 0, 0.3);
			--stripe: #c0392b;
			--stripe-opacity: 0.75;
			--patch-in: #2e220c;
			--patch-out: #17110a;
			--patch-ring: rgba(90, 55, 0, 0.35);
			--patch-dash: rgba(255, 214, 110, 0.5);
			--button: #2a1d06;
			--button-hovered: #3a2a0c;
			--button-text: #ffcc4d;
			--button-dash: rgba(255, 204, 77, 0.5);
		}

		/* the confirm dialog's towel */
		&.large {
			--scallop: 0.5rem;
			--scallop-every: 1.5rem;
			--stripe-bottom: 1.125rem;
			--stripe-height: 0.875rem;
			--stitch-inset: 0.5625rem;
			--stitch-bottom: 1.375rem;
			--peg-top: -1.25rem;
			--peg-inset: 2.5rem;
			--peg-width: 1rem;
			--peg-height: 2.75rem;
			--drop-shadow: 0 1.1rem 1.25rem rgba(0, 0, 0, 0.55);
		}
	}

	.shadow {
		filter: drop-shadow(var(--drop-shadow));
	}

	.cloth {
		position: relative;
		overflow: hidden;
		background:
			repeating-linear-gradient(0deg, var(--weave-dark) 0 1px, transparent 1px 3px),
			repeating-linear-gradient(90deg, var(--weave-light) 0 1px, transparent 1px 3px),
			linear-gradient(180deg, var(--cloth-top), var(--cloth-bottom));
		/* a scalloped hem */
		-webkit-mask: radial-gradient(circle var(--scallop) at 50% 100%, transparent 96%, #000) 0 0 /
			var(--scallop-every) 100% repeat-x;
		mask: radial-gradient(circle var(--scallop) at 50% 100%, transparent 96%, #000) 0 0 /
			var(--scallop-every) 100% repeat-x;
	}

	/* on top of the stripes and stitches */
	.content {
		position: relative;
	}

	/* the stripes across the bottom of a dish towel */
	.hem-stripe {
		position: absolute;
		left: 0;
		right: 0;
		bottom: var(--stripe-bottom);
		height: var(--stripe-height);
		background: repeating-linear-gradient(0deg, var(--stripe) 0 0.1875rem, transparent 0.1875rem 0.375rem);
		opacity: var(--stripe-opacity);
	}

	.stitches {
		position: absolute;
		inset: var(--stitch-inset) var(--stitch-inset) var(--stitch-bottom);
		border: 2px dashed var(--stitch);
		border-bottom: none;
	}

	/* wooden clothes pegs, with their metal springs */
	.peg {
		position: absolute;
		top: var(--peg-top);
		width: var(--peg-width);
		height: var(--peg-height);
		border-radius: 3px;
		background: linear-gradient(90deg, #c58a4e, #e6b07a 45%, #a8713a);
		box-shadow: 0 3px 4px rgba(0, 0, 0, 0.4);

		&::after {
			content: '';
			position: absolute;
			top: 38%;
			left: -2px;
			right: -2px;
			height: 4px;
			border-radius: 2px;
			background: #9aa0a6;
		}

		&.left {
			left: var(--peg-inset);
		}

		&.right {
			right: var(--peg-inset);
		}
	}
</style>
