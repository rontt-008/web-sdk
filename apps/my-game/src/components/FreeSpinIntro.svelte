<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { Container, Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { BONUS_NAME, BONUS_DESCRIPTION } from '../game/constants';
	import type { BonusType } from '../game/types';
	import { createBoardTextStyle, fitBoardFontSize } from '../game/textStyles';
	import PressToContinue from './PressToContinue.svelte';

	// Cuts straight to the game scene, blurred (see SceneBlur), with the bonus's name in light yellow,
	// the number of spins and, smaller, how the bonus works. Sizes are in the standard layout
	// (1920x1080 on desktop, 1080x1920 in portrait).
	const OUTLINE_COLOR = 0x4a1c00;
	const TITLE_FONT_SIZE = 120;
	const SPINS_FONT_SIZE = 64;
	const DESCRIPTION_FONT_SIZE = 40;
	const DESCRIPTION_MAX_WIDTH = 1100;
	const FADE_DURATION = 250;
	const POP_SCALE = 0.85;
	const POP_DURATION = 350;

	// Under the text, the cat that comes with the bonus and a ball of yarn in front of it, both from
	// the symbol art (with their soft shadows). Sizes are of the images, to keep their proportions.
	type Art = { key: string; image: [number, number]; shadow: [number, number] };
	const BONUS_CAT: Record<BonusType, Art & { facing: 'left' | 'right' }> = {
		normal: { key: 'symbolH4', image: [240, 282], shadow: [292, 334], facing: 'left' },
		super: { key: 'symbolH2', image: [329, 288], shadow: [387, 346], facing: 'left' },
		mythic: { key: 'symbolH1', image: [277, 290], shadow: [329, 342], facing: 'right' },
	};
	const BALL: Art = { key: 'symbolL1', image: [562, 419], shadow: [662, 519] };
	const CAT_HEIGHT = 230;
	const BALL_HEIGHT = 115;
	// between the cat and the ball
	const ART_GAP = 12;
	// between the last line of text and the cat
	const ART_TOP_GAP = 36;
	// as on the board: the shadow a little down and right, see-through
	const SHADOW_OFFSET = { x: 0.04, y: 0.06 };
	const SHADOW_ALPHA = 0.6;
	// the ball rocks back and forth as if the cat has just batted it
	const BALL_ROCK_ANGLE = (8 * Math.PI) / 180;
	const BALL_ROCK_PERIOD = 1.6;

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
	const catWidth = $derived((cat.image[0] * CAT_HEIGHT) / cat.image[1]);
	const ballWidth = (BALL.image[0] * BALL_HEIGHT) / BALL.image[1];
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
	const scale = new Tween(1, { duration: POP_DURATION, easing: backOut });

	let time = $state(0);
	const ballRotation = $derived(
		Math.sin((time * 2 * Math.PI) / BALL_ROCK_PERIOD) * BALL_ROCK_ANGLE,
	);

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
		freeSpinIntroShow: async () => {
			show = true;
			await scale.set(POP_SCALE, { duration: 0 });
			scale.set(1);
		},
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async (emitterEvent) => {
			freeSpins = emitterEvent.totalFreeSpins;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<!-- symbol art standing on `artBottom`, centred on x, with its shadow -->
{#snippet art(item: Art, height: number, x: number, rotation: number)}
	{@const artScale = height / item.image[1]}
	<Container {x} y={artBottom - height * 0.5} {rotation}>
		<Sprite
			key={`${item.key}Shadow`}
			anchor={0.5}
			x={height * SHADOW_OFFSET.x}
			y={height * SHADOW_OFFSET.y}
			width={item.shadow[0] * artScale}
			height={item.shadow[1] * artScale}
			alpha={SHADOW_ALPHA}
		/>
		<Sprite key={item.key} anchor={0.5} width={item.image[0] * artScale} {height} />
	</Container>
{/snippet}

<FadeContainer {show} duration={FADE_DURATION}>
	<!-- a little darker, so the text reads on any part of the scene -->
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.25} />

	<MainContainer standard>
		<!-- at the title's bottom; the rest is below it -->
		<Container x={layout.width * 0.5} y={blockY} scale={scale.current}>
			<Text
				anchor={{ x: 0.5, y: 1 }}
				text={title}
				style={titleStyle}
				onresize={(sizes) => (titleHeight = sizes.height)}
			/>
			<Text
				anchor={{ x: 0.5, y: 0 }}
				y={SPINS_Y}
				text={`${freeSpins} SPINS`}
				style={spinsStyle}
				onresize={(sizes) => (spinsHeight = sizes.height)}
			/>
			{#if description}
				<Text
					anchor={{ x: 0.5, y: 0 }}
					y={DESCRIPTION_Y}
					text={description}
					style={descriptionStyle}
					onresize={(sizes) => (descriptionHeight = sizes.height)}
				/>
			{/if}
			{@render art(cat, CAT_HEIGHT, catX, 0)}
			{@render art(BALL, BALL_HEIGHT, ballX, ballRotation)}
		</Container>
	</MainContainer>

	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
