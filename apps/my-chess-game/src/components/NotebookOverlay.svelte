<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { sidePanelLayout } from '../game/sideLayout';
	import { notebook, notebookLabel } from '../game/notebook.svelte';
	import NotebookPad from './NotebookPad.svelte';

	// The whole notebook (NotebookPad) opened flat over the board on phones and almost square screens,
	// big enough to read every move and the engine's reasons: opened with a press on the strip under the
	// board (NotebookStrip) or on the side panel (SidePanel, phones held sideways); a press anywhere shuts
	// it, and so does the next spin. Under the UI, which stays in reach.
	const context = getContext();
	const overlay = $derived(sidePanelLayout().overlay);
	const screen = $derived(context.stateGameDerived.screenBounds());

	const shown = new Tween(0, { duration: 220, easing: cubicOut });
	$effect(() => {
		shown.target = notebook.open && overlay ? 1 : 0;
	});
	// shut where there's nowhere to open it (desktop)
	$effect(() => {
		if (!overlay && notebook.open) notebook.open = false;
	});
	context.eventEmitter.subscribeOnMount({
		playBoardDrop: () => {
			notebook.open = false;
		},
	});

	const size = $derived(overlay ? { width: overlay.width / overlay.zoom, height: overlay.height / overlay.zoom } : { width: 0, height: 0 });
	const screenSize = $derived({ width: screen.right - screen.left, height: screen.bottom - screen.top });
	const resolution = $derived(
		Math.max(1, context.stateLayoutDerived.mainLayout().scale * Math.min(window.devicePixelRatio || 1, 2)),
	);
</script>

{#if overlay && shown.current > 0}
	<MainContainer>
		<Button x={screen.left} y={screen.top} sizes={screenSize} onpress={() => (notebook.open = false)}>
			{#snippet children()}
				<Rectangle
					width={screenSize.width}
					height={screenSize.height}
					backgroundColor={0x000000}
					backgroundAlpha={0.55 * shown.current}
				/>
			{/snippet}
		</Button>
		<!-- it rises a little as it opens; a press on it shuts it too -->
		<Container alpha={shown.current} y={(1 - shown.current) * 30}>
			<Button x={overlay.x} y={overlay.y} sizes={{ width: overlay.width, height: overlay.height }} onpress={() => (notebook.open = false)}>
				{#snippet children()}
					<Container scale={overlay.zoom}>
						<NotebookPad width={size.width} height={size.height} zoom={overlay.zoom} spinsLeft />
					</Container>
				{/snippet}
			</Button>
			{#if overlay.y - screen.top >= 40}
				<Text
					text="TAP ANYWHERE TO CLOSE"
					anchor={{ x: 0.5, y: 1 }}
					x={overlay.x + overlay.width / 2}
					y={overlay.y - 14}
					{resolution}
					style={notebookLabel(15, 0xdde9f1)}
				/>
			{/if}
		</Container>
	</MainContainer>
{/if}
