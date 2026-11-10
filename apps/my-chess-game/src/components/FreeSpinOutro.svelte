<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { SUPER_MODE } from '../game/betModes';
	import { winRankAt } from '../game/print';
	import PieceRain from './PieceRain.svelte';
	import WinCard, { winCardWidth } from './WinCard.svelte';
	import PressToContinue from './PressToContinue.svelte';

	// The bonus's end: what its free spins won in all, counted up on a card (WinCard) over the dimmed
	// board. The bonus's own piece on it (the rook; the SUPER BONUS's golden king) and how many free
	// spins were played; when the total is a big win, its rank's piece and name instead, climbing as it
	// counts (see Win), with the pieces raining behind. A press finishes the count, another goes on.
	const context = getContext();

	let show = $state(true);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => (show = true),
		freeSpinOutroHide: async () => (show = false),
		freeSpinOutroCountUp: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});

	const board = $derived(context.stateGameDerived.boardLayout());
	const isSuper = $derived(stateBet.activeBetModeKey === SUPER_MODE);
	// more pieces fall the higher the win's rank
	const RAIN = { least: 14, more: 6 };
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{@const rank = winRankAt(winLevelData?.alias, amount ? countUpAmount / amount : 1)}
				<OnMount onmount={() => startCountUp()} />

				<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.6} />
				{#if rank}
					<MainContainer>
						<PieceRain emit={!countUpCompleted} count={RAIN.least + rank.top * RAIN.more} />
					</MainContainer>
				{/if}
				<MainContainer>
					<WinCard
						x={board.x}
						y={board.y}
						width={winCardWidth()}
						piece={rank?.piece ?? (isSuper ? 'gK' : 'bR')}
						heading={rank ? 'TOTAL WIN' : isSuper ? 'SUPER BONUS' : 'CHECKMATE BONUS'}
						title={rank?.text ?? 'TOTAL WIN'}
						figure={bookEventAmountToCurrencyString(Math.round(countUpAmount))}
						rank={rank?.index}
						caption={`${context.stateGame.freeSpins.total} free spins played`}
					/>
				</MainContainer>

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
