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
	// the card says why it can't be picked, instead of only being greyed out
	const notEnoughBalance = $derived(stateBet.balanceAmount < cost);
	const isActivate = $derived(betModeData.type === 'activate');
	const active = $derived(stateBet.activeBetModeKey === betModeData.mode);
	// a mode that is switched on is switched off from its card, straight away
	const deactivates = $derived(isActivate && active);
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

		<div class="price">
			<HeadingText fill="var(--ui-card-price, white)">{numberToCurrencyString(cost)}</HeadingText>
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
			if (deactivates) {
				stateBet.activeBetModeKey = 'BASE';
			} else {
				stateBonus.selectedBetModeKey = betModeData.mode;
				eventEmitter.broadcast({ type: 'buyBonusConfirm' });
			}
			eventEmitter.broadcast({ type: 'soundPressGeneral' });
		}}
		disabled={!deactivates && (stateBet.betAmount <= 0 || notEnoughBalance)}
	>
		<ButtonFace
			variant={isActivate ? 'activate' : 'primary'}
			flush
			height="3.4rem"
			fontSize="1.3rem"
		>
			{#if deactivates}
				{i18nDerived.deactivate()}
			{:else}
				{notEnoughBalance ? i18nDerived.notEnoughBalance() : betModeData.text.button}
			{/if}
		</ButtonFace>
	</Button>
</div>

<style lang="scss">
	.bonus-card {
		/* buying and switching a mode on have their own colour: the title, the button and the glow */
		--type-color: var(--ui-accent-color, white);

		box-sizing: border-box;
		width: 16rem;
		display: flex;
		flex-direction: column;
		overflow: hidden;

		color: var(--ui-card-text, white);
		background: var(--ui-card-bg, rgba(0, 0, 0, 0.5));
		border: var(--ui-card-border, none);
		border-radius: var(--ui-card-radius, 1rem);
		border-image: var(--ui-card-border-image, none);
		box-shadow: var(--ui-card-shadow, none);
		text-align: center;
		transition: filter 200ms ease;

		&.activate {
			--type-color: var(--ui-activate-color, white);
		}

		/* a glow that follows the card's outline, including a frame the theme draws around it */
		&.active {
			filter: drop-shadow(0 0 0.2rem var(--type-color)) drop-shadow(0 0 0.8rem var(--type-color));
		}
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
		font-size: 1.75rem;
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
