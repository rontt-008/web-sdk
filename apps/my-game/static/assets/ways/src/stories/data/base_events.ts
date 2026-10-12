export default {
	reveal: {
		type: 'reveal',
		board: [
			[
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
			],
			[
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
			],
			[
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
			],
			[
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H5',
				},
				{
					name: 'H5',
				},
			],
			[
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
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
		totalFs: 15,
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
		total: 15,
	},
	winInfo: {
		type: 'winInfo',
		totalWin: 170,
		wins: [
			{
				symbol: 'L4',
				kind: 3,
				win: 10,
				positions: [
					{
						reel: 0,
						row: 1,
					},
					{
						reel: 1,
						row: 3,
					},
					{
						reel: 2,
						row: 3,
					},
				],
				meta: {
					ways: 1,
					globalMult: 1,
					winWithoutMult: 10,
					symbolMult: 0,
				},
			},
			{
				symbol: 'L3',
				kind: 3,
				win: 160,
				positions: [
					{
						reel: 0,
						row: 2,
					},
					{
						reel: 0,
						row: 3,
					},
					{
						reel: 1,
						row: 2,
					},
					{
						reel: 1,
						row: 3,
					},
					{
						reel: 2,
						row: 1,
					},
					{
						reel: 2,
						row: 2,
					},
				],
				meta: {
					ways: 8,
					globalMult: 1,
					winWithoutMult: 160,
					symbolMult: 0,
				},
			},
		],
	},
	setWin: {
		type: 'setWin',
		amount: 170,
		winLevel: 3,
	},
	freeSpinEnd: {
		type: 'freeSpinEnd',
		amount: 3230,
		winLevel: 5,
	},
};
