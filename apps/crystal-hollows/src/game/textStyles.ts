import { FillGradient } from 'pixi.js';

import { UI_FONT_FAMILY } from 'constants-shared/fonts';

// The logo's lettering (the user's CRYSTAL HOLLOWS logo, its colours sampled from the letters), for
// words and numbers over the game (LogoText): Titan One (assets.ts; one weight, already bold), leaning
// as the logo's letters do (LOGO_TEXT_SKEW, a Container's skew.x), drawn as layers of the same text
// (logoTextLayers), in two looks:
// - simple (the tall WILD's multiplier): its darker 3D underside (`depth` x fontSize lower) and its
//   face, the colours' top-to-bottom fade, both with a thin dark outline (`outline` x fontSize wide,
//   half of it outside the letter): the logo's thick one was taken off ("remove black outlines"), then a
//   tiny one put back ("add a tiny black outline to the multi on the wild", both 2026-11-13);
// - logo (the free spins sign's words; the user, 2026-11-13: "they look too bland look how clean the
//   logo looks"): as the logo's letters are drawn, a thick dark outline round the face and the
//   underside together, the underside, and a light rim along the face's top edges (the face drawn `rim`
//   lower over a copy of it in the rim's colour). (No see-through gloss: a FillGradient's stops lose
//   their alpha, so a white-to-clear gloss came out solid white over the face.)
export const LOGO_TEXT_SKEW = -0.17;
const LOGO_OUTLINE = 0x110927;
// (logo's outline was 0.24 till 2026-11-14, the user: "make the spins outline smaller")
const LOOKS = {
	simple: { outline: 0.08, depth: 0.08, rim: 0 },
	logo: { outline: 0.15, depth: 0.1, rim: 0.04 },
};
export type LogoTextLook = keyof typeof LOOKS;

// The lettering's colours: its face's top-to-bottom fade, the rim along its top edges and its underside.
// - logo: the whole logo's, CRYSTAL's cyan to violet into HOLLOWS' magenta to pink (the WILD's multiplier)
// - blue, pink: one row's each, light blue to dark blue, and pink to red (the free spins sign's words, the
//   user, 2026-11-13: "make the free spins have light blue at the top and dark blue at the bottom and the
//   spins pink at the top and red at the bottom"), bright and saturated as the logo's are, each with
//   an underside of its own darker colour
export type LogoTextColors = {
	stops: { offset: number; color: number }[];
	rim: number;
	underside: number;
};
export const LOGO_TEXT_COLORS = {
	logo: {
		stops: [
			{ offset: 0.12, color: 0x55c4f8 },
			{ offset: 0.35, color: 0x3690f2 },
			{ offset: 0.52, color: 0x614eec },
			{ offset: 0.66, color: 0xb730c4 },
			{ offset: 0.82, color: 0xd8217c },
			{ offset: 0.95, color: 0xef2a67 },
		],
		rim: 0xd2f3ff,
		underside: 0x86155a,
	},
	blue: {
		stops: [
			{ offset: 0.1, color: 0x8fe4ff },
			{ offset: 0.4, color: 0x42b2ff },
			{ offset: 0.7, color: 0x2f7cf2 },
			{ offset: 0.95, color: 0x2448cc },
		],
		rim: 0xd8f7ff,
		underside: 0x1a2c8c,
	},
	pink: {
		stops: [
			{ offset: 0.1, color: 0xff8be2 },
			{ offset: 0.4, color: 0xff4cb2 },
			{ offset: 0.7, color: 0xf72f7c },
			{ offset: 0.95, color: 0xe2203c },
		],
		rim: 0xffd8f5,
		underside: 0x8c1040,
	},
} satisfies Record<string, LogoTextColors>;

const gradient = (stops: { offset: number; color: number }[]) =>
	new FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		textureSpace: 'local',
		colorStops: stops,
	});

// The layers, back to front: each the text in `style`, `y` below the text's place.
export const logoTextLayers = (
	fontSize: number,
	colors: LogoTextColors = LOGO_TEXT_COLORS.logo,
	look: LogoTextLook = 'simple',
) => {
	const { outline, depth, rim } = LOOKS[look];
	const text = { fontFamily: 'Titan One', fontSize };
	const stroke = { color: LOGO_OUTLINE, width: fontSize * outline, join: 'round' as const };
	if (look === 'simple') {
		return [
			{ y: fontSize * depth, style: { ...text, fill: colors.underside, stroke } },
			{ y: 0, style: { ...text, fill: gradient(colors.stops), stroke } },
		];
	}
	const face = fontSize * rim;
	return [
		// the outline round it all: the face's place and the underside's
		{ y: fontSize * depth, style: { ...text, fill: LOGO_OUTLINE, stroke } },
		{ y: 0, style: { ...text, fill: LOGO_OUTLINE, stroke } },
		{ y: fontSize * depth, style: { ...text, fill: colors.underside } },
		{ y: 0, style: { ...text, fill: colors.rim } },
		{ y: face, style: { ...text, fill: gradient(colors.stops) } },
	];
};

// Titan One's characters are about 0.67 of the font size wide, plus the outline: the font size that
// fits `text` in maxWidth (no bigger than fontSize)
export const fitLogoFontSize = (
	text: string,
	fontSize: number,
	maxWidth: number,
	look: LogoTextLook = 'simple',
) => Math.min(fontSize, maxWidth / (text.length * 0.67 + LOOKS[look].outline + 0.05));

// The game's own texts (wins, free spins, press to continue) in the UI's look: the UI's font, bold,
// with a near-black outline and a hard shadow straight down, as the charcoal bar's labels (see
// uiTheme). Plain stand-ins until the game has its own art.

export const TEXT_WHITE = 0xffffff;
// the UI's win amount colour (uiTheme panelBar.win)
export const TEXT_GOLD = 0xffd34d;
const OUTLINE = 0x0a0a0c;

export const gameTextStyle = (fontSize: number, fill: number = TEXT_WHITE) => ({
	fontFamily: UI_FONT_FAMILY,
	fontSize,
	fontWeight: '800' as const,
	fill,
	align: 'center' as const,
	stroke: { color: OUTLINE, width: Math.max(2, fontSize * 0.12), join: 'round' as const },
	dropShadow: {
		color: OUTLINE,
		alpha: 1,
		blur: 0,
		angle: Math.PI / 2,
		distance: Math.max(2, fontSize * 0.07),
	},
});
