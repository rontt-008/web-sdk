export default {
	customBackground: {
		type: 'sprite',
		src: new URL('../../assets/custom-background2.webp', import.meta.url).href,
		preload: true,
	},
	boardFrame: {
		type: 'sprite',
		src: new URL('../../assets/board-frame.webp', import.meta.url).href,
	},
	// the cat paws that carry a walking big wild in SUPER free spins
	hands: {
		type: 'sprite',
		src: new URL('../../assets/hands.webp', import.meta.url).href,
	},
	// also shown on the loading screen, so it loads first
	gameLogo: {
		type: 'sprite',
		src: new URL('../../assets/game-logo.webp', import.meta.url).href,
		preload: true,
	},
	// the cat sitting on a rock under the logo, cropped to their edges, and their soft shadows like
	// the symbols'
	logoRock: {
		type: 'sprite',
		src: new URL('../../assets/logo-rock.webp', import.meta.url).href,
	},
	logoRockShadow: {
		type: 'sprite',
		src: new URL('../../assets/logo-rock-shadow.webp', import.meta.url).href,
	},
	logoCat: {
		type: 'sprite',
		src: new URL('../../assets/logo-cat.webp', import.meta.url).href,
	},
	// the same cat with its eyes shut, for blinking
	logoCatBlink: {
		type: 'sprite',
		src: new URL('../../assets/logo-cat-blink.webp', import.meta.url).href,
	},
	// its pupils drawn apart from the art so they can look around: one pupil, drawn in each eye, the
	// eyes with their painted pupils painted out, and the inside of each eye's rim (see LogoCat)
	logoCatPupil: {
		type: 'sprite',
		src: new URL('../../assets/logo-cat-pupil.png', import.meta.url).href,
	},
	logoCatIrises: {
		type: 'sprite',
		src: new URL('../../assets/logo-cat-irises.png', import.meta.url).href,
	},
	logoCatEyeMask: {
		type: 'sprite',
		src: new URL('../../assets/logo-cat-eye-mask.png', import.meta.url).href,
	},
	logoCatShadow: {
		type: 'sprite',
		src: new URL('../../assets/logo-cat-shadow.webp', import.meta.url).href,
	},
	// the yarn ball symbol without its tail, cropped to the round ball, for the ball that rolls across
	// the screen (see YarnBall), and its soft shadow
	yarnBall: {
		type: 'sprite',
		src: new URL('../../assets/yarn-ball.webp', import.meta.url).href,
	},
	yarnBallShadow: {
		type: 'sprite',
		src: new URL('../../assets/yarn-ball-shadow.webp', import.meta.url).href,
	},
	sunGlow: {
		type: 'sprite',
		src: new URL('../../assets/sun-glow.png', import.meta.url).href,
	},
	sunRays: {
		type: 'sprite',
		src: new URL('../../assets/sun-rays.webp', import.meta.url).href,
	},
	buttonBuyBonus: {
		type: 'sprite',
		src: new URL('../../assets/button-buy-bonus.webp', import.meta.url).href,
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
		src: new URL('../../assets/symbols/h1.webp', import.meta.url).href,
	},
	symbolH2: {
		type: 'sprite',
		src: new URL('../../assets/symbols/h2.webp', import.meta.url).href,
	},
	symbolH3: {
		type: 'sprite',
		src: new URL('../../assets/symbols/h3.webp', import.meta.url).href,
	},
	symbolH4: {
		type: 'sprite',
		src: new URL('../../assets/symbols/h4.webp', import.meta.url).href,
	},
	symbolL1: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l1.webp', import.meta.url).href,
	},
	symbolL2: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l2.webp', import.meta.url).href,
	},
	symbolL3: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l3.webp', import.meta.url).href,
	},
	symbolL4: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l4.webp', import.meta.url).href,
	},
	symbolL5: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l5.webp', import.meta.url).href,
	},
	symbolW: {
		type: 'sprite',
		src: new URL('../../assets/symbols/w.webp', import.meta.url).href,
	},
	symbolS: {
		type: 'sprite',
		src: new URL('../../assets/symbols/s.webp', import.meta.url).href,
	},
	bigWild: {
		type: 'sprite',
		src: new URL('../../assets/symbols/bigwild.webp', import.meta.url).href,
	},
	// the same with an empty mouth: a big wild that has thrown its fish, or has none to throw
	bigWildNoFish: {
		type: 'sprite',
		src: new URL('../../assets/symbols/bigwild-nofish.webp', import.meta.url).href,
	},
	// the fish a big wild throws, which turns into a wild where it lands (see WildThrow)
	wildFish: {
		type: 'sprite',
		src: new URL('../../assets/symbols/fish.webp', import.meta.url).href,
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
		src: new URL('../../assets/symbols/l1-shadow.webp', import.meta.url).href,
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
		src: new URL('../../assets/symbols/l4-shadow.webp', import.meta.url).href,
	},
	symbolL5Shadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/l5-shadow.png', import.meta.url).href,
	},
	symbolWShadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/w-shadow.webp', import.meta.url).href,
	},
	symbolSShadow: {
		type: 'sprite',
		src: new URL('../../assets/symbols/s-shadow.webp', import.meta.url).href,
	},
	anticipation: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/anticipation/anticipation.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/anticipation/anticipation.json', import.meta.url).href,
			scale: 2,
		},
	},
	// a web font for Text; pixi names it after the file, so it is used as fontFamily 'Titan One'.
	// Loads first, as the loading bar's percentage is written in it
	titanOne: {
		type: 'font',
		src: new URL('../../assets/fonts/titanOne/titan-one.ttf', import.meta.url).href,
		preload: true,
	},
	// the sound effects, in mono, and the music (the bgm_ sounds) in stereo: mono takes half the
	// memory once decoded, and only the music loses anything by it
	sound: {
		type: 'audio',
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
		preload: true,
	},
	music: {
		type: 'audio',
		src: new URL('../../assets/audio/music.json', import.meta.url).href,
		preload: true,
	},
} as const;
