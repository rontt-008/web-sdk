<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { LOGO_TEXT_COLORS } from '../game/textStyles';
	import LogoText from './LogoText.svelte';
	import PressToContinue from './PressToContinue.svelte';

	// The free spins' total win counting up over the dimmed board, in the logo's lettering as the start
	// screen's cards and the free spins sign are (LogoText, look logo; the user, 2026-11-14: "make the
	// bonus win screen have the same font as the cards"): TOTAL WIN in the blue, the amount in the pink
	// to red. (It was the UI's font, the amount gold, till then.) The sample's Mining Mayhem panel
	// animation, word pictures and coin fountain were removed before.
	// Font sizes in cells; middles: the words `gap` cells above the board's middle (their bottom), the
	// amount under it; both at most `fill` of the board's width.
	const WORDS = { title: 0.75, amount: 1.1, gap: 0.2, fill: 1.1 };

	const context = getContext();

	let show = $state(true);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});

	const board = $derived(context.stateGameDerived.boardLayout());

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
		<WinCountUpProvider {amount} {duration} oncomplete={() => {}}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<OnMount onmount={() => startCountUp()} />

				<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.6} />

				<MainContainer>
					<!-- (LogoText is centred on its place: half a line above / below the old edges) -->
					<Container x={board.x} y={board.y}>
						<LogoText
							text="TOTAL WIN"
							y={-SYMBOL_SIZE * (WORDS.gap + WORDS.title * 0.6)}
							fontSize={SYMBOL_SIZE * WORDS.title}
							maxWidth={board.width * WORDS.fill}
							colors={LOGO_TEXT_COLORS.blue}
							look="logo"
						/>
						<LogoText
							text={bookEventAmountToCurrencyString(countUpAmount)}
							y={SYMBOL_SIZE * WORDS.amount * 0.6}
							fontSize={SYMBOL_SIZE * WORDS.amount}
							maxWidth={board.width * WORDS.fill}
							colors={LOGO_TEXT_COLORS.pink}
							look="logo"
						/>
					</Container>
				</MainContainer>

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
