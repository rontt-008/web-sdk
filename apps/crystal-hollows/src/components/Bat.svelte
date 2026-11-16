<script lang="ts" module>
	export type EmitterEventBat = { type: 'batAttack' };
</script>

<script lang="ts">
	import { Container, SpineProvider } from 'pixi-svelte';

	import BatSpine from './BatSpine.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();

	// The crystal bat (the user's bat_fly.blend as a Spine skeleton, now from bat_attack.blend's export,
	// art-source/bat-spine.py): flapping on the spot in its `fly` loop (3 s), in the air right of the
	// board. As the free spins trigger (batAttack) it attacks (the user, 2026-11-13: "add this animation to
	// the bat and trigger it when you get a bonus"), BatSpine; its lunge reaches a little past the box
	// below (the hover's, where it spends its time).
	// Where its wings reach over the loop, in the skeleton's units with y down (its origin is between
	// its shoulders): measured with Spine's maths, frame by frame. This box is fitted into the room.
	const LOOP_BOUNDS = { x: -739, y: -548, width: 1462, height: 987 };
	const BAT = {
		// the room's width it fills: at most this, and narrower than minWidth it is left out (no room
		// beside the board)
		maxWidth: SYMBOL_SIZE * 2.9,
		minWidth: SYMBOL_SIZE * 1.6,
		// and then drawn this much bigger (the user's ask): where the room is too narrow for that, its
		// far wing reaches over the board frame (it is drawn over the board, see Game)
		size: 1.5,
		// the room: from this right of the board frame to this inside the screen's right edge
		gapToFrame: SYMBOL_SIZE * 0.1,
		screenMargin: SYMBOL_SIZE * 0.15,
		// then moved this much right (the user's ask), so its far wing reaches less far over the frame;
		// at most this far past the room's right edge, where its near wing's tip goes off the screen
		// at the top of its swing
		nudgeRight: SYMBOL_SIZE * 0.5,
		overhang: SYMBOL_SIZE * 0.5,
		// its middle this far above the board's middle (in board heights): up in the cave's air, clear
		// of the crystals and rocks on the right (the logo, which was above it here, is left of the
		// board since 2026-11-13; 0.25 till then, the user: "move the bat down a bit too")
		above: 0.18,
	};
	// as well as its own bob, it drifts slowly about where it hovers (units, and seconds a sway),
	// side to side and up and down out of step, so the loop never looks pinned to one spot
	const DRIFT = { x: SYMBOL_SIZE * 0.08, y: SYMBOL_SIZE * 0.06, xPeriod: 11, yPeriod: 7.3 };

	// in the middle of the room right of the board frame, sized by the room
	const layout = $derived.by(() => {
		const board = context.stateGameDerived.boardLayout();
		const frame = context.stateGameDerived.boardFrameLayout();
		const main = context.stateLayoutDerived.mainLayout();
		const canvas = context.stateLayoutDerived.canvasSizes();
		// the room, in the board's coordinates
		const left = frame.right + BAT.gapToFrame;
		const right = main.width / 2 + canvas.width / 2 / main.scale - BAT.screenMargin;
		const fit = Math.min(BAT.maxWidth, right - left);
		const width = fit * BAT.size;
		return {
			x: Math.min((left + right) / 2 + BAT.nudgeRight, right + BAT.overhang - width / 2),
			y: board.y - board.height * board.scale * BAT.above,
			fit,
			scale: width / LOOP_BOUNDS.width,
		};
	});

	// only on wide screens (phones held sideways have the spin and bet buttons right of the board),
	// and once it is loaded (it is lazy, loaded by Game when the screen is wide)
	const shown = $derived(
		context.stateLayoutDerived.layoutType() === 'desktop' &&
			layout.fit >= BAT.minWidth &&
			!!context.stateApp.loadedAssets.bat,
	);

	// the attacks asked for (BatSpine plays one each time this goes up)
	let attacks = $state(0);
	context.eventEmitter.subscribeOnMount({
		batAttack: () => {
			attacks += 1;
		},
	});

	let drift = $state({ x: 0, y: 0 });
	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!shown || !ticker) return;
		let time = 0;
		const tick = () => {
			time += ticker.deltaMS / 1000;
			drift = {
				x: DRIFT.x * Math.sin((2 * Math.PI * time) / DRIFT.xPeriod),
				y: DRIFT.y * Math.sin((2 * Math.PI * time) / DRIFT.yPeriod + 1),
			};
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});
</script>

{#if shown}
	<!-- the container at the box's middle; the skeleton's origin put so the box is centred there -->
	<Container x={layout.x + drift.x} y={layout.y + drift.y} scale={layout.scale}>
		<SpineProvider
			key="bat"
			x={-(LOOP_BOUNDS.x + LOOP_BOUNDS.width / 2)}
			y={-(LOOP_BOUNDS.y + LOOP_BOUNDS.height / 2)}
		>
			<BatSpine {attacks} />
		</SpineProvider>
	</Container>
{/if}
