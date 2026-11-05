<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer, CanvasSizeRectangle } from 'components-layout';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import CameraContainer from './CameraContainer.svelte';

	// The wooden table (static/assets/table.webp) over the whole screen (the board lies on it, TiltedPlane),
	// and a blue cast over everything in the free spins.
	// The table covers the screen with its top left corner in the screen's, so the lamp and the book are
	// always in view and what's cut off is plain wood (right and bottom); a little more than the screen,
	// so the camera's zoom and shake never show its edge. A dark wood colour under it all. The whole
	// scene is seen through the camera: the table zooms with the board and the side panel on it.
	const context = getContext();
	const showFeatureBackground = $derived(context.stateGame.gameType === 'freegame');

	const TABLE = { width: 1731, height: 909 };
	const MARGIN = SYMBOL_SIZE * 0.15;
	// the screen in the main layout's units (its container is centred on the screen)
	const table = $derived.by(() => {
		const main = context.stateLayoutDerived.mainLayout();
		const canvas = context.stateLayoutDerived.canvasSizes();
		const width = canvas.width / main.scale + MARGIN * 2;
		const height = canvas.height / main.scale + MARGIN * 2;
		const scale = Math.max(width / TABLE.width, height / TABLE.height);
		return {
			x: main.width / 2 - canvas.width / main.scale / 2 - MARGIN,
			y: main.height / 2 - canvas.height / main.scale / 2 - MARGIN,
			width: TABLE.width * scale,
			height: TABLE.height * scale,
		};
	});
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x2a1309} zIndex={-3} />

<!-- once the pictures are in: this is drawn under the loading screen too. Seen through the camera
     (CameraContainer), so the table zooms with the board -->
{#if context.stateApp.loaded}
	<MainContainer zIndex={-2}>
		<CameraContainer>
			<Sprite key="table" x={table.x} y={table.y} width={table.width} height={table.height} />
		</CameraContainer>
	</MainContainer>
{/if}

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={-1}>
	<CanvasSizeRectangle backgroundColor={0x2a1f66} backgroundAlpha={0.22} />
</FadeContainer>
