<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	import { Rectangle, Sprite, SpineProvider, SpineTrack } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	const SPINE_SCALE = { width: 0.6, height: 0.6 };
	const POSITION_ADJUSTMENT = 1.01;

	const frame = $derived(context.stateGameDerived.boardFrameLayout());

	// the solid panel the symbols sit on, filling the frame's opening and reaching a little under the
	// wood so its edges are hidden
	const PANEL_COLOR = 0x2b170d;
	const PANEL_OVERLAP = SYMBOL_SIZE * 0.15;
	const panel = $derived({
		x: frame.opening.left - PANEL_OVERLAP,
		y: frame.opening.top - PANEL_OVERLAP,
		width: frame.opening.right - frame.opening.left + PANEL_OVERLAP * 2,
		height: frame.opening.bottom - frame.opening.top + PANEL_OVERLAP * 2,
	});

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

<Rectangle {...panel} backgroundColor={PANEL_COLOR} />

<!-- the wooden frame, its opening around the board (see boardFrameLayout) -->
<Sprite
	key="boardFrame"
	x={frame.x}
	y={frame.y}
	anchor={frame.anchor}
	width={frame.width}
	height={frame.height}
/>
