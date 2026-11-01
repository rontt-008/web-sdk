<script lang="ts" module>
	import ClusterWinAmount, {
		LABEL_SIZE,
		labelText,
		type Box,
		type RawWin,
		type Win,
	} from './ClusterWinAmount.svelte';

	export type EmitterEventClusterWinAmounts = {
		type: 'showClusterWinAmounts';
		wins: RawWin[];
		// one at a time (clusters through a big wild), not all at once
		oneByOne?: boolean;
		// called when the last has come up
		onshown?: () => void;
	};
</script>

<script lang="ts">
	import _ from 'lodash';
	import { CanvasTextMetrics, TextStyle } from 'pixi.js';
	import { stateBetDerived } from 'state-shared';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { BOARD_DIMENSIONS, SYMBOL_SIZE } from '../game/constants';
	import { signTextStyle } from '../game/signText';
	import type { Position } from '../game/types';

	const context = getContext();

	let wins: Win[] = $state([]);

	// Each label goes over its cluster without covering another: at the books' overlay cell (the
	// cluster's cell nearest its middle) if it is clear there, else at the nearest of its cluster's
	// other cells where it is (clusters running through the same wilds, as round a big wild, have
	// their middles side by side), else stacked above or below its overlay cell, else anywhere within
	// `reach` cells of it, half a cell apart, nearest first; kept on the board. The room it takes is
	// its longer words (with its multiplier, if it has one) and GAP round them. A cascade's labels
	// that don't all fit that way are all placed again smaller (ATTEMPTS: their size, and how far
	// they may go), the last time anywhere on the board; failing even that (the board already full of
	// the cascade before's), a label goes over its cluster and the older ones in its way go at once.
	// (Checked against every cascade of the made-up books.)
	const GAP = SYMBOL_SIZE * 0.1;
	const BOARD = {
		width: SYMBOL_SIZE * BOARD_DIMENSIONS.x,
		height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
	};
	const ATTEMPTS = [
		{ size: 1, reach: 2 },
		{ size: 0.85, reach: 2 },
		{ size: 0.7, reach: 2 },
		{ size: 0.7, reach: Infinity },
	];

	const measure = (win: RawWin, size: number) => {
		const style = new TextStyle(signTextStyle(LABEL_SIZE * size));
		const texts =
			win.mult > 1 ? [labelText(win, false), labelText(win, true)] : [labelText(win, true)];
		const sizes = texts.map((text) => CanvasTextMetrics.measureText(text, style));
		return {
			width: Math.max(...sizes.map((size) => size.width)) + GAP,
			height: Math.max(...sizes.map((size) => size.height)) + GAP,
		};
	};

	// points half a cell apart over the board
	const GRID = _.range(0, BOARD.height + 1, SYMBOL_SIZE / 2).flatMap((y) =>
		_.range(0, BOARD.width + 1, SYMBOL_SIZE / 2).map((x) => ({ x, y })),
	);

	const cellMiddle = ({ reel, row }: Position) => ({
		x: SYMBOL_SIZE * (reel + 0.5),
		y: SYMBOL_SIZE * (row - 0.5),
	});

	const onBoard = (middle: { x: number; y: number }, size: { width: number; height: number }) => ({
		x:
			size.width < BOARD.width
				? _.clamp(middle.x, size.width / 2, BOARD.width - size.width / 2)
				: BOARD.width / 2,
		y: _.clamp(middle.y, size.height / 2, BOARD.height - size.height / 2),
	});

	const overlaps = (a: Box, b: Box) =>
		Math.abs(a.x - b.x) * 2 < a.width + b.width && Math.abs(a.y - b.y) * 2 < a.height + b.height;

	// where a label goes clear of those `taken`, or over its cluster if nowhere is (`clear` false)
	const place = (win: RawWin, taken: Box[], size: number, reach: number) => {
		const room = measure(win, size);
		const home = cellMiddle(win);
		const distance = (point: { x: number; y: number }) =>
			Math.hypot(point.x - home.x, point.y - home.y);
		const nearest = _.sortBy(win.positions.map(cellMiddle), distance);
		const stacked = [1, -1, 2, -2, 3, -3].map((k) => ({ x: home.x, y: home.y + k * room.height }));
		const around = _.sortBy(
			GRID.filter((point) => distance(point) <= reach * SYMBOL_SIZE),
			distance,
		);
		for (const middle of [home, ...nearest, ...stacked, ...around]) {
			const box = { ...onBoard(middle, room), ...room };
			if (!taken.some((other) => overlaps(other, box))) return { box, clear: true };
		}
		return { box: { ...onBoard(home, room), ...room }, clear: false };
	};

	// a cascade's labels, against those still showing, as big as they all fit (see above)
	const placeCascade = (rawWins: RawWin[]) => {
		let placed: { box: Box; clear: boolean; size: number }[] = [];
		for (const { size, reach } of ATTEMPTS) {
			const taken: Box[] = [...wins];
			placed = rawWins.map((rawWin) => {
				const { box, clear } = place(rawWin, taken, size, reach);
				taken.push(box);
				return { box, clear, size };
			});
			if (placed.every(({ clear }) => clear)) break;
		}
		// those older labels a new one couldn't keep clear of go now
		for (const { box, clear } of placed) {
			if (!clear) wins.filter((win) => overlaps(win, box)).forEach((win) => (win.leave = true));
		}
		return placed;
	};

	// a big wild's clusters' wins come up this far apart, in ms
	const ONE_BY_ONE = 450;
	// each label's own id, so each keeps its ClusterWinAmount as others come and go (by place in the
	// list, one that had played out was handed the next label, which then never showed)
	let nextId = 0;

	// each cluster's win floats up from it and fades; the board may tumble under them meanwhile (see
	// winInfo), so a new cascade's are added to any still floating, each taken away when it is done;
	// all placed first, so they keep clear of each other when they come up one at a time
	context.eventEmitter.subscribeOnMount({
		showClusterWinAmounts: async (emitterEvent) => {
			const placed = placeCascade(emitterEvent.wins).map(({ box, size }, i) => ({
				...emitterEvent.wins[i],
				...box,
				size,
				id: nextId++,
				leave: false,
				oncomplete: () => {},
			}));
			const done: Promise<void>[] = [];
			for (const [i, win] of placed.entries()) {
				if (emitterEvent.oneByOne && i > 0) {
					await waitForTimeout(ONE_BY_ONE / stateBetDerived.timeScale());
				}
				wins = [...wins, win];
				// the new one as the state holds it, so it can be found in it again
				const added = wins[wins.length - 1];
				done.push(
					waitForResolve((resolve) => (added.oncomplete = resolve)).then(() => {
						wins = wins.filter((other) => other !== added);
					}),
				);
			}
			emitterEvent.onshown?.();
			await Promise.all(done);
		},
	});
</script>

<BoardContainer>
	{#each wins as win (win.id)}
		<ClusterWinAmount {win} />
	{/each}
</BoardContainer>
