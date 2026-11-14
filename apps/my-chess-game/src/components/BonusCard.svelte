<script lang="ts">
	import type { BetModeData } from 'state-shared';
	import { createBonusCard } from 'components-ui-html';

	import assets from '../game/assets';
	import { BONUS_MODE, CHEAT_MODE, SUPER_MODE } from '../game/betModes';
	import { FREE_SPINS } from '../game/constants';
	import SignText from './SignText.svelte';

	type Props = {
		// the bonus's bet mode, followed by its levels (the modes whose parent it is; this game has none)
		levels: BetModeData[];
		// another card has levels: unused, none has
		levelRow: boolean;
	};

	const props: Props = $props();
	const card = createBonusCard(() => props.levels);
	const mode = $derived(card.betModeData.mode);

	// A bonus in the buy bonus menu as a dark box seen from the front and a little above: its top an ink
	// panel with the bonus's piece, its name and price in carved lettering (SignText), what it does, and
	// a band across its foot to press; under it the box's front side, the band's colour darker.
	// Lettering as the cluster game's: Germania One for the names, prices, tags and the band, the menu's
	// own font for the small print.
	// Each in its own colour (its edge, its band, its box's side), cheapest to dearest: DUMB MODE in the
	// board's blue (calm, a beginner), CHEATER MODE in the check's red, the CHECKMATE BONUS in bronze and
	// the SUPER BONUS in the golden king's gold, a faint glow round it and BEST OF THE BEST on a tab over
	// its top.
	// - the modes switched on: the piece in cream outline (the pawn, the queen), the price cream, ACTIVATE
	// - the bought bonuses: a tag with their free spins, the piece in their colour (the rook, the golden
	//   king), the price too, BUY
	// - a mode that's on says so on a red tab over its top (its band then switches it off)
	const LOOKS: Record<string, { piece: string; filter: string }> = {
		// the white pieces turned over (invert): their black outline cream on the ink, their fill dark
		[CHEAT_MODE]: { piece: assets.wQ.src, filter: 'invert(1) sepia(0.35) brightness(0.88)' },
		// the white rook turned bronze (darkened first, so sepia has some colour to work with), its
		// outline staying dark
		[BONUS_MODE]: { piece: assets.wR.src, filter: 'brightness(0.66) sepia(1) saturate(3.4) hue-rotate(-16deg)' },
		// the golden king as it is
		[SUPER_MODE]: { piece: assets.gK.src, filter: 'none' },
	};
	// DUMB MODE (and anything else): the pawn
	const look = $derived(LOOKS[mode] ?? { piece: assets.wP.src, filter: LOOKS[CHEAT_MODE].filter });
	const best = $derived(mode === SUPER_MODE);
	// the card's colour, and its price's
	const TONES: Record<string, 'blue' | 'red' | 'bronze' | 'gold'> = {
		[CHEAT_MODE]: 'red',
		[BONUS_MODE]: 'bronze',
		[SUPER_MODE]: 'gold',
	};
	const tone = $derived(TONES[mode] ?? 'blue');
	const priceColour = $derived(tone === 'bronze' ? 'bronze' : tone === 'gold' ? 'gold' : 'cream');
	const tab = $derived(card.isActivate && card.active ? 'ACTIVE' : best ? 'BEST OF THE BEST' : undefined);

	// longer prices, like MX$1,000,000.00, get smaller so they stay on the card
	const PRICE_FONT_SIZE_REM = 2.3;
	const PRICE_FULL_SIZE_LENGTH = 8;
	const priceFontSize = $derived(
		`${PRICE_FONT_SIZE_REM * Math.min(1, PRICE_FULL_SIZE_LENGTH / card.priceText.length)}rem`,
	);
</script>

<!-- the row stretches every card to the tallest: each sits at the foot of its room, so the shorter
     ones (the modes switched on) line up with the bought ones along the bottom -->
<div class="slot">
	<div
		class="card {tone}"
		class:on={card.isActivate && card.active}
		class:unavailable={card.disabled}
	>
		{#if tab}
			<div class="tab">{tab}</div>
		{/if}

		<div class="face">
			{#if !card.isActivate}
				<div class="spins">{FREE_SPINS} FREE SPINS</div>
			{/if}
			<img class="piece" src={look.piece} alt="" style:filter={look.filter} />
			<h3 class="title"><SignText text={card.betModeData.text.title} size="1.6rem" /></h3>
			<p class="description">{card.betModeData.text.description}</p>
			<div class="price">
				<SignText text={card.priceText} colour={priceColour} size={priceFontSize} />
			</div>
		</div>

		<button class="press" onclick={card.press} disabled={card.disabled}>{card.buttonLabel}</button>
	</div>
</div>

<style lang="scss">
	.slot {
		--ink: #241c17;
		--cream: #f7f2e6;
		--small-print: #c9bfae;
		--blue: #3f6f96;
		--red: #8b2e22;
		--bronze: #b5702e;
		--gold: #f0c75a;
		/* what the box's sides are darkened with: the table's dark brown, so they stay warm (black
		   turned the gold olive) */
		--floor: #2a1309;

		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		/* (the row stretches it, its height left auto) */
		align-self: stretch;
		width: 15rem;
		/* room for the box's front side and its shadow below, and the tab above */
		padding: 1rem 0 1.6rem;
	}

	/* the carved lettering, plain (the tags and the band) */
	.tab,
	.spins,
	.press {
		font-family: 'Germania One', serif;
		font-weight: normal;
		letter-spacing: 0.16em;
	}

	.card {
		/* its colour (tone, below): its edge, its band and its tags; the band's lettering cream on the
		   dark colours, ink on the light ones */
		--accent: var(--tone);
		--band: var(--tone);
		--band-text: var(--cream);
		--tag: var(--tone);

		/* the box's front side under the band: the band's colour darker, deeper towards the floor */
		--side: color-mix(in srgb, var(--band) 58%, var(--floor));
		--side-deep: color-mix(in srgb, var(--band) 36%, var(--floor));

		position: relative;
		display: flex;
		flex-direction: column;
		border: 0.16rem solid var(--accent);
		background: var(--ink);
		transition: opacity 200ms ease;

		/* the front side, under the border, with a faint light along its top edge and a soft shadow on
		   the floor below */
		&::after {
			content: '';
			position: absolute;
			left: -0.16rem;
			right: -0.16rem;
			top: calc(100% + 0.16rem);
			height: 0.8rem;
			background: linear-gradient(180deg, var(--side) 0%, var(--side-deep) 100%);
			box-shadow:
				inset 0 0.08rem 0 rgba(255, 255, 255, 0.14),
				0 0.45rem 0.7rem rgba(0, 0, 0, 0.5);
		}

		&.blue {
			--tone: var(--blue);
		}

		&.red {
			--tone: var(--red);
		}

		&.bronze {
			--tone: var(--bronze);
			--band-text: var(--ink);
			--tag: #e8a868;
		}

		&.gold {
			--tone: var(--gold);
			--band-text: var(--ink);
			box-shadow: 0 0 1.4rem rgba(240, 199, 90, 0.3);
		}

		&.unavailable {
			opacity: 0.55;
		}
	}

	/* over its top edge, in the edge's colour: BEST OF THE BEST, or ACTIVE in red */
	.tab {
		position: absolute;
		top: -0.85rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.25rem 0.9rem;
		background: var(--accent);
		color: var(--ink);
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.on .tab {
		background: var(--red);
		color: var(--cream);
	}

	.face {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1.6rem 1rem 1.2rem;
		text-align: center;
	}

	.spins {
		margin-bottom: 1rem;
		padding: 0.25rem 0.7rem;
		border: 0.08rem solid var(--accent);
		color: var(--tag);
		font-size: 0.8rem;
	}

	.piece {
		width: 4.4rem;
		height: 4.4rem;
		object-fit: contain;
	}

	/* room for two lines (CHECKMATE BONUS wraps), a one-line name at its foot by the small print, so
	   every card is as tall as the others of its kind */
	.title {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		min-height: 3.4rem;
		margin: 0.6rem 0 0;
		font-size: inherit;
		text-wrap: balance;
	}

	/* room for two lines */
	.description {
		margin: 0.6rem 0 0;
		min-height: 2.3rem;
		color: var(--small-print);
		font-size: 0.78rem;
		line-height: 1.4;
		text-wrap: balance;
	}

	.price {
		margin-top: 0.8rem;
		white-space: nowrap;
	}

	.press {
		padding: 1rem 0.5rem;
		border: 0;
		border-top: 0.16rem solid var(--accent);
		background: var(--band);
		color: var(--band-text);
		font-size: 1.15rem;
		cursor: pointer;
		transition: filter 150ms ease;

		&:hover:not(:disabled) {
			filter: brightness(1.12);
		}

		&:disabled {
			cursor: default;
		}
	}
</style>
