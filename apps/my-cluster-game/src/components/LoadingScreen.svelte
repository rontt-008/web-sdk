<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicInOut, cubicOut } from 'svelte/easing';
	import { Rectangle } from 'pixi-svelte';
	import { FadeContainer, LoadingProgress } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { LOGO_ART } from '../game/stateGame.svelte';
	import LogoArt from './LogoArt.svelte';
	import InfoCard, { INFO_CARD_ART } from './InfoCard.svelte';
	import InfoCardRunes from './InfoCardRunes.svelte';
	import InfoCardMaxWin from './InfoCardMaxWin.svelte';
	import PressToContinue, { PRESS_TEXT } from './PressToContinue.svelte';

	type Props = {
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// The start screen: while the game loads, its logo a little above the middle with the loading
	// progress under it; once loaded, the logo glides up to the top, a little smaller, and three info
	// cards (InfoCard: the rune powers, the max win, the third empty for now) rise into the middle one
	// after another, side by side and spaced out, between the logo and "press anywhere to continue" at
	// the bottom. A press fades it all out and the game comes in.
	const LOGO = { width: 560, middle: 0.45, topWidth: 420, top: 12 };
	// a flat bar in the UI bar's colours (uiTheme): charcoal with a near-black outline, filling cream
	const BAR = { width: 360, height: 22, below: 40, outline: 3, inset: 5 };
	const COLOURS = { track: 0x232227, outline: 0x0a0a0c, fill: 0xf1ece1 };
	// the cards, as big as fits: how many, the gap between them in a card's width, the room kept under
	// the logo, over the press text (at the bottom, PRESS_TEXT) and at the sides, and how far each
	// rises as it comes in
	const CARDS = { count: 3, gap: 0.2, below: 10, above: 8, sides: 0.94, rise: 40 };
	// from loading to the start screen, in ms: the logo moves over the first `logo` of it, each card
	// comes in over `card` of it, starting at `first` and `next` after the one before
	const INTRO = { duration: 1600, logo: 0.5, first: 0.35, next: 0.12, card: 0.4 };
	// the cards float: each bobs smoothly up and down this far (into the room kept round them), once
	// every `periods` seconds, each at its own pace and from its own point in its bob
	const FLOAT = { height: 4, periods: [6, 7.5, 6.7], phases: [0, 2.1, 4.2] };

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
	const logoAt = (width: number, middle: number) => {
		const height = (width * LOGO_ART.height) / LOGO_ART.width;
		return { x: (main.width - width) / 2, y: middle - height / 2, width, height };
	};
	// where it is while loading and on the start screen, and between them
	const logoLoading = $derived(
		logoAt(Math.min(LOGO.width, main.width * 0.85), main.height * LOGO.middle),
	);
	const logoTop = $derived.by(() => {
		const width = Math.min(LOGO.topWidth, main.width * 0.85);
		return logoAt(width, LOGO.top + (width * LOGO_ART.height) / LOGO_ART.width / 2);
	});
	const logo = $derived.by(() => {
		const t = cubicInOut(part(0, INTRO.logo));
		const between = (from: number, to: number) => from + (to - from) * t;
		return {
			x: between(logoLoading.x, logoTop.x),
			y: between(logoLoading.y, logoTop.y),
			width: between(logoLoading.width, logoTop.width),
			height: between(logoLoading.height, logoTop.height),
		};
	});

	// the cards side by side between the logo (at the top) and the press text, as big as fits
	const cards = $derived.by(() => {
		const top = logoTop.y + logoTop.height + CARDS.below;
		const bottom = main.height - PRESS_TEXT.room - CARDS.above;
		const aspect = INFO_CARD_ART.width / INFO_CARD_ART.height;
		const rowWidth = CARDS.count + (CARDS.count - 1) * CARDS.gap;
		const width = Math.min((bottom - top) * aspect, (main.width * CARDS.sides) / rowWidth);
		const y = (top + bottom) / 2;
		return Array.from({ length: CARDS.count }, (_, i) => {
			const t = cubicOut(part(INTRO.first + i * INTRO.next, INTRO.card));
			const period = FLOAT.periods[i % FLOAT.periods.length];
			const phase = FLOAT.phases[i % FLOAT.phases.length];
			const float = FLOAT.height * Math.sin((2 * Math.PI * time) / period + phase);
			return {
				x: main.width / 2 + (i - (CARDS.count - 1) / 2) * width * (1 + CARDS.gap),
				y: y + (1 - t) * CARDS.rise + float,
				width,
				alpha: t,
				scale: 0.92 + 0.08 * t,
			};
		});
	});
</script>

<!-- logo and loading progress, then the info cards -->
<FadeContainer show={!leaving} oncomplete={() => leaving && props.onloaded()}>
	<MainContainer>
		<LogoArt x={logo.x} y={logo.y} width={logo.width} />
		{#if intro.current > 0}
			{#each cards as card, i}
				<InfoCard {...card}>
					{#snippet children(slate)}
						{#if i === 0}
							<InfoCardRunes {...slate} />
						{:else if i === 1}
							<InfoCardMaxWin {...slate} />
						{/if}
					{/snippet}
				</InfoCard>
			{/each}
		{/if}
		{#if !context.stateApp.loaded}
			<LoadingProgress
				x={main.width / 2}
				y={logo.y + logo.height + BAR.below}
				width={BAR.width}
				height={BAR.height}
			>
				{#snippet background(sizes)}
					<Rectangle {...sizes} borderRadius={sizes.height / 2} backgroundColor={COLOURS.track} />
				{/snippet}
				{#snippet progress(sizes)}
					<Rectangle
						x={BAR.inset}
						y={BAR.inset}
						width={sizes.width - BAR.inset * 2}
						height={sizes.height - BAR.inset * 2}
						borderRadius={(sizes.height - BAR.inset * 2) / 2}
						backgroundColor={COLOURS.fill}
					/>
				{/snippet}
				{#snippet frame(sizes)}
					<Rectangle
						{...sizes}
						borderRadius={sizes.height / 2}
						backgroundAlpha={0}
						borderColor={COLOURS.outline}
						borderWidth={BAR.outline}
					/>
				{/snippet}
			</LoadingProgress>
		{/if}
	</MainContainer>
</FadeContainer>

<!-- press to continue -->
<FadeContainer show={!leaving && context.stateApp.loaded}>
	<PressToContinue onpress={() => (leaving = true)} />
</FadeContainer>
