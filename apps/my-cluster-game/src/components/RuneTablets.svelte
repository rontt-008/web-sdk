<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';

	import RuneTablet, { RUNE_BOX_FRAME, runeBoxFrameScale } from './RuneTablet.svelte';
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

	// from the boxes to the board's frame and to the screen's edge, and how wide they get
	const GAP = LAYOUT_UNIT * 0.04;
	const MARGIN = LAYOUT_UNIT * 0.04;
	const MAX_WIDTH = LAYOUT_UNIT * 3.2;
	// the column this much lower than from the top of the screen to the bottom of the board (its
	// bottom still clears the UI's bar)
	const DROP = LAYOUT_UNIT * 0.2;
	// narrower than this left of the frame (phones held upright), they go in a row above it
	const MIN_COLUMN = LAYOUT_UNIT * 0.9;
	const ROW_HEIGHT = LAYOUT_UNIT * 1.25;

	// how far neighbouring boxes overlap, so their frames' branches touch: by the see-through room
	// beyond the branches, at the frame's size for that box (which needs the box's size: worked out
	// a few times, it settles)
	const { width: ART_WIDTH, height: ART_HEIGHT, outer } = RUNE_BOX_FRAME;
	const OVERLAP = {
		down: outer.top + (ART_HEIGHT - outer.bottom),
		across: outer.left + (ART_WIDTH - outer.right),
	};
	const fitTouching = (room: number, other: number, overlap: number, upright: boolean) => {
		let size = room / 4;
		for (let i = 0; i < 4; i++) {
			const scale = upright ? runeBoxFrameScale(other, size) : runeBoxFrameScale(size, other);
			size = (room + 3 * overlap * scale) / 4;
		}
		const scale = upright ? runeBoxFrameScale(other, size) : runeBoxFrameScale(size, other);
		return { size, step: size - overlap * scale };
	};

	// The four boxes, touching: a column left of the board's frame, from the top of the screen (or of
	// the board's frame) to the bottom of the board, or with no room there a row above the frame.
	const boxes = $derived.by(() => {
		const main = context.stateLayoutDerived.mainLayout();
		const board = context.stateGameDerived.boardLayout();
		const frame = context.stateGameDerived.boardFrameLayout();
		// the screen's top left corner in the main layout
		const screenLeft = main.width / 2 - main.x / main.scale;
		const screenTop = main.height / 2 - main.y / main.scale;

		const right = frame.visible.left - GAP;
		const left = Math.max(screenLeft + MARGIN, right - MAX_WIDTH);
		if (right - left >= MIN_COLUMN) {
			const top = Math.max(screenTop + MARGIN, frame.visible.top) + DROP;
			const bottom = board.y + board.height / 2 + DROP;
			const width = right - left;
			const { size, step } = fitTouching(bottom - top, width, OVERLAP.down, true);
			return RUNE_NAMES.map((_, i) => ({ x: left, y: top + i * step, width, height: size }));
		}

		const bottom = frame.visible.top - GAP;
		const height = Math.min(ROW_HEIGHT, bottom - screenTop - MARGIN);
		const { size, step } = fitTouching(
			frame.visible.right - frame.visible.left,
			height,
			OVERLAP.across,
			false,
		);
		return RUNE_NAMES.map((_, i) => ({
			x: frame.visible.left + i * step,
			y: bottom - height,
			width: size,
			height,
		}));
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
				state={stateOf(name)}
				offset={offsets[name]}
				glows={name === active ? glows.map((glow) => glow.current) : []}
				scale={pulses[name].current}
			/>
		{/each}
	</FadeContainer>
</MainContainer>
