import * as PIXI from 'pixi.js';
// adds renderer.prepare (not in pixi.js by itself); imported before the renderer is made
import 'pixi.js/prepare';
import type { Assets, LoadedAssets } from 'pixi-svelte';

// The graphics card gets a texture the first time it is drawn, which on a phone freezes the game a
// moment (the game coming in after the loading screen, a big win's first show). These are all the
// loaded assets' textures, to send it while the loading screen shows instead (renderer.prepare,
// a few a frame): the sprites', the sprite sheets' frames' and the spines' atlas pages'.
export const loadedTextureSources = (assets: Assets, loaded: LoadedAssets) => {
	const sources = new Set<PIXI.TextureSource>();
	const add = (item: unknown) => {
		if (item instanceof PIXI.Texture) sources.add(item.source);
		else if (Array.isArray(item)) item.forEach(add);
	};
	for (const [key, asset] of Object.entries(loaded)) {
		const src = assets[key]?.src;
		if (assets[key]?.type === 'spine' && typeof src === 'object') {
			// spine-pixi's atlas pages hold a SpineTexture, its Pixi texture in `texture`
			const atlas = PIXI.Assets.get(src.atlas) as
				| { pages: { texture: { texture?: unknown } | null }[] }
				| undefined;
			atlas?.pages.forEach((page) => add(page.texture?.texture));
		} else add(asset);
	}
	return [...sources];
};
