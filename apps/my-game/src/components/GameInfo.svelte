<script lang="ts">
	import { HeadingText } from 'components-ui-html';
	import { stateBet } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import assets from '../game/assets';
	import config from '../game/config';
	import {
		BONUS_NAME,
		BONUS_SCATTER_COUNT,
		FREE_SPINS_AWARDED,
		FREE_SPINS_ADDED,
		FREE_SPIN_WILD_MULTIPLIERS,
	} from '../game/constants';
	import {
		BONUS_COST,
		SUPER_COST,
		MYTHIC_COST,
		MYSTERY_COST,
		FEATURE_COST,
		BOOSTER_COST,
		MYSTERY_CHANCES,
	} from '../game/betModes';
	import type { BonusType } from '../game/types';

	type Props = {
		// the pay table (symbols, the FS symbol, paylines) or the rules (features, RTP, max win)
		part: 'payTable' | 'gameRules';
	};

	const props: Props = $props();

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

	const amount = (multiplier: number) => numberToCurrencyString(stateBet.betAmount * multiplier);

	const BONUS_TYPES: BonusType[] = ['normal', 'super', 'mythic'];
	const bonusTitle = (type: BonusType) =>
		[BONUS_NAME[type], 'FREE SPINS'].filter(Boolean).join(' ');

	const paylines = Object.values(config.paylines);
	const ROWS = config.numRows[0];

	const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
	const chance = (value: number) => `${Math.round(value * 100)}%`;
	const times = (value: number) => `${value.toLocaleString('en-US')}x`;
	// "2, 3, 4 or 5"
	const either = (items: (string | number)[]) =>
		`${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;

	// every way to play, with its cost, RTP and max win
	const MODES = [
		{ name: 'Base game', cost: 1, mode: config.betModes.base },
		{ name: 'Booster', cost: BOOSTER_COST, mode: config.betModes.ante },
		{ name: 'Bonus', cost: BONUS_COST, mode: config.betModes.bonus },
		{ name: 'Super bonus', cost: SUPER_COST, mode: config.betModes.super },
		{ name: 'Mythic bonus', cost: MYTHIC_COST, mode: config.betModes.mythic },
		{ name: 'Mystery bonus', cost: MYSTERY_COST, mode: config.betModes.mystery },
		{ name: 'Feature spin', cost: FEATURE_COST, mode: config.betModes.feature },
	];

	const minMultiplier = Math.min(...FREE_SPIN_WILD_MULTIPLIERS);
	const maxMultiplier = Math.max(...FREE_SPIN_WILD_MULTIPLIERS);
	const maxWin = Math.max(...MODES.map(({ mode }) => mode.max_win));
</script>

{#snippet heading(text: string)}
	<h2 class="heading"><HeadingText>{text}</HeadingText></h2>
{/snippet}

<div class="game-info">
	{#if props.part === 'payTable'}
		<section>
			{@render heading('Symbol pays')}
			<p class="note">
				Pays for 3, 4 or 5 of a kind on a payline, at your bet of {amount(1)}.
			</p>
			<div class="symbols">
				{#each PAYING_SYMBOLS as symbol}
					<div class="card symbol">
						<img src={SYMBOL_IMAGES[symbol]} alt={symbol} />
						<dl>
							{#each getPays(symbol) as [count, pay]}
								<div class="pay">
									<dt>{count}</dt>
									<dd>{amount(pay)}</dd>
								</div>
							{/each}
						</dl>
					</div>
				{/each}
			</div>
		</section>

		<section>
			{@render heading('Wild')}
			<div class="card feature">
				<img src={assets.bigWild.src} alt="Big wild" class="feature-art tall" />
				<p>
					The WILD stands in for every symbol except FS. A WILD anywhere on a reel turns the whole
					reel into a BIG WILD, and every BIG WILD throws 0 to 3 extra WILDs onto the other reels.
				</p>
			</div>
		</section>

		<section>
			{@render heading('Free spins')}
			<div class="card feature">
				<img src={assets.symbolS.src} alt="FS" class="feature-art" />
				<p>
					3, 4 or 5 FS symbols anywhere on the reels start FREE SPINS. FS symbols don't pay, and one
					covered by a BIG WILD doesn't count.
				</p>
			</div>
			<div class="bonuses">
				{#each BONUS_TYPES as type}
					{@const scatters = BONUS_SCATTER_COUNT[type]}
					<div class="card bonus">
						<HeadingText>{bonusTitle(type)}</HeadingText>
						<span class="big">{FREE_SPINS_AWARDED[scatters]} spins</span>
						<span class="muted">{scatters} FS symbols</span>
					</div>
				{/each}
			</div>
		</section>

		<section>
			{@render heading(`${paylines.length} paylines`)}
			<p class="note">
				Wins pay from left to right on adjacent reels, starting from the leftmost reel. WILDs stand
				in for the symbol after them, so a line counts all the way through; a line of only WILDs
				pays as WILDs. Wins on different paylines are added together.
			</p>
			<div class="paylines">
				{#each paylines as line, index}
					<div class="payline">
						<span class="muted">{index + 1}</span>
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
	{:else}
		<section>
			{@render heading('Free spins')}
			<div class="card feature">
				<p>
					During FREE SPINS, {either(Object.keys(FREE_SPINS_ADDED))} FS symbols add
					{either(Object.values(FREE_SPINS_ADDED))} more spins. Every WILD carries a {minMultiplier}x
					to {maxMultiplier}x multiplier, and the multipliers of the WILDs on a winning line are
					added together. Thrown WILDs carry no multiplier.
				</p>
			</div>
			<div class="card feature">
				<p>
					<strong>MYTHIC FREE SPINS:</strong> every spin has at least one BIG WILD, and one of them
					throws 1 to 3 extra WILDs instead of 0 to 3.
				</p>
			</div>
		</section>

		<section>
			{@render heading('Booster and bonus buys')}
			<div class="card feature">
				<p>
					<strong>BOOSTER:</strong> each spin costs {BOOSTER_COST}x the bet and FREE SPINS start
					more often.
				</p>
			</div>
			<div class="card feature">
				<p>
					<strong>BUY BONUS:</strong> go straight to FREE SPINS. BONUS ({BONUS_COST}x the bet),
					SUPER BONUS ({SUPER_COST}x) and MYTHIC BONUS ({MYTHIC_COST}x) give their FREE SPINS.
					MYSTERY BONUS ({MYSTERY_COST}x) gives the normal FREE SPINS with a {chance(
						MYSTERY_CHANCES.normal,
					)} chance, SUPER with {chance(MYSTERY_CHANCES.super)} and MYTHIC with {chance(
						MYSTERY_CHANCES.mythic,
					)}.
				</p>
			</div>
			<div class="card feature">
				<p>
					<strong>FEATURE SPIN:</strong> one spin for {FEATURE_COST}x the bet with at least one BIG
					WILD, and one of them throws 1 to 3 extra WILDs onto the other reels. It pays like a base
					game spin and can't start FREE SPINS.
				</p>
			</div>
		</section>

		<section>
			{@render heading('Return to player')}
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
				Wins in a round are capped at {times(maxWin)} the bet. Malfunction voids all pays and plays.
			</p>
		</section>
	{/if}
</div>

<style lang="scss">
	.game-info {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		width: min(46rem, 100%);
		color: var(--ui-text, white);
		text-align: left;
	}

	section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.heading {
		margin: 0;
		font-size: 1.35rem;
		text-align: center;
	}

	p {
		margin: 0;
		line-height: 1.45;
	}

	.note,
	.muted {
		color: var(--ui-text-muted, white);
	}

	.note {
		text-align: center;
	}

	.card {
		box-sizing: border-box;
		background: var(--ui-card-bg, rgba(255, 255, 255, 0.08));
		border: var(--ui-card-border, none);
		border-radius: var(--ui-card-radius, 0.75rem);
		box-shadow: var(--ui-card-shadow, none);
	}

	.symbols {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 0.75rem;
	}

	.symbol {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;

		img {
			width: 3.5rem;
			height: 3.5rem;
			object-fit: contain;
		}

		dl {
			margin: 0;
			display: flex;
			flex-direction: column;
			gap: 0.1rem;
		}
	}

	.pay {
		display: flex;
		gap: 0.5rem;

		dt {
			min-width: 0.8rem;
			color: var(--ui-text-muted, white);
		}

		dd {
			margin: 0;
			color: var(--ui-card-price, white);
			font-weight: 700;
		}
	}

	.feature {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
	}

	.feature-art {
		width: 4rem;
		height: 4rem;
		object-fit: contain;
		flex-shrink: 0;

		&.tall {
			height: 6rem;
		}
	}

	.bonuses {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.bonus {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 0.5rem;
		text-align: center;
		font-size: 0.95rem;

		.big {
			font-size: 1.25rem;
			font-weight: 800;
		}
	}

	.paylines {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
		gap: 0.75rem 0.5rem;
	}

	.payline {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.85rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(var(--reels), 1fr);
		gap: 2px;
		width: 100%;
		padding: 3px;
		box-sizing: border-box;
		background: var(--ui-card-bg, rgba(255, 255, 255, 0.08));
		border-radius: 0.35rem;
	}

	.cell {
		aspect-ratio: 1;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.14);

		&.on {
			background: var(--ui-accent-bg, #6fd3ff);
		}
	}

	.modes {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		overflow: hidden;

		th,
		td {
			padding: 0.5rem 0.75rem;
			text-align: right;
		}

		th:first-child,
		td:first-child {
			text-align: left;
		}

		th {
			color: var(--ui-text-muted, white);
			font-weight: 600;
		}

		tbody tr:nth-child(odd) {
			background: rgba(255, 255, 255, 0.04);
		}
	}

	@media (max-width: 30rem) {
		.bonuses {
			grid-template-columns: 1fr;
		}
	}
</style>
