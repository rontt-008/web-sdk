export type EmitterEventModal =
	| { type: 'soundPressGeneral' }
	| { type: 'buyBonusConfirm' }
	| { type: 'bet' }
	| { type: 'autoBet' }
	// the replay card's START REPLAY, like the UI's PLAY button
	| { type: 'soundPressBet' }
	| { type: 'resumeBet' };
