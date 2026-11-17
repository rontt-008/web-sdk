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
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { LOGO_TEXT_COLORS } from '../game/textStyles';
	import LogoText from './LogoText.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import BatSign from './BatSign.svelte';

	// The free spins' total win (2026-11-17, the user: "using the bats animation can you make a
	// animation/custom screen for these screenshots"): over the dimmed game the crystal bat dives to the
	// bottom of the screen and fishes the sign up on two ropes (BatSign), TOTAL WIN on it; once it is
	// up, the amount counts up on it, and when it is done the bat roars, the amount kicking at the
	// roar's snap. Pressed, the count finishes; pressed again, the bat lets go of the sign, which falls
	// away, and flies back. In the logo's lettering as the start screen's cards and the free spins sign
	// (LogoText, look logo; 2026-11-14): TOTAL WIN blue, the amount pink to red.
	// Font sizes and middles (from the panel's middle) of the panel's height, at most `fill` of its width.
	const WORDS = { title: { size: 0.26, y: -0.24 }, amount: { size: 0.36, y: 0.17 }, fill: 0.9 };
	// the amount's kick at the snap: this much bigger and back, over this long
	const KICK = { by: 0.3, ms: 450 };

	const context = getContext();

	let show = $state(true);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let leaving = $state(false);
	let roars = $state(0);
	let left = false;
	let oncomplete = $state(() => {});
	const kick = new Tween(1);

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			show = true;
			leaving = false;
			left = false;
		},
		freeSpinOutroHide: async () => (show = false),
		freeSpinOutroCountUp: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			if (left) return;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => (roars += 1)}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.62} />

				<MainContainer>
					<BatSign
						{leaving}
						{roars}
						onarrived={() => startCountUp()}
						onsnap={() => {
							kick.set(1 + KICK.by, { duration: 0 });
							kick.set(1, { duration: KICK.ms, easing: backOut });
						}}
						onleft={() => {
							left = true;
							oncomplete();
						}}
					>
						{#snippet panel({ width, height })}
							<LogoText
								text="TOTAL WIN"
								y={height * WORDS.title.y}
								fontSize={height * WORDS.title.size}
								maxWidth={width * WORDS.fill}
								colors={LOGO_TEXT_COLORS.blue}
								look="logo"
							/>
							<Container y={height * WORDS.amount.y} scale={kick.current}>
								<LogoText
									text={bookEventAmountToCurrencyString(countUpAmount, { counting: !countUpCompleted })}
									fontSize={height * WORDS.amount.size}
									maxWidth={width * WORDS.fill}
									colors={LOGO_TEXT_COLORS.pink}
									look="logo"
								/>
							</Container>
						{/snippet}
					</BatSign>
				</MainContainer>

				{#if !leaving}
					<PressToContinue onpress={() => (countUpCompleted ? (leaving = true) : finishCountUp())} />
				{/if}
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
