export default {
	providerName: 'sample_provider',
	gameName: 'sample_lines',
	gameID: '0_0_ways',
	rtp: 0.97,
	numReels: 5,
	numRows: [3, 3, 3, 3, 3],
	betModes: {
		base: {
			cost: 1.0,
			feature: true,
			buyBonus: false,
			rtp: 0.97,
			max_win: 5000,
		},
		bonus: {
			cost: 100.0,
			feature: false,
			buyBonus: true,
			rtp: 0.97,
			max_win: 5000,
		},
	},
	symbols: {
		W: {
			paytable: null,
			special_properties: ['wild'],
		},
		H4: {
			paytable: [
				{
					'5': 3,
				},
				{
					'4': 1,
				},
				{
					'3': 0.5,
				},
			],
		},
		H5: {
			paytable: [
				{
					'5': 2,
				},
				{
					'4': 0.8,
				},
				{
					'3': 0.4,
				},
			],
		},
		S: {
			paytable: null,
			special_properties: ['scatter'],
		},
		L1: {
			paytable: [
				{
					'5': 2,
				},
				{
					'4': 0.8,
				},
				{
					'3': 0.4,
				},
			],
		},
		L2: {
			paytable: [
				{
					'5': 1.5,
				},
				{
					'4': 0.5,
				},
				{
					'3': 0.2,
				},
			],
		},
		L3: {
			paytable: [
				{
					'5': 1.5,
				},
				{
					'4': 0.5,
				},
				{
					'3': 0.2,
				},
			],
		},
		L4: {
			paytable: [
				{
					'5': 1,
				},
				{
					'4': 0.3,
				},
				{
					'3': 0.1,
				},
			],
		},
		H3: {
			paytable: [
				{
					'5': 5,
				},
				{
					'4': 2,
				},
				{
					'3': 1,
				},
			],
		},
		H2: {
			paytable: [
				{
					'5': 8,
				},
				{
					'4': 4,
				},
				{
					'3': 2,
				},
			],
		},
		H1: {
			paytable: [
				{
					'5': 10,
				},
				{
					'4': 5,
				},
				{
					'3': 3,
				},
			],
		},
	},
	paddingReels: {
		basegame: '',
		freegame: '',
		superspingame: '',
	},
};
