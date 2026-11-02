<script lang="ts">
	import { Button, Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateBet, stateReplay, stateReplayDerived, stateUrlDerived } from 'state-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import ButtonFace from './ButtonFace.svelte';
	import BaseTitle from './BaseTitle.svelte';
	import BaseContent from './BaseContent.svelte';
	import BaseButtonWrap from './BaseButtonWrap.svelte';
	import type { EmitterEventModal } from '../types';

	// The card a replay (replay=true) opens with, as in Stake Engine's example: the round's mode, base
	// bet, cost multiplier and total cost, its payout multiplier and total win, and START REPLAY, which
	// plays the round the way the UI's PLAY button does. It shows once the replay has loaded and goes
	// once the round starts; REPLAY under the board plays it again. Social mode has Engine's words for
	// the numbers (see stateReplayDerived.words).
	type Props = {
		// e.g. while the game's loading screen is up
		hidden?: boolean;
	};

	const props: Props = $props();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	const words = $derived(stateReplayDerived.words());
	const costMultiplier = $derived(stateReplayDerived.costMultiplier());
	const times = (value: number) =>
		`${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}x`;

	const start = () => {
		if (!stateReplay.bet) return;
		eventEmitter.broadcast({ type: 'soundPressBet' });
		stateBet.winBookEventAmount = 0;
		stateBet.betToResume = { ...stateReplay.bet };
		eventEmitter.broadcast({ type: 'resumeBet' });
	};
</script>

{#if stateUrlDerived.replay() && stateReplay.bet && !stateReplay.played && !props.hidden}
	<Popup zIndex={zIndex.modal} persistent onclose={() => {}}>
		<BaseContent maxWidth="80%">
			<span class="badge">REPLAY</span>
			<div class="title">
				<BaseTitle>{words.title}</BaseTitle>
			</div>

			<!-- what it cost, then what it won: one over the other, or side by side on short screens -->
			<dl class="numbers">
				<div class="group">
					<div class="row">
						<dt>{words.mode}</dt>
						<dd class="mode">{stateReplayDerived.modeName()}</dd>
					</div>
					<hr />
					<div class="row">
						<dt>{words.baseBet}</dt>
						<dd>{numberToCurrencyString(stateBet.betAmount, { fixed: true })}</dd>
					</div>
					<div class="row">
						<dt>{words.costMultiplier}</dt>
						<dd>{times(costMultiplier)}</dd>
					</div>
					<div class="row total">
						<dt>{words.totalCost}</dt>
						<dd>{numberToCurrencyString(stateBet.betAmount * costMultiplier, { fixed: true })}</dd>
					</div>
				</div>
				<div class="group won">
					<div class="row">
						<dt>{words.payoutMultiplier}</dt>
						<dd class="win">{times(stateReplay.payoutMultiplier)}</dd>
					</div>
					<div class="row total">
						<dt>{words.totalWin}</dt>
						<dd class="win">
							{numberToCurrencyString(stateBet.betAmount * stateReplay.payoutMultiplier)}
						</dd>
					</div>
				</div>
			</dl>

			<BaseButtonWrap type="full-width">
				<Button data-test="replay-start-button" onclick={start}>
					<ButtonFace variant="primary" height="3.25rem" fontSize="1.35rem">
						<span class="play" aria-hidden="true">▶</span>
						{words.start}
					</ButtonFace>
				</Button>
			</BaseButtonWrap>

			<p class="note">{words.note}</p>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.badge {
		padding: 0.3rem 1.1rem;
		border-radius: 999px;
		background: var(--ui-accent-bg, white);
		color: var(--ui-accent-text, black);
		font-family: var(--ui-font-heading, inherit);
		font-weight: var(--ui-heading-weight, 800);
		font-size: 0.85rem;
		letter-spacing: 0.2em;
	}

	.numbers {
		box-sizing: border-box;
		width: min(26rem, 80vw);
		margin: 0;
		padding: 0.75rem;
		border-radius: var(--ui-control-radius, 0.625rem);
		background: rgba(0, 0, 0, 0.3);
		border: var(--ui-control-border, none);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.55rem 0.75rem;

		dt {
			color: var(--ui-text-muted, white);
		}

		dd {
			margin: 0;
			color: var(--ui-price, white);
			font-family: var(--ui-font-heading, inherit);
			font-weight: var(--ui-heading-weight, 800);
			font-size: 1.1rem;
			text-align: right;
		}

		/* the totals stand out on a lighter strip, a little bigger */
		&.total {
			margin: 0.25rem 0;
			padding: 0.8rem 0.75rem;
			border-radius: calc(var(--ui-control-radius, 0.625rem) * 0.8);
			background: rgba(255, 255, 255, 0.07);

			dd {
				font-size: 1.4rem;
			}
		}

		.mode {
			color: var(--ui-accent-color, white);
			letter-spacing: 0.06em;
		}

		.win {
			color: var(--ui-win, #3ddc84);
		}
	}

	hr {
		margin: 0.5rem 0.75rem;
		border: none;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
	}

	.won {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
	}

	/* Short screens (a phone held sideways, the small popout): no title or note, and what it cost
	   beside what it won, so the whole card and its button fit. */
	@media (max-height: 640px) {
		.title,
		.note {
			display: none;
		}

		.numbers {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.75rem;
			width: min(36rem, 88vw);
			padding: 0.5rem;
		}

		.won {
			margin-top: 0;
			padding-top: 0;
			padding-left: 0.75rem;
			border-top: none;
			border-left: 1px solid rgba(255, 255, 255, 0.12);
		}

		.row {
			padding: 0.3rem 0.5rem;

			dd {
				font-size: 1rem;
			}

			&.total {
				margin: 0.15rem 0;
				padding: 0.45rem 0.5rem;

				dd {
					font-size: 1.15rem;
				}
			}
		}

		hr {
			margin: 0.25rem 0.5rem;
		}
	}

	.play {
		margin-right: 0.5rem;
		font-size: 0.8em;
	}

	.note {
		margin: 0;
		max-width: min(26rem, 80vw);
		text-align: center;
		font-size: 0.85rem;
		color: var(--ui-text-muted, white);
		opacity: 0.8;
	}
</style>
