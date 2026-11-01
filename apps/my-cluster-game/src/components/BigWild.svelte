<script lang="ts" module>
	import type { SymbolState } from '../game/types';

	// what a block's cells can be doing that it shows for all of them: a win or a tumble's going
	// reaches every winning or going cell at once; otherwise it does what the cell it moves with does
	const SHARED_STATES: SymbolState[] = ['win', 'explosion'];

	export const blockState = (cells: { symbolState: SymbolState }[], lead: SymbolState) =>
		SHARED_STATES.find((state) => cells.some((cell) => cell.symbolState === state)) ?? lead;
</script>

<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { getContextBoard } from 'components-shared';

	import Symbol from './Symbol.svelte';
	import { BOARD_DIMENSIONS, SYMBOL_SIZE } from '../game/constants';
	import { IDLE_REEL_PHASE } from '../game/idleClock.svelte';

	type Props = {
		// its side in cells, where its middle is (as it falls) and the reel its idle loop is timed by
		size: number;
		x: number;
		y: number;
		reel: number;
		state: SymbolState;
		// when it has played its state's animation (its land, hit or going), for its cells
		oncomplete: () => void;
	};

	const props: Props = $props();
	const boardContext = getContextBoard();

	// A square block of wilds (2x2 or 3x3, see findWildBlocks) drawn as one big wild (the wild's own
	// idle, land, hit and going, in a container scaled up), where its cells are, which aren't drawn
	// (BoardBase, TumbleBoardBase): so many times a wild that its art, corner rocks included (1.08
	// cells for one wild), just fits in the block's cells with the gap tiles leave round them, rather
	// than reaching onto the tiles round it (the user found 3 times "a little too big"). Under the
	// board's mask while it falls in or out of the board (spin), over it otherwise so its hit,
	// swelling a little past the block, isn't cut at the board's edge; drawn while any of it is on the
	// board.
	const WILD_ART = 1.08;
	const GAP = 0.03;
	const scale = $derived((props.size - GAP) / WILD_ART);
	const falling = $derived(props.state === 'spin');
	const show = $derived(boardContext.animate !== falling);
	const reach = $derived((SYMBOL_SIZE * props.size) / 2);
	const onBoard = $derived(props.y > -reach && props.y < SYMBOL_SIZE * BOARD_DIMENSIONS.y + reach);
</script>

{#if show && onBoard}
	<Container x={props.x} y={props.y} {scale}>
		<Symbol
			rawSymbol={{ name: 'W', wild: true }}
			state={props.state}
			phase={props.reel * IDLE_REEL_PHASE}
			oncomplete={props.oncomplete}
		/>
	</Container>
{/if}
