<script lang="ts">
  import type { Texture } from 'pixi.js';
  import { Rectangle, Sprite } from 'pixi-svelte';
  import { getContext } from '../game/context';
  import { SCENE_BLUR_EDGE } from './SceneBlur.svelte';

  type Area = { x: number; y: number; width: number; height: number };

  const context = getContext();

  const canvas = $derived(context.stateLayoutDerived.canvasSizes());
  const texture = $derived(context.stateApp.loadedAssets?.customBackground as Texture | undefined);

  // the picture keeps its shape on every screen (wide, tall or square): scaled to cover the area,
  // centred on it, with the overflow cropped by the screen's edges
  const cover = (area: Area): Area => {
    const imageWidth = texture?.width || area.width;
    const imageHeight = texture?.height || area.height;
    const scale = Math.max(area.width / imageWidth, area.height / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    return {
      x: area.x + (area.width - width) / 2,
      y: area.y + (area.height - height) / 2,
      width,
      height,
    };
  };

  const screenLayout = $derived(cover({ x: 0, y: 0, ...canvas }));
  const edgeLayout = $derived(
    cover({
      x: -SCENE_BLUR_EDGE,
      y: -SCENE_BLUR_EDGE,
      width: canvas.width + SCENE_BLUR_EDGE * 2,
      height: canvas.height + SCENE_BLUR_EDGE * 2,
    }),
  );
</script>

<Rectangle
  {...canvas}
  backgroundColor={0x000000}
  zIndex={-3}
/>

<!-- the background again, a little bigger so it reaches past the screen's edges: hidden behind the
  real one, it gives the scene blur picture to blur into at the edges (see SceneBlur) -->
<Sprite key="customBackground" {...edgeLayout} zIndex={-3} />

<Sprite key="customBackground" {...screenLayout} zIndex={-2} />
