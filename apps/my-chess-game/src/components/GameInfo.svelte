<script lang="ts">
	import { stateUrlDerived } from 'state-shared';

	import config from '../game/config';
	import {
		CAPTURE_PAYS,
		PIECE_NAMES,
		FREE_SPINS,
		RETRIGGER_SPINS,
		MAX_FREE_SPINS,
		MAX_MOVES,
		CHEAT_SPOTS,
		SPOT_ADD_VALUES,
		SPOT_MULT_VALUES,
	} from '../game/constants';
	import { BONUS_COST, BOOSTER_COST, CHEAT_COST } from '../game/betModes';
	import type { PieceKind } from '../game/types';

	// The game rules (the menu button opens them), which hold the pays too: the board, the moves, what
	// a capture pays, the multiplier, the checkmate bonus, the bonus buy, the side toggle, RTP and max
	// win, the controls and the disclaimer. Flat cards on the menus' black panel, in the board's gold.

	// social mode (social=true) can't use words like bet, buy, pay or cost (Stake Engine's restricted
	// words); the others are said the same way in both
	const words = stateUrlDerived.socialWords()
		? { bet: 'play amount', buyBonus: 'GET BONUS', costs: 'is played for', cost: 'Played for' }
		: { bet: 'bet', buyBonus: 'BUY BONUS', costs: 'costs', cost: 'Cost' };

	// the pieces' pictures (static/assets/pieces), each path written out as assets.ts does: Vite
	// leaves a fixed path to the static folder alone, but can't resolve one built from a variable
	const PICTURES = {
		wK: new URL('../../assets/pieces/wK.png', import.meta.url).href,
		bK: new URL('../../assets/pieces/bK.png', import.meta.url).href,
		bQ: new URL('../../assets/pieces/bQ.png', import.meta.url).href,
		bR: new URL('../../assets/pieces/bR.png', import.meta.url).href,
		bB: new URL('../../assets/pieces/bB.png', import.meta.url).href,
		bN: new URL('../../assets/pieces/bN.png', import.meta.url).href,
		bP: new URL('../../assets/pieces/bP.png', import.meta.url).href,
	};

	// the pieces you can take, the most valuable first
	const PAYING: { kind: Exclude<PieceKind, 'K'>; picture: string }[] = [
		{ kind: 'Q', picture: PICTURES.bQ },
		{ kind: 'R', picture: PICTURES.bR },
		{ kind: 'B', picture: PICTURES.bB },
		{ kind: 'N', picture: PICTURES.bN },
		{ kind: 'P', picture: PICTURES.bP },
	];

	const times = (value: number) => `${value}x`;
	const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
	const maxWin = config.betModes.base.max_win;
</script>

<div class="game-info">
	<section>
		<h2>CHECKMATE</h2>
		<p class="lead">A game of chess, one spin at a time.</p>
		<div class="card text">
			<p>
				Every spin, chess pieces land on the board: your king, the other side's king and a handful
				of pieces on each side, in a random position. It is your move. Your pieces play their best
				move, the other side answers with its best defence, and so on: each spin plays out as a
				combination of up to {MAX_MOVES} of your moves.
			</p>
			<p>
				The combination goes on while your move is a forcing one: it takes a piece or gives check.
				When your best move does neither, the spin is over. Only legal chess moves are played: no
				castling and no en passant, as the positions have no history. A pawn that reaches the far
				side becomes a queen.
			</p>
		</div>
		<div class="card text">
			<h3>Why a piece is not taken</h3>
			<p>
				Your pieces are played by a chess engine, and it plays to win the game, not to grab pieces.
				It captures when the capture is its best move. If taking a piece would walk into a bigger
				loss, such as a recapture or a pawn promoting with check, it plays the safe move instead,
				and the spin ends. After a spin that ends this way, the side panel shows the capture it turned
				down, what would have happened, and the move it played instead.
			</p>
		</div>
	</section>

	<section>
		<h3>Captures pay</h3>
		<p>
			Every piece of the other side you take pays, as a multiple of the {words.bet}. Only your
			captures pay: what the other side takes from you costs nothing.
		</p>
		<div class="pieces">
			{#each PAYING as { kind, picture }}
				<div class="piece">
					<img src={picture} alt={PIECE_NAMES[kind]} />
					<div class="piece-name">{PIECE_NAMES[kind]}</div>
					<div class="piece-pay">{times(CAPTURE_PAYS[kind])}</div>
				</div>
			{/each}
		</div>
		<div class="card text">
			<h3>Multiplier</h3>
			<p>
				A spin starts at a 1x multiplier. Every piece you take pays its value times the multiplier,
				and then the multiplier grows by 1: the second capture of a combination pays 2x, the third 3x,
				and so on. A multiplier spot the piece is taken on goes into the multiplier too. In the base
				game the multiplier resets with every spin.
			</p>
		</div>
	</section>

	<section>
		<h3>Multiplier spots</h3>
		<div class="card text">
			<p>
				Before the pieces land, a few squares (none to three, mostly under the other side's pieces)
				get a multiplier spot. A blue + spot adds its value to the spin's multiplier: {SPOT_ADD_VALUES.map(
					(value) => `+${value}`,
				).join(', ')}. A gold x spot multiplies the spin's multiplier: {SPOT_MULT_VALUES.map(
					(value) => `x${value}`,
				).join(', ')}. Take one of the other side's pieces on a spot and the spot goes into the
				multiplier first, so that capture and every one after it pay at the bigger multiplier; the
				spot is used up. A spot does nothing for the other side.
			</p>
		</div>
	</section>

	<section>
		<h3>DUMB MODE</h3>
		<div class="card text">
			<p>
				Switched on in the bonus menu, every spin {words.costs} {times(BOOSTER_COST)} the {words.bet}.
				The other side plays like a beginner: any legal move, at random, so it hangs its pieces. Your
				own moves stay at full strength, and checkmates and the CHECKMATE BONUS come about four times
				as often. It stays on until you switch it off; its FREE SPINS are the normal ones.
			</p>
		</div>
	</section>

	<section>
		<h3>CHEATER MODE</h3>
		<div class="card text">
			<p>
				Switched on in the bonus menu, every spin {words.costs} {times(CHEAT_COST)} the {words.bet}.
				Your queen always lands, and the board gets {CHEAT_SPOTS.min} to {CHEAT_SPOTS.max} multiplier
				spots. Before the moves, the queen collects every spot into the spin's multiplier, every +
				first and then every x (+3, +5 and x2 make (1 + 3 + 5) x 2 = x18), and the moves then play
				with it. A checkmate starts the CHECKMATE BONUS with that multiplier already running. It stays
				on until you switch it off.
			</p>
		</div>
	</section>

	<section>
		<h3>CHECKMATE BONUS</h3>
		<div class="card text">
			<p>
				Checkmate the other side's king in a spin and the CHECKMATE BONUS starts: {FREE_SPINS} FREE
				SPINS on boards with more pieces, heavier ones and only + spots. In the FREE SPINS
				the multiplier never resets: it carries on growing from spin to spin, with every piece you
				take and every spot you take one on.
			</p>
			<p>
				Every checkmate in the FREE SPINS gives {RETRIGGER_SPINS} more spins, up to {MAX_FREE_SPINS}
				spins in a bonus.
				Being checkmated, a stalemate or a draw only ends the spin.
			</p>
		</div>
		<div class="card text">
			<h3>{words.buyBonus}</h3>
			<p>
				The CHECKMATE BONUS can be bought from the bonus menu for {times(BONUS_COST)} the {words.bet}:
				one base game spin is played, and the FREE SPINS follow whatever it does.
			</p>
		</div>
	</section>

	<section>
		<h3>White or black</h3>
		<div class="card text side">
			<div class="kings">
				<img src={PICTURES.wK} alt="White king" />
				<img src={PICTURES.bK} alt="Black king" />
			</div>
			<p>
				The YOU PLAY toggle beside the board chooses whether your pieces are the white ones or the
				black ones. It changes only how the pieces are drawn: whichever colour you play, it is always
				your move first and the odds are exactly the same.
			</p>
		</div>
	</section>

	<section>
		<h3>Max win and RTP</h3>
		<div class="card text">
			<p>
				The most a round can win is {times(maxWin)} the {words.bet}, in any mode: once a round
				reaches it, it ends and pays that. The return to player is {percent(config.rtp)} in the
				base game, in DUMB MODE, in CHEATER MODE and with the bonus bought.
			</p>
			<p class="note">
				Malfunction voids all pays and plays. The game is decided by the outcome drawn from the game
				server; the moves on the board show that outcome.
			</p>
		</div>
	</section>

	<section>
		<h3>Controls</h3>
		<div class="card text">
			<p>
				SPIN plays a round. The amount panel sets the {words.bet}; AUTO plays rounds on its own
				until stopped; the TURBO button makes the moves faster. The bonus menu (the chess piece
				button) holds the CHECKMATE BONUS. The menu button opens these rules, and the sound buttons
				mute the music and the effects.
			</p>
		</div>
	</section>
</div>

<style lang="scss">
	.game-info {
		--text: #f6f2ee;
		--body: #c9c0b8;
		--muted: #918780;
		--accent: #f2c94c;
		--accent-bg: rgba(242, 201, 76, 0.14);

		display: flex;
		flex-direction: column;
		gap: 2.5rem;
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
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-align: center;
	}

	h3 {
		margin: 0;
		font-size: 1.2rem;
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
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.1rem 1.25rem;
		border-radius: 0.9rem;
		background: var(--accent-bg);
	}

	.side {
		flex-direction: row;
		align-items: center;
		gap: 1.25rem;
	}

	.kings {
		display: flex;
		flex-shrink: 0;
		gap: 0.25rem;

		img {
			width: 3.5rem;
			height: 3.5rem;
		}
	}

	.pieces {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
		gap: 0.75rem;
	}

	.piece {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.9rem 0.5rem;
		border-radius: 0.9rem;
		background: #1c1c1c;

		img {
			width: 4rem;
			height: 4rem;
		}
	}

	.piece-name {
		font-size: 0.85rem;
		color: var(--muted);
	}

	.piece-pay {
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--accent);
	}
</style>
