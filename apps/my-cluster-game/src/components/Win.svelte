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
	import { MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import BigWin from './BigWin.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { LAYOUT_UNIT } from '../game/constants';
	import { signTextStyle } from '../game/signText';
	import { getContext } from '../game/context';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	// counts the wins shown, so each starts afresh
	let round = $state(0);
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			round++;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{#key round}
			{#if winLevelData.type === 'big'}
				<!-- a big win: its own screen, climbing through the levels (BigWin) -->
				<BigWin {amount} level={winLevelData.level} oncomplete={() => oncomplete()} />
			{:else}
				<!-- a smaller one: the amount counts up over the board and goes on by itself; a press
				hurries it -->
				<WinCountUpProvider
					{amount}
					duration={winLevelData.presentDuration}
					oncomplete={() => onCountUpComplete()}
				>
					{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
						<OnMount
							onmount={async () => {
								await startCountUp();
								await waitForTimeout(300);
								oncomplete();
							}}
						/>

						<MainContainer>
							<Container
								x={context.stateGameDerived.boardLayout().x}
								y={context.stateGameDerived.boardLayout().y}
							>
								<ResponsiveText
									anchor={0.5}
									maxWidth={context.stateLayoutDerived.canvasSizes().width /
										context.stateLayoutDerived.mainLayout().scale}
									text={bookEventAmountToCurrencyString(countUpAmount, {
										counting: !countUpCompleted,
									})}
									style={{ ...signTextStyle(LAYOUT_UNIT), align: 'center' }}
								/>
							</Container>
						</MainContainer>

						<PressToContinue
							hideText
							onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())}
						/>
					{/snippet}
				</WinCountUpProvider>
			{/if}
		{/key}
	{/if}
</FadeContainer>
