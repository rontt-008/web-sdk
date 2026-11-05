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
	setTotalWin: {
		type: 'setTotalWin',
		amount: 1000,
	},
	finalWin: {
		type: 'finalWin',
		amount: 0,
	},
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
			{
				reel: 4,
				row: 3,
			},
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
