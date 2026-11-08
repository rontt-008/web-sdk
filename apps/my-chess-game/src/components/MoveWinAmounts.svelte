<script lang="ts" module>
	import type { Position } from '../game/types';
	import type { SpotValue } from '../game/typesBookEvent';

	// a capture's pay, shown where the piece was taken; awaited until it has counted up to `amount`
	export type EmitterEventMoveWinAmounts = {
		type: 'moveWinShow';
		position: Position;
		// what the capture pays, the multiplier in it
		amount: number;
		multiplier: number;
		// the multiplier spot the piece was taken on (it went into the multiplier), if any
		spot?: SpotValue;
	};
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut, cubicIn, cubicOut, sineInOut } from 'svelte/easing';
	import { BitmapText, Container, Text } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { stateBetDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_COLOURS } from '../game/constants';
	import { sidePanelLayout } from '../game/sideLayout';
	import { camera } from '../game/camera.svelte';
	import CameraContainer from './CameraContainer.svelte';
	import { SIDE_PANEL_MULTIPLIER } from './SidePanel.svelte';

	// A capture's pay, on its square, in three beats:
	// 1. what the piece pays before the multiplier pops up there (with the spot over it, a + in blue or a
	//    x in gold, when it was taken on one)
	// 2. the spin's multiplier is thrown at it, "x5" flying in an arc from where the multiplier is shown
	//    (the side panel's head on desktop, the badge elsewhere)
	// 3. as it hits, the pay jumps and counts up to what the capture pays
	// then it floats up and fades. At x1 there's nothing to throw: the pay just pops up. The move waits
	// for the count (the spin's win takes the pay as it ends), not for the fade.
	type Amount = {
		id: number;
		spot?: SpotValue;
		x: number;
		y: Tween<number>;
		alpha: Tween<number>;
		scale: Tween<number>;
		value: Tween<number>;
	};
	type Thrown = {
		id: number;
		text: string;
		from: { x: number; y: number };
		to: { x: number; y: number };
		progress: Tween<number>;
	};

	const context = getContext();
	const RISE = SYMBOL_SIZE * 1.1;
	// in ms (divided by the turbo's time scale): the pop, the throw's flight, the count, the hold before
	// it floats off, and the float and fade
	const TIMING = { pop: 260, flight: 560, count: 650, hold: 450, fade: 900 };
	// how high the throw's arc goes (above the straight line), and how much it swells halfway
	const THROW = { arc: SYMBOL_SIZE * 1.6, swell: 0.5 };

	let amounts = $state<Amount[]>([]);
	let thrown = $state<Thrown[]>([]);
	let nextId = 1;

	const ms = (duration: number) => duration / stateBetDerived.timeScale();
	const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, ms(duration)));

	// where the multiplier is shown, in the board's camera space (what's in CameraContainer): the side
	// panel lies on the table under the camera, so its point is the table's; the badge is over the
	// camera, so its point is taken back through the camera's zoom as it is now; with neither, from
	// above the square
	const multiplierFrom = (to: { x: number; y: number }) => {
		const layout = sidePanelLayout();
		if (layout.panel) {
			return context.stateGameDerived.tablePoint(
				layout.panel.x + SIDE_PANEL_MULTIPLIER.x,
				layout.panel.y + SIDE_PANEL_MULTIPLIER.y,
			);
		}
		if (layout.multiplier) {
			const back = (point: number, focus: number, shake: number) =>
				(point - focus - shake) / camera.scale.current + focus;
			return {
				x: back(layout.multiplier.x, camera.focusX.current, camera.shakeX.current),
				y: back(layout.multiplier.y, camera.focusY.current, camera.shakeY.current),
			};
		}
		return { x: to.x, y: to.y - SYMBOL_SIZE * 2 };
	};

	const thrownAt = (item: Thrown) => {
		const t = item.progress.current;
		return {
			x: item.from.x + (item.to.x - item.from.x) * t,
			y: item.from.y + (item.to.y - item.from.y) * t - Math.sin(Math.PI * t) * THROW.arc,
			scale: 1 + Math.sin(Math.PI * t) * THROW.swell,
		};
	};

	const throwMultiplier = async (text: string, from: { x: number; y: number }, to: { x: number; y: number }) => {
		const item: Thrown = { id: nextId++, text, from, to, progress: new Tween(0) };
		thrown = [...thrown, item];
		await item.progress.set(1, { duration: ms(TIMING.flight), easing: sineInOut });
		// by id: the array is state, so its items are proxies and never the item itself
		thrown = thrown.filter((other) => other.id !== item.id);
	};

	context.eventEmitter.subscribeOnMount({
		moveWinShow: async ({ position, amount, multiplier, spot }) => {
			const { x, y } = context.stateGameDerived.cellCentre(position);
			const multiplied = multiplier > 1;
			const base = multiplied ? amount / multiplier : amount;
			const item: Amount = {
				id: nextId++,
				spot,
				x,
				y: new Tween(y),
				alpha: new Tween(1),
				scale: new Tween(0.4),
				value: new Tween(base),
			};
			amounts = [...amounts, item];

			// 1. the pay before the multiplier pops up
			await item.scale.set(1, { duration: ms(TIMING.pop), easing: backOut });

			if (multiplied) {
				// 2. the multiplier thrown at it
				await throwMultiplier(`×${multiplier}`, multiplierFrom({ x, y }), { x, y });
				// 3. it hits: the pay jumps and counts up
				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
				item.scale.set(1.35, { duration: 0 });
				item.scale.set(1, { duration: ms(TIMING.count), easing: cubicOut });
				await item.value.set(amount, { duration: ms(TIMING.count), easing: cubicOut });
			}

			// then it floats up and fades, without the move waiting
			(async () => {
				await wait(TIMING.hold);
				item.y.set(y - RISE, { duration: ms(TIMING.fade), easing: cubicOut });
				await item.alpha.set(0, { duration: ms(TIMING.fade), easing: cubicIn });
				amounts = amounts.filter((other) => other.id !== item.id);
			})();
		},
	});
</script>

<MainContainer>
	<CameraContainer>
		{#each amounts as item (item.id)}
			<Container x={item.x} y={item.y.current} alpha={item.alpha.current}>
				{#if item.spot}
					<Text
						text={`${item.spot.op}${item.spot.value} MULTI`}
						anchor={{ x: 0.5, y: 1 }}
						y={-SYMBOL_SIZE * 0.26}
						style={{
							fontFamily: 'proxima-nova',
							fontSize: SYMBOL_SIZE * 0.26,
							fontWeight: '800',
							fill: item.spot.op === '+' ? BOARD_COLOURS.spotAdd : BOARD_COLOURS.spot,
							stroke: { color: 0x1a1208, width: 4 },
						}}
					/>
				{/if}
				<BitmapText
					text={bookEventAmountToCurrencyString(item.value.current)}
					anchor={0.5}
					scale={item.scale.current}
					style={{ fontFamily: 'gold', fontSize: SYMBOL_SIZE * 0.42, fontWeight: 'bold' }}
				/>
			</Container>
		{/each}

		<!-- the multipliers on their way -->
		{#each thrown as item (item.id)}
			{@const at = thrownAt(item)}
			<Text
				text={item.text}
				anchor={0.5}
				x={at.x}
				y={at.y}
				scale={at.scale}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: SYMBOL_SIZE * 0.5,
					fontWeight: '800',
					fill: BOARD_COLOURS.spot,
					stroke: { color: 0x1a1208, width: 5 },
				}}
			/>
		{/each}
	</CameraContainer>
</MainContainer>
