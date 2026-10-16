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
	import { untrack, type ComponentProps } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Container, Graphics, Text } from 'pixi-svelte';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { stateBetDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { SYMBOL_IMAGES, type SymbolImageKey } from '../game/constants';
	import { hopPose, popOut, REST_POSE } from '../game/motion';
	import { createBoardTextStyle, fitBoardFontSize } from '../game/textStyles';
	import Burst, { BURST_COLORS } from './Burst.svelte';
	import Confetti from './Confetti.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import StandingArt from './StandingArt.svelte';

	// A win of 15x the bet or more, after its lines: the scene blurs as for the free spin screens and
	// the win counts up under its name. The name climbs as the count passes each level, from BIG WIN
	// up to the round's own, slamming in with a burst of sparkles each time. A cat hops beside a ball
	// of yarn below, and paw prints rain down. Pressing skips to the end of the count, then closes; it
	// also closes by itself a moment after the count ends (for autoplay). Sizes are in the standard
	// layout (1920x1080 on desktop, 1080x1920 in portrait).
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

	// soft rays turning slowly behind the name
	const RAY_COUNT = 14;
	const RAY_LENGTH = 1100;
	const RAY_COLOR = 0xfff4d6;
	const RAY_ALPHA = 0.09;
	const RAY_SPEED = 0.12;

	// the cat and its ball, standing under the amount
	const CAT_KEY = 'symbolH4';
	const CAT_HEIGHT = 230;
	const BALL_KEY = 'symbolL1';
	const BALL_HEIGHT = 115;
	const widthAt = (key: SymbolImageKey, height: number) =>
		(SYMBOL_IMAGES[key].image[0] * height) / SYMBOL_IMAGES[key].image[1];
	const CAT_WIDTH = widthAt(CAT_KEY, CAT_HEIGHT);
	const BALL_WIDTH = widthAt(BALL_KEY, BALL_HEIGHT);
	const ART_GAP = 30;
	// the cat hops every so often (seconds), and the ball rocks when it lands
	const HOP_EVERY = 1.1;
	const HOP_LENGTH = 0.65;
	const BALL_ROCK = (10 * Math.PI) / 180;

	// how many paw prints and paper bits fall at once, more for bigger wins
	const CONFETTI_COUNT: Record<number, number> = { 6: 30, 7: 45, 8: 60, 9: 75, 10: 90 };

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

	// the name slams in again whenever it changes, with sparkles bursting out behind it
	const titleScale = new Tween(1);
	let burstId = $state(0);
	$effect(() => {
		title;
		if (!show) return;
		untrack(() => burstId++);
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

	// seconds since it was shown, for the rays, the cat and the ball
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

	const catPose = $derived.by(() => {
		const t = (time % HOP_EVERY) / HOP_LENGTH;
		return t < 1 ? hopPose(t, 1) : REST_POSE;
	});
	// batted as the cat lands, then rocking to a stop
	const ballSpin = $derived.by(() => {
		const sinceLanding = (time % HOP_EVERY) - HOP_LENGTH * 0.7;
		if (sinceLanding < 0) return 0;
		return BALL_ROCK * Math.exp(-sinceLanding * 4) * Math.sin(sinceLanding * 14);
	});

	const drawRays: ComponentProps<typeof Graphics>['draw'] = (graphics) => {
		const turn = time * RAY_SPEED;
		const half = Math.PI / RAY_COUNT / 2;
		for (const index of _.range(RAY_COUNT)) {
			const angle = turn + (index / RAY_COUNT) * Math.PI * 2;
			graphics.poly([
				0,
				0,
				Math.cos(angle - half) * RAY_LENGTH,
				Math.sin(angle - half) * RAY_LENGTH,
				Math.cos(angle + half) * RAY_LENGTH,
				Math.sin(angle + half) * RAY_LENGTH,
			]);
		}
		graphics.fill({ color: RAY_COLOR, alpha: RAY_ALPHA });
	};

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
		burstId++;
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
			time = 0;
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

	<Confetti active={show && !countDone} count={CONFETTI_COUNT[finalLevel] ?? 40} />

	<MainContainer standard>
		<Container x={layout.width * 0.5} y={layout.height * 0.4} scale={opening}>
			<Graphics draw={drawRays} />
			{#key burstId}
				<Burst
					distance={TITLE_FONT_SIZE * 3}
					size={TITLE_FONT_SIZE * 0.16}
					count={18}
					duration={700}
					colors={BURST_COLORS}
				/>
			{/key}

			<Text anchor={{ x: 0.5, y: 1 }} scale={titleScale.current} text={title} style={titleStyle} />
			<Text
				anchor={{ x: 0.5, y: 0 }}
				y={AMOUNT_FONT_SIZE * 0.1}
				scale={amountScale.current}
				text={bookEventAmountToCurrencyString(countAmount, { counting: !countDone })}
				style={amountStyle}
			/>

			<!-- the cat and the ball stand together under the amount, centred -->
			<StandingArt
				key={CAT_KEY}
				height={CAT_HEIGHT}
				x={-(BALL_WIDTH + ART_GAP) / 2}
				y={AMOUNT_FONT_SIZE * 1.45 + CAT_HEIGHT}
				pose={catPose}
			/>
			<StandingArt
				key={BALL_KEY}
				height={BALL_HEIGHT}
				x={(CAT_WIDTH + ART_GAP) / 2}
				y={AMOUNT_FONT_SIZE * 1.45 + CAT_HEIGHT}
				spin={ballSpin}
			/>
		</Container>
	</MainContainer>

	<PressToContinue onpress={() => onpress()} />
</FadeContainer>
