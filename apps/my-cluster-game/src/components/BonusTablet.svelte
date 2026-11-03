<script lang="ts">
	import type { BetModeData } from 'state-shared';
	import { createBonusCard, i18nDerived } from 'components-ui-html';

	import RuneSlate from './RuneSlate.svelte';
	import RuneEmblem from './RuneEmblem.svelte';
	import SignText from './SignText.svelte';
	import PlankButton from './PlankButton.svelte';
	import { bonusColour, LEAF_STILLS } from '../game/bonusLook';

	type Props = {
		// the bonus's bet mode, followed by its levels (the modes whose parent it is)
		levels: BetModeData[];
		// another card has levels: this one keeps the room for them, so the prices line up
		levelRow: boolean;
		// only shown, off the branch, and not pressed (as the gust blows it away, BonusGust)
		picture?: boolean;
		// its runes flaring (as it is bought)
		flare?: boolean;
	};

	const props: Props = $props();
	const card = createBonusCard(() => props.levels);
	const colour = $derived(bonusColour(card.betModeData.mode));

	// longer prices, like MX$1,000,000.00, get smaller so they stay on the slate
	const PRICE_FONT_SIZE_REM = 1.9;
	const PRICE_FULL_SIZE_LENGTH = 9;
	const priceFontSize = $derived(
		`${PRICE_FONT_SIZE_REM * Math.min(1, PRICE_FULL_SIZE_LENGTH / card.priceText.length)}rem`,
	);
</script>

<!--
	A bonus in the buy bonus menu as a rune slate in a frame of logs and maple leaves (RuneSlate),
	hanging by two ropes from a branch across the row, a leaf caught on it: its name in the logo's
	lettering in its colour, what it does, its runes glowing, its price, and a plank to press. The menu
	tells each card where it sits along its row (data-row-end), so the branch carries on past the
	row's ends. Hovered, it swings on its ropes.
-->
<div
	class="tablet"
	class:activate={card.isActivate}
	class:level-row={props.levelRow}
	class:unavailable={card.disabled}
	class:picture={props.picture}
	inert={props.picture}
>
	<div class="branch" aria-hidden="true">
		<img class="leaf" src={LEAF_STILLS[colour]} alt="" />
	</div>

	<div class="swing">
		<span class="rope left" aria-hidden="true"></span>
		<span class="rope right" aria-hidden="true"></span>

		<RuneSlate width="14.5rem" natural>
			<div class="face">
				<SignText text={card.betModeData.text.title} {colour} size="1.45rem" />
				<p class="description">{card.betModeData.text.description}</p>

				<div class="emblem">
					<RuneEmblem mode={card.betModeData.mode} size="3.3rem" flare={props.flare} />
				</div>

				<div class="price"><SignText text={card.priceText} colour="cream" size={priceFontSize} /></div>
				<div class="multiple">{card.betModeData.costMultiplier}x {i18nDerived.bet()}</div>

				<!-- the bonus's levels, right above the plank that buys or switches on the one picked -->
				{#if card.hasLevels}
					<div class="levels">
						<button class="level-arrow" aria-label="previous" onclick={() => card.select(card.index - 1)}>
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
						<button class="level-arrow" aria-label="next" onclick={() => card.select(card.index + 1)}>
							<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
						</button>
					</div>
				{/if}

				<span class="fill"></span>
				<div class="press">
					<PlankButton label={card.buttonLabel} onclick={card.press} disabled={card.disabled} {colour} />
				</div>
			</div>
		</RuneSlate>

		<!-- only what stays switched on (a bought bonus is "active" only while it starts) -->
		{#if card.active && card.isActivate}
			<div class="seal"><SignText text="ACTIVE" colour="yellow" size="0.95rem" /></div>
		{/if}
	</div>
</div>

<style lang="scss">
	.tablet {
		--swing: -2.5deg;

		position: relative;
		box-sizing: border-box;
		width: 14.5rem;
		padding: 0.4rem 0 0.75rem;

		&.activate {
			--swing: 2.5deg;
		}
	}

	/* this card's piece of the branch, from halfway to the card on its left to halfway to the one on
	   its right, so the pieces join into one; over the ropes' knots */
	.branch {
		position: absolute;
		z-index: 2;
		top: 0.35rem;
		left: calc(var(--row-gap, 1rem) / -2);
		right: calc(var(--row-gap, 1rem) / -2);
		height: 0.8rem;

		&,
		&::before,
		&::after {
			background:
				repeating-linear-gradient(
					90deg,
					transparent 0 1.7rem,
					rgba(42, 18, 6, 0.4) 1.7rem 1.82rem,
					transparent 1.82rem 2.6rem,
					rgba(255, 214, 160, 0.18) 2.6rem 2.7rem
				),
				linear-gradient(180deg, #9a6438 0%, #72421f 45%, #4a2812 100%);
			border-top: 0.12rem solid #2a1206;
			border-bottom: 0.12rem solid #2a1206;
			box-shadow: 0 0.3rem 0.35rem rgba(0, 0, 0, 0.45);
		}

		/* at the ends of the row it carries on, out of sight */
		&::before,
		&::after {
			position: absolute;
			top: -0.12rem;
			bottom: -0.12rem;
			width: 40rem;
		}

		&::before {
			right: 100%;
		}

		&::after {
			left: 100%;
		}
	}

	/* (the menu sets data-row-end while it runs, so it is global here) */
	.tablet:global(:is([data-row-end='first'], [data-row-end='both'])) .branch::before,
	.tablet:global(:is([data-row-end='last'], [data-row-end='both'])) .branch::after {
		content: '';
	}

	.leaf {
		position: absolute;
		right: 12%;
		top: -0.85rem;
		width: 2rem;
		height: 2rem;
		transform: rotate(-24deg);
		filter: drop-shadow(0 0.15rem 0.15rem rgba(0, 0, 0, 0.5));
	}

	.activate .leaf {
		left: 12%;
		right: auto;
		transform: rotate(28deg) scaleX(-1);
	}

	/* hanging from the branch by its ropes, swinging on them when hovered */
	.swing {
		position: relative;
		padding-top: 1.35rem;
		transform-origin: 50% 0.4rem;
		transition:
			transform 0.9s cubic-bezier(0.25, 2.4, 0.45, 1),
			opacity 200ms ease;
	}

	.tablet:hover .swing {
		transform: rotate(var(--swing));
	}

	.rope {
		position: absolute;
		z-index: 1;
		top: 0.3rem;
		width: 0.22rem;
		height: 2.9rem;
		border-radius: 0.1rem;
		background: repeating-linear-gradient(180deg, #e3cf9f 0 0.2rem, #a8865a 0.2rem 0.38rem);
		box-shadow: 0.08rem 0.08rem 0 rgba(0, 0, 0, 0.35);

		&.left {
			left: 26%;
		}

		&.right {
			right: 26%;
		}
	}

	/* a bonus that can't be picked (the balance doesn't cover it) is faded, its plank with it; the
	   branch stays */
	.unavailable .swing {
		opacity: 0.6;
	}

	.picture {
		pointer-events: none;

		.branch,
		.rope {
			display: none;
		}
	}

	.face {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem 0.25rem 0.35rem;
		text-align: center;
	}

	.level-row .face {
		padding-bottom: 0.1rem;
	}

	/* room for three lines */
	.description {
		margin: 0.3rem 0 0;
		height: 2.8rem;
		font-size: 0.72rem;
		line-height: 1.3;
		text-wrap: balance;
		color: #c8c2d2;
	}

	.emblem {
		margin-top: 0.4rem;
	}

	.price {
		margin-top: 0.55rem;
		white-space: nowrap;
	}

	.multiple {
		margin-top: 0.1rem;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: #8f8a9c;
	}

	.levels {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.45rem;
	}

	.level-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		padding: 0;
		border: 0.12rem solid #2a1206;
		border-radius: 50%;
		background: #6c3b1b;
		color: #fff1d6;
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
		background: #8f8a9c;
		opacity: 0.45;
		cursor: pointer;
		transition: width 160ms ease;

		&.current {
			width: 1.3rem;
			opacity: 1;
			background: #ffd23f;
		}
	}

	.fill {
		flex: 1 0 0.6rem;
	}

	/* the plank, clear of the logs round the slate */
	.press {
		width: 80%;
		margin-bottom: 0.45rem;
	}

	/* what is switched on gets a glowing gold seal over its slate, beside its runes */
	.seal {
		position: absolute;
		z-index: 3;
		top: 9.7rem;
		right: 0.3rem;
		padding: 0.35rem 0.6rem;
		border: 0.14rem solid #ffd23f;
		border-radius: 0.5rem;
		background: radial-gradient(circle, #3b2a0a, #1d1406);
		transform: rotate(12deg);
		box-shadow:
			0 0 0.7rem rgba(255, 171, 26, 0.75),
			0 0.25rem 0.5rem rgba(0, 0, 0, 0.5);
	}
</style>
