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

	import PressToContinue from './PressToContinue.svelte';
	import LogoText from './LogoText.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { LOGO_TEXT_COLORS } from '../game/textStyles';

	// The win counting up over the board; big wins dim the screen and have their name (BIG WIN, SUPER
	// WIN...) over the amount. In the game's rock lettering (LogoText; the user, 2026-11-16: every text in
	// the game but the UI's): the name in the logo's colours, the amount in gold. (Only big wins are shown
	// here since the same day: bookEventHandlerMap's setWin.) The sample's Mining Mayhem big win animation
	// and coin fountain were removed.
	const WORDS = { title: 1.1, amount: 1, small: 0.8, gap: 0.2 };

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
						<!-- (LogoText is centred on its place: half a line above / below the old edges) -->
						{#if title}
							<LogoText
								text={title}
								y={-SYMBOL_SIZE * (WORDS.gap + WORDS.title * 0.6)}
								fontSize={SYMBOL_SIZE * WORDS.title}
								{maxWidth}
								colors={LOGO_TEXT_COLORS.logo}
								look="logo"
							/>
						{/if}
						<LogoText
							text={bookEventAmountToCurrencyString(countUpAmount, { counting: !countUpCompleted })}
							y={isBigWin ? SYMBOL_SIZE * WORDS.amount * 0.6 : 0}
							fontSize={SYMBOL_SIZE * (isBigWin ? WORDS.amount : WORDS.small)}
							{maxWidth}
							colors={LOGO_TEXT_COLORS.gold}
							look="logo"
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
