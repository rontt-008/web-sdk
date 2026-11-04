<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventMoveWinAmounts = {
		type: 'moveWinShow';
		position: Position;
		amount: number;
		multiplier: number;
		// the multiplier spot the piece was taken on, if any
		spot?: number;
	};
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { BitmapText, Text } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { stateBetDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_COLOURS } from '../game/constants';

	// what a capture pays floats up from its square and fades, with the spot's multiplier over it when
	// the piece was taken on one
	type Amount = { id: number; text: string; spot?: number; x: number; y: Tween<number>; alpha: Tween<number> };

	const context = getContext();
	const RISE = SYMBOL_SIZE * 1.1;
	const DURATION = 1100;

	let amounts = $state<Amount[]>([]);
	let nextId = 1;

	context.eventEmitter.subscribeOnMount({
		moveWinShow: async ({ position, amount, spot }) => {
			const { x, y } = context.stateGameDerived.cellCentre(position);
			const item: Amount = {
				id: nextId++,
				text: bookEventAmountToCurrencyString(amount),
				spot,
				x,
				y: new Tween(y),
				alpha: new Tween(1),
			};
			amounts = [...amounts, item];
			const duration = (spot ? DURATION * 1.3 : DURATION) / stateBetDerived.timeScale();
			item.y.set(y - RISE, { duration, easing: cubicOut });
			await item.alpha.set(0, { duration, delay: duration * 0.45 });
			amounts = amounts.filter((other) => other !== item);
		},
	});
</script>

<MainContainer>
	{#each amounts as item (item.id)}
		{#if item.spot}
			<Text
				text={`SPOT x${item.spot}`}
				anchor={{ x: 0.5, y: 1 }}
				x={item.x}
				y={item.y.current - SYMBOL_SIZE * 0.26}
				alpha={item.alpha.current}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: SYMBOL_SIZE * 0.26,
					fontWeight: '800',
					fill: BOARD_COLOURS.spot,
					stroke: { color: 0x1a1208, width: 4 },
				}}
			/>
		{/if}
		<BitmapText
			text={item.text}
			anchor={0.5}
			x={item.x}
			y={item.y.current}
			alpha={item.alpha.current}
			style={{ fontFamily: 'gold', fontSize: SYMBOL_SIZE * 0.42, fontWeight: 'bold' }}
		/>
	{/each}
</MainContainer>
