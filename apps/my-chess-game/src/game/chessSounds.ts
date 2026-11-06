import { eventEmitter } from './eventEmitter';
import { pieceKind } from './chess';
import type { ChessSoundName } from './sound';
import type { Side, SymbolName } from './types';

// The chess sounds (scripts/generate-sounds.mjs), each played as the thing happens on the board: a
// piece's sound as it lands, not as it sets off. Every one is forced, so two in quick succession (a
// move and its capture, the turbo's fast moves) both sound.

const play = (name: ChessSoundName) => eventEmitter.broadcast({ type: 'soundOnce', name, forcePlay: true });

const kindOf = (symbol: SymbolName) => pieceKind(symbol)?.toLowerCase() as 'p' | 'n' | 'b' | 'r' | 'q' | 'k' | undefined; // prettier-ignore

// each kind's three takes of its move, played in turn, so a run of moves never repeats one
const takes: Record<string, number> = {};

export const chessSound = {
	// a piece set down on its square
	move: (symbol: SymbolName) => {
		const kind = kindOf(symbol);
		if (!kind) return;
		const take = (takes[kind] = ((takes[kind] ?? 0) % 3) + 1);
		play(`sfx_chess_move_${kind}_${take as 1 | 2 | 3}`);
	},
	// a piece taken (`by` who took it): your take rings a chime for what it was worth, a loss of yours
	// falls low
	take: (captured: SymbolName, by: Side) => {
		const kind = kindOf(captured);
		if (!kind || kind === 'k') return;
		play(by === 'you' ? `sfx_chess_take_${kind}` : `sfx_chess_taken_${kind}`);
	},
	check: (by: Side) => play(by === 'you' ? 'sfx_chess_check' : 'sfx_chess_checked'),
	mate: (by: Side) => play(by === 'you' ? 'sfx_chess_mate' : 'sfx_chess_mated'),
	promote: () => play('sfx_chess_promote'),
	castle: () => play('sfx_chess_castle'),
	pick: () => play('sfx_chess_pick'),
	back: () => play('sfx_chess_back'),
	// a column of the reels landing, from the left (0-7): each a note higher
	drop: (reelIndex: number) => play(`sfx_chess_drop_${(Math.min(7, Math.max(0, reelIndex)) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`), // prettier-ignore
};
