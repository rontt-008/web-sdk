<script lang="ts">
	import { stateBet, type BetModeData } from 'state-shared';
	import { i18nDerived } from 'components-ui-html';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import BonusCardArt from './BonusCardArt.svelte';
	import TowelCloth from './TowelCloth.svelte';
	import TowelPatch from './TowelPatch.svelte';
	import TowelButton from './TowelButton.svelte';
	import { MYSTERY_CHANCES, MYSTERY_MODE, percent } from '../game/betModes';

	type Props = {
		betModeData: BetModeData;
		onconfirm: () => void;
		oncancel: () => void;
	};

	const props: Props = $props();

	const priceText = $derived(numberToCurrencyString(stateBet.betAmount * props.betModeData.costMultiplier));
	// longer prices, like MX$1,000,000.00, get smaller so they stay on the towel
	const PRICE_FONT_SIZE_REM = 2.125;
	const PRICE_FULL_SIZE_LENGTH = 12;
	const priceFontSize = $derived(
		`${PRICE_FONT_SIZE_REM * Math.min(1, PRICE_FULL_SIZE_LENGTH / priceText.length)}rem`,
	);

	// the mystery bonus's chances of each free spins, as stitched swatches as wide as their chance
	// (MYTHIC a little wider, to fit its words)
	const ODDS = [
		{ name: 'FREE SPINS', chance: MYSTERY_CHANCES.normal, kind: 'normal' },
		{ name: 'SUPER', chance: MYSTERY_CHANCES.super, kind: 'super' },
		{ name: 'MYTHIC', chance: MYSTERY_CHANCES.mythic, kind: 'mythic' },
	];
</script>

<!--
	The buy bonus confirm dialog as the bonus's towel, bigger, pegged to a washing line across the
	screen: its picture, what it does (the mystery bonus's chances as swatches), its price, and
	CANCEL (light, so nobody buys by accident) beside CONFIRM.
-->
<div class="confirm-towel">
	<svg class="line" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
		<path class="line-shadow" d="M0 1 Q50 15 100 1" />
		<path class="line-rope" d="M0 1 Q50 15 100 1" />
		<path class="line-twist" d="M0 1 Q50 15 100 1" />
	</svg>

	<div class="tilt">
		<TowelCloth activate={props.betModeData.type === 'activate'} large>
			<div class="face">
				<div class="title">{props.betModeData.text.title}</div>

				<div class="patch">
					<TowelPatch size={8.25}>
						<BonusCardArt mode={props.betModeData.mode} size={3.4} />
					</TowelPatch>
				</div>

				{#if props.betModeData.mode === MYSTERY_MODE}
					<div class="odds">
						{#each ODDS as odd}
							<div class="swatch {odd.kind}" style:flex-grow={Math.max(odd.chance, 0.18) * 100}>
								<span class="chance">{percent(odd.chance)}</span>
								{odd.name}
							</div>
						{/each}
					</div>
				{/if}

				<p class="dialog">{props.betModeData.text.dialog}</p>

				<span class="fill"></span>
				<div class="price">
					<span class="amount" style:font-size={priceFontSize}>{priceText}</span>
					<span class="multiple">{props.betModeData.costMultiplier}× {i18nDerived.bet()}</span>
				</div>

				<div class="buttons">
					<div class="cancel">
						<TowelButton data-test="cancel-button" onclick={props.oncancel} quiet>
							{i18nDerived.cancel()}
						</TowelButton>
					</div>
					<div class="confirm">
						<TowelButton data-test="confirm-button" onclick={props.onconfirm} paw>
							{i18nDerived.confirm()}
						</TowelButton>
					</div>
				</div>
			</div>
		</TowelCloth>
	</div>
</div>

<style lang="scss">
	.confirm-towel {
		position: relative;
		z-index: 100;
		box-sizing: border-box;
		width: min(30rem, calc(100vw - 2rem));
		margin-top: 1.5rem;
		font-family: var(--ui-font-heading, inherit);
	}

	/* the washing line, across the whole screen, sagging to where the towel is pegged */
	.line {
		position: absolute;
		left: 50%;
		top: -1.9rem;
		width: 100vw;
		height: 2.2rem;
		margin-left: -50vw;
		overflow: visible;

		path {
			fill: none;
			vector-effect: non-scaling-stroke;
		}

		.line-shadow {
			stroke: rgba(0, 0, 0, 0.45);
			stroke-width: 5px;
			transform: translateY(0.4px);
		}

		.line-rope {
			stroke: #e9dcc2;
			stroke-width: 4px;
		}

		.line-twist {
			stroke: #b9a684;
			stroke-width: 4px;
			stroke-dasharray: 3 5;
		}
	}

	.tilt {
		transform: rotate(-0.6deg);
		transform-origin: 50% 0;
	}

	.face {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1.75rem 2rem 2.75rem;
	}

	.title {
		font-size: 1.875rem;
		font-weight: 900;
		letter-spacing: 0.03em;
		line-height: 1.1;
		text-align: center;
		text-transform: uppercase;
	}

	.patch {
		margin-top: 1rem;
	}

	/* the mystery bonus's chances, sewn on as swatches */
	.odds {
		align-self: stretch;
		display: flex;
		gap: 0.25rem;
		height: 2.875rem;
		margin-top: 1.1rem;
	}

	.swatch {
		flex-basis: 0;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		font-weight: 700;
		white-space: nowrap;
		outline: 2px dashed rgba(6, 50, 74, 0.3);
		outline-offset: -5px;

		&.normal {
			border-radius: 0.5rem 0 0 0.5rem;
			background: #f2f9fc;
			color: #06324a;
		}

		&.super {
			background: #f7cf63;
			color: #3a2600;
			outline-color: rgba(90, 55, 0, 0.3);
		}

		&.mythic {
			flex-direction: column;
			gap: 0;
			border-radius: 0 0.5rem 0.5rem 0;
			background: #3a2a6e;
			color: #e2d6ff;
			font-size: 0.56rem;
			letter-spacing: 0.08em;
			line-height: 1.1;
			outline-color: rgba(226, 214, 255, 0.4);

			.chance {
				font-size: 0.94rem;
				letter-spacing: 0;
			}
		}
	}

	.chance {
		font-size: 1.06rem;
		font-weight: 900;
	}

	.dialog {
		align-self: stretch;
		margin: 0.75rem 0 0;
		font-family: var(--ui-font, inherit);
		font-size: 0.8rem;
		line-height: 1.4;
		text-align: center;
		text-wrap: balance;
		color: var(--ink-soft);
	}

	.fill {
		flex: 1 0 0;
	}

	.price {
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
		margin-top: 0.9rem;
		white-space: nowrap;
	}

	.amount {
		font-weight: 900;
		line-height: 1.1;
	}

	.multiple {
		font-size: 0.69rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		opacity: 0.7;
	}

	.buttons {
		--towel-button-height: 3.125rem;

		align-self: stretch;
		display: flex;
		gap: 0.625rem;
		margin-top: 0.75rem;

		> div {
			display: flex;
			flex-direction: column;
			min-width: 0;
		}
	}

	.cancel {
		--towel-button-font: 1rem;

		flex: 1;
	}

	.confirm {
		flex: 2;
	}
</style>
