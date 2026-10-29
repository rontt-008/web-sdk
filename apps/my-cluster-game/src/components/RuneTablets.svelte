<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Container, Sprite } from 'pixi-svelte';

	import RuneTablet from './RuneTablet.svelte';
	import { getContext } from '../game/context';
	import { LAYOUT_UNIT } from '../game/constants';
	import {
		NO_OFFSET,
		RUNES,
		RUNE_NAMES,
		runeSpotIndex,
		type RuneName,
		type RuneOffset,
	} from '../game/runes';

	const context = getContext();

	// The ladder of branches the boxes sit in (static/assets/rune-ladder.webp, from
	// art-source/wood-frames.py), standing up, in its pixels: its size and its four compartments, inside
	// the branches, top to bottom; and how far a box's panel reaches under the branches round it.
	const LADDER_ART = {
		width: 606,
		height: 1499,
		compartments: [
			{ left: 106, top: 114, right: 519, bottom: 437 },
			{ left: 109, top: 469, right: 520, bottom: 790 },
			{ left: 124, top: 819, right: 519, bottom: 1131 },
			{ left: 119, top: 1159, right: 522, bottom: 1428 },
		],
	};
	const TUCK = 12;

	// from the ladder to the board's frame and to the screen's edge, and how wide it gets
	const GAP = LAYOUT_UNIT * 0.04;
	const MARGIN = LAYOUT_UNIT * 0.04;
	const MAX_WIDTH = LAYOUT_UNIT * 3.2;
	// the room for it this much lower than from the top of the screen to the bottom of the board (its
	// bottom still clears the UI's bar)
	const DROP = LAYOUT_UNIT * 0.2;
	// narrower than this left of the frame (phones held upright), it lies down in the bonus meter's
	// place above the board (the meter is hidden in the bonus)
	const MIN_COLUMN = LAYOUT_UNIT * 0.9;

	// The ladder, keeping its shape, as big as fits: standing up left of the board's frame, between
	// the top of the screen (or of the frame) and the bottom of the board, or lying down (turned a
	// quarter clockwise) in the bonus meter's place. `x`, `y` and `scale` are for its art.
	const ladder = $derived.by(() => {
		const main = context.stateLayoutDerived.mainLayout();
		const board = context.stateGameDerived.boardLayout();
		const frame = context.stateGameDerived.boardFrameLayout().visible;
		// the screen's top left corner in the main layout
		const screenLeft = main.width / 2 - main.x / main.scale;
		const screenTop = main.height / 2 - main.y / main.scale;
		const { width, height } = LADDER_ART;

		const right = frame.left - GAP;
		const left = Math.max(screenLeft + MARGIN, right - MAX_WIDTH);
		if (right - left >= MIN_COLUMN) {
			const top = Math.max(screenTop + MARGIN, frame.top) + DROP;
			const bottom = board.y + board.height / 2 + DROP;
			const scale = Math.min((right - left) / width, (bottom - top) / height);
			return {
				upright: true,
				x: (left + right - width * scale) / 2,
				y: (top + bottom - height * scale) / 2,
				scale,
			};
		}
		const room = context.stateGameDerived.bonusMeterLayout();
		const scale = Math.min(room.width / height, room.height / width);
		return {
			upright: false,
			x: room.x + (room.width - height * scale) / 2,
			y: room.y + (room.height - width * scale) / 2,
			scale,
		};
	});

	// the boxes in its compartments: top to bottom, or lying down left to right
	const boxes = $derived.by(() => {
		const { x, y, scale, upright } = ladder;
		if (upright) {
			return LADDER_ART.compartments.map((c) => ({
				x: x + c.left * scale,
				y: y + c.top * scale,
				width: (c.right - c.left) * scale,
				height: (c.bottom - c.top) * scale,
			}));
		}
		return [...LADDER_ART.compartments].reverse().map((c) => ({
			x: x + (LADDER_ART.height - c.bottom) * scale,
			y: y + c.left * scale,
			width: (c.bottom - c.top) * scale,
			height: (c.right - c.left) * scale,
		}));
	});

	// what the boxes' pictures and powers are laid out in: as big as fits the smallest compartment
	const content = $derived({
		width: Math.min(...boxes.map((box) => box.width)),
		height: Math.min(...boxes.map((box) => box.height)),
	});

	let show = $state(false);
	let active = $state<RuneName | undefined>(undefined);
	// where each rune lies on the board, or lay: its picture shows it there
	const noOffsets = () =>
		Object.fromEntries(RUNE_NAMES.map((name) => [name, NO_OFFSET])) as Record<RuneName, RuneOffset>;
	let offsets = $state(noOffsets());
	let collected = $state<RuneName[]>([]);
	// how lit the active rune's spots are, as on the board
	let glows = $state<Tween<number>[]>([]);
	const pulses = Object.fromEntries(
		RUNE_NAMES.map((name) => [name, new Tween(1, { duration: 220, easing: cubicOut })]),
	) as Record<RuneName, Tween<number>>;

	const activate = (name: RuneName | undefined) => {
		active = name;
		glows = name ? RUNES[name].spots.map(() => new Tween(0, { duration: 400, easing: cubicOut })) : [];
	};

	const reset = () => {
		show = false;
		activate(undefined);
		collected = [];
		offsets = noOffsets();
	};

	context.eventEmitter.subscribeOnMount({
		runesShow: ({ rune, offset }) => {
			show = true;
			offsets[rune] = offset;
			activate(rune);
		},
		runesLight: async ({ positions }) => {
			const name = active;
			if (!name) return;
			const spots = positions.map((position) => runeSpotIndex(name, offsets[name], position));
			await Promise.all(spots.filter((spot) => spot >= 0).map((spot) => glows[spot].set(1)));
		},
		runesComplete: async ({ rune }) => {
			activate(undefined);
			collected = [...collected, rune];
			await pulses[rune].set(1.12);
			await pulses[rune].set(1, { duration: 300 });
		},
		runesHide: () => activate(undefined),
		runesReset: reset,
		runesRestore: ({ rune, offsets: restoredOffsets, lit, collected: restored }) => {
			show = true;
			collected = restored;
			offsets = { ...noOffsets(), ...restoredOffsets };
			activate(rune);
			if (rune) {
				lit.forEach((position) => glows[runeSpotIndex(rune, offsets[rune], position)]?.set(1, { duration: 0 }));
			}
		},
	});

	const stateOf = (name: RuneName) =>
		collected.includes(name) ? 'collected' : name === active ? 'active' : 'waiting';
</script>

<MainContainer>
	<FadeContainer {show}>
		{#each RUNE_NAMES as name, i}
			<RuneTablet
				rune={name}
				{...boxes[i]}
				tuck={TUCK * ladder.scale}
				{content}
				state={stateOf(name)}
				offset={offsets[name]}
				glows={name === active ? glows.map((glow) => glow.current) : []}
				scale={pulses[name].current}
			/>
		{/each}

		<!-- the ladder over the boxes' panels; lying down, turned a quarter clockwise -->
		<Container
			x={ladder.upright ? ladder.x : ladder.x + LADDER_ART.height * ladder.scale}
			y={ladder.y}
			rotation={ladder.upright ? 0 : Math.PI / 2}
			scale={ladder.scale}
		>
			<Sprite key="runeLadder" width={LADDER_ART.width} height={LADDER_ART.height} />
		</Container>
	</FadeContainer>
</MainContainer>
