<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import _ from 'lodash';
	import { Tween } from 'svelte/motion';
	import { Container, Text } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import { getContext } from '../game/context';
	import { SYMBOL_IMAGES, type SymbolImageKey } from '../game/constants';
	import { hopPose, popOut, REST_POSE, stage } from '../game/motion';
	import type { BonusType } from '../game/types';
	import { createBoardTextStyle, fitBoardFontSize } from '../game/textStyles';
	import Burst from './Burst.svelte';
	import Confetti from './Confetti.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import StandingArt from './StandingArt.svelte';

	// Like the free spin intro: the game scene blurred behind (see SceneBlur), "Total Win!" in big
	// yellow letters and the amount counting up under it, with the bonus's cat by its ball of yarn
	// below. It comes in a piece at a time like the intro, the amount kicks with a burst of sparkles
	// when the count ends, and paw prints rain down for big totals. Sizes are in the standard layout
	// (1920x1080 on desktop, 1080x1920 in portrait).
	const TITLE = 'Total Win!';
	const OUTLINE_COLOR = 0x4a1c00;
	const TITLE_FONT_SIZE = 150;
	const AMOUNT_FONT_SIZE = 120;
	const FADE_DURATION = 250;

	// in seconds from showing
	const ENTRANCE = {
		title: { start: 0, length: 0.45 },
		amount: { start: 0.25, length: 0.4 },
		cat: { start: 0.45, length: 0.65 },
		ball: { start: 0.6, length: 0.4 },
	};
	const TITLE_SLAM_FROM = 1.8;
	const FINISH_KICK = 1.18;
	const CAT_HOP_EVERY = 1.6;

	// the bonus's cat, as on the intro, and the ball of yarn on the side it faces
	const BONUS_CAT: Record<BonusType, { key: SymbolImageKey; facing: 'left' | 'right' }> = {
		normal: { key: 'symbolH4', facing: 'left' },
		super: { key: 'symbolH2', facing: 'left' },
		mythic: { key: 'symbolH1', facing: 'right' },
	};
	const BALL_KEY = 'symbolL1';
	const CAT_HEIGHT = 200;
	const BALL_HEIGHT = 100;
	const ART_GAP = 12;
	const BALL_ROCK_ANGLE = (8 * Math.PI) / 180;
	const BALL_ROCK_PERIOD = 1.6;
	const widthAt = (key: SymbolImageKey, height: number) =>
		(SYMBOL_IMAGES[key].image[0] * height) / SYMBOL_IMAGES[key].image[1];
	const CONFETTI_COUNT = 60;

	const context = getContext();
	const layout = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const maxWidth = $derived(layout.width * 0.85);

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	// the bonus type is cleared only after this closes, so it is still set here
	const cat = $derived(BONUS_CAT[context.stateGame.bonusType ?? 'normal']);
	const catWidth = $derived(widthAt(cat.key, CAT_HEIGHT));
	const ballWidth = widthAt(BALL_KEY, BALL_HEIGHT);
	const artWidth = $derived(catWidth + ART_GAP + ballWidth);
	const towardsBall = $derived(cat.facing === 'left' ? -1 : 1);
	const catX = $derived(((artWidth - catWidth) / 2) * -towardsBall);
	const ballX = $derived(((artWidth - ballWidth) / 2) * towardsBall);
	const artBottom = AMOUNT_FONT_SIZE * 1.5 + CAT_HEIGHT;

	// seconds since it was shown
	let time = $state(0);
	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => {
			if (show) time += ticker.deltaMS / 1000;
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	const entrance = $derived(_.mapValues(ENTRANCE, (step) => stage(time, step.start, step.length)));
	const titleScale = $derived(
		TITLE_SLAM_FROM + (1 - TITLE_SLAM_FROM) * popOut(entrance.title, 2.6),
	);
	const catPose = $derived.by(() => {
		if (time < ENTRANCE.cat.start + ENTRANCE.cat.length) return hopPose(entrance.cat);
		const sinceHop = (time - ENTRANCE.cat.start) % CAT_HOP_EVERY;
		return sinceHop < ENTRANCE.cat.length ? hopPose(sinceHop / ENTRANCE.cat.length) : REST_POSE;
	});
	const ballRotation = $derived(
		Math.sin((time * 2 * Math.PI) / BALL_ROCK_PERIOD) * BALL_ROCK_ANGLE,
	);

	// the amount's kick when the count ends, and a burst of sparkles with it
	const finishScale = new Tween(1);
	let finishBurst = $state(0);
	const kick = async () => {
		finishBurst++;
		await finishScale.set(FINISH_KICK, { duration: 120 });
		await finishScale.set(1, { duration: 380, easing: (t) => popOut(t, 3) });
	};

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
		freeSpinOutroShow: () => {
			time = 0;
			finishScale.set(1, { duration: 0 });
			show = true;
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
				<OnMount
					onmount={async () => {
						await startCountUp();
						kick();
					}}
				/>

				<!-- a little darker, so the text reads on any part of the scene -->
				<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.25} />

				{#if winLevelData?.type === 'big'}
					<Confetti active={show && !countUpCompleted} count={CONFETTI_COUNT} />
				{/if}

				<MainContainer standard>
					<Container x={layout.width * 0.5} y={layout.height * 0.38}>
						<Burst
							y={-TITLE_FONT_SIZE * 0.6}
							distance={TITLE_FONT_SIZE * 3}
							size={TITLE_FONT_SIZE * 0.16}
							count={18}
							duration={700}
						/>
						{#key finishBurst}
							{#if finishBurst}
								<Burst
									y={AMOUNT_FONT_SIZE * 0.6}
									distance={AMOUNT_FONT_SIZE * 3.5}
									size={AMOUNT_FONT_SIZE * 0.18}
									count={20}
									duration={700}
								/>
							{/if}
						{/key}

						<Container
							y={-TITLE_FONT_SIZE * 0.6}
							scale={titleScale}
							alpha={Math.min(1, entrance.title * 4)}
						>
							<Text anchor={0.5} text={TITLE} style={titleStyle} />
						</Container>
						<Container
							y={AMOUNT_FONT_SIZE * 0.6}
							scale={popOut(entrance.amount) * finishScale.current}
						>
							<Text
								anchor={0.5}
								text={bookEventAmountToCurrencyString(countUpAmount, {
									counting: !countUpCompleted,
								})}
								style={amountStyle}
							/>
						</Container>

						<StandingArt
							key={cat.key}
							height={CAT_HEIGHT}
							x={catX}
							y={artBottom}
							pose={catPose}
							alpha={Math.min(1, entrance.cat * 5)}
						/>
						<StandingArt
							key={BALL_KEY}
							height={BALL_HEIGHT}
							x={ballX}
							y={artBottom}
							pose={{
								...REST_POSE,
								scaleX: popOut(entrance.ball),
								scaleY: popOut(entrance.ball),
							}}
							spin={ballRotation}
						/>
					</Container>
				</MainContainer>

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
