<script lang="ts">
  import { Rectangle, Sprite } from 'pixi-svelte';
  import { getContext } from '../game/context';
  import { SCENE_BLUR_EDGE } from './SceneBlur.svelte';

  const context = getContext();
</script>

<Rectangle
  {...context.stateLayoutDerived.canvasSizes()}
  backgroundColor={0x000000}
  zIndex={-3}
/>

<!-- the background again, a little bigger so it reaches past the screen's edges: hidden behind the
  real one, it gives the scene blur picture to blur into at the edges (see SceneBlur) -->
<Sprite
  key="customBackground"
  x={-SCENE_BLUR_EDGE}
  y={-SCENE_BLUR_EDGE}
  width={context.stateLayoutDerived.canvasSizes().width + SCENE_BLUR_EDGE * 2}
  height={context.stateLayoutDerived.canvasSizes().height + SCENE_BLUR_EDGE * 2}
  zIndex={-3}
/>

<Sprite
  key="customBackground"
  x={0}
  y={0}
  width={context.stateLayoutDerived.canvasSizes().width}
  height={context.stateLayoutDerived.canvasSizes().height}
  zIndex={-2}
/>