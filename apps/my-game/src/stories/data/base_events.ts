export default {
	reveal: {
		type: 'reveal',
		board: [
			[
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
			],
			[
				{
					name: 'H1',
				},
				{
					name: 'L5',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
			],
			[
				{
					name: 'L3',
				},
				{
					name: 'L5',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
			],
			[
				{
					name: 'H4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L5',
				},
				{
					name: 'L1',
				},
			],
			[
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
			],
		],
		paddingPositions: [216, 205, 195, 16, 65],
		gameType: 'basegame',
		anticipation: [0, 0, 0, 0, 0],
	},
	// reel 2 lands one W, so the whole reel is shown as one big wild
	revealBigWild: {
		type: 'reveal',
		board: [
			[{ name: 'L2' }, { name: 'H3' }, { name: 'L4' }, { name: 'H2' }, { name: 'L1' }, { name: 'L5' }],
			[{ name: 'H1' }, { name: 'L5' }, { name: 'H3' }, { name: 'L3' }, { name: 'L4' }, { name: 'L2' }],
			[
				{ name: 'L3' },
				{ name: 'H4' },
				{ name: 'L1' },
				{ name: 'W', wild: true, multiplier: 3 },
				{ name: 'L5' },
				{ name: 'L4' },
			],
			[{ name: 'H4' }, { name: 'L1' }, { name: 'H3' }, { name: 'L5' }, { name: 'H1' }, { name: 'L1' }],
			[{ name: 'H3' }, { name: 'L3' }, { name: 'L2' }, { name: 'H1' }, { name: 'L2' }, { name: 'H1' }],
		],
		paddingPositions: [216, 205, 195, 16, 65],
		gameType: 'basegame',
		anticipation: [0, 0, 0, 0, 0],
	},
	winInfoBigWild: {
		type: 'winInfo',
		totalWin: 900,
		wins: [
			{
				symbol: 'H3',
				kind: 4,
				win: 900,
				positions: [
					{ reel: 0, row: 1 },
					{ reel: 1, row: 2 },
					{ reel: 2, row: 3 },
					{ reel: 3, row: 2 },
				],
				meta: {
					lineIndex: 1,
					multiplier: 3,
					winWithoutMult: 300,
					globalMult: 1,
					lineMultiplier: 3,
				},
			},
		],
	},
	// the big wild on reel 2 (revealBigWild) throws 3 wilds
	bigWildThrow: {
		type: 'bigWildThrow',
		reel: 2,
		positions: [
			{ reel: 0, row: 2 },
			{ reel: 3, row: 1 },
			{ reel: 4, row: 4 },
		],
	},
	setTotalWin: {
		type: 'setTotalWin',
		amount: 1000,
	},
	finalWin: {
		type: 'finalWin',
		amount: 0,
	},
	// 3 FS symbols: normal bonus
	freeSpinTrigger: {
		type: 'freeSpinTrigger',
		totalFs: 12,
		positions: [
			{
				reel: 0,
				row: 3,
			},
			{
				reel: 1,
				row: 1,
			},
			{
				reel: 2,
				row: 3,
			},
		],
	},
	// 4 FS symbols: super bonus
	freeSpinTriggerSuper: {
		type: 'freeSpinTrigger',
		totalFs: 12,
		positions: [
			{ reel: 0, row: 3 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 3 },
			{ reel: 4, row: 3 },
		],
	},
	// 5 FS symbols: mythic bonus
	freeSpinTriggerMythic: {
		type: 'freeSpinTrigger',
		totalFs: 12,
		positions: [
			{ reel: 0, row: 3 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 3 },
			{ reel: 3, row: 2 },
			{ reel: 4, row: 3 },
		],
	},
	updateFreeSpin: {
		type: 'updateFreeSpin',
		amount: 1,
		total: 12,
	},
	winInfo: {
		type: 'winInfo',
		totalWin: 400,
		wins: [
			{
				symbol: 'H3',
				kind: 3,
				win: 200,
				positions: [
					{
						reel: 0,
						row: 1,
					},
					{
						reel: 1,
						row: 2,
					},
					{
						reel: 2,
						row: 3,
					},
				],
				meta: {
					lineIndex: 4,
					multiplier: 1,
					winWithoutMult: 200,
					globalMult: 1,
					lineMultiplier: 1.0,
				},
			},
			{
				symbol: 'H3',
				kind: 3,
				win: 200,
				positions: [
					{
						reel: 0,
						row: 3,
					},
					{
						reel: 1,
						row: 2,
					},
					{
						reel: 2,
						row: 3,
					},
				],
				meta: {
					lineIndex: 13,
					multiplier: 1,
					winWithoutMult: 200,
					globalMult: 1,
					lineMultiplier: 1.0,
				},
			},
		],
	},
	setWin: {
		type: 'setWin',
		amount: 400,
		winLevel: 4,
	},
	freeSpinEnd: {
		type: 'freeSpinEnd',
		amount: 400,
		winLevel: 2,
	},
};
