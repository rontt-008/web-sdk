<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	import { Rectangle, Sprite, SpineProvider, SpineTrack } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_SIZES, BOARD_DIMENSIONS } from '../game/constants';
	import { lookColor } from '../game/look';

	const context = getContext();
	const SPINE_SCALE = { width: 0.6, height: 0.6 };
	const POSITION_ADJUSTMENT = 1.01;

	const frame = $derived(context.stateGameDerived.boardFrameLayout());

	// the slightly see-through panel the symbols sit on, so they stand out from the background: it fills
	// the frame's opening and reaches a little under the wood, so its edges are hidden; dark brown in
	// the board's duller look (see look.ts), like the frame's art
	const PANEL_COLOR = lookColor(0x24170e);
	const PANEL_ALPHA = 0.9;
	const PANEL_TUCK = SYMBOL_SIZE * 0.15;
	const panel = $derived({
		x: frame.opening.left - PANEL_TUCK,
		y: frame.opening.top - PANEL_TUCK,
		width: frame.opening.right - frame.opening.left + PANEL_TUCK * 2,
		height: frame.opening.bottom - frame.opening.top + PANEL_TUCK * 2,
	});

	// thin lighter lines on the panel between the reels, so the columns are easier to follow: from the
	// panel's top to its bottom, their ends under the wood
	const LINE_COLOR = lookColor(0x8a6a4a);
	const LINE_ALPHA = 0.35;
	const LINE_WIDTH = SYMBOL_SIZE * 0.025;
	const lines = $derived(
		Array.from({ length: BOARD_DIMENSIONS.x - 1 }, (_, index) => ({
			x: frame.x - BOARD_SIZES.width / 2 + SYMBOL_SIZE * (index + 1) - LINE_WIDTH / 2,
			y: panel.y,
			width: LINE_WIDTH,
			height: panel.height,
		})),
	);

	type AnimationName = 'reelhouse_glow_start' | 'reelhouse_glow_idle' | 'reelhouse_glow_exit';

	let animationName = $state<AnimationName | undefined>(undefined);
	let loop = $state(false);

	context.eventEmitter.subscribeOnMount({
		boardFrameGlowShow: () => {
			animationName = 'reelhouse_glow_start';
			loop = false;
		},
		boardFrameGlowHide: () => {
			if (animationName) animationName = 'reelhouse_glow_exit';
		},
	});
</script>

{#if animationName}
	<SpineProvider
		zIndex={-1}
		key="reelhouse"
		x={context.stateGameDerived.boardLayout().x * POSITION_ADJUSTMENT}
		y={context.stateGameDerived.boardLayout().y * POSITION_ADJUSTMENT}
		width={context.stateGameDerived.boardLayout().width * SPINE_SCALE.width}
		height={context.stateGameDerived.boardLayout().height * SPINE_SCALE.height}
	>
		<SpineTrack
			trackIndex={0}
			{animationName}
			{loop}
			listener={{
				complete: (entry) => {
					if (entry.animation) {
						if (entry.animation.name === 'reelhouse_glow_start') {
							animationName = 'reelhouse_glow_idle';
							loop = true;
						}

						if (entry.animation.name === 'reelhouse_glow_exit') {
							animationName = undefined;
							loop = false;
						}
					}
				},
			}}
		/>
	</SpineProvider>
{/if}

<Rectangle {...panel} backgroundColor={PANEL_COLOR} backgroundAlpha={PANEL_ALPHA} />
{#each lines as line}
	<Rectangle {...line} backgroundColor={LINE_COLOR} backgroundAlpha={LINE_ALPHA} />
{/each}

<!-- the wooden frame, its opening around the board (see boardFrameLayout) -->
<Sprite
	key="boardFrame"
	x={frame.x}
	y={frame.y}
	anchor={frame.anchor}
	width={frame.width}
	height={frame.height}
/>
