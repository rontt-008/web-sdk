export default {
	// the game's name on a wooden sign: the sign and its letters, each its own frame, as the letters
	// move on their own (see LogoArt, art-source/logo-idle.py); loaded first, as the start screen
	// shows it while the rest loads
	logoIdle: {
		type: 'sprites',
		src: new URL('../../assets/sprites/logo/logo-idle.json', import.meta.url).href,
		preload: true,
	},
	// the high symbols (see SYMBOL_INFO_MAP): their idle loops, 120 frames of 256 x 256 at 30 a
	// second, played in every state, and their hits, 60 frames at 60 a second played once on a win
	// (see art-source/symbol-animations.py)
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
	// and the wild's (W), its letters and runes moving
	wildIdle: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolIdles/wild-idle.json', import.meta.url).href,
	},
	blueberriesHit: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolHits/blueberries-hit.json', import.meta.url).href,
	},
	runestoneHit: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolHits/runestone-hit.json', import.meta.url).href,
	},
	mushroomHit: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolHits/mushroom-hit.json', import.meta.url).href,
	},
	acornHit: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolHits/acorn-hit.json', import.meta.url).href,
	},
	wildHit: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolHits/wild-hit.json', import.meta.url).href,
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
	// the Fehu symbol (F) and the Ingwaz symbol (I), the user's art, 1254 x 1254
	fehuSymbol: {
		type: 'sprite',
		src: new URL('../../assets/symbols/symbolrune.png', import.meta.url).href,
	},
	ingwazSymbol: {
		type: 'sprite',
		src: new URL('../../assets/symbols/symbolrune2.png', import.meta.url).href,
	},
	// and their lands, the user's Blender animations: 90 frames of 256 x 256 at 60 a second played
	// once as they land, lined up with the art above (see art-source/rune-lands.py)
	fehuLand: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolLands/fehu-land.json', import.meta.url).href,
	},
	ingwazLand: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolLands/ingwaz-land.json', import.meta.url).href,
	},
	// the leaves' hits, 90 frames of 320 x 320 at 60 a second played once on a win (see
	// art-source/leaf-hits.py)
	leafGreenHit: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolHits/leaf-green-hit.json', import.meta.url).href,
	},
	leafBrownHit: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolHits/leaf-brown-hit.json', import.meta.url).href,
	},
	leafRedHit: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolHits/leaf-red-hit.json', import.meta.url).href,
	},
	leafYellowHit: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/symbolHits/leaf-yellow-hit.json', import.meta.url).href,
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
	reelsFrame: {
		type: 'sprites',
		src: new URL('../../assets/sprites/reelsFrame/reels_frame.json', import.meta.url).href,
	},
	payFrame: {
		type: 'sprite',
		src: new URL('../../assets/sprites/payFrame/payFrame.png', import.meta.url).href,
	},
	// Germania One (OFL, Google Fonts), chunky carved letters like the logo's, for the bonus meter's
	// count; registered as "Germania One" from its file's name, loaded before the game shows
	germaniaOne: {
		type: 'font',
		src: new URL('../../assets/fonts/germaniaOne/germania-one.ttf', import.meta.url).href,
		preload: true,
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
	// the frame round the bonus meter, with the sign for its count (see BonusMeter,
	// art-source/wood-frames.py)
	bonusMeterFrame: {
		type: 'sprite',
		src: new URL('../../assets/bonus-meter-frame.webp', import.meta.url).href,
	},
	// its planks green alone, revealed in the bonus's zone as it fills, and orange, in the super
	// bonus's
	bonusMeterFill: {
		type: 'sprite',
		src: new URL('../../assets/bonus-meter-fill.webp', import.meta.url).href,
	},
	bonusMeterFillSuper: {
		type: 'sprite',
		src: new URL('../../assets/bonus-meter-fill-super.webp', import.meta.url).href,
	},
	// and yellow, on the way to the bonus
	bonusMeterFillProgress: {
		type: 'sprite',
		src: new URL('../../assets/bonus-meter-fill-progress.webp', import.meta.url).href,
	},
	// the sign for the free and power spins' count, in the meter's place in the bonus (see
	// FreeSpinCounter, art-source/wood-frames.py)
	spinSign: {
		type: 'sprite',
		src: new URL('../../assets/spin-sign.webp', import.meta.url).href,
	},
	// the cards on the start screen, for the game's info (see InfoCard, art-source/wood-frames.py)
	infoCard: {
		type: 'sprite',
		src: new URL('../../assets/info-card.webp', import.meta.url).href,
	},
	// the panel of the free spins' intro and end screens (see FreeSpinAnimation,
	// art-source/wood-frames.py)
	screenPanel: {
		type: 'sprite',
		src: new URL('../../assets/screen-panel.webp', import.meta.url).href,
	},

	// the ladder of branches the rune boxes sit in, left of the board (see RuneTablets,
	// art-source/wood-frames.py)
	runeLadder: {
		type: 'sprite',
		src: new URL('../../assets/rune-ladder.webp', import.meta.url).href,
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
			skeleton: new URL('../../assets/spines/tumbleWin/tumble_multiplier.json', import.meta.url)
				.href,
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
	clusterWin: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/clusterWin/clusterpay.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/clusterWin/clusterpay.json', import.meta.url).href,
			scale: 2,
		},
	},
	symbolsStatic: {
		type: 'sprites',
		src: new URL('../../assets/sprites/symbolsStatic/symbolsStatic.json', import.meta.url).href,
	},
	sound: {
		type: 'audio',
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
		preload: true,
	},
} as const;
