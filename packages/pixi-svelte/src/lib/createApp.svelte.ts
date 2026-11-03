import * as PIXI from 'pixi.js';

import { getProcessed } from './assetLoad';
import type { LoadedAssets, Assets, RawAsset } from './types';

export function createApp({ assets }: { assets: Assets }) {
	// the lazy assets asked for so far, each loaded once
	const lazyRequested = new Set<string>();

	const reset = () => {
		stateApp.loaded = false;
		stateApp.loadingProgress = 0;
		stateApp.loadedAssets = {};
		stateApp.pixiApplication = undefined as PIXI.Application | undefined;
		lazyRequested.clear();
	};

	// Loads assets left out of the loading (lazy: true), when the game wants them (only on screens
	// that show them, say), into loadedAssets beside the others.
	const loadLazyAssets = async (keys: string[]) => {
		const wanted = keys.filter((key) => !lazyRequested.has(key));
		if (!wanted.length) return;
		wanted.forEach((key) => lazyRequested.add(key));
		const loaded = await Promise.all(
			wanted.map(async (key) => {
				try {
					const { type, src } = assets[key];
					const loadSrc =
						type === 'spine' ? Object.values(src).filter((item) => typeof item === 'string') : src;
					const rawAsset = await PIXI.Assets.load<RawAsset>(loadSrc);
					return getProcessed({ key, rawAsset, type, src });
				} catch (error) {
					console.error(error);
				}
			}),
		);
		stateApp.loadedAssets = Object.assign({}, stateApp.loadedAssets, ...loaded) as LoadedAssets;
	};

	const stateApp = $state({
		reset,
		loadLazyAssets,
		assets,
		loaded: false,
		loadingProgress: 0,
		loadedAssets: {} as LoadedAssets,
		pixiApplication: undefined as PIXI.Application | undefined,
	});

	return {
		stateApp,
	};
}

export type App = ReturnType<typeof createApp>;
