<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveText } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { gameTextStyle, TEXT_GOLD } from '../game/textStyles';

	// The win counting up over the board in plain text; big wins dim the screen and have their name
	// (BIG WIN, SUPER WIN...) over the amount. The sample's Mining Mayhem big win animation and coin
	// fountain were removed.

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});

	const board = $derived(context.stateGameDerived.boardLayout());
	const maxWidth = $derived(board.width * 1.1);

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const isBigWin = winLevelData.type === 'big'}
		{@const title = isBigWin ? winLevelData.text : null}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => {}}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{#if isBigWin}
					<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.6} />
				{/if}

				<OnMount
					onmount={async () => {
						await startCountUp();
						await waitForTimeout(300);
						oncomplete();
					}}
				/>

				<MainContainer>
					<Container x={board.x} y={board.y}>
						{#if title}
							<ResponsiveText
								anchor={{ x: 0.5, y: 1 }}
								y={-SYMBOL_SIZE * 0.2}
								{maxWidth}
								text={title}
								style={gameTextStyle(SYMBOL_SIZE * 1.1)}
							/>
						{/if}
						<ResponsiveText
							anchor={isBigWin ? { x: 0.5, y: 0 } : 0.5}
							{maxWidth}
							text={bookEventAmountToCurrencyString(countUpAmount)}
							style={gameTextStyle(SYMBOL_SIZE * (isBigWin ? 1 : 0.8), TEXT_GOLD)}
						/>
					</Container>
				</MainContainer>

				<!-- small wins go on by themselves; a tap still hurries them -->
				<PressToContinue
					hideText={!isBigWin}
					onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())}
				/>
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
