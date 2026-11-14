<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import PieceRain from './PieceRain.svelte';
	import WinCard, { winCardWidth } from './WinCard.svelte';
	import PrintSlip from './PrintSlip.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { winRankAt } from '../game/print';

	// A round's win, counted up over the board, printed like the start screen's cards (print.ts):
	// - a small win: a slip with WIN over the amount (a bigger one, with a band of squares, for the
	//   medium wins)
	// - a big win: the screen dims, a card (WinCard) comes up with the win's rank as a chess piece, and
	//   pieces rain down behind it (PieceRain). The ranks climb as it counts: a BIG WIN is a knight, then
	//   a SUPER WIN a bishop, a MEGA WIN a rook, an EPIC WIN a queen, and the MAX WIN the golden king.
	// A press finishes the count, another goes on.
	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});

	const board = $derived(context.stateGameDerived.boardLayout());
	// more pieces fall the higher the win's rank
	const RAIN = { least: 14, more: 6 };
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const isBigWin = winLevelData.type === 'big'}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{@const rank = winRankAt(winLevelData?.alias, amount ? countUpAmount / amount : 1)}
				<OnMount
					onmount={async () => {
						await startCountUp();
						await waitForTimeout(300);
						oncomplete();
					}}
				/>

				{#if isBigWin && rank}
					<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.6} />
					<MainContainer>
						<PieceRain emit={!countUpCompleted} count={RAIN.least + rank.top * RAIN.more} />
					</MainContainer>
					<MainContainer>
						<WinCard
							x={board.x}
							y={board.y}
							width={winCardWidth()}
							piece={rank.piece}
							heading="YOU WON"
							title={rank.text}
							figure={bookEventAmountToCurrencyString(Math.round(countUpAmount))}
							rank={rank.index}
						/>
					</MainContainer>
				{:else}
					<MainContainer>
						<Container x={board.x} y={board.y}>
							<PrintSlip
								label="WIN"
								text={bookEventAmountToCurrencyString(Math.round(countUpAmount))}
								size={SYMBOL_SIZE * (winLevelData?.type === 'medium' ? 0.8 : 0.62)}
								tone="red"
								band={winLevelData?.type === 'medium'}
							/>
						</Container>
					</MainContainer>
				{/if}

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
