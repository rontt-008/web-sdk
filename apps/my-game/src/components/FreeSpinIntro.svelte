<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import _ from 'lodash';
	import { cubicOut } from 'svelte/easing';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { Container, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		BONUS_NAME,
		BONUS_DESCRIPTION,
		SYMBOL_IMAGES,
		type SymbolImageKey,
	} from '../game/constants';
	import { hopPose, popOut, REST_POSE, stage } from '../game/motion';
	import type { BonusType } from '../game/types';
	import { createBoardTextStyle, fitBoardFontSize } from '../game/textStyles';
	import Burst from './Burst.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import StandingArt from './StandingArt.svelte';

	// Cuts straight to the game scene, blurred (see SceneBlur), with the bonus's name in light yellow,
	// the number of spins and, smaller, how the bonus works. Sizes are in the standard layout
	// (1920x1080 on desktop, 1080x1920 in portrait).
	const OUTLINE_COLOR = 0x4a1c00;
	const TITLE_FONT_SIZE = 120;
	const SPINS_FONT_SIZE = 64;
	const DESCRIPTION_FONT_SIZE = 40;
	const DESCRIPTION_MAX_WIDTH = 1100;
	const FADE_DURATION = 250;

	// It comes in a piece at a time (in seconds from showing): the title slams down with sparkles
	// bursting behind it, the spins pop up under it, the description rises in and the cat hops in.
	const ENTRANCE = {
		title: { start: 0, length: 0.45 },
		spins: { start: 0.25, length: 0.4 },
		description: { start: 0.4, length: 0.35 },
		cat: { start: 0.5, length: 0.65 },
		ball: { start: 0.65, length: 0.4 },
	};
	const TITLE_SLAM_FROM = 1.8;
	const DESCRIPTION_RISE = 24;
	// then the cat hops again every so often
	const CAT_HOP_EVERY = 2.4;

	// Under the text, the cat that comes with the bonus and a ball of yarn in front of it, both from
	// the symbol art (with their soft shadows).
	const BONUS_CAT: Record<BonusType, { key: SymbolImageKey; facing: 'left' | 'right' }> = {
		normal: { key: 'symbolH4', facing: 'left' },
		super: { key: 'symbolH2', facing: 'left' },
		mythic: { key: 'symbolH1', facing: 'right' },
	};
	const BALL_KEY = 'symbolL1';
	const CAT_HEIGHT = 230;
	const BALL_HEIGHT = 115;
	// between the cat and the ball
	const ART_GAP = 12;
	// between the last line of text and the cat
	const ART_TOP_GAP = 36;
	// the ball rocks back and forth as if the cat has just batted it
	const BALL_ROCK_ANGLE = (8 * Math.PI) / 180;
	const BALL_ROCK_PERIOD = 1.6;
	const widthAt = (key: SymbolImageKey, height: number) =>
		(SYMBOL_IMAGES[key].image[0] * height) / SYMBOL_IMAGES[key].image[1];

	// down from the title's bottom
	const SPINS_Y = SPINS_FONT_SIZE * 0.1;
	const DESCRIPTION_Y = SPINS_FONT_SIZE * 1.5 + DESCRIPTION_FONT_SIZE * 0.6;
	// where the middle of the whole block (title to cat) sits, as a share of the screen's height:
	// a little above the middle, clear of the "press anywhere" prompt at the bottom
	const BLOCK_CENTER_Y = 0.46;

	const context = getContext();
	const layout = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const maxWidth = $derived(layout.width * 0.85);
	const bonusType = $derived(context.stateGame.bonusType ?? 'normal');
	const title = $derived([BONUS_NAME[bonusType], 'FREE SPINS'].filter(Boolean).join(' '));
	const description = $derived(BONUS_DESCRIPTION[bonusType]);

	const titleFontSize = $derived(
		fitBoardFontSize({ text: title, fontSize: TITLE_FONT_SIZE, maxWidth }),
	);
	const titleStyle = $derived(
		createBoardTextStyle({
			fontSize: titleFontSize,
			top: 0xfffbe6,
			bottom: 0xffe27a,
			outline: OUTLINE_COLOR,
		}),
	);

	// the cat and the ball side by side, centred, the ball on the side the cat faces
	const cat = $derived(BONUS_CAT[bonusType]);
	const catWidth = $derived(widthAt(cat.key, CAT_HEIGHT));
	const ballWidth = widthAt(BALL_KEY, BALL_HEIGHT);
	const artWidth = $derived(catWidth + ART_GAP + ballWidth);
	const towardsBall = $derived(cat.facing === 'left' ? -1 : 1);
	const catX = $derived(((artWidth - catWidth) / 2) * -towardsBall);
	const ballX = $derived(((artWidth - ballWidth) / 2) * towardsBall);

	const spinsStyle = createBoardTextStyle({
		fontSize: SPINS_FONT_SIZE,
		top: 0xffffff,
		bottom: 0xfff2c2,
		outline: OUTLINE_COLOR,
	});
	const descriptionStyle = $derived({
		fontFamily: 'Titan One',
		fontSize: DESCRIPTION_FONT_SIZE,
		lineHeight: DESCRIPTION_FONT_SIZE * 1.3,
		fill: 0xfff6e2,
		stroke: { color: OUTLINE_COLOR, width: DESCRIPTION_FONT_SIZE * 0.12, join: 'round' },
		align: 'center',
		wordWrap: true,
		wordWrapWidth: Math.min(DESCRIPTION_MAX_WIDTH, maxWidth),
	} as const);

	// measured text heights (the description wraps to however many lines it needs), starting from
	// estimates until the text has been drawn
	let titleHeight = $state(TITLE_FONT_SIZE * 1.3);
	let spinsHeight = $state(SPINS_FONT_SIZE * 1.3);
	let descriptionHeight = $state(0);
	const textBottom = $derived(
		description ? DESCRIPTION_Y + descriptionHeight : SPINS_Y + spinsHeight,
	);
	// the cat and the ball stand on this line, under the text
	const artBottom = $derived(textBottom + ART_TOP_GAP + CAT_HEIGHT);
	const blockY = $derived(layout.height * BLOCK_CENTER_Y - (artBottom - titleHeight) / 2);

	let show = $state(false);
	let freeSpins = $state(0);
	let oncomplete = $state(() => {});

	// seconds since it was shown
	let time = $state(0);
	const ballRotation = $derived(
		Math.sin((time * 2 * Math.PI) / BALL_ROCK_PERIOD) * BALL_ROCK_ANGLE,
	);

	const entrance = $derived(_.mapValues(ENTRANCE, (step) => stage(time, step.start, step.length)));
	const titleScale = $derived(TITLE_SLAM_FROM + (1 - TITLE_SLAM_FROM) * popOut(entrance.title, 2.6));
	const catPose = $derived.by(() => {
		if (time < ENTRANCE.cat.start + ENTRANCE.cat.length) return hopPose(entrance.cat);
		const sinceHop = (time - ENTRANCE.cat.start) % CAT_HOP_EVERY;
		return sinceHop < ENTRANCE.cat.length ? hopPose(sinceHop / ENTRANCE.cat.length) : REST_POSE;
	});

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;

		const tick = () => {
			if (show) time += ticker.deltaMS / 1000;
		};

		ticker.add(tick);
		return () => ticker.remove(tick);
	});

	// only touches the blur while shown, so it can't turn off another screen's blur
	$effect(() => {
		if (!show) return;
		context.stateGame.blurScene = true;
		return () => (context.stateGame.blurScene = false);
	});

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => {
			time = 0;
			show = true;
		},
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async (emitterEvent) => {
			freeSpins = emitterEvent.totalFreeSpins;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show} duration={FADE_DURATION}>
	<!-- a little darker, so the text reads on any part of the scene -->
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.25} />

	<MainContainer standard>
		<!-- at the title's bottom; the rest is below it -->
		<Container x={layout.width * 0.5} y={blockY}>
			{#if show}
				<Burst
					y={-titleHeight * 0.5}
					distance={TITLE_FONT_SIZE * 3}
					size={TITLE_FONT_SIZE * 0.16}
					count={18}
					duration={700}
				/>
			{/if}
			<!-- scaled about their middles; the texts themselves keep their size, which places the rest -->
			<Container
				y={-titleHeight * 0.5}
				scale={titleScale}
				alpha={Math.min(1, entrance.title * 4)}
			>
				<Text
					anchor={0.5}
					text={title}
					style={titleStyle}
					onresize={(sizes) => (titleHeight = sizes.height)}
				/>
			</Container>
			<Container y={SPINS_Y + spinsHeight * 0.5} scale={popOut(entrance.spins)}>
				<Text
					anchor={0.5}
					text={`${freeSpins} SPINS`}
					style={spinsStyle}
					onresize={(sizes) => (spinsHeight = sizes.height)}
				/>
			</Container>
			{#if description}
				<Text
					anchor={{ x: 0.5, y: 0 }}
					y={DESCRIPTION_Y + DESCRIPTION_RISE * (1 - cubicOut(entrance.description))}
					alpha={entrance.description}
					text={description}
					style={descriptionStyle}
					onresize={(sizes) => (descriptionHeight = sizes.height)}
				/>
			{/if}
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
				pose={{ ...REST_POSE, scaleX: popOut(entrance.ball), scaleY: popOut(entrance.ball) }}
				spin={ballRotation}
			/>
		</Container>
	</MainContainer>

	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
