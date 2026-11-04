<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventMoveWinAmounts = {
		type: 'moveWinShow';
		position: Position;
		amount: number;
		multiplier: number;
	};
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { BitmapText } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { stateBetDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	// what a capture pays floats up from its square and fades
	type Amount = { id: number; text: string; x: number; y: Tween<number>; alpha: Tween<number> };

	const context = getContext();
	const RISE = SYMBOL_SIZE * 1.1;
	const DURATION = 1100;

	let amounts = $state<Amount[]>([]);
	let nextId = 1;

	context.eventEmitter.subscribeOnMount({
		moveWinShow: async ({ position, amount }) => {
			const { x, y } = context.stateGameDerived.cellCentre(position);
			const item: Amount = {
				id: nextId++,
				text: bookEventAmountToCurrencyString(amount),
				x,
				y: new Tween(y),
				alpha: new Tween(1),
			};
			amounts = [...amounts, item];
			const duration = DURATION / stateBetDerived.timeScale();
			item.y.set(y - RISE, { duration, easing: cubicOut });
			await item.alpha.set(0, { duration, delay: duration * 0.45 });
			amounts = amounts.filter((other) => other !== item);
		},
	});
</script>

<MainContainer>
	{#each amounts as item (item.id)}
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
