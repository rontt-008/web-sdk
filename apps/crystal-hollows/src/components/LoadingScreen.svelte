<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicInOut, cubicOut } from 'svelte/easing';
	import { Container, SpineProvider, SpineTrack } from 'pixi-svelte';
	import { FadeContainer, LoadingBar } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import config from '../game/config';
	import { LOGO_ART } from '../game/constants';
	import { LOGO_TEXT_COLORS, type LogoTextColors } from '../game/textStyles';
	import { loadingBarTheme } from '../game/uiTheme';
	import InfoCard, { INFO_CARD_ART } from './InfoCard.svelte';
	import InfoCardFeature, { type InfoCardPicture } from './InfoCardFeature.svelte';
	import PressToContinue from './PressToContinue.svelte';

	type Props = {
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// The start screen (as RuneFall's; the user, 2026-11-14: "when loading in this screen the logo goes
	// up and 3 cards pop on the screen and displays stuff like in runefall"): while the game loads, the
	// user's title (the logo, LOGO_ART, its letters floating; loaded first so it is here from the start)
	// big a little above the middle with a flat loading bar in the UI's colours under it; once loaded,
	// the title glides up to the top, smaller, and three info cards (InfoCard, the user's stone card:
	// the bat wilds, the max win, five scatters) rise into the middle one after another, side by
	// side, floating, between the title and "press anywhere to continue" at the bottom. A press fades it
	// all out and the game comes in.
	// the title: while loading, fill of the screen's width, at most `tall` of its height, its middle `y`
	// down it; at the top, `topFill` of its width (`portraitFill` on a screen taller than wide), at most
	// `topTall` of its height, `top` from the top
	const TITLE = {
		fill: 0.84,
		tall: 0.42,
		y: 0.4,
		topFill: 0.5,
		portraitFill: 0.84,
		topTall: 0.22,
		top: 14,
	};
	const BAR = { width: 420, height: 22, gap: 70 };
	// the room "press anywhere to continue" takes at the bottom (PressToContinue: its 40-unit words 60
	// above the bottom)
	const PRESS_ROOM = 120;
	// the cards, as big as fits: the gap between them in a card's width, the room kept under the title,
	// over the press text and at the sides, and how far each rises as it comes in. Side by side; on a
	// screen taller than wide, `portraitColumns` a row (two, then the last in the middle under them), so
	// they aren't tiny.
	const CARDS = { gap: 0.18, below: 14, above: 10, sides: 0.94, rise: 40, portraitColumns: 2 };
	// from loading to the start screen, in ms: the title moves over the first `title` of it, each card
	// comes in over `card` of it, starting at `first` and `next` after the one before
	const INTRO = { duration: 1600, title: 0.5, first: 0.35, next: 0.12, card: 0.4 };
	// the cards float: each bobs smoothly up and down this far (into the room kept round them), once
	// every `periods` seconds, each at its own pace and from its own point in its bob
	const FLOAT = { height: 4, periods: [6, 7.5, 6.7], phases: [0, 2.1, 4.2] };

	// what the cards show (InfoCardFeature): the bat wilds; the max win (2026-11-14, the user: "in the
	// middle advertise the 25k max win and the right one to advertise the 5 scatter"; config's max_win,
	// so it follows the math); five free spins symbols
	const MAX_WIN = `${config.betModes.base.max_win.toLocaleString('en-US')}X`;
	const FEATURES: {
		picture: InfoCardPicture;
		title: string;
		colors: LogoTextColors;
		caption: string[];
	}[] = [
		{
			picture: { sprite: 'symbolWild' },
			title: 'BAT WILDS',
			colors: LOGO_TEXT_COLORS.blue,
			caption: ['LANDING BATS GROW', 'INTO REEL-TALL WILDS'],
		},
		{
			picture: { word: MAX_WIN },
			title: 'MAX WIN',
			colors: LOGO_TEXT_COLORS.pink,
			caption: [`WIN UP TO ${MAX_WIN}`, 'YOUR BET'],
		},
		{
			picture: { sprite: 'symbolFreeSpins', count: 5 },
			title: '5 SCATTERS',
			colors: LOGO_TEXT_COLORS.blue,
			caption: ['LAND 5 FS SYMBOLS', 'FOR THE MYTHIC BONUS'],
		},
	];

	let leaving = $state(false);
	// seconds since the start screen came up, for the float
	let time = $state(0);
	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => (time += ticker.deltaMS / 1000);
		ticker.add(tick);
		return () => ticker.remove(tick);
	});
	const intro = new Tween(0, { duration: INTRO.duration });
	$effect(() => {
		if (context.stateApp.loaded) intro.set(1);
	});
	// how far into its part of the intro something is, 0 to 1
	const part = (start: number, length: number) =>
		Math.min(1, Math.max(0, (intro.current - start) / length));

	const main = $derived(context.stateLayoutDerived.mainLayout());
	const portrait = $derived(main.height > main.width);
	const ART_HEIGHT = LOGO_ART.above + LOGO_ART.below;
	// the title's scale and the middle of what shows of it, while loading and at the top
	const titleLoading = $derived.by(() => {
		const scale = Math.min(
			(main.width * TITLE.fill) / LOGO_ART.width,
			(main.height * TITLE.tall) / ART_HEIGHT,
		);
		return { scale, x: main.width / 2, y: main.height * TITLE.y };
	});
	const titleTop = $derived.by(() => {
		const scale = Math.min(
			(main.width * (portrait ? TITLE.portraitFill : TITLE.topFill)) / LOGO_ART.width,
			(main.height * TITLE.topTall) / ART_HEIGHT,
		);
		return { scale, x: main.width / 2, y: TITLE.top + (ART_HEIGHT * scale) / 2 };
	});
	const title = $derived.by(() => {
		const t = cubicInOut(part(0, INTRO.title));
		const between = (from: number, to: number) => from + (to - from) * t;
		const scale = between(titleLoading.scale, titleTop.scale);
		const middle = { x: between(titleLoading.x, titleTop.x), y: between(titleLoading.y, titleTop.y) };
		return {
			// the skeleton's origin, so that what shows of it is centred on the middle
			x: middle.x - LOGO_ART.shiftX * scale,
			y: middle.y - ((LOGO_ART.below - LOGO_ART.above) / 2) * scale,
			scale,
			bottom: middle.y + (ART_HEIGHT / 2) * scale,
		};
	});

	// the cards in rows between the title (at the top) and the press text, as big as fits
	const cards = $derived.by(() => {
		const top = titleTop.y + (ART_HEIGHT / 2) * titleTop.scale + CARDS.below;
		const bottom = main.height - PRESS_ROOM - CARDS.above;
		const count = FEATURES.length;
		const columns = portrait ? Math.min(count, CARDS.portraitColumns) : count;
		const rows = Math.ceil(count / columns);
		const rowWidth = columns + (columns - 1) * CARDS.gap;
		// (rows are a gap apart too, a gap of a card's width)
		const width = Math.min(
			(bottom - top) / (rows * INFO_CARD_ART.aspect + (rows - 1) * CARDS.gap),
			(main.width * CARDS.sides) / rowWidth,
		);
		const height = width * INFO_CARD_ART.aspect;
		const pitch = height + width * CARDS.gap;
		const middle = (top + bottom) / 2;
		return FEATURES.map((_, i) => {
			const row = Math.floor(i / columns);
			const inRow = Math.min(columns, count - row * columns);
			const column = i - row * columns;
			const t = cubicOut(part(INTRO.first + i * INTRO.next, INTRO.card));
			const period = FLOAT.periods[i % FLOAT.periods.length];
			const phase = FLOAT.phases[i % FLOAT.phases.length];
			const float = FLOAT.height * Math.sin((2 * Math.PI * time) / period + phase);
			const y = middle + (row - (rows - 1) / 2) * pitch;
			return {
				x: main.width / 2 + (column - (inRow - 1) / 2) * width * (1 + CARDS.gap),
				y: y + (1 - t) * CARDS.rise + float,
				width,
				alpha: t,
				scale: 0.92 + 0.08 * t,
			};
		});
	});
</script>

<!-- the title and the loading bar, then the info cards -->
<FadeContainer show={!leaving} oncomplete={() => leaving && props.onloaded()}>
	<MainContainer>
		{#if context.stateApp.loadedAssets?.logo}
			<Container x={title.x} y={title.y} scale={title.scale}>
				<SpineProvider key="logo">
					<SpineTrack trackIndex={0} animationName="idle" loop />
				</SpineProvider>
			</Container>
		{/if}
		{#if intro.current > 0}
			{#each cards as card, i}
				<InfoCard {...card}>
					{#snippet children(panel)}
						<InfoCardFeature {...panel} {...FEATURES[i]} />
					{/snippet}
				</InfoCard>
			{/each}
		{/if}
		<!-- (the bar is drawn round its middle) -->
		<FadeContainer show={!context.stateApp.loaded} x={main.width / 2} y={title.bottom + BAR.gap}>
			<LoadingBar width={BAR.width} height={BAR.height} theme={loadingBarTheme} />
		</FadeContainer>
	</MainContainer>
</FadeContainer>

<!-- press to continue -->
<FadeContainer show={!leaving && context.stateApp.loaded}>
	<PressToContinue onpress={() => (leaving = true)} />
</FadeContainer>
