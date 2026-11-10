<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { stateBet } from 'state-shared';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { SUPER_MODE } from '../game/betModes';
	import { RETRIGGER_SPINS } from '../game/constants';
	import PressToContinue from './PressToContinue.svelte';
	import WinCard, { winCardWidth } from './WinCard.svelte';

	// The bonus's start: its free spins on a card (WinCard) over the dimmed board, with its piece as the
	// buy menu has it (the CHECKMATE BONUS's rook, the SUPER BONUS's golden king) and a line of what's
	// special about it. A press goes on.
	const context = getContext();

	let show = $state(false);
	let freeSpinsFromEvent = $state(0);
	let oncomplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => (show = true),
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async (emitterEvent) => {
			freeSpinsFromEvent = emitterEvent.totalFreeSpins;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});

	const board = $derived(context.stateGameDerived.boardLayout());
	const isSuper = $derived(stateBet.activeBetModeKey === SUPER_MODE);
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.6} />

	<MainContainer>
		<WinCard
			x={board.x}
			y={board.y}
			width={winCardWidth()}
			piece={isSuper ? 'gK' : 'bR'}
			heading={isSuper ? 'SUPER BONUS' : 'CHECKMATE BONUS'}
			title="FREE SPINS"
			figure={String(freeSpinsFromEvent)}
			caption={isSuper ? 'Sticky spots that grow every spin' : `Every checkmate adds ${RETRIGGER_SPINS} more`}
		/>
	</MainContainer>

	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
