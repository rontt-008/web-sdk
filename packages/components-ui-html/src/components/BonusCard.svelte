<script lang="ts">
	import type { Snippet } from 'svelte';
	import { stateBet, type BetModeData } from 'state-shared';
	import { Button } from 'components-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import ButtonFace from './ButtonFace.svelte';
	import HeadingText from './HeadingText.svelte';
	import VolatilityMeter from './VolatilityMeter.svelte';
	import { stateBonus } from '../stateBonus.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import type { EmitterEventModal } from '../types';

	type Props = {
		// a bet mode, followed by its levels (the modes whose parent it is)
		levels: BetModeData[];
		// keeps room for the level slider when another card has one, so the prices line up
		levelRow?: boolean;
		bonusArt?: Snippet<[BetModeData]>;
	};

	const props: Props = $props();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	// opens on the level in use, e.g. a booster level that is switched on
	let index = $state(
		Math.max(
			0,
			props.levels.findIndex((level) => level.mode === stateBet.activeBetModeKey),
		),
	);

	const betModeData = $derived(props.levels[Math.min(index, props.levels.length - 1)]);
	const cost = $derived(stateBet.betAmount * betModeData.costMultiplier);
	// longer prices, like MX$1,000,000.00, get smaller so they stay inside the card
	const PRICE_FONT_SIZE_REM = 1.75;
	const PRICE_FULL_SIZE_LENGTH = 12;
	const priceText = $derived(numberToCurrencyString(cost));
	const priceFontSize = $derived(
		`${PRICE_FONT_SIZE_REM * Math.min(1, PRICE_FULL_SIZE_LENGTH / priceText.length)}rem`,
	);
	// the card says why it can't be picked, instead of only being greyed out
	const notEnoughBalance = $derived(stateBet.balanceAmount < cost);
	const isActivate = $derived(betModeData.type === 'activate');
	const active = $derived(stateBet.activeBetModeKey === betModeData.mode);
	// a mode that is switched on is switched off from its card, straight away
	const canDisable = $derived(isActivate && active);
	const hasLevels = $derived(props.levels.length > 1);

	const select = (levelIndex: number) => {
		index = (levelIndex + props.levels.length) % props.levels.length;
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};
</script>

<!-- the arrows at the ends of the level slider -->
{#snippet arrow(direction: -1 | 1)}
	<Button
		data-test={direction < 0 ? 'level-down-button' : 'level-up-button'}
		onclick={() => select(index + direction)}
	>
		<ButtonFace variant="control" round width="2rem" height="2rem">
			<svg class="chevron" viewBox="0 0 16 16" aria-hidden="true">
				<path d={direction < 0 ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'} />
			</svg>
		</ButtonFace>
	</Button>
{/snippet}

<div class="bonus-card" class:activate={isActivate} class:active>
	<div class="body">
		<div class="title">
			<HeadingText fill="var(--type-color)">{betModeData.text.title}</HeadingText>
		</div>

		{#if betModeData.text.description}
			<p class="description">{betModeData.text.description}</p>
		{/if}

		{#if props.bonusArt}
			<div class="art">
				{@render props.bonusArt(betModeData)}
			</div>
		{/if}

		{#if betModeData.volatility}
			<VolatilityMeter value={betModeData.volatility} />
		{/if}

		<div class="price" style:font-size={priceFontSize}>
			<HeadingText fill="var(--ui-card-price, white)">{priceText}</HeadingText>
		</div>
	</div>

	<!-- the bonus's levels, right above the button that buys or switches on the one picked -->
	{#if hasLevels}
		<div class="level-slider">
			{@render arrow(-1)}
			<div class="stops">
				{#each props.levels as level, levelIndex (level.mode)}
					<button
						class="stop"
						class:current={levelIndex === index}
						aria-label={level.text.title}
						aria-current={levelIndex === index}
						onclick={() => select(levelIndex)}
					></button>
				{/each}
			</div>
			{@render arrow(1)}
		</div>
	{:else if props.levelRow}
		<div class="level-slider empty" aria-hidden="true"></div>
	{/if}

	<Button
		onclick={() => {
			if (canDisable) {
				stateBet.activeBetModeKey = 'BASE';
			} else {
				stateBonus.selectedBetModeKey = betModeData.mode;
				eventEmitter.broadcast({ type: 'buyBonusConfirm' });
			}
			eventEmitter.broadcast({ type: 'soundPressGeneral' });
		}}
		disabled={!canDisable && (stateBet.betAmount <= 0 || notEnoughBalance)}
	>
		<ButtonFace
			variant={isActivate ? 'activate' : 'primary'}
			flush
			height="3.4rem"
			fontSize="1.3rem"
		>
			{canDisable
				? i18nDerived.disable()
				: notEnoughBalance
					? i18nDerived.notEnoughBalance()
					: betModeData.text.button}
		</ButtonFace>
	</Button>
</div>

<style lang="scss">
	.bonus-card {
		/* buying and switching a mode on have their own colour: the title, the button and the glow */
		--type-color: var(--ui-accent-color, white);

		/* the buy button's bottom corners, the same as the card's */
		--ui-flush-radius: var(--ui-card-radius, 1rem);

		box-sizing: border-box;
		width: 16rem;
		display: flex;
		flex-direction: column;

		color: var(--ui-card-text, white);
		background: var(--ui-card-bg, rgba(0, 0, 0, 0.5));
		border: var(--ui-card-border, none);
		border-radius: var(--ui-card-radius, 1rem);
		border-image: var(--ui-card-border-image, none);
		box-shadow: var(--ui-card-shadow, none);
		text-align: center;
		/* the ring around the card that is switched on (below), faded in */
		outline: 3px solid transparent;
		outline-offset: 3px;
		transition: outline-color 200ms ease;

		&.activate {
			--type-color: var(--ui-activate-color, white);
		}

		&.active {
			outline-color: var(--type-color);
		}
	}

	/* The buy button covers the card's bottom edge, border included, and draws the rounded bottom
	   corners itself: clipped by the card instead, its corners come out jagged, with the card's
	   border showing as a dark line around them. The browser's own button border is left out too;
	   it kept the button 2px inside its place. (The themes' card border is 1px.) */
	.bonus-card > :global(button) {
		width: calc(100% + 2px);
		margin: 0 -1px -1px;
		border: 0;
	}

	.body {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 1.1rem 1rem 0.9rem;
	}

	.title {
		font-size: 1.35rem;
		text-wrap: balance;
	}

	.description {
		margin: 0;
		min-height: 3.1rem;
		font-size: 0.8rem;
		line-height: 1.3;
		white-space: pre-line;
		text-wrap: balance;
	}

	/* the picture stands on a soft light, the card shows through around it */
	.art {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 7rem;
		background: var(--ui-card-art-bg, none);
		border-radius: var(--ui-card-art-radius, 0);
	}

	.price {
		white-space: nowrap;
	}

	.level-slider {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		height: 2.75rem;
		padding: 0 0.6rem;
		background: rgba(0, 0, 0, 0.18);
		border-top: 1px solid rgba(255, 255, 255, 0.06);

		/* only the room, so this card's price lines up with the cards that have levels */
		&.empty {
			background: none;
			border-top-color: transparent;
		}
	}

	.chevron {
		width: 0.9rem;
		height: 0.9rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* one stop per level; the picked one stretches into a bar */
	.stops {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
	}

	.stop {
		width: 0.55rem;
		height: 0.55rem;
		padding: 0;
		border: none;
		border-radius: 1rem;
		cursor: pointer;
		background: var(--ui-meter-empty, rgba(255, 255, 255, 0.2));
		transition:
			width 160ms ease,
			background 160ms ease;

		&:hover {
			background: var(--ui-card-text, white);
		}

		&.current {
			width: 1.4rem;
			background: var(--type-color);
		}

		&:focus-visible {
			outline: 2px solid var(--type-color);
			outline-offset: 2px;
		}
	}
</style>
