import { createLayout } from 'utils-layout';

export const { stateLayout, stateLayoutDerived } = createLayout({
	backgroundRatio: {
		normal: 2039 / 1000,
		portrait: 1242 / 2208,
	},
	mainSizesMap: {
		// a little less than the sample's 1422 x 800 (1463 x 824, the board in its frame from the top
		// of the screen to the UI's bar, made a tenth smaller): the board bigger, its frame's top a
		// little off the screen and its bottom behind the bar
		desktop: { width: 1330, height: 749 },
		tablet: { width: 1000, height: 1000 },
		landscape: { width: 1600, height: 900 },
		portrait: { width: 800, height: 1422 },
	},
});
