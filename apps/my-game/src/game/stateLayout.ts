import { createLayout } from 'utils-layout';

export const { stateLayout, stateLayoutDerived } = createLayout({
	backgroundRatio: {
		normal: 2039 / 1000,
		portrait: 1242 / 2208,
	},
	mainSizesMap: {
		// a bit larger than the 1422x800 default so the board leaves room for the bottom UI row
		desktop: { width: 1494, height: 840 },
		// tablet, landscape and portrait are larger than the standard sizes so the wide board fits
		tablet: { width: 1290, height: 1290 },
		landscape: { width: 1700, height: 956 },
		portrait: { width: 1030, height: 1831 },
	},
});
