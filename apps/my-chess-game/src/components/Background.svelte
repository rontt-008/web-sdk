<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer, CanvasSizeRectangle } from 'components-layout';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import { tableLayout } from '../game/tableLayout';
	import CameraContainer from './CameraContainer.svelte';
	import TablePieces from './TablePieces.svelte';

	// The wooden table (static/assets/table.webp) over the whole screen (where, tableLayout; the board
	// lies on it, TiltedPlane), and a blue cast over everything in the free spins. A dark wood colour under
	// it all. The whole scene is seen through the camera: the table zooms with the board and the side
	// panel on it.
	const context = getContext();
	const showFeatureBackground = $derived(context.stateGame.gameType === 'freegame');
	const table = $derived(tableLayout());

	// the pieces standing on the table left of the board (TablePieces): desktop only, elsewhere the board
	// covers that part of the table
	const showTablePieces = $derived(context.stateLayoutDerived.layoutType() === 'desktop');
	// the table and its pieces are preloaded (assets.ts), so they're there under the loading screen
	const tableLoaded = $derived(Boolean(context.stateApp.loadedAssets?.table));
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x2a1309} zIndex={-3} />

<!-- once its pictures are in (they're preloaded): this is drawn under the loading screen too. Seen
     through the camera (CameraContainer), so the table and what stands on it zoom with the board. The
     container is there from the start, only what's in it waits for the pictures: MainContainer's zIndex
     goes on its inner container, not the one on the stage, so a container added later would be drawn
     over the loading screen (added before it) -->
<MainContainer zIndex={-2}>
	<CameraContainer>
		{#if tableLoaded}
			<Sprite key="table" x={table.x} y={table.y} width={table.width} height={table.height} />
			{#if showTablePieces}
				<TablePieces />
			{/if}
		{/if}
	</CameraContainer>
</MainContainer>

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={-1}>
	<CanvasSizeRectangle backgroundColor={0x2a1f66} backgroundAlpha={0.22} />
</FadeContainer>
