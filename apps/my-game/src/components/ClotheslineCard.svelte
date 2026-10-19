<script lang="ts">
	import type { BetModeData } from 'state-shared';
	import { createBonusCard, i18nDerived } from 'components-ui-html';

	import BonusCardArt from './BonusCardArt.svelte';
	import TowelCloth from './TowelCloth.svelte';
	import TowelPatch from './TowelPatch.svelte';
	import TowelButton from './TowelButton.svelte';
	import { MYSTERY_MODE, SUPER_MODE } from '../game/betModes';

	type Props = {
		// the bonus's bet mode, followed by its levels (the modes whose parent it is)
		levels: BetModeData[];
		// another card has levels: this one keeps the room for them, so the prices line up
		levelRow: boolean;
		// only shown, off the line, and not pressed (as when it rips, BonusRip.svelte)
		picture?: boolean;
	};

	const props: Props = $props();
	const card = createBonusCard(() => props.levels);

	// longer prices, like MX$1,000,000.00, get smaller so they stay on the towel
	const PRICE_FONT_SIZE_REM = 1.75;
	const PRICE_FULL_SIZE_LENGTH = 10;
	const priceFontSize = $derived(
		`${PRICE_FONT_SIZE_REM * Math.min(1, PRICE_FULL_SIZE_LENGTH / card.priceText.length)}rem`,
	);
</script>

<!--
	A bonus in the buy bonus menu as a woven dish towel (TowelCloth), pegged to a washing line that
	sags across the row: yellow for what is switched on (the booster, the feature spin), blue for what
	is bought. The menu tells each card where it sits along its row (--row-from, --row-to); the line
	is drawn a card at a time, each piece running straight between where the towels are pegged.
-->
<div
	class="towel"
	class:activate={card.isActivate}
	class:level-row={props.levelRow}
	class:unavailable={card.disabled}
	class:picture={props.picture}
	inert={props.picture}
>
	<div class="hang">
		<div class="line" aria-hidden="true"></div>

		<div class="sway">
			<TowelCloth activate={card.isActivate}>
				{#snippet behind()}
					{#if card.betModeData.mode === MYSTERY_MODE}
						<div class="mystery-mark" aria-hidden="true">?</div>
					{/if}
					{#if card.betModeData.mode === SUPER_MODE}
						<div class="super-stripes" aria-hidden="true"></div>
					{/if}
				{/snippet}

				{#snippet over()}
					<!-- only what stays switched on (a bought bonus is "active" only while it starts) -->
					{#if card.active && card.isActivate}
						<div class="stamp">ACTIVE</div>
					{/if}
				{/snippet}

				<div class="face">
					<div class="title">{card.betModeData.text.title}</div>
					<p class="description">{card.betModeData.text.description}</p>

					<div class="patch">
						<TowelPatch size={8.25}>
							<BonusCardArt betModeData={card.betModeData} size={3.3} />
						</TowelPatch>
					</div>

					<div class="price" style:font-size={priceFontSize}>{card.priceText}</div>
					<div class="multiple">{card.betModeData.costMultiplier}x {i18nDerived.bet()}</div>

					<!-- the bonus's levels, right above the button that buys or switches on the one picked -->
					{#if card.hasLevels}
						<div class="levels">
							<button
								class="level-arrow"
								aria-label="previous"
								onclick={() => card.select(card.index - 1)}
							>
								<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
							</button>
							{#each card.levels as level, levelIndex (level.mode)}
								<button
									class="level-stop"
									class:current={levelIndex === card.index}
									aria-label={level.text.title}
									aria-current={levelIndex === card.index}
									onclick={() => card.select(levelIndex)}
								></button>
							{/each}
							<button
								class="level-arrow"
								aria-label="next"
								onclick={() => card.select(card.index + 1)}
							>
								<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
							</button>
						</div>
					{/if}

					<span class="fill"></span>
					<div class="press">
						<!-- no paw when it can't be pressed, leaving room for NOT ENOUGH BALANCE -->
						<TowelButton onclick={card.press} disabled={card.disabled} paw={!card.disabled}>
							{card.buttonLabel}
						</TowelButton>
					</div>
				</div>
			</TowelCloth>
		</div>
	</div>
</div>

<style lang="scss">
	.towel {
		--sway: -3deg;

		/* The line sags a parabola across the row, --sag at its middle: y = 4 * sag * t * (1 - t), t
		   going from 0 at the row's left end to 1 at its right end. Each towel hangs from the line where
		   it is (the middle of its two ends, y0 and y1) and tilts with it. */
		--sag: 2.2rem;
		--t0: var(--row-from, 0.5);
		--t1: var(--row-to, 0.5);
		--y0: calc(4 * var(--sag) * var(--t0) * (1 - var(--t0)));
		--y1: calc(4 * var(--sag) * var(--t1) * (1 - var(--t1)));
		--slope: atan2(calc(var(--y1) - var(--y0)), var(--row-span, 14rem));

		box-sizing: border-box;
		width: 13.125rem;
		/* room for the pegs above, and for hanging lower in the middle of the row below */
		padding: 1.5rem 0 calc(var(--sag) + 0.5rem);
		font-family: var(--ui-font-heading, inherit);

		&.activate {
			--sway: 3deg;
		}
	}

	.hang {
		position: relative;
		transform: translateY(calc((var(--y0) + var(--y1)) / 2));
	}

	/* this towel's piece of the line, from halfway to the towel on its left to halfway to the one on
	   its right, slanted so its ends meet theirs */
	.line {
		position: absolute;
		top: -0.3rem;
		left: calc(var(--row-gap, 1.25rem) / -2);
		right: calc(var(--row-gap, 1.25rem) / -2);
		height: 0.25rem;
		background: repeating-linear-gradient(90deg, #b9a684 0 0.19rem, #e9dcc2 0.19rem 0.5rem);
		box-shadow: 0 0.25rem 0.1rem rgba(0, 0, 0, 0.45);
		transform: skewY(var(--slope));

		/* at the ends of the row it carries on, out to where it is tied */
		&::before,
		&::after {
			position: absolute;
			top: 0;
			bottom: 0;
			width: 40rem;
			background: inherit;
			box-shadow: inherit;
		}

		&::before {
			right: 100%;
		}

		&::after {
			left: 100%;
		}
	}

	/* (the menu sets data-row-end while it runs, so it is global here) */
	.towel:global(:is([data-row-end='first'], [data-row-end='both'])) .line::before,
	.towel:global(:is([data-row-end='last'], [data-row-end='both'])) .line::after {
		content: '';
	}

	/* tilted with the line, a little less, as the cloth hangs down; swaying when hovered */
	.sway {
		position: relative;
		transform: rotate(calc(var(--slope) * 0.5));
		transform-origin: 50% 0;
		transition:
			transform 0.9s cubic-bezier(0.25, 2.4, 0.45, 1),
			opacity 200ms ease;
	}

	.towel:hover .sway {
		transform: rotate(calc(var(--slope) * 0.5 + var(--sway)));
	}

	/* a bonus that can't be picked (the balance doesn't cover it) is faded, towel and pegs, its
	   button with it; its piece of the line stays */
	.unavailable .sway {
		opacity: 0.55;
	}

	.picture {
		pointer-events: none;

		.line {
			display: none;
		}
	}

	.face {
		box-sizing: border-box;
		min-height: 24.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1.875rem 1rem 1.75rem;
	}

	.level-row .face {
		min-height: 26.75rem;
	}

	.mystery-mark {
		position: absolute;
		right: 0.5rem;
		top: 5.75rem;
		font-size: 7.5rem;
		font-weight: 900;
		line-height: 1;
		color: rgba(6, 50, 74, 0.1);
	}

	.super-stripes {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.22) 0 0.625rem,
			transparent 0.625rem 1.75rem
		);
	}

	.title {
		font-size: 1.1875rem;
		font-weight: 900;
		white-space: nowrap;
		text-transform: uppercase;
	}

	/* room for three lines, which still end clear of the patch below */
	.description {
		margin: 0.375rem 0 0;
		height: 3.25rem;
		font-family: var(--ui-font, inherit);
		font-size: 0.72rem;
		line-height: 1.3;
		text-align: center;
		text-wrap: balance;
		color: var(--ink-soft);
	}

	.patch {
		margin-top: 0.35rem;
	}

	.price {
		margin-top: 0.6rem;
		font-weight: 900;
		line-height: 1.2;
		white-space: nowrap;
	}

	.multiple {
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: var(--ink-faint);
	}

	.levels {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.5rem;
	}

	.level-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: var(--button);
		color: var(--button-text);
		cursor: pointer;

		svg {
			width: 0.8rem;
			height: 0.8rem;
			fill: none;
			stroke: currentColor;
			stroke-width: 2.5;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	}

	.level-stop {
		width: 0.5rem;
		height: 0.5rem;
		padding: 0;
		border: 0;
		border-radius: 1rem;
		background: var(--ink-faint);
		opacity: 0.45;
		cursor: pointer;
		transition: width 160ms ease;

		&.current {
			width: 1.3rem;
			opacity: 1;
			background: var(--button);
		}
	}

	/* the button at the bottom of the towel, the same on every towel in the row */
	.fill {
		flex: 1 0 0;
	}

	.press {
		align-self: stretch;
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
	}

	/* the bonus that is switched on gets a red stamp */
	.stamp {
		position: absolute;
		top: 7.375rem;
		right: 0.25rem;
		transform: rotate(12deg);
		padding: 0.375rem 0.625rem;
		border-radius: 0.25rem;
		background: #c0392b;
		color: white;
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.4);
		outline: 1.5px dashed rgba(255, 255, 255, 0.6);
		outline-offset: -4px;
	}
</style>
