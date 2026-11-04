<script lang="ts">
	import { Text } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	// the spin's moves so far in words under the board, the latest last: "YOU  Qd1→h5 ×P  CHECK"
	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
	const SHOWN = 3;
	const lines = $derived(context.stateGame.moveLog.slice(-SHOWN));
</script>

<MainContainer>
	{#each lines as line, index}
		<Text
			text={line}
			anchor={{ x: 0.5, y: 0 }}
			x={board.x}
			y={board.y + board.height / 2 + SYMBOL_SIZE * 1.15 + index * SYMBOL_SIZE * 0.25}
			alpha={index === lines.length - 1 ? 1 : 0.55}
			style={{
				fontFamily: 'proxima-nova',
				fontSize: SYMBOL_SIZE * 0.2,
				fontWeight: '700',
				fill: 0xe8d9b8,
			}}
		/>
	{/each}
</MainContainer>
