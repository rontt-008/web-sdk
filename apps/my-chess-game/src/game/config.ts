// The game's settings, as the math's config_fe_my_chess_game.json (math-sdk games/my_chess_game): the
// bet modes at their prices (the base game, DUMB MODE for 3x a spin, the bonus buy, CHEATER MODE for 30x a spin,
// the SUPER BONUS buy),
// and the symbols: your pieces (W, white in the math, where you always move first), the other side's (B)
// and the empty square. Only the other side's pieces pay, when you take them (one capture: the
// paytable's "1").
export default {
	providerName: 'sample_provider',
	gameName: 'my_chess_game',
	gameID: 'my_chess_game',
	rtp: 0.967,
	numReels: 8,
	numRows: [8, 8, 8, 8, 8, 8, 8, 8],
	betModes: {
		base: {
			cost: 1.0,
			feature: true,
			buyBonus: false,
			rtp: 0.967,
			max_win: 25000.0,
		},
		booster: {
			cost: 3.0,
			feature: true,
			buyBonus: false,
			rtp: 0.967,
			max_win: 25000.0,
		},
		bonus: {
			cost: 100.0,
			feature: false,
			buyBonus: true,
			rtp: 0.967,
			max_win: 25000.0,
		},
		cheat: {
			cost: 30.0,
			feature: true,
			buyBonus: false,
			rtp: 0.967,
			max_win: 25000.0,
		},
		// the SUPER BONUS, bought (the math's super_cost)
		super: {
			cost: 500.0,
			feature: false,
			buyBonus: true,
			rtp: 0.967,
			max_win: 25000.0,
		},
	},
	symbols: {
		WP: { paytable: null, special_properties: ['mine'] },
		WN: { paytable: null, special_properties: ['mine'] },
		WB: { paytable: null, special_properties: ['mine'] },
		WR: { paytable: null, special_properties: ['mine'] },
		WQ: { paytable: null, special_properties: ['mine'] },
		WK: { paytable: null, special_properties: ['mine', 'king'] },
		BP: { paytable: [{ '1': 0.2 }] },
		BN: { paytable: [{ '1': 0.6 }] },
		BB: { paytable: [{ '1': 0.6 }] },
		BR: { paytable: [{ '1': 1.0 }] },
		BQ: { paytable: [{ '1': 2.0 }] },
		BK: { paytable: null, special_properties: ['king'] },
		E: { paytable: null, special_properties: ['empty'] },
	},
	paddingReels: {
		basegame: [],
		freegame: [],
	},
};
