<script lang="ts">
	import { Rectangle } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { sidePanelLayout } from '../game/sideLayout';
	import { LAMP_SHADOW } from '../game/tilt';
	import { notebook } from '../game/notebook.svelte';
	import TiltedPlane from './TiltedPlane.svelte';
	import CameraContainer from './CameraContainer.svelte';
	import NotebookPad from './NotebookPad.svelte';

	// The notebook (NotebookPad) lying on the table beside the board, in the same plane: right of it on
	// desktop; left of it on phones held sideways, drawn bigger there (`zoom`) to be read, and a press on
	// it opens it bigger still over the board (NotebookOverlay). Seen through the camera
	// (CameraContainer) like the table it lies on, so it zooms with the scene.
	const context = getContext();
	const layout = $derived(sidePanelLayout());
	const panel = $derived(layout.panel);
	const size = $derived(panel ? { width: panel.width / panel.zoom, height: panel.height / panel.zoom } : { width: 0, height: 0 });
	const project = (x: number, y: number) =>
		panel ? context.stateGameDerived.tablePoint(panel.x + x * panel.zoom, panel.y + y * panel.zoom) : { x, y };

	// where a press opens it: round the pad as it's seen on the table
	const hit = $derived.by(() => {
		if (!panel || !layout.overlay) return undefined;
		const corners = [project(0, 0), project(size.width, 0), project(size.width, size.height), project(0, size.height)];
		const xs = corners.map((point) => point.x);
		const ys = corners.map((point) => point.y);
		return {
			x: Math.min(...xs),
			y: Math.min(...ys),
			width: Math.max(...xs) - Math.min(...xs),
			height: Math.max(...ys) - Math.min(...ys),
		};
	});
</script>

{#if panel}
	<MainContainer>
		<CameraContainer>
			<TiltedPlane {size} {project} pad={16} detail={panel.zoom} shadow={LAMP_SHADOW.alpha} shadowOffset={LAMP_SHADOW.offset}>
				<!-- the free spins left on it where there's no free spin sign by the board -->
				<NotebookPad
					width={size.width}
					height={size.height}
					zoom={panel.zoom}
					spinsLeft={context.stateLayoutDerived.layoutType() !== 'desktop'}
				/>
			</TiltedPlane>
			{#if hit}
				<Button x={hit.x} y={hit.y} sizes={{ width: hit.width, height: hit.height }} onpress={() => (notebook.open = true)}>
					{#snippet children()}
						<Rectangle width={hit.width} height={hit.height} backgroundColor={0x000000} backgroundAlpha={0.001} />
					{/snippet}
				</Button>
			{/if}
		</CameraContainer>
	</MainContainer>
{/if}
