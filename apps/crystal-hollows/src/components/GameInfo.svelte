<script lang="ts">
	import { stateReplayDerived, stateUrlDerived } from 'state-shared';

	import assets from '../game/assets';
	import config from '../game/config';
	import { TALL_WILD } from '../game/constants';
	import {
		BOOSTER_COST,
		BONUS_COST,
		SUPER_COST,
		MYSTERY_COST,
		MYSTERY_CHANCE,
		BONUS_WILD_START,
		SUPER_WILD_START,
	} from '../game/betModes';

	// The game rules (the menu's info button), which hold the pay table too (uiTheme's hidePayTable): the
	// symbol wins, the bat wild and free spins, the paylines, the bonus buy, RTP, the controls and the
	// disclaimer. Laid out as Cat Hunt's (apps/my-game GameInfo): soft cards on the black panel, the
	// premiums in one row and the letters in the next with their wins under them (as the pay table picture
	// the user sent, 2026-11-16), 5 of a kind picked out in the crystals' icy blue.

	// the words social mode uses instead of bet, buy, pay and cost
	const words = stateUrlDerived.socialWords()
		? {
				bet: 'play amount',
				payline: 'win line',
				paylines: 'win lines',
				buyBonus: 'GET BONUS',
				buyIt: 'start it',
				costs: 'is played for',
				cost: 'Played for',
			}
		: {
				bet: 'bet',
				payline: 'payline',
				paylines: 'paylines',
				buyBonus: 'BUY BONUS',
				buyIt: 'buy it',
				costs: 'costs',
				cost: 'Cost',
			};
	// the replay card's names for the round's numbers (Engine's words in social mode)
	const replayWords = stateReplayDerived.words();

	type PayingSymbol = Exclude<keyof typeof config.symbols, 'S'>;

	// best paying first: the premiums, then the stone letters
	const PREMIUMS: PayingSymbol[] = ['H1', 'H2', 'H3', 'H4'];
	const LETTERS: PayingSymbol[] = ['L1', 'L2', 'L3', 'L4'];
	const SYMBOL_IMAGES: Record<PayingSymbol, string> = {
		W: assets.symbolWild.src,
		H1: assets.symbolCrystal.src,
		H2: assets.symbolBerries.src,
		H3: assets.symbolStalactite.src,
		H4: assets.symbolMushroom.src,
		L1: assets.symbolA.src,
		L2: assets.symbolK.src,
		L3: assets.symbolQ.src,
		L4: assets.symbolJ.src,
	};
	const SYMBOL_NAMES: Record<PayingSymbol, string> = {
		W: 'WILD',
		H1: 'Crystal',
		H2: 'Berries',
		H3: 'Stalactite',
		H4: 'Mushroom',
		L1: 'A',
		L2: 'K',
		L3: 'Q',
		L4: 'J',
	};

	// [count, pay as a multiple of the bet], 5 of a kind first
	const getPays = (symbol: PayingSymbol) =>
		config.symbols[symbol].paytable.map((entry) => Object.entries(entry)[0] as [string, number]);

	// FREE SPINS for 3, 4 or 5 FS symbols, and the spins more of them add during FREE SPINS: the math's
	// (math-sdk/games/crystal_hollows game_config.py freespin_triggers)
	const FREE_SPINS_AWARDED: Record<number, number> = { 3: 5, 4: 7, 5: 10 };
	const FREE_SPINS_ADDED: Record<number, number> = { 2: 3, 3: 5, 4: 8, 5: 12 };

	const paylines = Object.values(config.paylines);
	const ROWS = config.numRows[0];

	const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
	const times = (value: number) => `${value.toLocaleString('en-US')}x`;
	// "a, b and c"
	const all = (items: string[]) =>
		`${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
	// "2 FS symbols add 3 spins, 3 FS symbols add 5, ..."
	const retriggers = all(
		Object.entries(FREE_SPINS_ADDED).map(
			([count, spins], index) => `${count} FS symbols add ${spins}${index === 0 ? ' spins' : ''}`,
		),
	);

	// every way to play, with its cost, RTP and max win
	const MODES = [
		{ name: 'Base game', mode: config.betModes.base },
		{ name: 'Booster', mode: config.betModes.booster },
		{ name: 'Bonus', mode: config.betModes.bonus },
		{ name: 'Super bonus', mode: config.betModes.super },
		{ name: 'Mystery bonus', mode: config.betModes.mystery },
	];
	const MYSTERY_PERCENT = Math.round(MYSTERY_CHANCE * 100);
	const maxWin = Math.max(...MODES.map(({ mode }) => mode.max_win));
	const WILD_START = TALL_WILD.multiplier.start;
	const BASE_MULTIPLIERS = Object.keys(TALL_WILD.multiplier.base).map(Number);
	const BASE_MIN = Math.min(...BASE_MULTIPLIERS);
	const BASE_MAX = Math.max(...BASE_MULTIPLIERS).toLocaleString('en-US');
</script>

{#snippet symbolTile(symbol: PayingSymbol)}
	<div class="card tile">
		<div class="art"><img src={SYMBOL_IMAGES[symbol]} alt={SYMBOL_NAMES[symbol]} /></div>
		<dl class="pays">
			{#each getPays(symbol) as [count, pay], index}
				<div class="pay" class:top={index === 0}>
					<dt>{count}</dt>
					<dd>{times(pay)}</dd>
				</div>
			{/each}
		</dl>
	</div>
{/snippet}

<div class="game-info">
	<p class="lead">
		Wins for 3, 4 or 5 of a kind on a {words.payline}, as a multiple of the {words.bet}.
	</p>

	<div class="symbols">
		{#each PREMIUMS as symbol}
			{@render symbolTile(symbol)}
		{/each}
		{#each LETTERS as symbol}
			{@render symbolTile(symbol)}
		{/each}
	</div>

	<div class="features">
		<div class="card feature">
			<img src={assets.wildTall.src} alt="WILD" class="feature-art tall" />
			<div class="feature-text">
				<h3>Bat wild</h3>
				<p>
					The bat in the thorn ring is the WILD: it stands in for every symbol except FS. A bat that
					lands anywhere on a reel grows into a WILD that fills the whole reel.
				</p>
				<div class="chips">
					{#each getPays('W') as [count, pay]}
						<span class="chip">
							<strong>{times(pay)}</strong>
							<span>{count} WILDs on a {words.payline}</span>
						</span>
					{/each}
				</div>
			</div>
		</div>
		<div class="card feature">
			<img src={assets.symbolFreeSpins.src} alt="FS" class="feature-art" />
			<div class="feature-text">
				<h3>Free spins</h3>
				<p>
					3, 4 or 5 FS symbols anywhere on the reels start FREE SPINS. FS symbols have no line wins
					of their own.
				</p>
				<div class="chips">
					{#each Object.entries(FREE_SPINS_AWARDED) as [scatters, spins]}
						<span class="chip">
							<strong>{scatters} &rarr; {spins} spins</strong>
							<span>FREE SPINS</span>
						</span>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<section>
		<h2>Wild multiplier</h2>
		<div class="card text">
			<p>
				Every WILD carries a multiplier, shown on the WILD. A win with a WILD in it is multiplied by
				its multiplier; when a win has several WILDs, their multipliers are added together. In the
				base game, each WILD lands with a random multiplier from {BASE_MIN}x up to {BASE_MAX}x. In
				FREE SPINS, every new WILD starts at {WILD_START}x, and each time it is part of a win its
				multiplier doubles once that spin, however many {words.paylines} it wins on.
			</p>
		</div>
	</section>

	<section>
		<h2>During free spins</h2>
		<div class="card text">
			<p>
				FREE SPINS start with one bat, which flies in on the first spin. During FREE SPINS, more FS
				symbols add more spins: {retriggers}. Every bat stays for the rest of FREE SPINS: when its
				spin is done, its WILD turns back into the bat, which flies to a new reel as the next spin's
				reels drop, lands on one of its symbols (never an FS symbol, and never on a reel where a new
				bat lands or another bat goes) and grows into a WILD there. A bat with no reel left to go to
				flies away. Each bat keeps its WILD's multiplier from spin to spin, so it keeps doubling with
				every spin it wins in.
			</p>
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
		<h2>{words.buyBonus}</h2>
		<div class="card text">
			<p>
				BOOSTER: switched on in the bonus menu, each spin {words.costs} {BOOSTER_COST}x the
				{words.bet} and triggers FREE SPINS far more often. It stays on until you turn it off: in the
				bonus menu, or with the X the bonus button shows while it is on.
			</p>
			<p>
				BONUS: go straight to FREE SPINS for {BONUS_COST}x the {words.bet}: the round starts with a
				spin that lands 3 or more FS symbols.
			</p>
			<p>
				SUPER BONUS: go straight to SUPER FREE SPINS for {SUPER_COST}x the {words.bet}: every bat
				WILD starts at x{SUPER_WILD_START} instead of x{BONUS_WILD_START}.
			</p>
			<p>
				MYSTERY BONUS: a {MYSTERY_PERCENT}% chance of FREE SPINS for {MYSTERY_COST}x the
				{words.bet}. If the mystery opens, the FREE SPINS start; if not, the round ends.
			</p>
		</div>
	</section>

	<section>
		<h2>Return to player</h2>
		<table class="card modes">
			<thead>
				<tr><th>Mode</th><th>{words.cost}</th><th>RTP</th><th>Max win</th></tr>
			</thead>
			<tbody>
				{#each MODES as { name, mode }}
					<tr>
						<td>{name}</td>
						<td>{times(mode.cost)}</td>
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
					The big round button starts a spin at the current {words.bet}. While the reels drop, press
					it again, or tap the reels, to stop them sooner. During autoplay it stops autoplay. The
					space bar does the same as this button.
				</dd>
			</div>
			<div>
				<dt>{words.bet.toUpperCase()} UP and DOWN</dt>
				<dd>
					The &minus; and + buttons either side of the {words.bet} raise or lower it one level at a time.
				</dd>
			</div>
			<div>
				<dt>{words.bet.toUpperCase()}</dt>
				<dd>
					Shows the {words.bet} of the next spin; press it to pick a {words.bet} from the menu.
				</dd>
			</div>
			<div>
				<dt>AUTOPLAY</dt>
				<dd>
					The circular arrow button opens the autoplay settings: choose the number of spins and,
					under ADVANCED, a loss limit and a single win limit, then start. While autoplay runs, the
					button shows the spins left; press it again to stop autoplay.
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
					The round button with the red bonus logo opens the bonus menu. Pick the bonus and check
					what it {words.costs}, then press CONFIRM to {words.buyIt}, or CANCEL to go back. The
					button is greyed out while a round plays.
				</dd>
			</div>
			<div>
				<dt>BALANCE and WIN</dt>
				<dd>Show the balance and the win of the current round.</dd>
			</div>
			<div>
				<dt>PRESS ANYWHERE TO CONTINUE</dt>
				<dd>
					On the start screen and the FREE SPINS screens, press anywhere or the space bar to
					continue.
				</dd>
			</div>
			<div>
				<dt>PLAY and REPLAY</dt>
				<dd>
					A replay of a round opens with a card of the round's {replayWords.mode.toLowerCase()},
					{replayWords.baseBet.toLowerCase()}, {replayWords.costMultiplier.toLowerCase()},
					{replayWords.totalCost.toLowerCase()}, {replayWords.payoutMultiplier.toLowerCase()} and
					{replayWords.totalWin.toLowerCase()}. {replayWords.start.toUpperCase()} on the card, or PLAY
					under the board, starts the round; once it has played, REPLAY plays it again from the start.
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
		/* cool near-whites and greys on the black panel, and the crystals' icy blue as the accent */
		--text: #eef4f8;
		--body: #b9c4cc;
		--soft: #c6d0d7;
		--muted: #84909a;
		--dim: #727e88;
		--line: #1c2024;
		--chip: #1a2128;
		--accent: #7fd6ff;
		--accent-bg: rgba(84, 190, 255, 0.15);

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

	/* the premiums in one row and the letters in the next, each its art over its wins */
	.symbols {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
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
	.features {
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

		/* the reel-tall WILD */
		&.tall {
			width: 3.5rem;
			height: 11rem;
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

	/* narrower screens: one card a row */
	@media (max-width: 50rem) {
		.features {
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

		.feature {
			flex-direction: column;
			align-items: center;
		}

		.controls div {
			grid-template-columns: 1fr;
			gap: 0.1rem;
		}
	}
</style>
