<script lang="ts">
	import { stateUrlDerived } from 'state-shared';

	import assets from '../game/assets';
	import config from '../game/config';
	import {
		BONUS_NAME,
		BONUS_SCATTER_COUNT,
		FREE_SPINS_AWARDED,
		FREE_SPINS_ADDED,
		FREE_SPIN_WILD_MULTIPLIERS,
		FEATURE_SPIN_WILD_MULTIPLIERS,
	} from '../game/constants';
	import {
		BONUS_COST,
		SUPER_COST,
		MYSTERY_COST,
		FEATURE_COST,
		BOOSTER_COST,
		MYSTERY_CHANCES,
		BOOSTER_MODE,
		FEATURE_MODE,
	} from '../game/betModes';
	import type { BonusType } from '../game/types';
	import BonusCardArt from './BonusCardArt.svelte';

	// The game rules (the menu's info button), which hold the pay table too: symbol wins, the wild,
	// free spins, paylines, the booster, feature spin and bonuses, RTP, the controls and the disclaimer.
	// Soft cards on the black panel: the symbols as tiles with their wins under them (5 of a kind
	// picked out in the pink accent), the wild and free spins side by side, and the rest in cards
	// with pink titles.

	// social mode (social=true) can't use words like bet, buy or pay
	const words = stateUrlDerived.social()
		? {
				bet: 'play amount',
				payline: 'win line',
				paylines: 'win lines',
				buyBonus: 'PLAY BONUS',
				bonusBuys: 'bonuses',
				buyIt: 'start it',
			}
		: {
				bet: 'bet',
				payline: 'payline',
				paylines: 'paylines',
				buyBonus: 'BUY BONUS',
				bonusBuys: 'bonus buys',
				buyIt: 'buy it',
			};

	type PayingSymbol = Exclude<keyof typeof config.symbols, 'S'>;

	// highest paying first
	const PAYING_SYMBOLS: PayingSymbol[] = [
		'W',
		'H1',
		'H2',
		'H4',
		'H3',
		'L1',
		'L2',
		'L3',
		'L4',
		'L5',
	];
	const SYMBOL_IMAGES: Record<PayingSymbol, string> = {
		W: assets.symbolW.src,
		H1: assets.symbolH1.src,
		H2: assets.symbolH2.src,
		H3: assets.symbolH3.src,
		H4: assets.symbolH4.src,
		L1: assets.symbolL1.src,
		L2: assets.symbolL2.src,
		L3: assets.symbolL3.src,
		L4: assets.symbolL4.src,
		L5: assets.symbolL5.src,
	};

	// [count, pay as a multiple of the bet], 5 of a kind first
	const getPays = (symbol: PayingSymbol) =>
		config.symbols[symbol].paytable.map((entry) => Object.entries(entry)[0] as [string, number]);

	const BONUS_TYPES: BonusType[] = ['normal', 'super', 'mythic'];
	const bonusTitle = (type: BonusType) =>
		[BONUS_NAME[type], 'FREE SPINS'].filter(Boolean).join(' ');

	const paylines = Object.values(config.paylines);
	const ROWS = config.numRows[0];

	const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
	const chance = (value: number) => `${Math.round(value * 100)}%`;
	const times = (value: number) => `${value.toLocaleString('en-US')}x`;
	// "a, b and c"
	const all = (items: string[]) =>
		`${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
	// 5 FS symbols never land during free spins in the published books (the free spin reels have
	// too few, about 1 in 14 million spins), so the rules don't offer them
	const MOST_RETRIGGER_SCATTERS = 4;
	// "2 FS symbols add 3 spins, 3 FS symbols add 5 and 4 FS symbols add 8"
	const retriggers = all(
		Object.entries(FREE_SPINS_ADDED)
			.filter(([count]) => Number(count) <= MOST_RETRIGGER_SCATTERS)
			.map(
				([count, spins], index) => `${count} FS symbols add ${spins}${index === 0 ? ' spins' : ''}`,
			),
	);
	const spinsFor = (type: BonusType) => FREE_SPINS_AWARDED[BONUS_SCATTER_COUNT[type]];

	// every way to play, with its cost, RTP and max win
	const MODES = [
		{ name: 'Base game', cost: 1, mode: config.betModes.base },
		{ name: 'Booster', cost: BOOSTER_COST, mode: config.betModes.ante },
		{ name: 'Bonus', cost: BONUS_COST, mode: config.betModes.bonus },
		{ name: 'Super bonus', cost: SUPER_COST, mode: config.betModes.super },
		{ name: 'Mystery bonus', cost: MYSTERY_COST, mode: config.betModes.mystery },
		{ name: 'Feature spin', cost: FEATURE_COST, mode: config.betModes.feature },
	];

	const minMultiplier = Math.min(...FREE_SPIN_WILD_MULTIPLIERS);
	const maxMultiplier = Math.max(...FREE_SPIN_WILD_MULTIPLIERS);
	const featureMinMultiplier = Math.min(...FEATURE_SPIN_WILD_MULTIPLIERS);
	const featureMaxMultiplier = Math.max(...FEATURE_SPIN_WILD_MULTIPLIERS);
	const maxWin = Math.max(...MODES.map(({ mode }) => mode.max_win));

	// the art on the super and mythic free spins, booster and feature spin cards, as on the bonus
	// menu's cards (see BonusCardArt): the size of one of three fanned FS symbols, in rem
	const CARD_ART_SIZE = 2.8;
</script>

<div class="game-info">
	<p class="lead">
		Wins for 3, 4 or 5 of a kind on a {words.payline}, as a multiple of the {words.bet}.
	</p>

	<div class="symbols">
		{#each PAYING_SYMBOLS as symbol}
			<div class="card tile">
				<div class="art"><img src={SYMBOL_IMAGES[symbol]} alt={symbol} /></div>
				<dl class="pays">
					{#each getPays(symbol) as [count, pay], index}
						<div class="pay" class:top={index === 0}>
							<dt>{count}</dt>
							<dd>{times(pay)}</dd>
						</div>
					{/each}
				</dl>
			</div>
		{/each}
	</div>

	<div class="features">
		<div class="card feature">
			<img src={assets.bigWild.src} alt="Big wild" class="feature-art tall" />
			<div class="feature-text">
				<h3>Wild</h3>
				<p>
					The WILD stands in for every symbol except FS. A WILD that lands anywhere on a reel turns
					the whole reel into a BIG WILD, and every BIG WILD throws 0 to 3 extra WILDs onto the
					other reels. Thrown WILDs stay where they land: they don't turn their reel into a BIG WILD
					and don't throw more WILDs. Outside FREE SPINS and the FEATURE SPIN, WILDs carry no
					multiplier.
				</p>
			</div>
		</div>
		<div class="card feature">
			<img src={assets.symbolS.src} alt="FS" class="feature-art" />
			<div class="feature-text">
				<h3>Free spins</h3>
				<p>
					3, 4 or 5 FS symbols anywhere on the reels start FREE SPINS. FS symbols have no line wins
					of their own, and one covered by a BIG WILD doesn't count.
				</p>
				<div class="chips">
					{#each BONUS_TYPES as type}
						{@const scatters = BONUS_SCATTER_COUNT[type]}
						<span class="chip">
							<strong>{scatters} &rarr; {FREE_SPINS_AWARDED[scatters]} spins</strong>
							<span>{bonusTitle(type)}</span>
						</span>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<section>
		<h2>During free spins</h2>
		<div class="card text">
			<p>
				During FREE SPINS, more FS symbols add more spins: {retriggers}. Every WILD carries a
				{minMultiplier}x to {maxMultiplier}x multiplier; when several WILDs land on one reel, its
				BIG WILD takes the highest of their multipliers. The multipliers of the BIG WILDs that are
				part of a win are added together and multiply that win. Thrown WILDs carry no multiplier.
			</p>
		</div>
		<div class="pair">
			<div class="card text with-art">
				<div class="card-art">
					<BonusCardArt scatters={BONUS_SCATTER_COUNT.super} size={CARD_ART_SIZE} />
				</div>
				<div class="feature-text">
					<h3>SUPER FREE SPINS</h3>
					<p>
						Every BIG WILD stays: each spin it moves one reel to the left, keeps its multiplier and
						throws 0 to 3 WILDs again, until it moves left from the first reel. The reel it moves
						onto doesn't spin, so nothing lands there; the reel it leaves spins as usual and can
						land a new BIG WILD.
					</p>
				</div>
			</div>
			<div class="card text with-art">
				<div class="card-art">
					<BonusCardArt scatters={BONUS_SCATTER_COUNT.mythic} size={CARD_ART_SIZE} />
				</div>
				<div class="feature-text">
					<h3>MYTHIC FREE SPINS</h3>
					<p>
						BIG WILDs stay and move the same way as in SUPER FREE SPINS, and each time a BIG WILD
						moves one reel to the left, its multiplier doubles.
					</p>
				</div>
			</div>
		</div>
	</section>

	<section>
		<h2>{paylines.length} {words.paylines}</h2>
		<p class="note">
			All {paylines.length}
			{words.paylines} are always played. Wins count from left to right on adjacent reels, starting from
			the leftmost reel. WILDs stand in for the symbol after them, so a line counts all the way through.
			WILDs at the start of a line win as WILDs when the line is only WILDs, or when the next symbol
			is an FS symbol. Wins on different {words.paylines} are added together.
		</p>
		<div class="paylines">
			{#each paylines as line, index}
				<div class="card payline">
					<span class="number">{index + 1}</span>
					<div class="grid" style:--reels={line.length}>
						{#each { length: ROWS } as _, row}
							{#each line as lineRow}
								<span class="cell" class:on={lineRow === row}></span>
							{/each}
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Booster, feature spin and {words.bonusBuys}</h2>
		<div class="pair">
			<div class="card text with-art">
				<div class="card-art"><BonusCardArt mode={BOOSTER_MODE} size={CARD_ART_SIZE} /></div>
				<div class="feature-text">
					<h3>BOOSTER</h3>
					<p>Each spin costs {BOOSTER_COST}x the {words.bet} and FREE SPINS start more often.</p>
				</div>
			</div>
			<div class="card text with-art">
				<div class="card-art"><BonusCardArt mode={FEATURE_MODE} size={CARD_ART_SIZE} /></div>
				<div class="feature-text">
					<h3>FEATURE SPIN</h3>
					<p>
						Switched on in the {words.buyBonus} menu. Each spin costs {FEATURE_COST}x the {words.bet}
						and has at least one BIG WILD that throws 1 to 3 extra WILDs onto the other reels. Every
						BIG WILD carries a {featureMinMultiplier}x to {featureMaxMultiplier}x multiplier, and
						the multipliers of the BIG WILDs that are part of a win are added together and multiply
						that win. Thrown WILDs carry no multiplier. A FEATURE SPIN can't start FREE SPINS.
					</p>
				</div>
			</div>
		</div>
		<div class="card text">
			<p>
				The BOOSTER and the FEATURE SPIN stay on until they are turned off, or until a bonus from
				the
				{words.buyBonus} menu starts, which turns them off. Only one of them can be on at a time.
			</p>
		</div>
		<div class="card text">
			<h3>{words.buyBonus}</h3>
			<p>
				Go straight to FREE SPINS. BONUS ({BONUS_COST}x the {words.bet}) gives FREE SPINS ({spinsFor(
					'normal',
				)} spins). SUPER BONUS ({SUPER_COST}x) gives SUPER FREE SPINS ({spinsFor('super')} spins). MYSTERY
				BONUS ({MYSTERY_COST}x) gives FREE SPINS with a
				{chance(MYSTERY_CHANCES.normal)} chance, SUPER FREE SPINS with
				{chance(MYSTERY_CHANCES.super)} and MYTHIC FREE SPINS ({spinsFor('mythic')} spins) with
				{chance(MYSTERY_CHANCES.mythic)}.
			</p>
		</div>
	</section>

	<section>
		<h2>Return to player</h2>
		<table class="card modes">
			<thead>
				<tr><th>Mode</th><th>Cost</th><th>RTP</th><th>Max win</th></tr>
			</thead>
			<tbody>
				{#each MODES as { name, cost, mode }}
					<tr>
						<td>{name}</td>
						<td>{times(cost)}</td>
						<td>{percent(mode.rtp)}</td>
						<td>{times(mode.max_win)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="note">
			Wins in a round are capped at {times(maxWin)} the {words.bet}; the round ends once it reaches
			that.
		</p>
	</section>

	<section>
		<h2>Controls</h2>
		<dl class="card controls">
			<div>
				<dt>SPIN</dt>
				<dd>
					The big round button with two arrows starts a spin at the current {words.bet}. While the
					reels spin it shows a square: press it again, or tap the reels, to stop them sooner.
					During autoplay it stops autoplay. The space bar does the same as this button.
				</dd>
			</div>
			<div>
				<dt>{words.bet.toUpperCase()} UP and DOWN</dt>
				<dd>
					On wide, square and tall screens (a phone held upright), the up and down arrows beside the
					{words.bet} raise or lower it one level at a time. On small wide screens (a phone held sideways,
					or a small window), the &minus; and + buttons do the same.
				</dd>
			</div>
			<div>
				<dt>{words.bet.toUpperCase()}</dt>
				<dd>
					Shows the {words.bet} of the next spin; press it to pick a {words.bet} from the menu. While
					the BOOSTER or the FEATURE SPIN is on, it reads BOOSTER or FEATURE SPIN and shows what each
					spin costs.
				</dd>
			</div>
			<div>
				<dt>AUTOPLAY</dt>
				<dd>
					The circular arrow button opens the autoplay settings: choose the number of spins and,
					under ADVANCED, a loss limit and a single win limit, then start. ADVANCED can't be opened
					while the BOOSTER or the FEATURE SPIN is on, and switching either on clears both limits.
					While autoplay runs, the button shows the spins left; press it again to stop autoplay.
				</dd>
			</div>
			<div>
				<dt>TURBO</dt>
				<dd>The lightning button turns faster spins and animations on and off.</dd>
			</div>
			<div>
				<dt>MENU</dt>
				<dd>
					The button with three lines opens these rules. When watching a replay, it opens the menu
					instead: the i button opens these rules, and the close button (X) closes the menu. The X
					at the top right of a window, or the Escape key, closes the window.
				</dd>
			</div>
			<div>
				<dt>SOUND</dt>
				<dd>
					The music note and speaker buttons next to the menu button turn music and sound effects on
					or off. On desktop, holding the pointer over either button opens a slider above it that
					sets the music or sound effect volume. When watching a replay, the sound button in the
					menu turns all sound on or off.
				</dd>
			</div>
			<div>
				<dt>{words.buyBonus}</dt>
				<dd>
					The round black button with the red S, right of the spin button (at the bottom right on
					tall screens and on small wide screens), opens the bonus menu. It shows the balance and
					the {words.bet}, with &minus; and + to change the {words.bet} the prices are worked out from.
					Pick a bonus and check what it costs, then press CONFIRM to
					{words.buyIt}, or CANCEL to go back to the bonus menu; the BOOSTER and FEATURE SPIN cards
					switch them on the same way, and while one is on, its card's DISABLE button switches it
					off. The button is greyed out while a round plays, and turns white while the BOOSTER or
					the FEATURE SPIN is on.
				</dd>
			</div>
			<div>
				<dt>BOOSTER</dt>
				<dd>
					The BOOSTER card in the bonus menu turns the booster on or off. Each spin costs
					{BOOSTER_COST}x the {words.bet} while it is on.
				</dd>
			</div>
			<div>
				<dt>FEATURE SPIN</dt>
				<dd>
					The FEATURE SPIN card in the bonus menu turns feature spins on or off. Each spin costs
					{FEATURE_COST}x the {words.bet} while it is on.
				</dd>
			</div>
			<div>
				<dt>BALANCE and WIN</dt>
				<dd>Show the balance and the win of the current round.</dd>
			</div>
			<div>
				<dt>ARROW</dt>
				<dd>
					On tall screens (like a phone held upright), the controls slide down out of the way during
					FREE SPINS; the arrow button brings them back up, or slides them down again.
				</dd>
			</div>
			<div>
				<dt>PRESS ANYWHERE TO CONTINUE</dt>
				<dd>
					On the start screen and the FREE SPINS screens, press anywhere or the space bar to
					continue. While the FREE SPINS total is counting up, the first press jumps to the final
					amount.
				</dd>
			</div>
			<div>
				<dt>PLAY and REPLAY</dt>
				<dd>
					When watching a replay of a round, PLAY starts the round; once it has played, REPLAY plays
					it again from the start. The replay shows the round's {words.bet} and, for a mode that costs
					more than the {words.bet}, REAL COST with the mode's multiplier and what the round cost.
				</dd>
			</div>
		</dl>
	</section>

	<section>
		<h2>Disclaimer</h2>
		<p class="note">
			Malfunction voids all wins and plays. A consistent internet connection is required. In the
			event of a disconnection, reload the game to finish any uncompleted rounds. The expected
			return is calculated over many plays. The game display is not representative of any physical
			device and is for illustrative purposes only. Winnings are settled according to the amount
			received from the Remote Game Server and not from events within the web browser. TM and &copy;
			2026 Engine.
		</p>
	</section>
</div>

<style lang="scss">
	.game-info {
		/* warm near-whites and greys on the black panel, and a pink accent for the cat theme */
		--text: #f6f1f2;
		--body: #c7bdbf;
		--soft: #cfc6c8;
		--muted: #8f8486;
		--dim: #7d7274;
		--line: #1e1e1e;
		--chip: #241d1e;
		--accent: #ff6f69;
		--accent-bg: rgba(248, 75, 75, 0.16);

		display: flex;
		flex-direction: column;
		gap: 2.75rem;
		width: min(52rem, 100%);
		color: var(--text);
		text-align: left;
	}

	section {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	h2 {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 800;
		letter-spacing: 0.02em;
		text-align: center;
	}

	h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--accent);
	}

	p {
		margin: 0;
		line-height: 1.55;
		color: var(--body);
		text-wrap: pretty;
	}

	.lead {
		margin-top: -0.25rem;
		font-size: 0.95rem;
		color: var(--muted);
		text-align: center;
	}

	.note {
		color: var(--muted);
		text-align: center;
	}

	.card {
		box-sizing: border-box;
		background: #000;
		border: 1px solid var(--line);
		border-radius: 1.25rem;
	}

	/* the symbols, five a row, each its art over its wins */
	.symbols {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.875rem;
		margin-top: -1.25rem;
	}

	.tile {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		padding: 0.875rem 0.875rem 1rem;
	}

	.art {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 6.875rem;

		img {
			max-width: 100%;
			max-height: 100%;
			object-fit: contain;
		}
	}

	.pays {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin: 0;
	}

	.pay {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.3rem 0.625rem;

		dt {
			font-size: 0.8rem;
			color: var(--dim);
		}

		dd {
			margin: 0;
			font-size: 0.95rem;
			font-weight: 600;
			white-space: nowrap;
		}

		&:last-child dd {
			color: var(--soft);
		}

		/* 5 of a kind, picked out */
		&.top {
			border-radius: 0.55rem;
			background: var(--accent-bg);

			dt,
			dd {
				color: var(--accent);
			}

			dd {
				font-weight: 700;
			}
		}
	}

	/* the wild and free spins, side by side */
	.features,
	.pair {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.875rem;
	}

	.feature {
		display: flex;
		align-items: flex-start;
		gap: 1.125rem;
		padding: 1.25rem;
	}

	.feature-art {
		flex: none;
		width: 5rem;
		height: 5rem;
		object-fit: contain;

		&.tall {
			height: 8.125rem;
		}
	}

	.feature-text,
	.text {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.text {
		padding: 1.25rem;
	}

	/* a card with its art on the left, as the wild and free spins cards */
	.with-art {
		flex-direction: row;
		align-items: flex-start;
		gap: 1.125rem;
	}

	.card-art {
		flex: none;
		width: 6rem;
		height: 5rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: 0.25rem;
	}

	.chip {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.35rem 0.625rem;
		border-radius: 0.5rem;
		background: var(--chip);
		font-size: 0.8rem;

		strong {
			font-size: 0.85rem;
			font-weight: 600;
		}

		span {
			color: var(--muted);
			font-size: 0.7rem;
		}
	}

	/* seven a row (the 14 in two rows) */
	.paylines {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.625rem;
	}

	.payline {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		padding: 0.5rem 0.5rem 0.6rem;
		border-radius: 0.875rem;
	}

	.number {
		font-size: 0.8rem;
		color: var(--dim);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(var(--reels), 1fr);
		gap: 2px;
		width: 100%;
	}

	.cell {
		aspect-ratio: 1;
		border-radius: 2px;
		background: var(--line);

		&.on {
			background: var(--accent);
		}
	}

	.modes {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		overflow: hidden;

		th,
		td {
			padding: 0.6rem 1rem;
			text-align: right;
		}

		th:first-child,
		td:first-child {
			text-align: left;
		}

		th {
			color: var(--dim);
			font-size: 0.85rem;
			font-weight: 600;
		}

		td {
			border-top: 1px solid var(--line);
			color: var(--body);
		}

		td:first-child {
			color: var(--text);
		}
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 0;
		padding: 1.25rem;

		div {
			display: grid;
			grid-template-columns: 9rem 1fr;
			gap: 0.875rem;
		}

		dt {
			font-weight: 700;
		}

		dd {
			margin: 0;
			line-height: 1.55;
			color: var(--body);
		}
	}

	/* narrower screens: fewer symbols a row, one card a row */
	@media (max-width: 50rem) {
		.symbols {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.features,
		.pair {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 30rem) {
		.symbols {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		/* seven a row would leave the lines too small to read on a phone */
		.paylines {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}

		.art {
			height: 5rem;
		}

		.feature,
		.with-art {
			flex-direction: column;
			align-items: center;
		}

		.controls div {
			grid-template-columns: 1fr;
			gap: 0.1rem;
		}
	}
</style>
