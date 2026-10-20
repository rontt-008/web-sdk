<script lang="ts">
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();

	// the fox art (static/assets/fox.webp) is 1251 x 1078: the fox with a dark outline, so it stands
	// out from the orange scene, and a soft shadow under it; its paws are 1008 down, its head on the
	// left so it faces the board from the right
	const FOX_ART = { width: 1251, height: 1078, paws: 1008 };
	const FOX_RATIO = FOX_ART.width / FOX_ART.height;
	// sizes are of the whole art, shadow included
	const FOX = {
		maxHeight: SYMBOL_SIZE * 3.7,
		// smaller than this, it is left out (narrow screens have no room beside the board)
		minHeight: SYMBOL_SIZE * 1.65,
		// from its nose to the board frame, and from the tip of its tail to the screen's edge
		gapToBoard: SYMBOL_SIZE * 0.15,
		screenMargin: SYMBOL_SIZE * 0.15,
		// its paws this far above the frame's bottom, clear of the spin button under them
		lift: SYMBOL_SIZE * 0.25,
	};

	// standing right of the board frame, about level with its bottom, as big as the room there allows
	const layout = $derived.by(() => {
		const frame = context.stateGameDerived.boardFrameLayout().visible;
		const main = context.stateLayoutDerived.mainLayout();
		const canvas = context.stateLayoutDerived.canvasSizes();
		const frameRight = frame.right;
		const frameBottom = frame.bottom;
		// the screen's right edge, in the board's coordinates
		const screenRight = main.width / 2 + canvas.width / 2 / main.scale;

		const room = screenRight - FOX.screenMargin - (frameRight + FOX.gapToBoard);
		const height = Math.min(FOX.maxHeight, room / FOX_RATIO);
		const width = height * FOX_RATIO;

		return {
			x: frameRight + FOX.gapToBoard + width / 2,
			y: frameBottom - FOX.lift,
			width,
			height,
		};
	});
</script>

<!-- only on wide screens: phones held sideways have the spin and bet buttons right of the board -->
{#if context.stateLayoutDerived.layoutType() === 'desktop' && layout.height >= FOX.minHeight}
	<Sprite key="fox" anchor={{ x: 0.5, y: FOX_ART.paws / FOX_ART.height }} {...layout} />
{/if}
