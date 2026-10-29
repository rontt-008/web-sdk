import type { Texture, TextureSource } from 'pixi.js';

// The wooden frames' art is drawn much smaller than it is (the bonus meter's 1395 px wide at about
// 270 px in a small window), and shrunk that far without help their dark outlines break into jagged
// pixels. These get mipmaps: smaller, smoothed copies the graphics card picks from when it draws
// them small. (Not the symbols' idle sheets: on a sheet the smaller copies would blur neighbouring
// frames into each other.)
export const SMOOTH_TEXTURE_KEYS = [
	'boardFrame',
	'runeBoxFrame',
	'bonusMeterFrame',
	'bonusMeterFill',
	'logo',
];

const smoothed = new WeakSet<TextureSource>();

export const smoothTexture = (texture: Texture) => {
	const source = texture.source;
	if (smoothed.has(source)) return;
	smoothed.add(source);
	source.autoGenerateMipmaps = true;
	// the card's copy (if it has one yet) is dropped, so it is sent again with its smaller copies
	source.unload();
};
