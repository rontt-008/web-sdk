<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventBigWin = {
		type: 'bigWinShow';
		// in book units, like the amounts in book events
		amount: number;
		winLevelData: WinLevelData;
	};
</script>

<script lang="ts">
	import _ from 'lodash';
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut, sineInOut } from 'svelte/easing';
	import { Container, Text } from 'pixi-svelte';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { stateBetDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { SYMBOL_IMAGES, type SymbolImageKey } from '../game/constants';
	import { hopPose, popOut, REST_POSE } from '../game/motion';
	import { createBoardTextStyle, fitBoardFontSize } from '../game/textStyles';
	import CountText from './CountText.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import StandingArt from './StandingArt.svelte';

	// A win of 15x the bet or more, after its lines: the scene blurs as for the free spin screens and
	// the win counts up under its name. The name climbs as the count passes each level, from BIG WIN
	// up to the round's own, slamming in each time. A cat hops beside a ball of yarn below. Pressing
	// skips to the end of the count, then closes; it also closes by itself a moment after the count
	// ends (for autoplay). Sizes are in the standard layout (1920x1080 on desktop, 1080x1920 in
	// portrait).
	type Level = { level: number; text: string; from: number };
	// where each level starts, in book units (100 is the bet), as in the math's win levels
	const LEVELS: Level[] = [
		{ level: 6, text: 'BIG WIN', from: 15 * 100 },
		{ level: 7, text: 'SUPER WIN', from: 30 * 100 },
		{ level: 8, text: 'MEGA WIN', from: 50 * 100 },
		{ level: 9, text: 'EPIC WIN', from: 100 * 100 },
	];
	// the max win has no amount of its own: it is named when the count reaches it
	const MAX_WIN = { level: 10, text: 'MAX WIN' };

	// how long the screen stays once the count is done, before closing by itself
	const HOLD_DURATION = 2200;
	const FADE_DURATION = 250;

	const OUTLINE_COLOR = 0x4a1c00;
	const TITLE_FONT_SIZE = 150;
	const AMOUNT_FONT_SIZE = 120;
	// a new level's name lands from this big, with a hard overshoot
	const SLAM_FROM = 1.9;
	const SLAM_DURATION = 450;
	// the amount kicks once more when the count ends
	const FINISH_KICK = 1.18;

	// A cat and its ball stand under the amount. The cat is the level's: the cats from the lowest
	// paying up (as in the paytable), so each level up brings a better cat, and the max win keeps
	// the best.
	const LEVEL_CATS: Record<number, SymbolImageKey> = {
		6: 'symbolH3',
		7: 'symbolH4',
		8: 'symbolH2',
		9: 'symbolH1',
		10: 'symbolH1',
	};
	// sized by area, as on the board, so the wide cat looks as big as the tall ones
	const CAT_SIZE = 212;
	const catWidth = (key: SymbolImageKey) =>
		CAT_SIZE * Math.sqrt(SYMBOL_IMAGES[key].image[0] / SYMBOL_IMAGES[key].image[1]);
	const catHeight = (key: SymbolImageKey) =>
		CAT_SIZE * Math.sqrt(SYMBOL_IMAGES[key].image[1] / SYMBOL_IMAGES[key].image[0]);
	const BALL_KEY = 'symbolL1';
	const BALL_HEIGHT = 115;
	const BALL_WIDTH =
		(SYMBOL_IMAGES[BALL_KEY].image[0] * BALL_HEIGHT) / SYMBOL_IMAGES[BALL_KEY].image[1];
	const ART_GAP = 30;
	// the line they stand on, under the amount
	const GROUND_Y = AMOUNT_FONT_SIZE * 1.45 + 230;
	// where the cat stands, and the ball beside it, the two centred together
	const CAT_X = -(BALL_WIDTH + ART_GAP) / 2;
	const ballXBeside = (key: SymbolImageKey) => (catWidth(key) + ART_GAP) / 2;
	// the cat hops every so often (seconds), and the ball rocks when it lands
	const HOP_EVERY = 1.1;
	const HOP_LENGTH = 0.65;
	const BALL_ROCK = (10 * Math.PI) / 180;
	// On a new level the cat flips round once on the spot with a little hop, gently speeding up and
	// slowing down, in one smooth turn. Edge-on at the third quarter turn the next cat takes its
	// place (coming in facing out) and finishes the turn; seen from behind (the back half of the
	// turn) the art is mirrored. All through the turn the cat grows or shrinks to the next one's
	// size, so nothing jumps as they change.
	//   swapTurn: when (of the turn) they change; hop: how high; blendIn: the part of the turn over
	//   which a hop the cat was in the middle of gives way to the flip
	const FLIP = { duration: 800, swapTurn: 0.75, hop: 60, blendIn: 0.25 };

	const context = getContext();
	const layout = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const maxWidth = $derived(layout.width * 0.85);

	let show = $state(false);
	let amount = $state(0);
	let finalLevel = $state(6);
	// the levels the count climbs through, each with the amounts it counts between
	let steps = $state<(Level & { start: number; end: number })[]>([]);
	// how far the count is, running from 0 to steps.length, a step for each level
	const count = new Tween(0);
	let countDone = $state(false);
	let onpress = $state(() => {});

	const stepIndex = $derived(Math.min(Math.floor(count.current), steps.length - 1));
	const step = $derived(steps[stepIndex]);
	const countAmount = $derived.by(() => {
		if (countDone) return amount;
		if (!step) return 0;
		// slows into the end of each level, before the next name slams in
		const within = cubicOut(Math.min(1, count.current - stepIndex));
		return step.start + (step.end - step.start) * within;
	});
	const title = $derived(
		countDone && finalLevel === MAX_WIN.level ? MAX_WIN.text : (step?.text ?? LEVELS[0].text),
	);
	const level = $derived(
		countDone && finalLevel === MAX_WIN.level ? MAX_WIN.level : (step?.level ?? LEVELS[0].level),
	);

	// the name slams in again whenever it changes
	const titleScale = new Tween(1);
	$effect(() => {
		title;
		if (!show) return;
		titleScale.set(SLAM_FROM, { duration: 0 });
		titleScale.set(1, {
			duration: SLAM_DURATION / stateBetDerived.timeScale(),
			easing: (t) => popOut(t, 2.6),
		});
	});

	const amountScale = new Tween(1);

	const titleStyle = $derived(
		createBoardTextStyle({
			fontSize: fitBoardFontSize({ text: title, fontSize: TITLE_FONT_SIZE, maxWidth }),
			top: 0xfff27a,
			bottom: 0xffc21a,
			outline: OUTLINE_COLOR,
		}),
	);
	// sized for the final amount, the longest the count gets, so it keeps one size while counting
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

	// seconds since it was shown, for the cat and the ball
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

	// everything grows in from the middle as the screen opens
	const opening = $derived(popOut(Math.min(1, time / 0.4), 1.6));

	// the level whose cat stands, the one it is flipping into (while it flips), how far round the
	// flip is (0 to 1, eased), and where the ball stands, moving over for the next cat as it flips
	let shownLevel = $state(LEVELS[0].level);
	let nextLevel = $state<number>();
	const flip = new Tween(0);
	const ballX = new Tween(ballXBeside(LEVEL_CATS[LEVELS[0].level]));
	// the hops count from here, so they start again from the ground after a flip
	let hopsFrom = $state(0);

	// the cat drawn: the next one from the moment the flip turns it edge-on
	const cat = $derived(
		LEVEL_CATS[nextLevel !== undefined && flip.current >= FLIP.swapTurn ? nextLevel : shownLevel],
	);
	// its height, going from one cat's to the next's all through the flip
	const shownCatHeight = $derived.by(() => {
		const from = catHeight(LEVEL_CATS[shownLevel]);
		if (nextLevel === undefined) return from;
		return from + (catHeight(LEVEL_CATS[nextLevel]) - from) * flip.current;
	});

	const flipOnce = async () => {
		const duration = FLIP.duration / stateBetDerived.timeScale();
		nextLevel = level;
		flip.set(0, { duration: 0 });
		ballX.set(ballXBeside(LEVEL_CATS[nextLevel]), { duration, easing: sineInOut });
		await flip.set(1, { duration, easing: sineInOut });
		shownLevel = nextLevel;
		nextLevel = undefined;
		// just landed: the ball is batted, and the next hop comes after the usual wait
		hopsFrom = time - HOP_LENGTH;
	};
	// flips whenever the level goes up, once more if it went up again meanwhile
	let flipRunning = false;
	const flipToLevel = async () => {
		if (flipRunning) return;
		flipRunning = true;
		while (show && shownLevel !== level) await flipOnce();
		flipRunning = false;
	};
	$effect(() => {
		level;
		if (!show) return;
		untrack(() => flipToLevel());
	});

	// hopping every so often, between flips
	const hop = $derived.by(() => {
		const t = ((time - hopsFrom) % HOP_EVERY) / HOP_LENGTH;
		return t < 1 ? hopPose(t, 1) : REST_POSE;
	});
	const catPose = $derived.by(() => {
		if (nextLevel === undefined) return hop;
		const turn = flip.current;
		// a hop it was in the middle of gives way to the flip's own over the start of the turn
		const blend = sineInOut(Math.min(1, turn / FLIP.blendIn));
		const mix = (from: number, to: number) => from + (to - from) * blend;
		return {
			y: mix(hop.y, -FLIP.hop * Math.sin(Math.PI * turn)),
			scaleX: Math.cos(2 * Math.PI * turn) * mix(hop.scaleX, 1),
			scaleY: mix(hop.scaleY, 1),
			rotation: mix(hop.rotation, 0),
		};
	});
	// batted as the cat lands, then rocking to a stop
	const ballSpin = $derived.by(() => {
		const sinceLanding = ((time - hopsFrom) % HOP_EVERY) - HOP_LENGTH * 0.7;
		if (sinceLanding < 0) return 0;
		return BALL_ROCK * Math.exp(-sinceLanding * 4) * Math.sin(sinceLanding * 14);
	});

	// only touches the blur while shown, so it can't turn off another screen's blur
	$effect(() => {
		if (!show) return;
		context.stateGame.blurScene = true;
		return () => (context.stateGame.blurScene = false);
	});

	const finishCount = async () => {
		count.set(steps.length, { duration: 0 });
		countDone = true;
		context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_end' });
		await amountScale.set(FINISH_KICK, { duration: 120 / stateBetDerived.timeScale() });
		await amountScale.set(1, {
			duration: 380 / stateBetDerived.timeScale(),
			easing: (t) => popOut(t, 3),
		});
	};

	context.eventEmitter.subscribeOnMount({
		bigWinShow: async (emitterEvent) => {
			const timeScale = stateBetDerived.timeScale();
			amount = emitterEvent.amount;
			finalLevel = emitterEvent.winLevelData.level;
			// every level up to the round's own that the win reaches, each counting up to the next
			const reached = LEVELS.filter(
				(level, index) => level.level <= finalLevel && (index === 0 || level.from < amount),
			);
			steps = reached.map((level, index) => ({
				...level,
				start: index === 0 ? 0 : level.from,
				end: reached[index + 1]?.from ?? amount,
			}));
			countDone = false;
			count.set(0, { duration: 0 });
			amountScale.set(1, { duration: 0 });
			// the first level's cat, standing still
			shownLevel = LEVELS[0].level;
			nextLevel = undefined;
			flip.set(0, { duration: 0 });
			ballX.set(ballXBeside(LEVEL_CATS[shownLevel]), { duration: 0 });
			time = 0;
			hopsFrom = 0;
			show = true;

			// each level takes an even share of the count's time
			const stepDuration = emitterEvent.winLevelData.presentDuration / steps.length / timeScale;
			let skipped = false;
			const counted = (async () => {
				for (const index of _.range(steps.length)) {
					await count.set(index + 1, { duration: stepDuration, easing: (t) => t });
					if (skipped) return;
					if (index < steps.length - 1) {
						context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
					}
				}
			})();

			// the first press (or the end of the count) finishes it, the next press (or the wait) closes
			await Promise.race([
				counted,
				waitForResolve((resolve) => (onpress = () => ((skipped = true), resolve()))),
			]);
			await finishCount();
			await Promise.race([
				waitForTimeout(HOLD_DURATION / timeScale),
				waitForResolve((resolve) => (onpress = resolve)),
			]);
			onpress = () => {};
			show = false;
			await waitForTimeout(FADE_DURATION);
		},
	});
</script>

<FadeContainer {show} duration={FADE_DURATION}>
	<!-- a little darker, so the text reads on any part of the scene -->
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.35} />

	<MainContainer standard>
		<Container x={layout.width * 0.5} y={layout.height * 0.4} scale={opening}>
			<Text anchor={{ x: 0.5, y: 1 }} scale={titleScale.current} text={title} style={titleStyle} />
			<!-- digits all one width, so the counting amount holds still (see CountText) -->
			<Container y={AMOUNT_FONT_SIZE * 0.1} scale={amountScale.current}>
				<CountText
					anchor={{ x: 0.5, y: 0 }}
					text={bookEventAmountToCurrencyString(countAmount, { counting: !countDone })}
					fitText={bookEventAmountToCurrencyString(amount)}
					style={amountStyle}
				/>
			</Container>

			<!-- the cat and the ball stand together under the amount, centred -->
			<StandingArt key={cat} height={shownCatHeight} x={CAT_X} y={GROUND_Y} pose={catPose} />
			<StandingArt
				key={BALL_KEY}
				height={BALL_HEIGHT}
				x={ballX.current}
				y={GROUND_Y}
				spin={ballSpin}
			/>
		</Container>
	</MainContainer>

	<PressToContinue onpress={() => onpress()} />
</FadeContainer>
