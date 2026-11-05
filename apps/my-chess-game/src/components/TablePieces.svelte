<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { Graphics, Sprite, SpriteSheet } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { squareToQuad } from '../game/tilt';
	import { tableLayout } from '../game/tableLayout';
	import TiltedPlane from './TiltedPlane.svelte';

	// Three pieces standing on the table between the lamp and the board (desktop only, see Background:
	// elsewhere the board covers that part of the table), in a small group: the pawn at the back, the rook
	// beside it, the king in front to the right, each a little to the side of the others. Each is set by
	// the middle of its foot, `gap` left of the board's frame, `at` px down the table's picture (all on the
	// plank between the gaps at 296 and 484 px, art-source/table.png, so none stands in a gap whatever the
	// screen's shape), `height` tall; `aspect` is its still picture's width over its height
	// (art-source/table-pieces.py). The nearer (lower) ones are drawn over the further. Each casts a soft
	// shadow away from the lamp (down and to the right).
	//
	// When the fist slams the board (FistSlam, as a bonus starts) all three play their animation at once (the user's
	// Blender renders, art-source/table-piece-anims.py, the fist landing on frame 4 in each): the king and
	// the pawn hop and settle back where they stood, the rook is knocked over and lies on its side (the
	// last frame held, its shadow moving under it as it falls) until it fades back to standing. Each
	// animation is lined up with its still by the standing piece's foot (`anim.anchor`, a frame's 0-1) and
	// height in it (`anim.standing`, px).
	//
	// They lean back a little, as the board does (BACK_TILT): each is drawn, with its animation, on a tilted
	// plane (TiltedPlane) the size of its animation's frame, its foot staying where it stands and its top
	// a little narrower and lower, the hop above it and the rook's fall beside it tilted the same way.
	type Piece = {
		name: 'pawn' | 'king' | 'rook';
		key: string;
		aspect: number;
		height: number;
		gap: number;
		at: number;
		anim: { key: string; anchor: { x: number; y: number }; standing: number; frame: { w: number; h: number } };
	};
	const PIECES: Piece[] = [
		{
			name: 'pawn',
			key: 'tablePawn',
			aspect: 0.628,
			height: 92,
			gap: 140,
			at: 370,
			anim: { key: 'tablePawnAnim', anchor: { x: 0.4976, y: 0.9893 }, standing: 161, frame: { w: 102, h: 175 } },
		},
		{
			name: 'king',
			key: 'tableKing',
			aspect: 0.463,
			height: 140,
			gap: 88,
			at: 458,
			anim: { key: 'tableKingAnim', anchor: { x: 0.4969, y: 0.9953 }, standing: 245, frame: { w: 115, h: 257 } },
		},
		{
			name: 'rook',
			key: 'tableRook',
			aspect: 0.659,
			height: 108,
			gap: 190,
			at: 420,
			anim: { key: 'tableRookAnim', anchor: { x: 0.7899, y: 0.9957 }, standing: 189, frame: { w: 303, h: 217 } },
		},
	];
	const ANIM_KEYS = PIECES.map((piece) => piece.anim.key);
	// 30 frames a second (1 is 60)
	const ANIMATION_SPEED = 0.5;
	// the rook lying down, from its foot in units (its last frame), and the frames it falls over in
	const ROOK_LYING = { left: -136.6, right: -27.5, bottom: -10 };
	const ROOK_FALL = { from: 19, to: 33 };
	// how long the rook lies before it fades back to standing, and the fade, ms
	const ROOK_HOLD = 3000;
	const ROOK_FADE = 500;
	// how far back they lean: a piece's top as wide as this of its foot, and its height this of its own
	const BACK_TILT = { far: 0.9, depth: 0.95 };

	const context = getContext();

	const pieces = $derived.by(() => {
		const board = context.stateGameDerived.boardLayout();
		const left = board.x - board.width / 2 - board.frame;
		const table = tableLayout();
		return PIECES.map((piece) => {
			const width = piece.height * piece.aspect;
			const x = left - piece.gap;
			const y = table.y + piece.at * table.scale;
			// its animation's frame on the table (the foot at its anchor): the plane it's drawn on
			const scale = piece.height / piece.anim.standing;
			const frame = { width: piece.anim.frame.w * scale, height: piece.anim.frame.h * scale };
			const foot = { x: piece.anim.anchor.x * frame.width, y: piece.anim.anchor.y * frame.height };
			const plane = { x: x - foot.x, y: y - foot.y, ...frame };
			// leaning back about its foot line: its standing box to that box with its top narrower and lower
			const half = width / 2;
			const topY = y - piece.height * BACK_TILT.depth;
			const map = squareToQuad([x - half * BACK_TILT.far, topY, x + half * BACK_TILT.far, topY, x + half, y, x - half, y]);
			const tilt = (px: number, py: number) => map((px - (x - half)) / width, (py - (y - piece.height)) / piece.height);
			return { ...piece, width, x, y, scale, plane, foot, tilt };
		}).sort((a, b) => a.y - b.y);
	});

	// the slam: which pieces are playing their animation, the rook's frame and its fade back
	const playing = $state({ pawn: false, king: false, rook: false });
	let rookFrame = $state(0);
	const rookBack = new Tween(0);
	const ready = $derived(ANIM_KEYS.every((key) => context.stateApp.loadedAssets?.[key]));

	const slam = () => {
		rookFrame = 0;
		rookBack.set(0, { duration: 0 });
		playing.pawn = playing.king = playing.rook = true;
	};
	const finished = (name: Piece['name']) => {
		if (name !== 'rook') {
			playing[name] = false;
			return;
		}
		setTimeout(async () => {
			await rookBack.set(1, { duration: ROOK_FADE });
			playing.rook = false;
			rookBack.set(0, { duration: 0 });
		}, ROOK_HOLD);
	};

	// the fist's slam (FistSlam, as a bonus starts) sets them off, unless the rook is still down
	context.eventEmitter.subscribeOnMount({
		tableSlam: () => {
			if (ready && !playing.rook) slam();
		},
	});

	onMount(() => {
		context.stateApp.loadLazyAssets(ANIM_KEYS);
	});

	// the shadows: under each foot, and under the rook as it lies (crossed over as it falls, and back as
	// it fades up again)
	const rookFallen = $derived(
		playing.rook
			? Math.min(1, Math.max(0, (rookFrame - ROOK_FALL.from) / (ROOK_FALL.to - ROOK_FALL.from))) * (1 - rookBack.current)
			: 0,
	);
	const shadowBlur = new PIXI.BlurFilter({ strength: 6, quality: 3 });
	const drawShadows = (graphics: PIXI.Graphics) => {
		for (const piece of pieces) {
			const standing = piece.name === 'rook' ? 1 - rookFallen : 1;
			graphics
				.ellipse(piece.x + piece.width * 0.55, piece.y - 1, piece.width * 0.8, piece.width * 0.17)
				.fill({ color: 0x000000, alpha: 0.5 * standing });
			graphics
				.ellipse(piece.x + 2, piece.y - 2, piece.width * 0.5, piece.width * 0.11)
				.fill({ color: 0x000000, alpha: 0.6 * standing });
			if (piece.name === 'rook' && rookFallen > 0) {
				// where it lies, leaning back with the rest of it
				const ends = [ROOK_LYING.left, ROOK_LYING.right].map((dx) => piece.tilt(piece.x + dx, piece.y + ROOK_LYING.bottom));
				const middle = (ends[0].x + ends[1].x) / 2;
				const half = (ends[1].x - ends[0].x) / 2;
				const bottom = (ends[0].y + ends[1].y) / 2;
				graphics.ellipse(middle + 10, bottom + 1, half + 8, 11).fill({ color: 0x000000, alpha: 0.5 * rookFallen });
				graphics.ellipse(middle + 2, bottom - 1, half, 7).fill({ color: 0x000000, alpha: 0.6 * rookFallen });
			}
		}
	};
</script>

<Graphics draw={drawShadows} filters={[shadowBlur]} />
{#each pieces as piece (piece.key)}
	{@const animating = playing[piece.name] && ready}
	{@const fading = piece.name === 'rook' ? rookBack.current : 0}
	<TiltedPlane
		size={{ width: piece.plane.width, height: piece.plane.height }}
		project={(x, y) => piece.tilt(piece.plane.x + x, piece.plane.y + y)}
		pad={4}
		detail={1.6}
		shadow={0}
	>
		{#if animating}
			<SpriteSheet
				key={piece.anim.key}
				play
				loop={false}
				animationSpeed={ANIMATION_SPEED}
				anchor={piece.anim.anchor}
				x={piece.foot.x}
				y={piece.foot.y}
				scale={piece.scale}
				alpha={1 - fading}
				onFrameChange={piece.name === 'rook' ? (frame: number) => (rookFrame = frame) : undefined}
				onComplete={() => finished(piece.name)}
			/>
		{/if}
		{#if !animating || fading > 0}
			<Sprite
				key={piece.key}
				anchor={{ x: 0.5, y: 1 }}
				x={piece.foot.x}
				y={piece.foot.y}
				width={piece.width}
				height={piece.height}
				alpha={animating ? fading : 1}
			/>
		{/if}
	</TiltedPlane>
{/each}
