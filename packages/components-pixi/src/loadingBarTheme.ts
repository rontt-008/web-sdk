import { UI_FONT_FAMILY } from 'constants-shared/fonts';

// Look of <LoadingBar />. Spread LOADING_BAR_THEME_CLEAN and override colours to fit a game, e.g.
// { ...LOADING_BAR_THEME_CLEAN, fill: 0xffb53d, marker: 'paw' }.
export type LoadingBarTheme = {
	// line around the whole bar
	outline: number;
	outlineWidth: number;
	// band between the outline and the track, like a frame (rimWidth 0 for none)
	rim: number;
	rimWidth: number;
	// the empty part of the bar, with a soft shadow along its top so it looks sunk in
	track: number;
	trackAlpha: number;
	// the filled part: `fill` on top of a `fillShade` lower edge, with a glossy `shine` stripe
	fill: number;
	fillShade: number;
	shine: number;
	shineAlpha: number;
	// shadow under the bar (0 for none)
	shadowAlpha: number;
	// riding the front of the fill
	marker: 'none' | 'dot' | 'paw';
	markerFill: number;
	markerOutline: number;
	// percentage under the bar; leave out to hide it
	percent?: {
		fontFamily: string;
		fontSize: number;
		fill: number;
		stroke: number;
		strokeWidth: number;
	};
};

const CHARCOAL = 0x1f2128;
const WHITE = 0xffffff;

// Neutral look to match UI_THEME_CLEAN: a white-outlined dark track filling with white.
export const LOADING_BAR_THEME_CLEAN: LoadingBarTheme = {
	outline: WHITE,
	outlineWidth: 3,
	rim: CHARCOAL,
	rimWidth: 0,
	track: CHARCOAL,
	trackAlpha: 0.6,
	fill: WHITE,
	fillShade: 0xd6d8dd,
	shine: WHITE,
	shineAlpha: 0,
	shadowAlpha: 0.25,
	marker: 'none',
	markerFill: WHITE,
	markerOutline: CHARCOAL,
	percent: { fontFamily: UI_FONT_FAMILY, fontSize: 22, fill: WHITE, stroke: CHARCOAL, strokeWidth: 0 },
};
