<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		cardCount: number;
		heading: Snippet;
		dock: Snippet;
		bonusCardsActivate: Snippet;
		bonusCardsBuy: Snippet;
	};

	const props: Props = $props();

	let content = $state<HTMLDivElement>();
	let cards = $state<HTMLDivElement>();
	// the space between the heading and the dock
	let areaWidth = $state(0);
	let areaHeight = $state(0);

	// sizes as laid out, before the scale; offsetWidth would round them to whole pixels, and a row
	// planned that way can come out too narrow for its last card
	const sizeOf = (element: Element) => {
		const style = getComputedStyle(element);
		return { width: parseFloat(style.width) || 0, height: parseFloat(style.height) || 0 };
	};

	let sizes = $state({ card: { width: 0, height: 0 }, gap: 0, padding: 0 });

	const measure = () => {
		if (!cards) return;
		const cardSizes = [...cards.children].map(sizeOf);
		const style = getComputedStyle(cards);
		sizes = {
			card: {
				width: Math.max(0, ...cardSizes.map((size) => size.width)),
				height: Math.max(0, ...cardSizes.map((size) => size.height)),
			},
			gap: parseFloat(style.columnGap) || 0,
			padding: parseFloat(style.paddingLeft) || 0,
		};
	};

	$effect(() => {
		if (!content || !cards) return;
		const observer = new ResizeObserver(measure);
		observer.observe(content);
		for (const card of cards.children) observer.observe(card);
		return () => observer.disconnect();
	});

	// The number of columns that lets the cards be biggest in the space, preferring more columns
	// (fewer rows) when it makes no difference, and the scale that fits them.
	const layout = $derived.by(() => {
		const count = Math.max(1, props.cardCount);
		const { card, gap, padding } = sizes;

		let best = { columns: count, scale: 0, width: 0 };
		for (let columns = count; columns >= 1; columns--) {
			const rows = Math.ceil(count / columns);
			const width = columns * card.width + (columns - 1) * gap + 2 * padding;
			const height = rows * card.height + (rows - 1) * gap + 2 * padding;
			const scale = Math.min(1, areaWidth / width, areaHeight / height);
			if (scale > best.scale + 0.001) best = { columns, scale, width };
		}
		return best;
	});
</script>

<div class="bonus-layout">
	<!-- beside the close button, which keeps the cards below clear of it -->
	<h2 class="heading">
		{@render props.heading()}
	</h2>

	<div class="cards-area" bind:clientWidth={areaWidth} bind:clientHeight={areaHeight}>
		<div class="bonus-content" bind:this={content} style:transform="scale({layout.scale})">
			<!-- the width for the chosen columns, even when wider than the screen: the scale shrinks it -->
			<div
				class="bonus-cards"
				bind:this={cards}
				style:width={layout.width ? `${Math.ceil(layout.width) + 1}px` : undefined}
			>
				{@render props.bonusCardsActivate()}
				{@render props.bonusCardsBuy()}
			</div>
		</div>
	</div>

	<div class="dock">
		{@render props.dock()}
	</div>
</div>

<style lang="scss">
	/* over the whole popup; only the cards and the dock take clicks, the rest closes the menu */
	.bonus-layout {
		position: absolute;
		inset: 0;
		z-index: 100;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		pointer-events: none;
	}

	.heading {
		flex: none;
		margin: 0.4rem 0 0;
		max-width: calc(100% - 8rem);
		font-size: 2.1rem;
		font-weight: inherit;
		line-height: 1;
		text-align: center;
	}

	.cards-area {
		flex: 1;
		min-height: 0;
		align-self: stretch;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bonus-content,
	.dock {
		pointer-events: auto;
	}

	.bonus-content {
		transform-origin: center center;
	}

	.bonus-cards {
		box-sizing: border-box;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		/* room for the frame the theme draws around each card */
		gap: calc(1.25rem + 2 * var(--ui-card-outset, 0rem));
		padding: var(--ui-card-outset, 0rem);

		> :global(*) {
			flex: none;
		}
	}

	.dock {
		flex: none;
	}
</style>
