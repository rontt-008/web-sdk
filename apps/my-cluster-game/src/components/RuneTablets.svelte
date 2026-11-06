<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Container, Sprite } from 'pixi-svelte';

	import { CanvasTextMetrics, TextStyle } from 'pixi.js';

	import RuneTablet from './RuneTablet.svelte';
	import MeterSouls from './MeterSouls.svelte';
	import { getContext } from '../game/context';
	import { RUNE_LADDER_ART } from '../game/stateGame.svelte';
	import { signTextStyle } from '../game/signText';
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
		...RUNE_LADDER_ART,
		compartments: [
			{ left: 106, top: 114, right: 519, bottom: 437 },
			{ left: 109, top: 469, right: 520, bottom: 790 },
			{ left: 124, top: 819, right: 519, bottom: 1131 },
			{ left: 119, top: 1159, right: 522, bottom: 1428 },
		],
	};
	const TUCK = 12;

	// The ladder, as big as fits: standing up left of the board's frame or lying down over it (see
	// runeLadderLayout, which also moves the board so it has the room)
	const ladder = $derived(context.stateGameDerived.runeLadderLayout());

	// The powers under the pictures, all the same size, as big as the longest fits (see RuneTablet):
	// how wide the longest power and the longest word are, in their font size (measured, with their
	// outline; a little to spare). They change in the free spins (Fehu's multiplier, Ingwaz's spins).
	const SPARE = 1.04;
	const MEASURE_SIZE = 100;
	const powerTexts = $derived(
		RUNE_NAMES.map((name) => RUNES[name].powerText(context.stateGame.bonusType, context.stateGame)),
	);
	const longest = $derived.by(() => {
		const style = new TextStyle(signTextStyle(MEASURE_SIZE));
		const measure = (text: string) =>
			(CanvasTextMetrics.measureText(text, style).width / MEASURE_SIZE) * SPARE;
		return {
			line: Math.max(...powerTexts.map(measure)),
			word: Math.max(...powerTexts.flatMap((text) => text.split(' ')).map(measure)),
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
		glows = name
			? RUNES[name].spots.map(() => new Tween(0, { duration: 400, easing: cubicOut }))
			: [];
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
		runesPulse: async ({ rune }) => {
			show = true;
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
				lit.forEach((position) =>
					glows[runeSpotIndex(rune, offsets[rune], position)]?.set(1, { duration: 0 }),
				);
			}
		},
	});

	// the runes whose symbols land in the free spins, their souls flying into the middle of their box
	// (see runeSouls)
	const SYMBOL_RUNES: RuneName[] = ['fehu', 'ingwaz'];
	const boxCentre = (name: RuneName) => {
		const box = boxes[RUNE_NAMES.indexOf(name)];
		return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
	};

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
				power={powerTexts[i]}
				{longest}
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

<!-- the rune symbols' souls, over the boxes and the ladder: in their own container, as beside them
in the same one they went under them (a FadeContainer goes once faded out and comes back, as it
does as it mounts, added after them) -->
<MainContainer>
	{#each SYMBOL_RUNES as name}
		<MeterSouls rune={name} target={boxCentre(name)} />
	{/each}
</MainContainer>
