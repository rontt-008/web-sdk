<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { Sprite } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { setYourColour } from '../game/stateGame.svelte';
	import { sidePanelLayout } from '../game/sideLayout';
	import CameraContainer from './CameraContainer.svelte';

	// The toggle of the colour your pieces are drawn in: just the two kings, the white (left) and the
	// black (right) in the pieces' own pictures, the king you play bright and full size, the other
	// faded and a little smaller; a press swaps them. Under the side panel's bottom left corner on
	// desktop (where the panel's layout has it otherwise), and seen through the camera like the table
	// it lies on, so it keeps its place as the board zooms. The maths is the same either way (you
	// always move first): it only changes the pictures, as the rules say.
	const context = getContext();
	const layout = $derived(sidePanelLayout());
	const isBlack = $derived(context.stateGame.yourColour === 'black');

	// its sizes, in the main layout's units
	const KING = 46;
	const GAP = 8;
	const WIDTH = KING * 2 + GAP;
	const HEIGHT = KING + 10;
	const at = $derived(layout.panel ? { x: layout.panel.x + WIDTH / 2, y: layout.toggle.y } : layout.toggle);

	const whiteFade = new Tween(isBlack ? 0.45 : 1, { duration: 300 });
	const blackFade = new Tween(isBlack ? 1 : 0.45, { duration: 300 });
	$effect(() => {
		whiteFade.set(isBlack ? 0.45 : 1);
		blackFade.set(isBlack ? 1 : 0.45);
	});
	// the king you play at full size, the other a little smaller
	const sizeOf = (fade: number) => KING * (0.8 + ((fade - 0.45) / 0.55) * 0.2);
</script>

<MainContainer>
	<CameraContainer>
		<Button
			x={at.x}
			y={at.y}
			anchor={0.5}
			sizes={{ width: WIDTH, height: HEIGHT }}
			onpress={() => setYourColour(isBlack ? 'white' : 'black')}
		>
			{#snippet children()}
				<Sprite
					key="wK"
					anchor={0.5}
					x={KING / 2}
					y={HEIGHT / 2}
					width={sizeOf(whiteFade.current)}
					height={sizeOf(whiteFade.current)}
					alpha={whiteFade.current}
				/>
				<Sprite
					key="bK"
					anchor={0.5}
					x={WIDTH - KING / 2}
					y={HEIGHT / 2}
					width={sizeOf(blackFade.current)}
					height={sizeOf(blackFade.current)}
					alpha={blackFade.current}
				/>
			{/snippet}
		</Button>
	</CameraContainer>
</MainContainer>
