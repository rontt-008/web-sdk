<script lang="ts" module>
	import * as PIXI from 'pixi.js';

	// A loaded sprite cut into nine: its corners keep their size, its edges stretch along, and its
	// middle both ways, to `width` x `height` (the rune boxes' frame, see RuneTablet).
	// leftWidth, topHeight, rightWidth and bottomHeight are the corners' sizes, in the art's pixels.
	export type Props = Omit<PIXI.NineSliceSpriteOptions, 'texture'> & { key: string };
</script>

<script lang="ts">
	import { getContextApp, getContextParent, propsSyncEffect, type LoadedSprite } from 'pixi-svelte';

	const { key, ...nineSliceProps }: Props = $props();
	const context = getContextApp();
	const parentContext = getContextParent();
	const texture = $derived(
		(context.stateApp.loadedAssets?.[key] || PIXI.Texture.EMPTY) as LoadedSprite,
	);
	const nineSliceSprite = new PIXI.NineSliceSprite({ texture: PIXI.Texture.EMPTY });

	$effect(() => {
		nineSliceSprite.texture = texture;
	});
	propsSyncEffect({ props: nineSliceProps, target: nineSliceSprite });

	parentContext.addToParent(nineSliceSprite);
</script>

{#if texture === PIXI.Texture.EMPTY}
	{console.error(`NineSliceSprite: key "${key}" is not found in the loadedAssets`)}
{/if}
