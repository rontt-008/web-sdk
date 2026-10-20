<script lang="ts" module>
	export type EmitterEventWalkingWilds =
		// SUPER and MYTHIC free spins: the big wilds that walk on cover their reels, as they look on
		// the board
		| {
				type: 'walkingWildsShow';
				// fish: it throws fish in the spin it walks into, so gets them on the way
				moves: {
					from: number;
					to: number;
					multiplier: number;
					newMultiplier?: number;
					fish?: boolean;
				}[];
		  }
		// cat paws reach up from under the board and grab each of them
		| { type: 'walkingWildsGrab' }
		// while the other reels spin, the paws carry them one reel left (or off the first one); in
		// MYTHIC free spins their multipliers then double
		| { type: 'walkingWildsMove' }
		// they are in place: the board draws them again and the paws let go and sink back down
		| { type: 'walkingWildsHide' };
</script>

<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { backOut, cubicIn, cubicInOut } from 'svelte/easing';
	import { BaseSprite, Container, Rectangle } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { BOARD_FRAME, BOARD_SIZES, SYMBOL_SIZE } from '../game/constants';
	import type { RawSymbol } from '../game/types';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import Symbol from './Symbol.svelte';

	const GRAB_DURATION = 300;
	const MOVE_DURATION = 450;
	const RELEASE_DURATION = 250;
	// a big wild whose multiplier doubles swells and settles as the new one shows
	const DOUBLE_DURATION = 350;
	const DOUBLE_SWELL = 0.15;

	// hands.png (588x1024) holds both paws, facing each other: the left one at x 0-218 and the right
	// one at x 370-588, both from y 376 down to their arms, which are cut flat at y 708. Their claw
	// tips are on their inner edges.
	const PAW_FRAMES = {
		left: new PIXI.Rectangle(0, 376, 218, 334),
		right: new PIXI.Rectangle(370, 376, 218, 334),
	};
	const PAW_SCALE = 0.62;
	const PAW_SIZES = { width: 218 * PAW_SCALE, height: 334 * PAW_SCALE };
	// each paw is placed by its claw tips (its inner edge) and its arm cut
	const PAW_ANCHORS = { left: { x: 1, y: 332 / 334 }, right: { x: 0, y: 332 / 334 } };
	// the claw tips this far from the big wild's middle, so the claws hold it tight
	const CLAW_TIPS_FROM_MIDDLE = SYMBOL_SIZE * 0.17;
	// they come up a little further apart and close in as they grab
	const PAWS_OPEN = SYMBOL_SIZE * 0.3;

	// The paws reach up from behind the frame's bottom log, which is drawn again over them: the
	// strip of board-frame.png under its inner panel (from y 665), opaque down to about y 718.
	const LOG_TOP = BOARD_FRAME.inner.y + BOARD_FRAME.inner.height;
	const LOG_FRAME = new PIXI.Rectangle(
		0,
		LOG_TOP,
		BOARD_FRAME.image.width,
		BOARD_FRAME.image.height - LOG_TOP,
	);
	const LOG_OPAQUE_HEIGHT = 718 - LOG_TOP;
	// each paw's arm is straight-edged from y 600 of hands.png down to its cut: that part stays
	// behind the log
	const PAW_HIDDEN_BELOW = 600;

	// from one reel to the one on its left; to is -1 off the board. Its multiplier becomes
	// newMultiplier there (doubled in MYTHIC free spins).
	// It walks with an empty mouth, as it was on the board; one that throws fish in the next spin
	// (fish) gets them as it moves, its mouth fading to full.
	type Walker = {
		from: number;
		to: number;
		multiplier: number;
		newMultiplier: number;
		fish: boolean;
		rawSymbol: RawSymbol;
		doubled?: boolean;
	};
	const bigWild = (multiplier: number, fish = false, fade = false): RawSymbol => ({
		name: 'W',
		wild: true,
		multiplier,
		bigWild: { anchor: true, multiplier, fish, fade },
	});

	const context = getContext();
	const handsTexture = $derived(context.stateApp.loadedAssets?.hands as PIXI.Texture | undefined);
	const pawTextures = $derived(
		handsTexture && {
			left: new PIXI.Texture({ source: handsTexture.source, frame: PAW_FRAMES.left }),
			right: new PIXI.Texture({ source: handsTexture.source, frame: PAW_FRAMES.right }),
		},
	);
	const frameTexture = $derived(
		context.stateApp.loadedAssets?.boardFrame as PIXI.Texture | undefined,
	);
	const logTexture = $derived(
		frameTexture && new PIXI.Texture({ source: frameTexture.source, frame: LOG_FRAME }),
	);

	// where BoardFrame draws the log, in the board's own units (the frame is stretched so its inner
	// panel wraps the board plus padding)
	const log = $derived.by(() => {
		const { width, height } = context.stateGameDerived.boardLayout();
		const scaleX = (width + BOARD_FRAME.padding * 2) / BOARD_FRAME.inner.width;
		const scaleY = (height + BOARD_FRAME.padding * 2) / BOARD_FRAME.inner.height;
		const panelMiddleX = BOARD_FRAME.inner.x + BOARD_FRAME.inner.width / 2;
		return {
			x: width / 2 - panelMiddleX * scaleX,
			// the bottom of the inner panel
			y: height + BOARD_FRAME.padding,
			width: BOARD_FRAME.image.width * scaleX,
			height: LOG_FRAME.height * scaleY,
			opaqueHeight: LOG_OPAQUE_HEIGHT * scaleY,
		};
	});
	// the arm cut, so the straight-edged part of the arm is behind the log
	const pawsRestY = $derived(log.y + (708 - PAW_HIDDEN_BELOW) * PAW_SCALE);
	// how far further down they start and go back to: all of the paw behind the log
	const PAWS_DROP = (PAW_HIDDEN_BELOW - 376) * PAW_SCALE + SYMBOL_SIZE * 0.1;

	let walkers = $state<Walker[]>([]);
	// the big wilds are drawn here until they are in place on the board; the paws stay to let go
	let wildsShown = $state(false);
	let walk = 0;
	// 0 on the reel it was on, 1 on the reel it moves to
	const progress = new Tween(0);
	// the paws: 0 down out of sight, 1 holding; then 0 holding, 1 back down
	const grab = new Tween(0);
	const release = new Tween(0);
	// 0 to 1 while a doubled multiplier shows
	const doubling = new Tween(0);

	const getX = (walker: Walker) =>
		getSymbolX(walker.from) + (getSymbolX(walker.to) - getSymbolX(walker.from)) * progress.current;
	// one walking off the first reel fades out, paws and all
	const getAlpha = (walker: Walker) => (walker.to < 0 ? 1 - progress.current : 1);

	// big wilds walking side by side are carried as one: the left paw on the leftmost of them, the
	// right paw on the rightmost
	const groups = $derived.by(() => {
		const result: { left: Walker; right: Walker }[] = [];
		for (const walker of [...walkers].sort((a, b) => a.from - b.from)) {
			const last = result[result.length - 1];
			if (last && walker.from === last.right.from + 1) last.right = walker;
			else result.push({ left: walker, right: walker });
		}
		return result;
	});
	const pawsY = $derived(pawsRestY + PAWS_DROP * (1 - grab.current + release.current));
	const pawsOpen = $derived(PAWS_OPEN * (1 - grab.current));

	context.eventEmitter.subscribeOnMount({
		walkingWildsShow: ({ moves }) => {
			walk++;
			progress.set(0, { duration: 0 });
			grab.set(0, { duration: 0 });
			release.set(0, { duration: 0 });
			doubling.set(0, { duration: 0 });
			wildsShown = true;
			walkers = moves.map(({ from, to, multiplier, newMultiplier = multiplier, fish = false }) => ({
				from,
				to,
				multiplier,
				newMultiplier,
				fish,
				rawSymbol: bigWild(multiplier),
			}));
		},
		walkingWildsGrab: async () => {
			if (walkers.length === 0) return;
			await grab.set(1, {
				duration: GRAB_DURATION / stateBetDerived.timeScale(),
				easing: backOut,
			});
		},
		walkingWildsMove: async () => {
			if (walkers.length === 0) return;
			// the ones getting fish for the next spin fade to full mouths on the way
			walkers = walkers.map((walker) =>
				walker.fish ? { ...walker, rawSymbol: bigWild(walker.multiplier, true, true) } : walker,
			);
			await progress.set(1, {
				duration: MOVE_DURATION / stateBetDerived.timeScale(),
				easing: cubicInOut,
			});

			// MYTHIC free spins: once there, the multipliers double
			const doubles = (walker: Walker) =>
				walker.to >= 0 && walker.newMultiplier !== walker.multiplier;
			if (!walkers.some(doubles)) return;
			walkers = walkers.map((walker) =>
				doubles(walker)
					? { ...walker, rawSymbol: bigWild(walker.newMultiplier, walker.fish), doubled: true }
					: walker,
			);
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
			await doubling.set(1, { duration: DOUBLE_DURATION / stateBetDerived.timeScale() });
		},
		walkingWildsHide: async () => {
			wildsShown = false;
			const thisWalk = walk;
			await release.set(1, {
				duration: RELEASE_DURATION / stateBetDerived.timeScale(),
				easing: cubicIn,
			});
			// unless the next walk has started meanwhile
			if (walk === thisWalk) walkers = [];
		},
	});
</script>

<!-- the big wilds, over the reels and clipped to the board like them -->
<BoardContainer>
	<BoardMask />
	{#if wildsShown}
		{#each walkers as walker, index (index)}
			<Container
				x={getX(walker)}
				y={BOARD_SIZES.height / 2}
				alpha={getAlpha(walker)}
				scale={walker.doubled ? 1 + DOUBLE_SWELL * Math.sin(Math.PI * doubling.current) : 1}
			>
				<Symbol state="static" rawSymbol={walker.rawSymbol} />
			</Container>
		{/each}
	{/if}
</BoardContainer>

<!-- the paws over them, their claws dug into the big wilds' sides, coming up from behind the
	frame's bottom log: clipped at the bottom of the log, which is drawn again over them -->
<BoardContainer>
	<Rectangle
		isMask
		x={-SYMBOL_SIZE * 2}
		y={-SYMBOL_SIZE}
		width={context.stateGameDerived.boardLayout().width + SYMBOL_SIZE * 4}
		height={log.y + log.opaqueHeight + SYMBOL_SIZE}
	/>
	{#if pawTextures}
		{#each groups as group, index (index)}
			<BaseSprite
				texture={pawTextures.left}
				anchor={PAW_ANCHORS.left}
				{...PAW_SIZES}
				x={getX(group.left) - CLAW_TIPS_FROM_MIDDLE - pawsOpen}
				y={pawsY}
				alpha={getAlpha(group.left)}
			/>
			<BaseSprite
				texture={pawTextures.right}
				anchor={PAW_ANCHORS.right}
				{...PAW_SIZES}
				x={getX(group.right) + CLAW_TIPS_FROM_MIDDLE + pawsOpen}
				y={pawsY}
				alpha={getAlpha(group.right)}
			/>
		{/each}
	{/if}
	{#if logTexture && walkers.length > 0}
		<BaseSprite texture={logTexture} x={log.x} y={log.y} width={log.width} height={log.height} />
	{/if}
</BoardContainer>
