<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { Container, Text } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import { getContext } from '../game/context';
	import { createBoardTextStyle, fitBoardFontSize } from '../game/textStyles';
	import PressToContinue from './PressToContinue.svelte';

	// Like the free spin intro: the game scene blurred behind (see SceneBlur), "Total Win!" in big
	// yellow letters and the amount counting up under it. Sizes are in the standard layout
	// (1920x1080 on desktop, 1080x1920 in portrait).
	const TITLE = 'Total Win!';
	const OUTLINE_COLOR = 0x4a1c00;
	const TITLE_FONT_SIZE = 150;
	const AMOUNT_FONT_SIZE = 120;
	const FADE_DURATION = 250;
	const POP_SCALE = 0.85;
	const POP_DURATION = 350;

	const context = getContext();
	const layout = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const maxWidth = $derived(layout.width * 0.85);

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});
	const scale = new Tween(1, { duration: POP_DURATION, easing: backOut });

	const titleStyle = $derived(
		createBoardTextStyle({
			fontSize: fitBoardFontSize({ text: TITLE, fontSize: TITLE_FONT_SIZE, maxWidth }),
			top: 0xfff27a,
			bottom: 0xffc21a,
			outline: OUTLINE_COLOR,
		}),
	);
	// sized for the final amount, the longest the count-up gets, so it keeps one size while counting
	const amountStyle = $derived(
		createBoardTextStyle({
			fontSize: fitBoardFontSize({
				text: bookEventAmountToCurrencyString(amount),
				fontSize: AMOUNT_FONT_SIZE,
				maxWidth,
			}),
			top: 0xffffff,
			bottom: 0xfff2c2,
			outline: OUTLINE_COLOR,
		}),
	);

	// only touches the blur while shown, so it can't turn off another screen's blur
	$effect(() => {
		if (!show) return;
		context.stateGame.blurScene = true;
		return () => (context.stateGame.blurScene = false);
	});

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: async () => {
			show = true;
			await scale.set(POP_SCALE, { duration: 0 });
			scale.set(1);
		},
		freeSpinOutroHide: async () => (show = false),
		freeSpinOutroCountUp: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show} duration={FADE_DURATION}>
	{#if winLevelData}
		<WinCountUpProvider
			{amount}
			duration={winLevelData.presentDuration}
			oncomplete={() => onCountUpComplete()}
		>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<OnMount onmount={() => startCountUp()} />

				<!-- a little darker, so the text reads on any part of the scene -->
				<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.25} />

				<MainContainer standard>
					<Container x={layout.width * 0.5} y={layout.height * 0.45} scale={scale.current}>
						<Text anchor={{ x: 0.5, y: 1 }} text={TITLE} style={titleStyle} />
						<Text
							anchor={{ x: 0.5, y: 0 }}
							y={AMOUNT_FONT_SIZE * 0.1}
							text={bookEventAmountToCurrencyString(countUpAmount)}
							style={amountStyle}
						/>
					</Container>
				</MainContainer>

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
