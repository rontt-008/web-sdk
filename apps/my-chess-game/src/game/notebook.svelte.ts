import type * as PIXI from 'pixi.js';
import { stateBet } from 'state-shared';

import { stateGame } from './stateGame.svelte';
import { BOOSTER_MODE, SUPER_MODE } from './betModes';
import { moveNotation, pieceAssetKey, scoreText } from './chess';
import type { Position, SymbolName } from './types';

// What the notebook says (the side panel on desktop and phones held sideways, NotebookPad; the strip
// under the board on tall screens, NotebookStrip; the whole pad opened over the board, NotebookOverlay;
// the sticky note of the engine's reasons, StickyNote), worked out once for all of them.

// the board picture's colours (static/assets/board.webp)
export const NOTEBOOK_COLOURS = {
	light: 0xdde9f1,
	dark: 0x6691ad,
	frame: 0x47504a,
	label: 0x628196,
	ink: 0x223646,
	reply: 0x4c7493,
	white: 0xffffff,
};
const SANS = ['Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'];

export const notebookText = (size: number, fill: number, more: Partial<PIXI.TextStyleOptions> = {}) => ({
	fontFamily: SANS,
	fontSize: size,
	fontWeight: '700' as const,
	fill,
	...more,
});
export const notebookLabel = (size: number, fill: number) =>
	notebookText(size, fill, { fontWeight: '800', letterSpacing: size / 6 });

// The full notebook opened over the board on phones (NotebookOverlay), from the strip under the board
// or the side panel; it shuts with another press, or as the next spin starts.
export const notebook = $state({ open: false });

// whose move it is: the king of the side on the move (yours drawn in your colour), none between spins;
// the other side's king gold in the SUPER BONUS, as on the board (Piece)
export const turnKing = () => {
	const turn = stateGame.turn;
	if (!turn) return undefined;
	if (turn === 'them' && stateBet.activeBetModeKey === SUPER_MODE && !stateGame.sandbox) return 'gK';
	return pieceAssetKey(turn === 'you' ? 'WK' : 'BK', stateGame.yourColour);
};

export const turnText = () =>
	stateGame.turn === 'you'
		? 'YOUR MOVE'
		: stateGame.turn === 'them'
			? stateBet.activeBetModeKey === BOOSTER_MODE
				? 'THEIR MOVE · BEGINNER'
				: 'THEIR MOVE'
			: 'PRESS SPIN TO PLAY';

// the multiplier's heading
export const multiplierLabel = () =>
	stateGame.gameType !== 'freegame'
		? 'MULTIPLIER'
		: stateBet.activeBetModeKey === SUPER_MODE
			? 'SUPER BONUS · SPIN MULTIPLIER'
			: 'BONUS MULTIPLIER';

// in the bonus, the free spins still to come after the one being played, of how many in all
export const spinsLeftText = () => {
	if (stateGame.gameType !== 'freegame' || stateGame.sandbox) return undefined;
	const { current, total } = stateGame.freeSpins;
	return `SPINS LEFT ${Math.max(0, total - current)} OF ${total}`;
};

// The engine's reasons for the spin's quiet end, in words, once it's over: the capture or check it
// passed over first (it's what the player saw), then the move it played instead. The heading too.
type AnalysedMove = { from: Position; to: Position; piece: SymbolName; captured?: SymbolName | ''; check: boolean; mate: boolean };
const notation = (move: AnalysedMove) => moveNotation({ side: 'you', ...move, captured: move.captured || undefined });

export const whyHeading = () => (stateGame.analysis?.forcing ? 'WHY NO CAPTURE' : 'NOTHING TO TAKE');

export const whyLines = () => {
	const analysis = stateGame.analysis;
	if (!analysis) return [];
	const lines: string[] = [];
	const forcing = analysis.forcing;
	const played = `${notation(analysis.best)} (${scoreText(analysis.best.score)})`;
	if (!forcing) {
		lines.push('No capture or check was possible.');
		lines.push(`The engine played ${played}, a quiet move, so the spin ended.`);
	} else {
		const what = forcing.captured ? notation(forcing) : `the check ${notation(forcing)}`;
		const after = scoreText(forcing.score);
		// the two are scored a ply apart, so a close call can even read the other way
		const gap = (analysis.best.score - forcing.score) / 100;
		if (gap < 0.5) {
			lines.push(`${what} was possible (${after}), but the engine rated the two about the same.`);
		} else if (forcing.reply) {
			lines.push(`${what} would lose to ${notation(forcing.reply)} (${after}).`);
		} else {
			lines.push(`${what} would leave you at ${after}.`);
		}
		lines.push(`The engine played ${played} instead, a quiet move, so the spin ended.`);
	}
	// a sentence starts with a capital, even one starting with a move ("the check …")
	return lines.map((line) => line.charAt(0).toUpperCase() + line.slice(1));
};

// what a side has taken this spin, the pieces' pictures
export const takenKeys = (side: 'you' | 'them') =>
	stateGame.moves
		.filter((move) => move.side === side && move.captured)
		.map((move) => pieceAssetKey(move.captured as SymbolName, stateGame.yourColour))
		.filter((key): key is string => Boolean(key));

// as many as `room` (at least 2) of `pieces`, the latest; when some are left out (a long practice
// game), the first slot says how many instead ("+5")
export const fitTaken = (pieces: string[], room: number) => {
	const fit = Math.max(2, room);
	if (pieces.length <= fit) return { more: 0, pieces };
	return { more: pieces.length - (fit - 1), pieces: pieces.slice(-(fit - 1)) };
};
