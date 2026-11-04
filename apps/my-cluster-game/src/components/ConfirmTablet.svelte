<script lang="ts">
	import { stateBet, type BetModeData } from 'state-shared';
	import { i18nDerived } from 'components-ui-html';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import FitScale from './FitScale.svelte';
	import RuneSlate from './RuneSlate.svelte';
	import RuneEmblem from './RuneEmblem.svelte';
	import SignText from './SignText.svelte';
	import PlankButton from './PlankButton.svelte';
	import { bonusColour, LEAF_STILLS } from '../game/bonusLook';

	type Props = {
		betModeData: BetModeData;
		onconfirm: () => void;
		oncancel: () => void;
	};

	const props: Props = $props();
	const colour = $derived(bonusColour(props.betModeData.mode));

	const priceText = $derived(
		numberToCurrencyString(stateBet.betAmount * props.betModeData.costMultiplier, { fixed: true }),
	);
	// longer prices, like MX$1,000,000.00, get smaller so they stay on the slate
	const PRICE_FONT_SIZE_REM = 2.5;
	const PRICE_FULL_SIZE_LENGTH = 10;
	const priceFontSize = $derived(
		`${PRICE_FONT_SIZE_REM * Math.min(1, PRICE_FULL_SIZE_LENGTH / priceText.length)}rem`,
	);
</script>

<!--
	The buy bonus confirm dialog as the bonus's slate, bigger, hanging from a branch right across the
	screen: its name, its runes, what it does, its price, and CANCEL (a plain plank, so nobody buys by
	accident) beside CONFIRM. On a small window it is scaled down to fit (FitScale).
-->
<div class="confirm-tablet">
	<FitScale>
		<div class="hang">
			<div class="branch" aria-hidden="true">
				<img class="leaf" src={LEAF_STILLS[colour]} alt="" />
			</div>
			<span class="rope left" aria-hidden="true"></span>
			<span class="rope right" aria-hidden="true"></span>

			<RuneSlate width="23rem">
				<div class="face">
					<SignText text={props.betModeData.text.title} {colour} size="2.1rem" />
					<div class="emblem">
						<RuneEmblem mode={props.betModeData.mode} size="4.4rem" />
					</div>
					<p class="dialog">{props.betModeData.text.dialog}</p>
					<div class="price">
						<SignText text={priceText} colour="cream" size={priceFontSize} />
						<span class="multiple">{props.betModeData.costMultiplier}x {i18nDerived.bet()}</span>
					</div>
					<div class="buttons">
						<div class="cancel">
							<PlankButton
								data-test="cancel-button"
								label={i18nDerived.cancel()}
								onclick={props.oncancel}
								quiet
							/>
						</div>
						<div class="confirm">
							<PlankButton
								data-test="confirm-button"
								label={i18nDerived.confirm()}
								onclick={props.onconfirm}
								{colour}
							/>
						</div>
					</div>
				</div>
			</RuneSlate>
		</div>
	</FitScale>
</div>

<style lang="scss">
	.confirm-tablet {
		position: relative;
		z-index: 100;
	}

	.hang {
		position: relative;
		padding-top: 2.1rem;
	}

	/* the branch, right across the screen whatever the scale */
	.branch {
		position: absolute;
		z-index: 2;
		top: 0.45rem;
		left: 50%;
		width: 400vw;
		height: 0.95rem;
		margin-left: -200vw;
		background:
			repeating-linear-gradient(
				90deg,
				transparent 0 1.7rem,
				rgba(42, 18, 6, 0.4) 1.7rem 1.82rem,
				transparent 1.82rem 2.6rem,
				rgba(255, 214, 160, 0.18) 2.6rem 2.7rem
			),
			linear-gradient(180deg, #9a6438 0%, #72421f 45%, #4a2812 100%);
		border-top: 0.14rem solid #2a1206;
		border-bottom: 0.14rem solid #2a1206;
		box-shadow: 0 0.35rem 0.4rem rgba(0, 0, 0, 0.45);
	}

	.leaf {
		position: absolute;
		left: calc(50% + 6.5rem);
		top: -1rem;
		width: 2.4rem;
		height: 2.4rem;
		transform: rotate(-24deg);
		filter: drop-shadow(0 0.15rem 0.15rem rgba(0, 0, 0, 0.5));
	}

	.rope {
		position: absolute;
		z-index: 1;
		top: 0.4rem;
		width: 0.26rem;
		height: 3.8rem;
		border-radius: 0.12rem;
		background: repeating-linear-gradient(180deg, #e3cf9f 0 0.22rem, #a8865a 0.22rem 0.42rem);
		box-shadow: 0.08rem 0.08rem 0 rgba(0, 0, 0, 0.35);

		&.left {
			left: 26%;
		}

		&.right {
			right: 26%;
		}
	}

	.face {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.8rem 0.6rem 0.6rem;
		text-align: center;
	}

	.emblem {
		margin-top: 0.7rem;
	}

	.dialog {
		margin: 0.9rem 0 0;
		font-size: 0.9rem;
		line-height: 1.45;
		text-wrap: pretty;
		color: #d6d0df;
	}

	.price {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 0.9rem;
		white-space: nowrap;
	}

	.multiple {
		margin-top: 0.15rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: #8f8a9c;
	}

	/* the two planks side by side in the middle, clear of the price above and the logs round the slate */
	.buttons {
		display: flex;
		justify-content: center;
		gap: 0.7rem;
		margin: 1.3rem 0 1rem;

		> * {
			width: 6.25rem;
		}
	}
</style>
