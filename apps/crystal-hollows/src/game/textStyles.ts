import { FillGradient, type TextStyleOptions } from 'pixi.js';

import { rockFills } from './rockTexture';

// The logo's lettering (the user's CRYSTAL HOLLOWS logo, its colours sampled from the letters), for
// words and numbers over the game (LogoText): Germania One, bold, as RuneFall's texts (FONT), leaning
// as the logo's letters do (LOGO_TEXT_SKEW, a Container's skew.x), drawn as layers of the same text
// (logoTextLayers). Cut from rock since 2026-11-16, as the logo's letters are (the user, of the free
// spins sign: "can u make every font like this look like its made of rock (except the ui fonts)", then
// of the win line's win and the big win: "also this and this like every text int the game except the ui
// bar adn ui"; every text over the game is in it now, the UI-font gameTextStyle is gone): back to front,
// - a dark outline round the face and the underside together (`outline` x fontSize wide, half of it
//   outside the letter);
// - the darker 3D underside (`depth` x fontSize lower);
// - a light rim along the face's top edges, where the light catches the chipped edge (the face drawn
//   `rim` lower over a copy of it in the rim's colour);
// - the face, the colours' top-to-bottom fade, with the rock over it (rockTexture): its chiselled
//   facets, seams and cracks multiplied over it, and the cracks' lit lips screened over it.
// Two looks, by outline: simple (the tall WILD's multiplier) a thin one (the user, 2026-11-13: "add a
// tiny black outline to the multi on the wild"); logo (the free spins sign's words, the start screen's
// cards, the bonus's total) thicker, as the logo's letters (0.24 till 2026-11-14, the user: "make the
// spins outline smaller"). (No see-through gloss: a FillGradient's stops lose their alpha.)
export const LOGO_TEXT_SKEW = -0.17;

// The font: RuneFall's (the user, 2026-11-17: "make the font be same as runefall"; it was Titan One).
// Where its capitals are in the line Pixi measures (from its glyphs' bounds: scratchpad fontmetrics.mjs),
// and Titan One's, which the colours' stops were picked on: the stops are moved from those to these, so
// each colour falls on the letters where it did. And how wide its letters are, about (of the font size,
// with the bold; for fitLogoFontSize). At a font size, both fonts' capitals are as tall (0.71 of it).
const FONT = {
	family: "'Germania One', serif",
	weight: 'bold' as const,
	caps: { top: 0.171, bottom: 0.785 },
	width: 0.52,
};
const PICKED_ON_CAPS = { top: 0.19, bottom: 0.863 };
const onCaps = (offset: number) =>
	Math.min(
		1,
		Math.max(
			0,
			FONT.caps.top +
				((offset - PICKED_ON_CAPS.top) * (FONT.caps.bottom - FONT.caps.top)) /
					(PICKED_ON_CAPS.bottom - PICKED_ON_CAPS.top),
		),
	);
// how far down to draw the text so its capitals' middle is on its place (Text is centred on its line,
// whose capitals sit a little above its middle; its line is 1.161 of the font size)
const CAPS_DOWN = (0.5 - (FONT.caps.top + FONT.caps.bottom) / 2) * 1.161;
const LOGO_OUTLINE = 0x110927;
const LOOKS = {
	simple: { outline: 0.08, depth: 0.08, rim: 0.035 },
	logo: { outline: 0.15, depth: 0.1, rim: 0.04 },
};
export type LogoTextLook = keyof typeof LOOKS;

// The lettering's colours: its face's top-to-bottom fade, the rim along its top edges and its underside.
// - logo: the whole logo's, CRYSTAL's cyan to violet into HOLLOWS' magenta to pink (the WILD's multiplier)
// - blue, pink: one row's each, light blue to dark blue, and pink to red (the free spins sign's words, the
//   user, 2026-11-13: "make the free spins have light blue at the top and dark blue at the bottom and the
//   spins pink at the top and red at the bottom"), bright and saturated as the logo's are, each with
//   an underside of its own darker colour
// - gold: the money (win amounts, the bonus's spins won, a symbol's multiplier), the UI's win gold
//   (uiTheme panelBar.win) from pale yellow to amber
// - stone: plain words (press to continue, the start screen cards' captions), white to a light lavender
//   grey, a pale stone once the rock is over it
// (gold and stone since 2026-11-16, the user: every text in the game but the UI's in rock, "also this and
// this like every text int the game except the ui bar adn ui")
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
	gold: {
		stops: [
			{ offset: 0.1, color: 0xfff2a1 },
			{ offset: 0.4, color: 0xffd34d },
			{ offset: 0.7, color: 0xf6a623 },
			{ offset: 0.95, color: 0xdc7418 },
		],
		rim: 0xfffbdc,
		underside: 0x8a4410,
	},
	stone: {
		stops: [
			{ offset: 0.1, color: 0xffffff },
			{ offset: 0.5, color: 0xebe8fb },
			{ offset: 0.95, color: 0xc6c0e6 },
		],
		rim: 0xffffff,
		underside: 0x56508c,
	},
} satisfies Record<string, LogoTextColors>;

const gradient = (stops: { offset: number; color: number }[]) =>
	new FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		textureSpace: 'local',
		colorStops: stops.map(({ offset, color }) => ({ offset: onCaps(offset), color })),
	});

export type LogoTextLayer = {
	y: number;
	style: TextStyleOptions;
	blendMode?: 'multiply' | 'screen';
	alpha?: number;
};

// The layers, back to front: each the text in `style`, `y` below the text's place. `rock`: how much
// of the rock is over the face, 1 all of it (small text takes less: at a caption's size its cracks broke
// the letters up).
export const logoTextLayers = (
	fontSize: number,
	colors: LogoTextColors = LOGO_TEXT_COLORS.logo,
	look: LogoTextLook = 'simple',
	rock = 1,
): LogoTextLayer[] => {
	const { outline, depth, rim } = LOOKS[look];
	const text = { fontFamily: FONT.family, fontWeight: FONT.weight, fontSize, align: 'center' as const };
	const stroke = { color: LOGO_OUTLINE, width: fontSize * outline, join: 'round' as const };
	const top = fontSize * CAPS_DOWN;
	const face = top + fontSize * rim;
	const under = top + fontSize * depth;
	const fills = rock > 0 ? rockFills(fontSize) : undefined;
	return [
		// the outline round it all: the face's place and the underside's
		{ y: under, style: { ...text, fill: LOGO_OUTLINE, stroke } },
		{ y: top, style: { ...text, fill: LOGO_OUTLINE, stroke } },
		{ y: under, style: { ...text, fill: colors.underside } },
		{ y: top, style: { ...text, fill: colors.rim } },
		{ y: face, style: { ...text, fill: gradient(colors.stops) } },
		...(fills
			? ([
					{ y: face, style: { ...text, fill: fills.shade }, blendMode: 'multiply', alpha: rock },
					{ y: face, style: { ...text, fill: fills.light }, blendMode: 'screen', alpha: rock },
				] as const)
			: []),
	];
};

// The characters are about FONT.width of the font size wide, plus the outline: the font size that fits
// `text` (its longest line) in maxWidth (no bigger than fontSize). (Titan One's were 0.67.)
export const fitLogoFontSize = (
	text: string,
	fontSize: number,
	maxWidth: number,
	look: LogoTextLook = 'simple',
) => {
	const longest = Math.max(...text.split('\n').map((line) => line.length));
	return Math.min(fontSize, maxWidth / (longest * FONT.width + LOOKS[look].outline + 0.05));
};
