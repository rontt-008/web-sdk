<script lang="ts" module>
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { SYMBOL_SIZE } from '../game/constants';
	import type { Position } from '../game/types';

	export type RawWin = {
		win: number;
		mult: number;
		result: number;
		reel: number; // 0 | 1 | 2 | 3 | 4 | 5;
		row: number; // 1 | 2 | 3 | 4 | 5; // excluding the off top row and the off bottom row
		// the cluster's cells (rows counted the same way)
		positions: Position[];
	};
	// where it goes on the board (its middle) and the room it takes there, its size (a share of
	// LABEL_SIZE: smaller on a crowded board) and whether it is to go at once, a newer label needing
	// its place (see ClusterWinAmounts)
	export type Box = { x: number; y: number; width: number; height: number };
	export type Win = RawWin &
		Box & { size: number; id: number; leave: boolean; oncomplete: () => void };

	export const LABEL_SIZE = SYMBOL_SIZE * 0.5;

	// its words: the win "X" the multiplier while it shows it, then the win with it
	export const labelText = (win: RawWin, multiplied: boolean) =>
		multiplied
			? bookEventAmountToCurrencyString(win.result)
			: `${bookEventAmountToCurrencyString(win.win)} X ${win.mult}`;
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';

	import { Text } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { SECOND } from 'constants-shared/time';
	import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
	import { FadeContainer } from 'components-pixi';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { signTextStyle, type SignColour } from '../game/signText';

	type Props = { win: Win };

	const props: Props = $props();
	const context = getContext();

	// the bigger the cluster's win, the hotter its colour: red from 50 times the bet, purple from 100
	// (the user's; about one cluster win in 43 and one in 75 in the made-up books), the game's yellow
	// below; by its win with any multiplier, as it shows it in the end
	const WIN_COLOURS: { from: number; colour: SignColour }[] = [
		{ from: 100, colour: 'purple' },
		{ from: 50, colour: 'red' },
	];
	const colour = $derived(
		WIN_COLOURS.find(({ from }) => props.win.result / BOOK_AMOUNT_MULTIPLIER >= from)?.colour ??
			'yellow',
	);

	// It pops up over its cluster (where ClusterWinAmounts puts it, clear of the others) and
	// stays there: with a multiplier, the win before it "X" the multiplier for a moment, which then
	// shrinks into the win; after a while it fades away. In ms.
	const TIME = { pop: 250, multiplier: SECOND, combine: 200, hold: 1600 };
	const scale = new Tween(0.4);
	let show = $state(true);
	let showMultiplier = $state(props.win.mult > 1);

	onMount(async () => {
		const time = (ms: number) => ms / stateBetDerived.timeScale();
		await scale.set(1, { duration: time(TIME.pop), easing: backOut });
		if (showMultiplier) {
			await waitForTimeout(time(TIME.multiplier));
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_combine_a' });
			await scale.set(0.1, { duration: time(TIME.combine) });
			showMultiplier = false;
			await scale.set(1, { duration: time(TIME.combine), easing: backOut });
		}
		await waitForTimeout(time(TIME.hold));
		show = false;
	});

	// or sooner, a newer label needing its place
	$effect(() => {
		if (props.win.leave) show = false;
	});
</script>

<FadeContainer
	{show}
	oncomplete={() => {
		if (!show) props.win.oncomplete();
	}}
>
	<Text
		x={props.win.x}
		y={props.win.y}
		scale={scale.current}
		text={labelText(props.win, !showMultiplier)}
		anchor={0.5}
		style={signTextStyle(LABEL_SIZE * props.win.size, colour)}
	/>
</FadeContainer>
