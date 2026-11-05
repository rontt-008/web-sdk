<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer, CanvasSizeRectangle } from 'components-layout';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import CameraContainer from './CameraContainer.svelte';

	// a plain night blue over the whole screen, the board's picture (static/assets/board.webp) on the
	// board's squares, and a blue cast over everything in the free spins
	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
	const showFeatureBackground = $derived(context.stateGame.gameType === 'freegame');
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x0e1527} zIndex={-3} />

<!-- once the pictures are in: this is drawn under the loading screen too. Seen through the camera
     (CameraContainer), so it zooms with the squares and pieces -->
{#if context.stateApp.loaded}
	<MainContainer zIndex={-2}>
		<CameraContainer>
			<Sprite key="board" x={board.x} y={board.y} anchor={0.5} width={board.width} height={board.height} />
		</CameraContainer>
	</MainContainer>
{/if}

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={-1}>
	<CanvasSizeRectangle backgroundColor={0x2a1f66} backgroundAlpha={0.22} />
</FadeContainer>
