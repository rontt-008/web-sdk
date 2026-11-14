<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import PrintSlip from './PrintSlip.svelte';

	// The free spins left, on a printed slip (PrintSlip) left of the board's top in the bonus: how many
	// are still to come after the one being played, of how many in all ("10 OF 10" as the bonus starts,
	// "9 OF 10" once its first spin is under way), from the game's count (stateGame.freeSpins; the
	// count's updates, freeSpinCounterUpdate, are for the SDK's counter and not needed here)
	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
	const position = $derived({
		x: board.x - board.width * 0.5 - board.frame - SYMBOL_SIZE * 1.9,
		y: board.y - board.height * 0.5 + SYMBOL_SIZE * 0.55,
	});

	let show = $state(false);
	const total = $derived(context.stateGame.freeSpins.total);
	const left = $derived(Math.max(0, total - context.stateGame.freeSpins.current));

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
	});
</script>

<MainContainer>
	<FadeContainer {show}>
		<Container {...position} rotation={-0.03}>
			<PrintSlip label="FREE SPINS" text={`${left} OF ${total}`} size={SYMBOL_SIZE * 0.44} />
		</Container>
	</FadeContainer>
</MainContainer>
