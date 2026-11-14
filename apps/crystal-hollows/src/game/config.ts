export default {
	providerName: 'sample_provider',
	gameName: 'crystal_hollows',
	gameID: '0_0_lines',
	rtp: 0.97,
	numReels: 5,
	numRows: [4, 4, 4, 4, 4],
	betModes: {
		base: {
			cost: 1.0,
			feature: true,
			buyBonus: false,
			rtp: 0.97,
			max_win: 25000.0,
		},
		bonus: {
			cost: 100.0,
			feature: false,
			buyBonus: true,
			rtp: 0.97,
			max_win: 25000.0,
		},
	},
	paylines: {
		// 4 rows (0 top to 3 bottom); 1-14 the same as Cat Hunt's (apps/my-game). Placeholder until
		// the math is written
		'1': [0, 0, 0, 0, 0],
		'2': [1, 1, 1, 1, 1],
		'3': [2, 2, 2, 2, 2],
		'4': [3, 3, 3, 3, 3],
		'5': [0, 1, 0, 1, 0],
		'6': [1, 2, 1, 2, 1],
		'7': [2, 3, 2, 3, 2],
		'8': [1, 0, 1, 0, 1],
		'9': [2, 1, 2, 1, 2],
		'10': [3, 2, 3, 2, 3],
		'11': [0, 1, 2, 1, 0],
		'12': [1, 2, 3, 2, 1],
		'13': [3, 2, 1, 2, 3],
		'14': [2, 1, 0, 1, 2],
		'15': [0, 0, 1, 0, 0],
		'16': [3, 3, 2, 3, 3],
		'17': [1, 1, 0, 1, 1],
		'18': [2, 2, 3, 2, 2],
		'19': [0, 1, 1, 1, 0],
		'20': [3, 2, 2, 2, 3],
	},
	symbols: {
		L1: {
			paytable: [
				{
					'5': 5,
				},
				{
					'4': 1,
				},
				{
					'3': 0.5,
				},
			],
		},
		H4: {
			paytable: [
				{
					'5': 8,
				},
				{
					'4': 2,
				},
				{
					'3': 1,
				},
			],
		},
		L4: {
			paytable: [
				{
					'5': 2,
				},
				{
					'4': 0.5,
				},
				{
					'3': 0.2,
				},
			],
		},
		S: {
			special_properties: ['scatter'],
		},
		H2: {
			paytable: [
				{
					'5': 15,
				},
				{
					'4': 5,
				},
				{
					'3': 3,
				},
			],
		},
		L3: {
			paytable: [
				{
					'5': 3,
				},
				{
					'4': 0.7,
				},
				{
					'3': 0.3,
				},
			],
		},
		W: {
			paytable: [
				{
					'5': 20,
				},
				{
					'4': 10,
				},
				{
					'3': 5,
				},
			],
			special_properties: ['wild', 'multiplier'],
		},
		H3: {
			paytable: [
				{
					'5': 10,
				},
				{
					'4': 3,
				},
				{
					'3': 2,
				},
			],
		},
		L2: {
			paytable: [
				{
					'5': 3,
				},
				{
					'4': 0.7,
				},
				{
					'3': 0.3,
				},
			],
		},
		H1: {
			paytable: [
				{
					'5': 20,
				},
				{
					'4': 10,
				},
				{
					'3': 5,
				},
			],
		},
	},
	paddingReels: {
		basegame: [
			[
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'S',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
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
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
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
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
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
				{
					name: 'L2',
				},
				{
					name: 'S',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'W',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'S',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
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
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
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
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
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
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
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
				{
					name: 'W',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'S',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
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
				{
					name: 'H2',
				},
				{
					name: 'L1',
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
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'S',
				},
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
			],
			[
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'S',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
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
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'W',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
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
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
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
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'W',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
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
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
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
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
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
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
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
					name: 'L3',
				},
				{
					name: 'S',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'S',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
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
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
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
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
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
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'S',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
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
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
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
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
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
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'W',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
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
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'S',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
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
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'W',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
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
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'S',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
			],
			[
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'S',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
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
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'W',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
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
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
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
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
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
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'W',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
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
				{
					name: 'L1',
				},
				{
					name: 'L3',
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
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
			],
			[
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'S',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'W',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'S',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
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
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
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
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'S',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
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
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'W',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
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
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H3',
				},
				{
					name: 'S',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
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
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'S',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
			],
		],
		freegame: [
			[
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
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
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
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
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
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
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
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
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
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
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
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
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'W',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
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
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'W',
				},
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
					name: 'L3',
				},
				{
					name: 'L3',
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
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
			],
			[
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
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
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
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
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
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
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
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
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'S',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'S',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
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
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'W',
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
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
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
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'W',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
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
					name: 'H4',
				},
				{
					name: 'L2',
				},
			],
			[
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
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
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
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
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'S',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
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
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
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
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'W',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
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
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
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
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
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
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
			],
			[
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
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
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
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
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
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
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'W',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
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
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'S',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'S',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'S',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'W',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
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
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
			],
			[
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H1',
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
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
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
				{
					name: 'L2',
				},
				{
					name: 'H3',
				},
				{
					name: 'W',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L3',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'L2',
				},
				{
					name: 'L1',
				},
				{
					name: 'H4',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'H2',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'L3',
				},
				{
					name: 'W',
				},
				{
					name: 'L1',
				},
				{
					name: 'H1',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
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
					name: 'H1',
				},
				{
					name: 'H3',
				},
				{
					name: 'L4',
				},
				{
					name: 'H2',
				},
				{
					name: 'H2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H2',
				},
				{
					name: 'H3',
				},
				{
					name: 'H4',
				},
				{
					name: 'L1',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'L1',
				},
				{
					name: 'L4',
				},
				{
					name: 'L2',
				},
				{
					name: 'L3',
				},
				{
					name: 'H1',
				},
				{
					name: 'H4',
				},
				{
					name: 'L2',
				},
				{
					name: 'H4',
				},
				{
					name: 'L4',
				},
			],
		],
	},
};
