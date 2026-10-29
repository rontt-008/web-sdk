<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import _ from 'lodash';
	import { FillGradient } from 'pixi.js';
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		BONUS_NAME,
		BONUS_DESCRIPTION,
		SYMBOL_IMAGES,
		type SymbolImageKey,
	} from '../game/constants';
	import { popOut, REST_POSE, stage } from '../game/motion';
	import Burst from './Burst.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import StandingArt from './StandingArt.svelte';

	// The game scene, blurred (see SceneBlur) and darkened, a warm glow in the middle, the bonus's
	// name small at the top and the number of spins huge in gold under it, with cats standing in a
	// row in front of it and how the bonus works written under them. Laid out as in its design: a
	// 960x540 card on wide screens and a 300x620 one on tall ones, in the card's own units (scaled up
	// to fit the screen, see S), the cards' parts placed by their middles and their feet.
	type Cat = { key: SymbolImageKey; x: number; feet: number; width: number; mirror?: boolean; float?: number };
	type Look = {
		card: { width: number; height: number };
		glow: { x: number; y: number; size: number };
		title: { top: number; fontSize: number; spacing: number };
		count: { fontSize: number };
		// the word SPINS under the number (tall screens only)
		spins?: { fontSize: number; spacing: number };
		cats: Cat[];
		ball?: { x: number; feet: number; size: number };
		// the description: this far under the cats' feet, no lower than this far from the card's
		// bottom (shrunk if it would be), its letter size and widest
		description: { gap: number; bottom: number; fontSize: number; width: number };
	};
	const LOOKS: Record<'wide' | 'tall', Look> = {
		wide: {
			card: { width: 960, height: 540 },
			glow: { x: 480, y: 259, size: 700 },
			title: { top: 48, fontSize: 34, spacing: 6 },
			count: { fontSize: 300 },
			cats: [
				{ key: 'symbolH2', x: 358, feet: 420, width: 170, float: 0 },
				{ key: 'symbolH1', x: 612, feet: 422, width: 150, float: 0.6 },
				{ key: 'symbolH3', x: 480, feet: 428, width: 118 },
			],
			ball: { x: 408, feet: 424, size: 40 },
			description: { gap: 4, bottom: 58, fontSize: 19, width: 560 },
		},
		tall: {
			card: { width: 300, height: 620 },
			glow: { x: 150, y: 248, size: 420 },
			title: { top: 70, fontSize: 24, spacing: 4 },
			count: { fontSize: 220 },
			spins: { fontSize: 22, spacing: 4 },
			cats: [
				{ key: 'symbolH2', x: 74, feet: 470, width: 120, float: 0 },
				{ key: 'symbolH1', x: 228, feet: 470, width: 104, float: 0.6 },
			],
			description: { gap: 16, bottom: 56, fontSize: 14, width: 252 },
		},
	};
	const CREAM = 0xffe9a3;
	const FADE_DURATION = 250;

	// It comes in a piece at a time (in seconds from showing): the name fades in, the number pops
	// out of the glow with sparkles, the description rises in. Then the cats float gently, out of
	// step, and the ball rolls slowly.
	const ENTRANCE = {
		title: { start: 0, length: 0.35 },
		count: { start: 0.15, length: 0.7 },
		cats: { start: 0.35, length: 0.4 },
		description: { start: 0.55, length: 0.35 },
	};
	const DESCRIPTION_RISE = 10;
	const FLOAT = { distance: 6, period: 3.2 };
	const BALL_TURN_PERIOD = 7;

	const context = getContext();
	const layout = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const look = $derived(layout.height > layout.width ? LOOKS.tall : LOOKS.wide);
	// the card's units to the screen's: as big as fits, centred
	const S = $derived(Math.min(layout.width / look.card.width, layout.height / look.card.height));
	const left = $derived((layout.width - look.card.width * S) / 2);
	const top = $derived((layout.height - look.card.height * S) / 2);
	const at = (x: number, y: number) => ({ x: left + x * S, y: top + y * S });

	const bonusType = $derived(context.stateGame.bonusType ?? 'normal');
	const title = $derived([BONUS_NAME[bonusType], 'FREE SPINS'].filter(Boolean).join(' '));
	const description = $derived(BONUS_DESCRIPTION[bonusType]);

	// cream text with a hard brown shadow under it
	const shadowed = (fontSize: number, spacing = 0) => ({
		fontFamily: 'Titan One',
		fontSize,
		fill: CREAM,
		letterSpacing: spacing,
		dropShadow: { color: 0x8a4414, alpha: 1, angle: Math.PI / 2, blur: 0, distance: fontSize * 0.07 },
	});
	// the name's letters are spaced wide: shrunk, spacing and all, so a long name still fits
	const titleSize = $derived.by(() => {
		const spacing = look.title.spacing / look.title.fontSize;
		const fitted = Math.min(
			look.title.fontSize * S,
			(look.card.width * S * 0.9) / (title.length * (0.67 + spacing)),
		);
		return { fontSize: fitted, spacing: fitted * spacing };
	});
	const styles = $derived({
		title: shadowed(titleSize.fontSize, titleSize.spacing),
		// the number in gold, light at the top to deep orange at the bottom
		count: {
			fontFamily: 'Titan One',
			fontSize: look.count.fontSize * S,
			fill: new FillGradient({
				type: 'linear',
				start: { x: 0, y: 0 },
				end: { x: 0, y: 1 },
				textureSpace: 'local',
				colorStops: [
					{ offset: 0, color: 0xfff2b3 },
					{ offset: 0.55, color: 0xffb627 },
					{ offset: 1, color: 0xf57b1a },
				],
			}),
			dropShadow: { color: 0x7a3a10, alpha: 1, angle: Math.PI / 2, blur: 0, distance: look.count.fontSize * S * 0.02 },
		},
		spins: look.spins && shadowed(look.spins.fontSize * S, look.spins.spacing * S),
		description: {
			fontFamily: 'Titan One',
			fontSize: look.description.fontSize * S,
			fill: 0xfff3dc,
			lineHeight: look.description.fontSize * S * 1.3,
			align: 'center' as const,
			wordWrap: true,
			wordWrapWidth: look.description.width * S,
			dropShadow: { color: 0x3c1e0a, alpha: 0.9, angle: Math.PI / 2, blur: 0, distance: look.description.fontSize * S * 0.1 },
		},
	});

	// measured heights, starting from estimates until the text has been drawn
	let titleHeight = $state(80);
	let countHeight = $state(500);
	// the number right under the name (its line is 0.85 of its size, as in the design), SPINS
	// tucked just under it
	const titleBottom = $derived(top + look.title.top * S + titleHeight);
	const countMiddle = $derived(titleBottom + (look.count.fontSize * S * 0.85) / 2);
	const spinsTop = $derived(countMiddle + countHeight * 0.4);
	// the description under the cats, shrunk if it would come too low
	let descriptionHeight = $state(0);
	const descriptionTop = $derived(
		top + (Math.max(...look.cats.map((cat) => cat.feet)) + look.description.gap) * S,
	);
	const descriptionRoom = $derived(top + (look.card.height - look.description.bottom) * S - descriptionTop);
	const descriptionScale = $derived(
		descriptionHeight > 0 ? Math.min(1, descriptionRoom / descriptionHeight) : 1,
	);

	let show = $state(false);
	let freeSpins = $state(0);
	let oncomplete = $state(() => {});

	// seconds since it was shown
	let time = $state(0);
	const entrance = $derived(_.mapValues(ENTRANCE, (step) => stage(time, step.start, step.length)));
	const floatY = (phase: number | undefined) =>
		phase === undefined
			? 0
			: -FLOAT.distance * S * (0.5 - 0.5 * Math.cos((2 * Math.PI * (time - phase)) / FLOAT.period));
	const catHeight = (cat: Cat) =>
		(cat.width * SYMBOL_IMAGES[cat.key].image[1]) / SYMBOL_IMAGES[cat.key].image[0];

	// darker at the top and much darker at the bottom, lightest a little above the middle
	const shade = new FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		textureSpace: 'local',
		colorStops: [
			{ offset: 0, color: 'rgba(25, 12, 5, 0.55)' },
			{ offset: 0.4, color: 'rgba(25, 12, 5, 0.35)' },
			{ offset: 1, color: 'rgba(25, 12, 5, 0.8)' },
		],
	});
	// a warm glow behind the number, gone by six tenths of the way out
	const glow = new FillGradient({
		type: 'radial',
		center: { x: 0.5, y: 0.5 },
		innerRadius: 0,
		outerCenter: { x: 0.5, y: 0.5 },
		outerRadius: 0.5,
		colorStops: [
			{ offset: 0, color: 'rgba(255, 214, 120, 0.35)' },
			{ offset: 0.6, color: 'rgba(255, 214, 120, 0)' },
			{ offset: 1, color: 'rgba(255, 214, 120, 0)' },
		],
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

<FadeContainer persistent {show} duration={FADE_DURATION}>
	<Graphics
		draw={(graphics) => {
			graphics.clear();
			graphics.rect(0, 0, canvas.width, canvas.height).fill(shade);
		}}
	/>

	<MainContainer standard>
		<Graphics
			{...at(look.glow.x, look.glow.y)}
			draw={(graphics) => {
				const radius = (look.glow.size * S) / 2;
				graphics.clear();
				graphics.circle(0, 0, radius).fill(glow);
			}}
		/>

		<Text
			anchor={{ x: 0.5, y: 0 }}
			x={layout.width / 2}
			y={top + look.title.top * S}
			alpha={entrance.title}
			text={title}
			style={styles.title}
			onresize={(sizes) => (titleHeight = sizes.height)}
		/>
		{#if show && entrance.count > 0}
			<Burst
				x={layout.width / 2}
				y={countMiddle}
				distance={look.count.fontSize * S * 0.9}
				size={look.count.fontSize * S * 0.05}
				count={18}
				duration={800}
			/>
		{/if}
		<!-- the number pops out about its middle -->
		<Container x={layout.width / 2} y={countMiddle} scale={popOut(entrance.count, 2.6)}>
			<Text
				anchor={0.5}
				text={`${freeSpins}`}
				style={styles.count}
				onresize={(sizes) => (countHeight = sizes.height)}
			/>
		</Container>
		{#if styles.spins}
			<Text
				anchor={{ x: 0.5, y: 0 }}
				x={layout.width / 2}
				y={spinsTop}
				alpha={entrance.count}
				text="SPINS"
				style={styles.spins}
			/>
		{/if}

		<!-- the cats in a row in front of the number, the ball by them -->
		{#each look.cats as cat (cat.key)}
			<Container
				x={at(cat.x, cat.feet).x}
				y={at(cat.x, cat.feet).y + floatY(cat.float)}
				scale={{ x: cat.mirror ? -1 : 1, y: 1 }}
			>
				<StandingArt
					key={cat.key}
					height={catHeight(cat) * S}
					pose={{ ...REST_POSE, scaleX: popOut(entrance.cats), scaleY: popOut(entrance.cats) }}
				/>
			</Container>
		{/each}
		{#if look.ball}
			<Sprite
				key="yarnBall"
				anchor={0.5}
				{...at(look.ball.x, look.ball.feet - look.ball.size / 2)}
				width={look.ball.size * S}
				height={look.ball.size * S}
				alpha={entrance.cats}
				rotation={(2 * Math.PI * time) / BALL_TURN_PERIOD}
			/>
		{/if}

		{#if description}
			<Container
				x={layout.width / 2}
				y={descriptionTop + DESCRIPTION_RISE * S * (1 - entrance.description)}
				scale={descriptionScale}
				alpha={entrance.description}
			>
				<Text
					anchor={{ x: 0.5, y: 0 }}
					text={description}
					style={styles.description}
					onresize={(sizes) => (descriptionHeight = sizes.height)}
				/>
			</Container>
		{/if}
	</MainContainer>

	{#if show}
		<PressToContinue onpress={() => oncomplete()} />
	{/if}
</FadeContainer>
