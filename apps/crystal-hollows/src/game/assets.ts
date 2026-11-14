// a stone letter's skeleton (its land and idle) on the atlas all four share (art-source/letters-spine.py)
const letterSpine = (skeleton: string) =>
	({
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/letters/letters.atlas', import.meta.url).href,
			skeleton,
			scale: 1,
		},
	}) as const;

// a premium's skeleton (its drop, idle and hit) on the atlas all four share (art-source/premiums-spine.py)
const premiumSpine = (skeleton: string) =>
	({
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/premiums/premiums.atlas', import.meta.url).href,
			skeleton,
			scale: 1,
		},
	}) as const;

export default {
	// the cave behind everything, in the base game and free spins: cave_water_idle.blend's picture,
	// and the layers its pool moves with (see CaveWater, art-source/cave-water.py)
	background: {
		type: 'sprite',
		src: new URL('../../assets/background.webp', import.meta.url).href,
		preload: true,
	},
	backgroundWater: {
		type: 'sprite',
		src: new URL('../../assets/background-water.webp', import.meta.url).href,
		preload: true,
	},
	backgroundWaterMask: {
		type: 'sprite',
		src: new URL('../../assets/background-water-mask.png', import.meta.url).href,
		preload: true,
	},
	// the board: the user's stone frame and its panel (see BoardFrame, art-source/board-frame.py)
	boardFrame: {
		type: 'sprite',
		src: new URL('../../assets/board-frame.webp', import.meta.url).href,
		preload: true,
	},
	// the crystal bat hovering right of the board (Bat): the user's bat_fly.blend as Spine, its atlas
	// shrunk by art-source/bat-spine.py; only on wide screens, so loaded once the screen is one (Game)
	bat: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/bat/bat.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/bat/bat.json', import.meta.url).href,
			scale: 1,
		},
		lazy: true,
	},
	// the logo: the user's title, crystal_hollows_title_idle.blend, as Spine, its letters floating
	// (art-source/logo-spine.py; LOGO_ART). The start screen shows it (LoadingScreen), so it loads first,
	// with the background; in the game it is at the top left on wide screens (Logo)
	logo: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/logo/logo.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/logo/logo.json', import.meta.url).href,
			scale: 1,
		},
		preload: true,
	},
	// the low symbols: the user's stone letters (art-source/letter-symbols.py), L1-L4 = A K Q J
	symbolA: { type: 'sprite', src: new URL('../../assets/symbols/a.webp', import.meta.url).href },
	symbolK: { type: 'sprite', src: new URL('../../assets/symbols/k.webp', import.meta.url).href },
	symbolQ: { type: 'sprite', src: new URL('../../assets/symbols/q.webp', import.meta.url).href },
	symbolJ: { type: 'sprite', src: new URL('../../assets/symbols/j.webp', import.meta.url).href },
	// their lands and idles, one skeleton each on one shared atlas (art-source/letters-spine.py)
	letterA: letterSpine(new URL('../../assets/spines/letters/a.json', import.meta.url).href),
	letterK: letterSpine(new URL('../../assets/spines/letters/k.json', import.meta.url).href),
	letterQ: letterSpine(new URL('../../assets/spines/letters/q.json', import.meta.url).href),
	letterJ: letterSpine(new URL('../../assets/spines/letters/j.json', import.meta.url).href),
	// the premiums: the user's drop .blends' pictures (art-source/premiums-spine.py), H1-H4 = crystal,
	// berries, stalactite, mushroom
	symbolCrystal: {
		type: 'sprite',
		src: new URL('../../assets/symbols/crystal.webp', import.meta.url).href,
	},
	symbolBerries: {
		type: 'sprite',
		src: new URL('../../assets/symbols/berries.webp', import.meta.url).href,
	},
	symbolStalactite: {
		type: 'sprite',
		src: new URL('../../assets/symbols/stalactite.webp', import.meta.url).href,
	},
	symbolMushroom: {
		type: 'sprite',
		src: new URL('../../assets/symbols/mushroom.webp', import.meta.url).href,
	},
	// their drops, idles and hits, one skeleton each on one shared atlas (art-source/premiums-spine.py)
	premiumCrystal: premiumSpine(
		new URL('../../assets/spines/premiums/crystal.json', import.meta.url).href,
	),
	premiumBerries: premiumSpine(
		new URL('../../assets/spines/premiums/berries.json', import.meta.url).href,
	),
	premiumStalactite: premiumSpine(
		new URL('../../assets/spines/premiums/stalactite.json', import.meta.url).href,
	),
	premiumMushroom: premiumSpine(
		new URL('../../assets/spines/premiums/mushroom.json', import.meta.url).href,
	),
	// the wild: the crystal bat in the turning thorn ring, the user's IDLE/bat_ring_idle.blend: its
	// still (the loop's first frame) and its skeleton, the idle loop (art-source/wild-spine.py)
	symbolWild: {
		type: 'sprite',
		src: new URL('../../assets/symbols/wild.webp', import.meta.url).href,
	},
	wild: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/wild/wild.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/wild/wild.json', import.meta.url).href,
			scale: 1,
		},
	},
	// the free spins symbol (S, the scatter): the user's FS rock at rest, its drop (its land) and its
	// activation (what it plays as the free spins trigger), from free_spin_drop.blend and
	// free_spin_activate.blend (art-source/free-spins.py)
	symbolFreeSpins: {
		type: 'sprite',
		src: new URL('../../assets/symbols/free-spins.webp', import.meta.url).href,
	},
	freeSpinsDrop: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/freeSpinsDrop/freeSpinsDrop.json', import.meta.url).href,
	},
	freeSpinsActivate: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/freeSpinsActivate/freeSpinsActivate.json', import.meta.url).href,
	},
	// the free spins sign (FreeSpinCounter): the user's stone frame round a dark panel
	// (art-source/stone-frames.py)
	freeSpinsSign: {
		type: 'sprite',
		src: new URL('../../assets/free-spins-sign.webp', import.meta.url).href,
	},
	// the start screen's info cards (InfoCard): the user's tall stone card round a dark panel
	// (art-source/stone-frames.py)
	infoCard: {
		type: 'sprite',
		src: new URL('../../assets/info-card.webp', import.meta.url).href,
	},
	// the tall wild (TallWild): the ring morphing into the big WILD that fills its reel, and the WILD at
	// rest, from the user's bat_ring_to_wild.blend (art-source/wild-tall.py)
	wildTall: {
		type: 'sprite',
		src: new URL('../../assets/symbols/wild-tall.webp', import.meta.url).href,
	},
	wildMorph: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/wildMorph/wildMorph.json', import.meta.url).href,
	},
	// the WILD's hit, when the symbols it covers win (the user's wild_bat_hit.blend): only what changes,
	// drawn over the WILD at rest (art-source/wild-tall.py)
	wildHit: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/wildHit/wildHit.json', import.meta.url).href,
	},
	// and back to the ring, in the bonus once its free spin is done (the user's wild_to_bat_ring.blend)
	wildUnmorph: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/wildUnmorph/wildUnmorph.json', import.meta.url).href,
	},
	// the tall WILD's multiplier is written in it (WildMultiplier, styled like the logo's letters): a
	// chunky rounded web font (OFL, as Cat Hunt's); pixi names it after the file, fontFamily 'Titan One'
	titanOne: {
		type: 'font',
		src: new URL('../../assets/fonts/titanOne/titan-one.ttf', import.meta.url).href,
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
	// the red swoosh on the buy bonus button: white on transparent, tinted by the UI (see uiTheme's
	// buyBonus), the same as RuneFall's and Lazy Evening's
	buyBonusLogo: {
		type: 'sprite',
		src: new URL('../../assets/buy-bonus-logo.webp', import.meta.url).href,
	},
	// the same logo grown by its outline's width, drawn behind it
	buyBonusLogoOutline: {
		type: 'sprite',
		src: new URL('../../assets/buy-bonus-logo-outline.webp', import.meta.url).href,
	},
} as const;
