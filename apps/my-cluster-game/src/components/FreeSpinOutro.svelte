<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Text } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveText } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { OnMount } from 'components-shared';

	import { getContext } from '../game/context';
	import { signTextStyle } from '../game/signText';
	import FreeSpinAnimation, { FREE_SPIN_NUMBER, FREE_SPIN_WORDS } from './FreeSpinAnimation.svelte';
	import FreeSpinPop from './FreeSpinPop.svelte';
	import PressToContinue from './PressToContinue.svelte';

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
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const duration = winLevelData.presentDuration}
		{@const isBigWin = winLevelData.type === 'big'}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<OnMount onmount={() => startCountUp()} />

				<!-- a stronger backdrop for a big total -->
				<FreeSpinAnimation power={isBigWin ? 0.9 : 0.5}>
					{#snippet children({ sizes })}
						{#if isBigWin}
							<Text {...FREE_SPIN_WORDS.congratulations} />
							<Text {...FREE_SPIN_WORDS.youWon} />
						{:else}
							<Text {...FREE_SPIN_WORDS.youWonSmall} />
						{/if}

						<FreeSpinPop y={FREE_SPIN_NUMBER.y}>
							<ResponsiveText
								anchor={0.5}
								style={signTextStyle(FREE_SPIN_NUMBER.size)}
								text={bookEventAmountToCurrencyString(countUpAmount, {
									counting: !countUpCompleted,
								})}
								maxWidth={sizes.width * 2.24}
							/>
						</FreeSpinPop>

						<Text {...isBigWin ? FREE_SPIN_WORDS.totalWin : FREE_SPIN_WORDS.totalWinSmall} />
					{/snippet}
				</FreeSpinAnimation>

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
