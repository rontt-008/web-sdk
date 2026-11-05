<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer, CanvasSizeRectangle } from 'components-layout';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import CameraContainer from './CameraContainer.svelte';

	// the picture with the board in it, drawn so its squares lie under the board (see BACKGROUND_ART in
	// stateGame): on screens it doesn't cover, its own night blue behind it; a blue cast over everything
	// in the free spins
	const context = getContext();
	const layout = $derived(context.stateGameDerived.backgroundLayout());
	const showFeatureBackground = $derived(context.stateGame.gameType === 'freegame');
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x0e1527} zIndex={-3} />

<MainContainer zIndex={-2}>
	<CameraContainer>
		<Sprite key="background" x={layout.x} y={layout.y} width={layout.width} height={layout.height} />
	</CameraContainer>
</MainContainer>

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={-1}>
	<CanvasSizeRectangle backgroundColor={0x2a1f66} backgroundAlpha={0.22} />
</FadeContainer>
