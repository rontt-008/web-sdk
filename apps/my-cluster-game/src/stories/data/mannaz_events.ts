// Written by hand (not generated): the base game's Mannaz (MANNAZ in src/game/runes.ts) and the mythic
// bonus it starts, as the real math should send them, until its books have them. Rows counted from
// 1, as in the books.
import type { BookEvent } from '../../game/typesBookEvent';

// a few of Mannaz's spots under a spin's wins: the left stave's top three and the left arm's
const lightSome: BookEvent = {
	index: 4,
	type: 'runeLight',
	rune: 'mannaz',
	positions: [
		{ reel: 0, row: 1 },
		{ reel: 0, row: 2 },
		{ reel: 0, row: 3 },
		{ reel: 1, row: 2 },
	],
};

// the rest of it, lit by the spin's later tumbles
const lightRest: BookEvent = {
	index: 8,
	type: 'runeLight',
	rune: 'mannaz',
	positions: [
		{ reel: 0, row: 4 },
		{ reel: 0, row: 5 },
		{ reel: 2, row: 3 },
		{ reel: 3, row: 2 },
		{ reel: 4, row: 1 },
		{ reel: 4, row: 2 },
		{ reel: 4, row: 3 },
		{ reel: 4, row: 4 },
		{ reel: 4, row: 5 },
	],
};

export default {
	mannazLight: lightSome,
	// all of Mannaz lit in one spin, and the mythic bonus it starts: 10 MYTHIC FREE SPINS with Fehu
	// and Hagall already collected
	mythicTrigger: [
		lightSome,
		lightRest,
		{ index: 9, type: 'runeComplete', rune: 'mannaz' },
		{
			index: 10,
			type: 'freeSpinTrigger',
			totalFs: 10,
			positions: [],
			bonusType: 'mythic',
			collected: ['fehu', 'hagall'],
		},
	] satisfies BookEvent[],
};
