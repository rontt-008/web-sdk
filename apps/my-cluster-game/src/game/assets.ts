export default {
	loader: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/loader/loader.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/loader/loader.json', import.meta.url).href,
			scale: 2,
		},
		preload: true,
	},
	pressToContinueText: {
		type: 'sprites',
		src: new URL('../../assets/sprites/pressToContinueText/MM_pressanywhere.json', import.meta.url).href,
		preload: true,
	},
	// the high symbols (see SYMBOL_INFO_MAP): their idle loops, 120 frames of 256 x 256 at 30 a
	// second, played in every state (see art-source/symbol-idles.py)
	blueberriesIdle: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolIdles/blueberries-idle.json', import.meta.url).href,
	},
	runestoneIdle: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolIdles/runestone-idle.json', import.meta.url).href,
	},
	mushroomIdle: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolIdles/mushroom-idle.json', import.meta.url).href,
	},
	acornIdle: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolIdles/acorn-idle.json', import.meta.url).href,
	},
	// the sample's fifth high symbol, not in this game's config
	H5: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols/h5.json', import.meta.url).href,
			scale: 2,
		},
	},
	// the low symbols (see SYMBOL_INFO_MAP), 256 x 256 (see art-source/README.md)
	leafGreen: {
		type: 'sprite',
		src: new URL('../../assets/symbols/leaf-green.webp', import.meta.url).href,
	},
	leafBrown: {
		type: 'sprite',
		src: new URL('../../assets/symbols/leaf-brown.webp', import.meta.url).href,
	},
	leafRed: {
		type: 'sprite',
		src: new URL('../../assets/symbols/leaf-red.webp', import.meta.url).href,
	},
	leafYellow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/leaf-yellow.webp', import.meta.url).href,
	},
	M: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols2/symbols2.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols2/M.json', import.meta.url).href,
			scale: 2,
		},
	},
	S: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols2/symbols2.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols2/S.json', import.meta.url).href,
			scale: 2,
		},
	},
	explosion: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols3/symbols3.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols3/explosion.json', import.meta.url).href,
			scale: 2,
		},
	},
	W: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols3/symbols3.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols3/W.json', import.meta.url).href,
			scale: 2,
		},
	},
	reelsFrame: {
		type: 'sprites',
		src: new URL('../../assets/sprites/reelsFrame/reels_frame.json', import.meta.url).href,
	},
	payFrame: {
		type: 'sprite',
		src: new URL('../../assets/sprites/payFrame/payFrame.png', import.meta.url).href,
	},
	anticipation: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/anticipation/anticipation.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/anticipation/anticipation.json', import.meta.url).href,
			scale: 2,
		},
	},
	goldFont: {
		type: 'font',
		src: new URL('../../assets/fonts/goldFont/mm_gold.xml', import.meta.url).href,
	},
	goldBlur: {
		type: 'font',
		src: new URL('../../assets/fonts/goldBlur/miningfont_gold_blur.xml', import.meta.url).href,
	},
	silverFont: {
		type: 'font',
		src: new URL('../../assets/fonts/silverFont/mm_silver.xml', import.meta.url).href,
	},
	purpleFont: {
		type: 'font',
		src: new URL('../../assets/fonts/purpleFont/mm_purple.xml', import.meta.url).href,
	},
	bigwin: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/bigwin/big_wins.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/bigwin/mm_bigwin.json', import.meta.url).href,
			scale: 2,
		},
	},
	globalMultiplier: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/globalMultiplier/multiframe.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/globalMultiplier/multiframe.json', import.meta.url).href,
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
	// the autumn lake behind everything, in the base game and free spins
	background: {
		type: 'sprite',
		src: new URL('../../assets/background.webp', import.meta.url).href,
		preload: true,
	},
	// the tree at the background's top left, cut out of it, so the clouds pass behind it (see Background)
	backgroundTree: {
		type: 'sprite',
		src: new URL('../../assets/background-tree.webp', import.meta.url).href,
		preload: true,
	},
	// cloud_1 to cloud_5, drifting across the background's sky (see Clouds)
	clouds: {
		type: 'sprites',
		src: new URL('../../assets/sprites/clouds/clouds.json', import.meta.url).href,
		preload: true,
	},
	// the red swoosh on the buy bonus button: white on transparent, tinted by the UI (see uiTheme's
	// buyBonus), the same as Cat Hunt's
	buyBonusLogo: {
		type: 'sprite',
		src: new URL('../../assets/buy-bonus-logo.png', import.meta.url).href,
	},
	// the same logo grown by its outline's width, drawn behind it
	buyBonusLogoOutline: {
		type: 'sprite',
		src: new URL('../../assets/buy-bonus-logo-outline.png', import.meta.url).href,
	},
	// the wooden frame around the board (see boardFrameLayout)
	boardFrame: {
		type: 'sprite',
		src: new URL('../../assets/board-frame.webp', import.meta.url).href,
		preload: true,
	},
	// standing right of the board, idling, with a gust of wind swinging its tail every so often (see Fox)
	foxIdle: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/fox/fox-idle.json', import.meta.url).href,
		preload: true,
	},
	foxGust: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/fox/fox-gust.json', import.meta.url).href,
		preload: true,
	},
	tumble_multiplier: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/tumbleWin/tumble_win.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/tumbleWin/tumble_multiplier.json', import.meta.url).href,
			scale: 2,
		},
	},
	tumble_win: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/tumbleWin/tumble_win.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/tumbleWin/tumble_win.json', import.meta.url).href,
			scale: 2,
		},
	},
	reelhouse: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/reelhouse/reelhouse_glow.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/reelhouse/reelhouse_glow.json', import.meta.url).href,
			scale: 2,
		},
	},
	progressBar: {
		type: 'sprites',
		src: new URL('../../assets/sprites/progressBar/progressBar.json', import.meta.url).href,
		preload: true,
	},
	freeSpins: {
		type: 'sprites',
		src: new URL('../../assets/sprites/freeSpins/freeSpins.json', import.meta.url).href,
	},
	winSmall: {
		type: 'sprites',
		src: new URL('../../assets/sprites/winSmall/MM_Localisation_winsmall.json', import.meta.url).href,
	},
	clusterWin: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/clusterWin/clusterpay.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/clusterWin/clusterpay.json', import.meta.url).href,
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
	symbolsStatic: {
		type: 'sprites',
		src: new URL('../../assets/sprites/symbolsStatic/symbolsStatic.json', import.meta.url).href,
	},
	coins: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/coin/SD2_Coin.json', import.meta.url).href,
	},
	sound: {
		type: 'audio',
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
		preload: true,
	},
} as const;
