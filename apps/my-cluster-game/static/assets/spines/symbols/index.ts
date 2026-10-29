import { createAsset } from 'pixi-svelte';

import img from './symbols.webp';
import rawAtlas from './symbols.atlas?raw';
import H5 from './h5.json';

export default createAsset({
	img,
	rawAtlas,
	spines: {
		H5,
	},
});