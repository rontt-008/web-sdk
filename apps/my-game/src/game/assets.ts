export default {
	H1: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols/h1.json', import.meta.url).href,
			scale: 2,
		},
	},
	H2: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols/h2.json', import.meta.url).href,
			scale: 2,
		},
	},
	H3: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols/h3.json', import.meta.url).href,
			scale: 2,
		},
	},
	H4: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols/h4.json', import.meta.url).href,
			scale: 2,
		},
	},
	H5: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols/h5.json', import.meta.url).href,
			scale: 2,
		},
	},
	L1: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols/l1.json', import.meta.url).href,
			scale: 2,
		},
	},
	L2: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols/l2.json', import.meta.url).href,
			scale: 2,
		},
	},
	L3: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols/l3.json', import.meta.url).href,
			scale: 2,
		},
	},
	L4: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols/l4.json', import.meta.url).href,
			scale: 2,
		},
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
	customBackground: {
		type: 'sprite',
		src: new URL('../../assets/custom-background2.png', import.meta.url).href,
		preload: true,
	},
	boardFrame: {
		type: 'sprite',
		src: new URL('../../assets/board-frame.png', import.meta.url).href,
	},
	// also shown on the loading screen, so it loads first
	gameLogo: {
		type: 'sprite',
		src: new URL('../../assets/game-logo.png', import.meta.url).href,
		preload: true,
	},
	// the cat sitting on a rock under the logo, cropped to their edges, and their soft shadows like
	// the symbols'
	logoRock: {
		type: 'sprite',
		src: new URL('../../assets/logo-rock.png', import.meta.url).href,
	},
	logoRockShadow: {
		type: 'sprite',
		src: new URL('../../assets/logo-rock-shadow.png', import.meta.url).href,
	},
	logoCat: {
		type: 'sprite',
		src: new URL('../../assets/logo-cat.png', import.meta.url).href,
	},
	// the same cat with its eyes shut, for blinking
	logoCatBlink: {
		type: 'sprite',
		src: new URL('../../assets/logo-cat-blink.png', import.meta.url).href,
	},
	logoCatShadow: {
		type: 'sprite',
		src: new URL('../../assets/logo-cat-shadow.png', import.meta.url).href,
	},
	sunGlow: {
		type: 'sprite',
		src: new URL('../../assets/sun-glow.png', import.meta.url).href,
	},
	sunRays: {
		type: 'sprite',
		src: new URL('../../assets/sun-rays.png', import.meta.url).href,
	},
	buttonBuyBonus: {
		type: 'sprite',
		src: new URL('../../assets/button-buy-bonus.png', import.meta.url).href,
	},
	// white on transparent, tinted by the UI's buy bonus button (see uiTheme's buyBonus)
	buyBonusLogo: {
		type: 'sprite',
		src: new URL('../../assets/buy-bonus-logo.png', import.meta.url).href,
	},
	// the same logo grown by its outline's width, drawn white behind it
	buyBonusLogoOutline: {
		type: 'sprite',
		src: new URL('../../assets/buy-bonus-logo-outline.png', import.meta.url).href,
	},
	symbolH1: {
		type: 'sprite',
		src: new URL('../../assets/symbols/h1.png', import.meta.url).href,
	},
	symbolH2: {
		type: 'sprite',
		src: new URL('../../assets/symbols/h2.png', import.meta.url).href,
	},
	symbolH3: {
		type: 'sprite',
		src: new URL('../../assets/symbols/h3.png', import.meta.url).href,
	},
	symbolH4: {
		type: 'sprite',
		src: new URL('../../assets/symbols/h4.png', import.meta.url).href,
	},
	symbolL1: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l1.png', import.meta.url).href,
	},
	symbolL2: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l2.png', import.meta.url).href,
	},
	symbolL3: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l3.png', import.meta.url).href,
	},
	symbolL4: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l4.png', import.meta.url).href,
	},
	symbolL5: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l5.png', import.meta.url).href,
	},
	symbolW: {
		type: 'sprite',
		src: new URL('../../assets/symbols/w.png', import.meta.url).href,
	},
	symbolS: {
		type: 'sprite',
		src: new URL('../../assets/symbols/s.png', import.meta.url).href,
	},
	bigWild: {
		type: 'sprite',
		src: new URL('../../assets/symbols/big-wild.png', import.meta.url).href,
	},
	symbolH1Shadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/h1-shadow.png', import.meta.url).href,
	},
	symbolH2Shadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/h2-shadow.png', import.meta.url).href,
	},
	symbolH3Shadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/h3-shadow.png', import.meta.url).href,
	},
	symbolH4Shadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/h4-shadow.png', import.meta.url).href,
	},
	symbolL1Shadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l1-shadow.png', import.meta.url).href,
	},
	symbolL2Shadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l2-shadow.png', import.meta.url).href,
	},
	symbolL3Shadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l3-shadow.png', import.meta.url).href,
	},
	symbolL4Shadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l4-shadow.png', import.meta.url).href,
	},
	symbolL5Shadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l5-shadow.png', import.meta.url).href,
	},
	symbolWShadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/w-shadow.png', import.meta.url).href,
	},
	symbolSShadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/s-shadow.png', import.meta.url).href,
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
	// a web font for Text; pixi names it after the file, so it is used as fontFamily 'Titan One'.
	// Loads first, as the loading bar's percentage is written in it
	titanOne: {
		type: 'font',
		src: new URL('../../assets/fonts/titanOne/titan-one.ttf', import.meta.url).href,
		preload: true,
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
	foregroundAnimation: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/foregroundAnimation/mm_bg.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/foregroundAnimation/mm_bg.json', import.meta.url).href,
			scale: 2,
		},
		preload: true,
	},
	foregroundFeatureAnimation: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/foregroundFeatureAnimation/mm_bg_feature.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/foregroundFeatureAnimation/mm_bg_feature.json', import.meta.url).href,
			scale: 2,
		},
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
