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
	import * as PIXI from 'pixi.js';
	import { cubicOut } from 'svelte/easing';
	import { BaseSprite, Container, Text } from 'pixi-svelte';
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
	import CountText from './CountText.svelte';
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

	const context = getContext();
	const layout = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const maxWidth = $derived(layout.width * 0.85);

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	// the bonus it shows for, kept from when it opens: the game clears the bonus type as this starts
	// to fade out, which would swap the cat mid-fade
	let bonusType = $state<BonusType>('normal');
	const cat = $derived(BONUS_CAT[bonusType]);
	const catWidth = $derived(widthAt(cat.key, CAT_HEIGHT));
	const ballWidth = widthAt(BALL_KEY, BALL_HEIGHT);
	const artWidth = $derived(catWidth + ART_GAP + ballWidth);
	const towardsBall = $derived(cat.facing === 'left' ? -1 : 1);
	const catX = $derived(((artWidth - catWidth) / 2) * -towardsBall);
	const ballX = $derived(((artWidth - ballWidth) / 2) * towardsBall);
	const artBottom = AMOUNT_FONT_SIZE * 1.5 + CAT_HEIGHT;

	// seconds since it was shown
	let time = $state(0);

	// The scene (board, logo, ...) fades away, leaving the background, and the leafy archway slides
	// in from both sides around the total win. Its picture is split down the middle: the left half
	// comes from the left, the right half from the right.
	const ARCH_SLIDE_DURATION = 0.7;
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const archTexture = $derived(
		context.stateApp.loadedAssets?.leafArchway as PIXI.Texture | undefined,
	);
	const archHalves = $derived.by(() => {
		if (!archTexture) return undefined;
		const { width, height } = archTexture;
		return {
			left: new PIXI.Texture({
				source: archTexture.source,
				frame: new PIXI.Rectangle(0, 0, width / 2, height),
			}),
			right: new PIXI.Texture({
				source: archTexture.source,
				frame: new PIXI.Rectangle(width / 2, 0, width / 2, height),
			}),
		};
	});
	// Scaled to cover the screen without stretching the art; on narrow screens (phones) each half is
	// positioned so its leafy pillar and flower pots frame the side of the screen rather than being
	// pushed off the edges by the wide empty gap in the middle of the image.
	const archProgress = $derived(Math.min(1, time / ARCH_SLIDE_DURATION));
	const arch = $derived.by(() => {
		const imageWidth = archTexture?.width ?? 1;
		const imageHeight = archTexture?.height ?? 1;
		const scale = Math.max(canvas.width / imageWidth, canvas.height / imageHeight);
		const width = imageWidth * scale;
		const height = imageHeight * scale;
		const halfWidth = width / 2;
		const restLeftX = Math.max((canvas.width - width) / 2, -width * 0.1);
		const restRightX = Math.min(canvas.width / 2, canvas.width - halfWidth + width * 0.1);
		const progress = cubicOut(archProgress);
		return {
			scale,
			y: (canvas.height - height) / 2,
			leftX: -halfWidth + (restLeftX + halfWidth) * progress,
			rightX: canvas.width - (canvas.width - restRightX) * progress,
		};
	});
	$effect(() => {
		if (!show) return;
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => {
			time += ticker.deltaMS / 1000;
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

	const titleFontSize = $derived(
		fitBoardFontSize({ text: TITLE, fontSize: TITLE_FONT_SIZE, maxWidth }),
	);
	const titleStyle = $derived(
		createBoardTextStyle({
			fontSize: titleFontSize,
			top: 0xfff27a,
			bottom: 0xffc21a,
			outline: OUTLINE_COLOR,
		}),
	);
	// sized for the final amount, the longest the count-up gets, so it keeps one size while counting
	const amountFontSize = $derived(
		fitBoardFontSize({
			text: bookEventAmountToCurrencyString(amount),
			fontSize: AMOUNT_FONT_SIZE,
			maxWidth,
		}),
	);
	const amountStyle = $derived(
		createBoardTextStyle({
			fontSize: amountFontSize,
			top: 0xffffff,
			bottom: 0xfff2c2,
			outline: OUTLINE_COLOR,
		}),
	);

	// the scene goes while shown, leaving only the background (see Game); the blur isn't used, as the
	// background stays clear behind the archway
	$effect(() => {
		if (!show) return;
		context.stateGame.hideScene = true;
		return () => (context.stateGame.hideScene = false);
	});

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			bonusType = context.stateGame.bonusType ?? 'normal';
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
	<!-- a little darker, so the text reads on any part of the scene -->
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.2} />

	<!-- the leafy archway, closing in from both sides around the total win -->
	{#if archHalves}
		<BaseSprite
			texture={archHalves.left}
			x={arch.leftX}
			y={arch.y}
			scale={arch.scale}
		/>
		<BaseSprite
			texture={archHalves.right}
			x={arch.rightX}
			y={arch.y}
			scale={arch.scale}
		/>
	{/if}

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
							<!-- digits all one width, so the counting amount holds still (see CountText) -->
							<CountText
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

				{#if show}
					<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
				{/if}
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>