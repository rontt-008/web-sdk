// the pieces' pictures (art-source/pieces.py): white and black, each kind. Each path written out:
// Vite rewrites these URLs as it bundles, and can't resolve one built from a variable
const piece = (href: string) => ({ type: 'sprite', src: href }) as const;

import { ARM_SLAM_ASSETS } from './armSlamAssets';

export default {
	// the arm slamming its fist on the table as a bonus starts (FistSlam; art-source/arm-slam.py)
	...ARM_SLAM_ASSETS,
	// the wooden table the board lies on, the lamp and the book at its left (Background; art-source/table.py):
	// preloaded with the pieces standing on it, so the loading screen is on the table too
	table: {
		type: 'sprite',
		src: new URL('../../assets/table.webp', import.meta.url).href,
		preload: true,
	},
	// the fist that slams the board as a bonus starts (FistSlam; art-source/fist.py)
	fist: {
		type: 'sprite',
		src: new URL('../../assets/fist.webp', import.meta.url).href,
	},
	// the pieces standing on the table left of the board (Background; art-source/table-pieces.py)
	tableKing: {
		type: 'sprite',
		src: new URL('../../assets/table-pieces/king.webp', import.meta.url).href,
		preload: true,
	},
	tablePawn: {
		type: 'sprite',
		src: new URL('../../assets/table-pieces/pawn.webp', import.meta.url).href,
		preload: true,
	},
	tableRook: {
		type: 'sprite',
		src: new URL('../../assets/table-pieces/rook.webp', import.meta.url).href,
		preload: true,
	},
	// and their animations as a fist slams the table (TablePieces; art-source/table-piece-anims.py, from
	// the user's Blender renders): loaded once the game is up, only where the pieces are shown
	tableKingAnim: {
		type: 'spriteSheet',
		src: new URL('../../assets/table-pieces/king-anim.json', import.meta.url).href,
		lazy: true,
	},
	tablePawnAnim: {
		type: 'spriteSheet',
		src: new URL('../../assets/table-pieces/pawn-anim.json', import.meta.url).href,
		lazy: true,
	},
	tableRookAnim: {
		type: 'spriteSheet',
		src: new URL('../../assets/table-pieces/rook-anim.json', import.meta.url).href,
		lazy: true,
	},
	// the board's wooden frame, flat (it's tilted with the board; art-source/board-frame.py)
	boardFrame: {
		type: 'sprite',
		src: new URL('../../assets/board-frame.webp', import.meta.url).href,
	},
	// the board's eight by eight squares, edge to edge (Background; art-source/board.py)
	board: {
		type: 'sprite',
		src: new URL('../../assets/board.webp', import.meta.url).href,
	},
	// the side panel's marble, the board's own (SidePanel; art-source/panel-texture.py): its page the light
	// squares', its head the dark squares'
	panelLight: {
		type: 'sprite',
		src: new URL('../../assets/panel-light.webp', import.meta.url).href,
	},
	panelDark: {
		type: 'sprite',
		src: new URL('../../assets/panel-dark.webp', import.meta.url).href,
	},
	// the multiplier badge's frame (ComboMultiplier): the user's astrology circle, see art-source
	multiplierFrame: {
		type: 'sprite',
		src: new URL('../../assets/multiplier-frame.webp', import.meta.url).href,
	},
	wP: piece(new URL('../../assets/pieces/wP.webp', import.meta.url).href),
	wN: piece(new URL('../../assets/pieces/wN.webp', import.meta.url).href),
	wB: piece(new URL('../../assets/pieces/wB.webp', import.meta.url).href),
	wR: piece(new URL('../../assets/pieces/wR.webp', import.meta.url).href),
	wQ: piece(new URL('../../assets/pieces/wQ.webp', import.meta.url).href),
	wK: piece(new URL('../../assets/pieces/wK.webp', import.meta.url).href),
	bP: piece(new URL('../../assets/pieces/bP.webp', import.meta.url).href),
	bN: piece(new URL('../../assets/pieces/bN.webp', import.meta.url).href),
	bB: piece(new URL('../../assets/pieces/bB.webp', import.meta.url).href),
	bR: piece(new URL('../../assets/pieces/bR.webp', import.meta.url).href),
	bQ: piece(new URL('../../assets/pieces/bQ.webp', import.meta.url).href),
	bK: piece(new URL('../../assets/pieces/bK.webp', import.meta.url).href),
	// the SUPER BONUS's golden king, the other side's (art-source/gold-king.py)
	gK: piece(new URL('../../assets/pieces/gK.webp', import.meta.url).href),
	// Germania One (OFL, Google Fonts, as the cluster game's), chunky carved letters, for the buy bonus
	// menu's cards (SignText); registered as "Germania One" from its file's name, loaded before the game
	// shows
	germaniaOne: {
		type: 'font',
		src: new URL('../../assets/fonts/germaniaOne/germania-one.ttf', import.meta.url).href,
		preload: true,
	},
	goldFont: {
		type: 'font',
		src: new URL('../../assets/fonts/goldFont/mm_gold.xml', import.meta.url).href,
	},
	bigwin: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/bigwin/big_wins.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/bigwin/mm_bigwin.json', import.meta.url).href,
			scale: 2,
		},
	},
	fsIntro: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/fsIntro/fs_screen.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/fsIntro/fs_screen.json', import.meta.url).href,
			scale: 2,
		},
	},
	fsIntroNumber: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/fsIntro/fs_screen.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/fsIntro/fs_screen_number.json', import.meta.url).href,
			scale: 2,
		},
	},
	fsOutroNumber: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/fsIntro/fs_screen.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/fsIntro/fs_total_number.json', import.meta.url).href,
			scale: 2,
		},
	},
	transition: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/transition/transition.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/transition/transition.json', import.meta.url).href,
			scale: 2,
		},
	},
	freeSpins: {
		type: 'sprites',
		src: new URL('../../assets/sprites/freeSpins/freeSpins.json', import.meta.url).href,
	},
	winSmall: {
		type: 'sprites',
		src: new URL('../../assets/sprites/winSmall/MM_Localisation_winsmall.json', import.meta.url).href,
	},
	coins: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/coin/SD2_Coin.json', import.meta.url).href,
	},
	sound: {
		type: 'audio',
		// loaded with the rest, not before the loading screen (it's only played once that's been clicked):
		// the biggest file by far, it held the loading screen back
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
	},
} as const;
