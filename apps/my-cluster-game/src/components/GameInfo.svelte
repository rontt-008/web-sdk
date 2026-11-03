<script lang="ts">
	import { stateReplayDerived, stateUrlDerived } from 'state-shared';

	import config from '../game/config';
	import { BONUS_TRIGGER, SUPER_TRIGGER, FREE_SPINS_AWARDED, POWER_SPINS } from '../game/constants';
	import { BONUS_COST, SUPER_COST, BOOSTER_COST } from '../game/betModes';
	import {
		BONUS_POWERS,
		RUNES,
		RUNE_COLOURS,
		RUNE_NAMES,
		runeShape,
		type BoardRuneName,
		type RuneName,
	} from '../game/runes';

	// The game rules (the menu button opens them), which hold the pay table too: cluster wins, the
	// wild, tumbles, the wind, the bonus meter, free spins with their runes, rune symbols and power
	// spins, the bonus buys, RTP, the controls and, at the bottom, the disclaimer. Flat cards on the menus' black
	// panel, as Cat Hunt's (apps/my-game GameInfo), in the game's warm orange: the symbols as tiles
	// with their wins under them (the biggest clusters' picked out), the runes drawn in their colours.

	// social mode (social=true) can't use words like bet, buy, pay or cost (Stake Engine's restricted
	// words); the others are said the same way in both
	const words = stateUrlDerived.socialWords()
		? {
				bet: 'play amount',
				buyBonus: 'GET BONUS',
				bonusBuys: 'Bonuses',
				costs: 'is played for',
				cost: 'Played for',
			}
		: { bet: 'bet', buyBonus: 'BUY BONUS', bonusBuys: 'Bonus buys', costs: 'costs', cost: 'Cost' };
	// the replay card's names for the round's numbers (Engine's words in social mode)
	const replayWords = stateReplayDerived.words();

	type PayingSymbol = 'H1' | 'H2' | 'H3' | 'H4' | 'L1' | 'L2' | 'L3' | 'L4';

	// the symbols' stills (static/assets/symbols), each path written out as assets.ts does: Vite
	// leaves a fixed path to the static folder alone, but can't resolve one built from a variable
	const STILLS = {
		blueberries: new URL('../../assets/symbols/blueberries.webp', import.meta.url).href,
		runestone: new URL('../../assets/symbols/runestone.webp', import.meta.url).href,
		mushroom: new URL('../../assets/symbols/mushroom.webp', import.meta.url).href,
		acorn: new URL('../../assets/symbols/acorn.webp', import.meta.url).href,
		leafGreen: new URL('../../assets/symbols/leaf-green.webp', import.meta.url).href,
		leafBrown: new URL('../../assets/symbols/leaf-brown.webp', import.meta.url).href,
		leafRed: new URL('../../assets/symbols/leaf-red.webp', import.meta.url).href,
		leafYellow: new URL('../../assets/symbols/leaf-yellow.webp', import.meta.url).href,
		wild: new URL('../../assets/symbols/wild.webp', import.meta.url).href,
		fehu: new URL('../../assets/symbols/symbolrune.webp', import.meta.url).href,
		ingwaz: new URL('../../assets/symbols/symbolrune2.webp', import.meta.url).href,
	};

	// highest paying first
	const SYMBOLS: { symbol: PayingSymbol; name: string; still: string }[] = [
		{ symbol: 'H1', name: 'Blueberries', still: STILLS.blueberries },
		{ symbol: 'H2', name: 'Rune stone', still: STILLS.runestone },
		{ symbol: 'H3', name: 'Mushroom', still: STILLS.mushroom },
		{ symbol: 'H4', name: 'Acorn', still: STILLS.acorn },
		{ symbol: 'L1', name: 'Green leaf', still: STILLS.leafGreen },
		{ symbol: 'L2', name: 'Oak leaf', still: STILLS.leafBrown },
		{ symbol: 'L3', name: 'Maple leaf', still: STILLS.leafRed },
		{ symbol: 'L4', name: 'Yellow leaf', still: STILLS.leafYellow },
	];

	// the cluster sizes that pay alike, as one row each ("5", "6-8", ..., "13+"), biggest first
	const getPays = (symbol: PayingSymbol) => {
		const entries = config.symbols[symbol].paytable.map(
			(entry) => Object.entries(entry)[0] as [string, number],
		);
		const rows: { from: number; to: number; pay: number }[] = [];
		for (const [size, pay] of entries) {
			const last = rows[rows.length - 1];
			if (last && last.pay === pay) last.to = Number(size);
			else rows.push({ from: Number(size), to: Number(size), pay });
		}
		const largest = Number(entries[entries.length - 1][0]);
		return rows
			.map(({ from, to, pay }) => ({
				size: to === largest ? `${from}+` : from === to ? `${from}` : `${from}-${to}`,
				pay,
			}))
			.reverse();
	};
	const MIN_CLUSTER = Number(Object.keys(config.symbols.L4.paytable[0])[0]);

	const RUNE_TITLES: Record<RuneName, string> = {
		othala: 'GREEN RUNE',
		fehu: 'RED RUNE',
		hagall: 'BLUE RUNE',
		ingwaz: 'YELLOW RUNE',
	};
	const { normal, super: superPowers, mythic: mythicPowers } = BONUS_POWERS;
	const RUNE_RULES: Record<RuneName, string> = {
		othala: 'Only premium symbols land in the POWER SPINS.',
		fehu: `Every win in the POWER SPINS is multiplied by ${normal.mult}, by ${superPowers.mult} in SUPER FREE SPINS. Every RED RUNE symbol that lands in the FREE SPINS doubles it, without limit.`,
		hagall:
			superPowers.wilds === normal.wilds
				? `Every POWER SPIN lands a ${normal.wilds}x${normal.wilds} BIG WILD.`
				: `Every POWER SPIN lands a ${normal.wilds}x${normal.wilds} BIG WILD, ${superPowers.wilds}x${superPowers.wilds} in SUPER FREE SPINS.`,
		ingwaz:
			'One more POWER SPIN, and one more for every YELLOW RUNE symbol that lands in the FREE SPINS.',
	};

	// a rune's lines (in board cells) in a square view round them
	const runeView = (name: BoardRuneName) => {
		const points = runeShape(name).strokes.flat();
		const xs = points.map(([x]) => x);
		const ys = points.map(([, y]) => y);
		const size =
			Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 0.8;
		const left = (Math.min(...xs) + Math.max(...xs) - size) / 2;
		const top = (Math.min(...ys) + Math.max(...ys) - size) / 2;
		return `${left} ${top} ${size} ${size}`;
	};
	const hex = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`;

	// Two little boards showing which symbols make a cluster: one that wins, and one that doesn't
	// (only 4 touch side to side, the 5th meets them at a corner, marked with an X). Drawn as the
	// board is, its reels in two browns, the example's symbols on a patch joined wherever they touch
	// and the others dimmed; `board` is rows of symbols, `corner` where to put the X (in cells).
	const STILL_OF = Object.fromEntries(
		SYMBOLS.map(({ symbol, still }) => [symbol, still]),
	) as Record<PayingSymbol, string>;
	type Example = {
		counts: boolean;
		text: string;
		symbol: PayingSymbol;
		board: PayingSymbol[][];
		corner?: [x: number, y: number];
	};
	const EXAMPLES: Example[] = [
		{
			counts: true,
			text: 'Six maple leaves, each touching another above, below or beside it, make one cluster.',
			symbol: 'L3',
			board: [
				['L1', 'H4', 'L4', 'L2', 'H2'],
				['L3', 'L3', 'L2', 'L4', 'L1'],
				['H3', 'L3', 'L3', 'L3', 'H4'],
				['L4', 'L1', 'L3', 'H1', 'L2'],
				['L2', 'H2', 'L4', 'L1', 'H3'],
			],
		},
		{
			counts: false,
			text: `Five yellow leaves, but only four touch side by side: the fifth meets them at a corner, and corners don't connect. No cluster of ${MIN_CLUSTER}.`,
			symbol: 'L4',
			board: [
				['L2', 'H1', 'L3', 'L1', 'H4'],
				['L3', 'L4', 'L4', 'H2', 'L2'],
				['H4', 'L4', 'L4', 'L1', 'L3'],
				['L1', 'L2', 'H3', 'L4', 'H1'],
				['H2', 'L3', 'L1', 'L2', 'H3'],
			],
			corner: [3, 3],
		},
	];
	const REEL_COLOURS = ['#24170e', '#2e1e13'];
	// the patch under an example's symbols: each cell, a bridge to each neighbour of the same symbol
	// on its right and below, and the middle of any square of four, so the touching ones join into
	// one shape
	const patch = ({ symbol, board }: Example) =>
		board.flatMap((row, y) =>
			row.flatMap((cell, x) => {
				if (cell !== symbol) return [];
				const right = row[x + 1] === symbol;
				const below = board[y + 1]?.[x] === symbol;
				const parts = [{ x: x + 0.06, y: y + 0.06, width: 0.88, height: 0.88 }];
				if (right) parts.push({ x: x + 0.5, y: y + 0.2, width: 1, height: 0.6 });
				if (below) parts.push({ x: x + 0.2, y: y + 0.5, width: 0.6, height: 1 });
				if (right && below && board[y + 1][x + 1] === symbol) parts.push({ x: x + 0.5, y: y + 0.5, width: 1, height: 1 }); // prettier-ignore
				return parts;
			}),
		);

	// every way to play, with its cost, RTP and max win
	const MODES = [
		{ name: 'Base game', cost: 1, mode: config.betModes.base },
		{ name: 'Booster', cost: BOOSTER_COST, mode: config.betModes.booster },
		{ name: 'Bonus', cost: BONUS_COST, mode: config.betModes.bonus },
		{ name: 'Super bonus', cost: SUPER_COST, mode: config.betModes.super },
	];
	const maxWin = Math.max(...MODES.map(({ mode }) => mode.max_win));

	const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
	const times = (value: number) => `${value.toLocaleString('en-US')}x`;
</script>

<div class="game-info">
	<p class="lead">
		Wins for clusters of {MIN_CLUSTER} or more matching symbols, by the cluster's size, as a multiple
		of the {words.bet}.
	</p>

	<div class="symbols">
		{#each SYMBOLS as { symbol, name, still }}
			<div class="card tile">
				<div class="art"><img src={still} alt={name} /></div>
				<dl class="pays">
					{#each getPays(symbol) as { size, pay }, index}
						<div class="pay" class:top={index === 0}>
							<dt>{size}</dt>
							<dd>{times(pay)}</dd>
						</div>
					{/each}
				</dl>
			</div>
		{/each}
	</div>

	<div class="pair">
		<div class="card text with-art">
			<img src={STILLS.wild} alt="Wild" class="card-art" />
			<div class="feature-text">
				<h3>Wild</h3>
				<p>
					The WILD stands in for every symbol: it joins the cluster of each symbol it touches, so
					one WILD can be part of several wins. A square of 2x2 or 3x3 WILDs shows as one BIG WILD.
				</p>
			</div>
		</div>
		<div class="card text">
			<h3>Clusters and tumbles</h3>
			<p>
				A cluster is {MIN_CLUSTER} or more of the same symbol, each touching the next above, below or
				beside it (not corner to corner). After a win its symbols disappear, the symbols above fall into
				the gaps and new ones drop in from the top. This repeats while new clusters form, and the wins
				of all the tumbles are added together.
			</p>
		</div>
	</div>

	<div class="pair">
		{#each EXAMPLES as example}
			<div class="card example" class:fails={!example.counts}>
				<svg viewBox="0 0 5 5" class="board" role="img" aria-label={example.text}>
					{#each example.board as row, y}
						{#each row as _, x}
							<rect {x} {y} width="1" height="1" fill={REEL_COLOURS[x % 2]} />
						{/each}
					{/each}
					{#each patch(example) as part}
						<rect {...part} rx="0.16" class="patch" />
					{/each}
					{#each example.board as row, y}
						{#each row as cell, x}
							<image
								href={STILL_OF[cell]}
								x={x + 0.08}
								y={y + 0.08}
								width="0.84"
								height="0.84"
								opacity={cell === example.symbol ? 1 : 0.3}
							/>
						{/each}
					{/each}
					{#if example.corner}
						{@const [cx, cy] = example.corner}
						<g class="cross" transform="translate({cx} {cy})">
							<circle r="0.22" />
							<path d="M -0.08 -0.08 L 0.08 0.08 M 0.08 -0.08 L -0.08 0.08" />
						</g>
					{/if}
				</svg>
				<div class="verdict">
					<span class="mark">{example.counts ? '✓' : '✕'}</span>
					<h3>{example.counts ? 'COUNTS' : "DOESN'T COUNT"}</h3>
				</div>
				<p>{example.text}</p>
			</div>
		{/each}
	</div>

	<section>
		<h2>Wind</h2>
		<div class="card text">
			<p>
				Now and then, in any spin of the base game or the bonus, a gust of wind blows across the
				board once the symbols have landed, before any wins are counted. Most gusts blow a few WILDs
				onto the board. A rarer, stronger gust carries off every symbol of one kind, and new symbols
				drop in to fill their places.
			</p>
		</div>
	</section>

	<section>
		<h2>Bonus meter</h2>
		<div class="card text">
			<p>
				In the base game every symbol of a winning cluster, over all of a spin's tumbles, fills the
				bonus meter beside the board. {BONUS_TRIGGER} or more start FREE SPINS; {SUPER_TRIGGER} or more
				start SUPER FREE SPINS. The meter starts empty on every spin.
			</p>
		</div>
	</section>

	<section>
		<h2>Orange rune</h2>
		<div class="card text mannaz">
			<svg viewBox={runeView('mannaz')} class="glyph" aria-hidden="true">
				{#each runeShape('mannaz').strokes as stroke}
					<polyline
						points={stroke.map(([x, y]) => `${x},${y}`).join(' ')}
						stroke={hex(RUNE_COLOURS.mannaz.neon)}
					/>
				{/each}
			</svg>
			<p>
				Now and then, in a spin of the base game, the ORANGE RUNE appears across the whole board
				as the symbols drop in. Each winning cluster lights the spots of it that it covers,
				over all of that spin's tumbles, and it goes when the next spin starts. When all of the
				ORANGE RUNE is lit, MYTHIC FREE SPINS start.
			</p>
		</div>
	</section>

	<section>
		<h2>Free spins and runes</h2>
		<div class="card text">
			<p>
				FREE SPINS give {FREE_SPINS_AWARDED} spins. One of four runes lies behind the symbols, anywhere
				on the board; each winning cluster lights the rune's spots it covers. When all its spots are
				lit, the rune is collected into its box beside the board, and the next rune comes with the next
				spin. The runes come in a random order.
			</p>
			<p>
				FREE SPINS, SUPER FREE SPINS and MYTHIC FREE SPINS always give {FREE_SPINS_AWARDED} spins, and
				can't be re-triggered: no more spins are won during them (the bonus meter and the ORANGE RUNE
				are only in the base game).
			</p>
			<p>
				After the FREE SPINS come {POWER_SPINS} POWER SPINS, with the powers of every rune collected:
			</p>
		</div>
		<div class="runes">
			{#each RUNE_NAMES as name}
				<div class="card rune">
					<svg viewBox={runeView(name)} class="glyph" aria-hidden="true">
						{#each RUNES[name].strokes as stroke}
							<polyline
								points={stroke.map(([x, y]) => `${x},${y}`).join(' ')}
								stroke={hex(RUNE_COLOURS[name].neon)}
							/>
						{/each}
					</svg>
					<h3 style:color={hex(RUNE_COLOURS[name].neon)}>{RUNE_TITLES[name]}</h3>
					<strong>{RUNES[name].powerText('normal')}</strong>
					<p>{RUNE_RULES[name]}</p>
				</div>
			{/each}
		</div>
		<!-- the two rune symbols, which land in the free spins and grow their runes' powers -->
		<div class="pair rune-symbols">
			<div class="card text with-art">
				<img src={STILLS.fehu} alt="RED RUNE symbol" class="card-art" />
				<div class="feature-text">
					<h3 style:color={hex(RUNE_COLOURS.fehu.neon)}>RED RUNE symbol</h3>
					<p>
						Lands only in FREE SPINS, and wins nothing itself. Its light flies into the RED RUNE's box and
						doubles the RED RUNE's multiplier (in FREE SPINS {normal.mult}x becomes {normal.mult * 2}x, then
						{normal.mult * 4}x and so on), without limit, then a new symbol drops into its place. The
						multiplier counts in the POWER SPINS once the RED RUNE is collected.
					</p>
				</div>
			</div>
			<div class="card text with-art">
				<img src={STILLS.ingwaz} alt="YELLOW RUNE symbol" class="card-art" />
				<div class="feature-text">
					<h3 style:color={hex(RUNE_COLOURS.ingwaz.neon)}>YELLOW RUNE symbol</h3>
					<p>
						Lands only in FREE SPINS, and wins nothing itself. Its light flies into the YELLOW RUNE's box and
						adds one more POWER SPIN, without limit, then a new symbol drops into its place. The extra
						spins count once the YELLOW RUNE is collected.
					</p>
				</div>
			</div>
		</div>
		<div class="card text">
			<h3>SUPER FREE SPINS</h3>
			<p>
				The same as FREE SPINS, with a bigger RED RUNE: it multiplies the POWER SPINS' wins by
				{superPowers.mult} (by {normal.mult} in FREE SPINS), before its symbols double it.{#if superPowers.wilds !== normal.wilds}
					The BLUE RUNE's BIG WILD is {superPowers.wilds}x{superPowers.wilds}.{/if}
			</p>
		</div>
		<div class="card text">
			<h3>MYTHIC FREE SPINS</h3>
			<p>
				Started only by the ORANGE RUNE. Two of the four runes, chosen at random, are already
				collected when they start, and the FREE SPINS bring the other two. The RED RUNE is the
				biggest of all: it multiplies the POWER SPINS' wins by {mythicPowers.mult} (by {superPowers.mult}
				in SUPER FREE SPINS), before its symbols double it.{#if mythicPowers.wilds !== normal.wilds}
					The BLUE RUNE's BIG WILD is {mythicPowers.wilds}x{mythicPowers.wilds}.{/if}
			</p>
		</div>
	</section>

	<section>
		<h2>{words.bonusBuys}</h2>
		<div class="card text">
			<h3>{words.buyBonus}</h3>
			<p>
				Go straight to the bonus. BONUS ({times(BONUS_COST)} the {words.bet}) starts FREE SPINS;
				SUPER BONUS ({times(SUPER_COST)} the {words.bet}) starts SUPER FREE SPINS.
			</p>
		</div>
		<div class="card text">
			<h3>BOOSTER</h3>
			<p>
				Switched on in the bonus menu, every spin {words.costs} {times(BOOSTER_COST)} the {words.bet}, and
				the bonus meter starts FREE SPINS and SUPER FREE SPINS far more often. It plays the same
				spins as the base game, and stays on until you switch it off.
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
					The big round button starts a spin at the current {words.bet}. While the symbols fall it
					shows a square: press it again to land them sooner. During autoplay it stops autoplay. The
					space bar does the same as this button.
				</dd>
			</div>
			<div>
				<dt>&minus; and +</dt>
				<dd>Beside the {words.bet}, they lower or raise it one level at a time.</dd>
			</div>
			<div>
				<dt>{words.bet.toUpperCase()}</dt>
				<dd>
					Shows the {words.bet} of the next spin; press it to pick a {words.bet} from the menu. On wide
					screens the line under it shows how far up the levels it is.
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
					The round button with the red S opens the bonus menu, which shows the balance and the
					{words.bet}, with &minus; and + to change the {words.bet} the prices are worked out from. Pick
					a bonus and check its price, then press CONFIRM to start it, or CANCEL to go back. The
					button is greyed out while a round plays.
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
					On the start screen, the FREE SPINS and POWER SPINS screens and big wins, press anywhere
					or the space bar to continue. While a total is counting up, the first press jumps to the
					final amount.
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
					While it plays, the win and the {replayWords.baseBet.toLowerCase()} show under the board, and
					for a mode with a {replayWords.costMultiplier.toLowerCase()} above 1x, the
					{replayWords.totalCost.toUpperCase()} with that multiplier.
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
		/* warm near-whites and greys on the black panel, and the game's autumn orange */
		--text: #f6f2ee;
		--body: #c9c0b8;
		--soft: #d2c9c1;
		--muted: #918780;
		--dim: #7f756e;
		--line: #1f1c1a;
		--accent: #ff9a3c;
		--accent-bg: rgba(247, 146, 30, 0.16);

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

	/* the symbols, four a row, each its art over its wins */
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

		/* the biggest clusters, picked out */
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

	.pair {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.875rem;
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

	/* the two example boards: the one that counts in green, the one that doesn't in red */
	.example {
		--verdict: #5fd36a;
		--patch: #2c5a2a;

		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 1.25rem;
		text-align: center;

		&.fails {
			--verdict: #ff5a4e;
			--patch: #6a2420;
		}

		h3 {
			font-size: 1.1rem;
			letter-spacing: 0.04em;
			color: var(--verdict);
		}

		p {
			font-size: 0.9rem;
		}
	}

	.board {
		width: min(14rem, 100%);
		aspect-ratio: 1;
		border-radius: 0.6rem;
	}

	.patch {
		fill: var(--patch);
	}

	.cross {
		circle {
			fill: var(--verdict);
		}

		path {
			fill: none;
			stroke: #fff;
			stroke-width: 0.05;
			stroke-linecap: round;
		}
	}

	.verdict {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.mark {
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 50%;
		background: var(--verdict);
		color: #000;
		font-weight: 800;
	}

	/* a card with its art on the left */
	.with-art {
		flex-direction: row;
		align-items: flex-start;
		gap: 1.125rem;
	}

	.card-art {
		flex: none;
		width: 5rem;
		height: 5rem;
		object-fit: contain;
	}

	/* the four runes, each drawn in its colour over its power */
	.runes {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.875rem;
	}

	.rune {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 1.1rem 0.9rem 1.2rem;
		text-align: center;

		h3 {
			font-size: 1.1rem;
			letter-spacing: 0.06em;
		}

		strong {
			font-size: 0.85rem;
			color: var(--text);
		}

		p {
			font-size: 0.85rem;
			line-height: 1.45;
		}
	}

	/* Mannaz drawn beside what it does */
	.mannaz {
		display: flex;
		align-items: center;
		gap: 1.25rem;

		.glyph {
			flex: none;
			margin-bottom: 0;
		}
	}

	.glyph {
		width: 4.5rem;
		height: 4.5rem;
		margin-bottom: 0.25rem;

		polyline {
			fill: none;
			stroke-width: 0.3;
			stroke-linecap: round;
			stroke-linejoin: round;
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

	/* narrower screens: fewer symbols and runes a row, one card a row */
	@media (max-width: 50rem) {
		.pair {
			grid-template-columns: 1fr;
		}

		.runes {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 30rem) {
		.symbols {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.art {
			height: 5rem;
		}

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
