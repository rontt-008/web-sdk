<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import type { TextStyleOptions } from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { cubicInOut, cubicOut } from 'svelte/easing';
	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { FadeContainer, LoadingProgress, ResponsiveText } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import config from '../game/config';
	import { getContext } from '../game/context';
	import { TITLE_FONT, titleTextStyle, spacingShift } from '../game/titleText';
	import InfoCard, { INFO_CARD, CARD_COLOURS } from './InfoCard.svelte';
	import PressToContinue from './PressToContinue.svelte';

	type Props = {
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// The start screen (as the cluster game's): while the game loads, the title CHESS a little above
	// the middle with a plain loading bar under it; once loaded, the title glides up to the top, a little
	// smaller, and three cards (InfoCard) rise into the middle one after another: the PLAYGROUND (the
	// practice game against the engine, between spins), the MAX WIN, and the SUPER BONUS with its golden
	// king. "Press anywhere to continue" at the bottom; a press fades it all out and the game comes in
	// (no transition animation: that's for the bonus, Transition).
	let leaving = $state(false);

	// the title's size while loading and at the top (its font size; at the top it's scaled down)
	const TITLE = { size: 120, middle: 0.42, topSize: 78, top: 14 };
	// the title's letters are plain (titleText), the cards' in the same serif
	// a flat bar in the UI bar's colours (uiTheme): charcoal with a near-black outline, filling gold
	const BAR = { width: 360, height: 22, below: 0.75, outline: 3, inset: 5 };
	const BAR_COLOURS = { track: 0x232227, outline: 0x0a0a0c, fill: 0xf2c94c };
	// the cards, as big as fits: how many, the gap between them in a card's width, the room kept under
	// the title, over "press anywhere" (PressToContinue) and at the sides, and how
	// far each rises as it comes in
	const CARDS = { count: 3, gap: 0.12, below: 14, above: 108, sides: 0.94, rise: 40 };
	// from loading to the start screen, in ms: the title moves over the first `title` of it, each card
	// comes in over `card` of it, starting at `first` and `next` after the one before
	const INTRO = { duration: 1600, title: 0.5, first: 0.35, next: 0.12, card: 0.4 };
	// the cards float: each bobs gently up and down, at its own pace and from its own point in its bob
	const FLOAT = { height: 4, periods: [6, 7.5, 6.7], phases: [0, 2.1, 4.2] };

	// seconds since the screen came up, for the float
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
	const part = (start: number, length: number) => Math.min(1, Math.max(0, (intro.current - start) / length));

	const main = $derived(context.stateLayoutDerived.mainLayout());

	// the title: its font size (fitting the screen) while loading, and its middle and scale then and at
	// the top; between them as the intro goes
	const titleSize = $derived(Math.min(TITLE.size, main.width * 0.13));
	const titleTopScale = $derived(Math.min(TITLE.topSize, main.width * 0.1) / titleSize);
	const titleTopY = $derived(TITLE.top + titleSize * titleTopScale * 0.6);
	const title = $derived.by(() => {
		const t = cubicInOut(part(0, INTRO.title));
		return {
			y: main.height * TITLE.middle + (titleTopY - main.height * TITLE.middle) * t,
			scale: 1 + (titleTopScale - 1) * t,
		};
	});

	// the cards side by side between the title (at the top) and the press text, as big as fits
	const cards = $derived.by(() => {
		const top = titleTopY + titleSize * titleTopScale * 0.6 + CARDS.below;
		const bottom = main.height - CARDS.above;
		const rowWidth = CARDS.count + (CARDS.count - 1) * CARDS.gap;
		const width = Math.min((bottom - top) / INFO_CARD.aspect, (main.width * CARDS.sides) / rowWidth);
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

	// The cards' contents, printed flat: a small numeral at the top (I, II, III), a picture, the name big
	// with a short rule under it, and a line or two of small print. Places are in the card's height
	// (`h`), sizes in its width (`w`).
	const NUMERALS = ['I', 'II', 'III'];
	const LAYOUT = {
		numeral: { y: 0.068, size: 0.04 },
		name: { y: 0.559, size: 0.1 },
		rule: { y: 0.636, width: 0.123, height: 0.0066 },
		caption: { y: 0.712, gap: 0.057, size: 0.052 },
	};
	const CAPTIONS = [
		['A free practice game', 'between your spins'],
		['The biggest prize on the board'],
		['Sticky spots that grow every spin'],
	];
	const NAMES = ['PLAYGROUND', 'MAX WIN', 'SUPER BONUS'];
	// PLAYGROUND: a corner of the board, the black knight with the square it can jump to marked, and the
	// king in check (its square red), as the practice game's board
	const PLAYGROUND = {
		board: { cols: 4, rows: 3, cell: 0.163, top: 0.127 },
		knight: [0, 2],
		target: [1, 0],
		king: [2, 1],
	};
	// MAX WIN: "up to", the max win in bets big in red (config, so it follows the math), "your bet"
	const MAX_WIN = `${config.betModes.base.max_win.toLocaleString('en-US')}×`;
	const MAX_WIN_LINES = [
		{ text: 'UP TO', y: 0.198, size: 0.045, big: false },
		{ text: MAX_WIN, y: 0.297, size: 0.22, big: true },
		{ text: 'YOUR BET', y: 0.406, size: 0.045, big: false },
	];
	// SUPER BONUS: the golden king
	const SUPER_KING = { y: 0.3, size: 0.4 };

	// the lettering: a serif, flat (no outline), in the card's colours
	const printStyle = (
		size: number,
		fill: number,
		options: { bold?: boolean; spacing?: number } = {},
	): TextStyleOptions => ({
		fontFamily: TITLE_FONT,
		fontSize: size,
		fontWeight: options.bold ? 'bold' : 'normal',
		letterSpacing: size * (options.spacing ?? 0),
		fill,
	});

	const drawMiniBoard = (w: number) => (graphics: PIXI.Graphics) => {
		const { cols, rows, cell } = PLAYGROUND.board;
		const c = w * cell;
		for (let col = 0; col < cols; col++) {
			for (let row = 0; row < rows; row++) {
				graphics
					.rect(col * c, row * c, c, c)
					.fill((col + row) % 2 === 0 ? CARD_COLOURS.paper : CARD_COLOURS.ink);
			}
		}
		const [kc, kr] = PLAYGROUND.king;
		graphics.rect(kc * c, kr * c, c, c).fill(CARD_COLOURS.red);
		const [tc, tr] = PLAYGROUND.target;
		graphics.circle((tc + 0.5) * c, (tr + 0.5) * c, c * 0.09).fill(CARD_COLOURS.red);
		graphics
			.rect(0, 0, cols * c, rows * c)
			.stroke({ color: CARD_COLOURS.ink, width: Math.max(1.5, w * 0.0066), alignment: 1 });
	};
	const drawRule = (w: number, colour: number) => (graphics: PIXI.Graphics) => {
		const { width, height } = LAYOUT.rule;
		graphics.rect((-w * width) / 2, (-w * height) / 2, w * width, Math.max(1.5, w * height)).fill(colour);
	};
</script>

<!-- the title and the loading bar, then the cards -->
<FadeContainer show={!leaving} oncomplete={() => leaving && props.onloaded()}>
	<MainContainer>
		<Text
			text="CHESS"
			anchor={0.5}
			x={main.width / 2 + spacingShift(titleSize, undefined, title.scale)}
			y={title.y}
			scale={title.scale}
			style={titleTextStyle(titleSize)}
		/>

		{#if !context.stateApp.loaded}
			<LoadingProgress
				x={main.width / 2}
				y={title.y + titleSize * BAR.below}
				width={Math.min(BAR.width, main.width * 0.7)}
				height={BAR.height}
			>
				{#snippet background(sizes)}
					<Rectangle {...sizes} borderRadius={sizes.height / 2} backgroundColor={BAR_COLOURS.track} />
				{/snippet}
				{#snippet progress(sizes)}
					<Rectangle
						x={BAR.inset}
						y={BAR.inset}
						width={sizes.width - BAR.inset * 2}
						height={sizes.height - BAR.inset * 2}
						borderRadius={(sizes.height - BAR.inset * 2) / 2}
						backgroundColor={BAR_COLOURS.fill}
					/>
				{/snippet}
				{#snippet frame(sizes)}
					<Rectangle
						{...sizes}
						borderRadius={sizes.height / 2}
						backgroundAlpha={0}
						borderColor={BAR_COLOURS.outline}
						borderWidth={BAR.outline}
					/>
				{/snippet}
			</LoadingProgress>
		{/if}

		{#if intro.current > 0}
			{#each cards as card, i}
				{@const accent = CARD_COLOURS.red}
				<InfoCard {...card}>
					{#snippet children({ width: w, height: h })}
						<!-- the numeral, the name, its rule and the small print, on every card -->
						<Text
							anchor={0.5}
							x={w / 2}
							y={h * LAYOUT.numeral.y}
							text={NUMERALS[i]}
							style={printStyle(w * LAYOUT.numeral.size, accent, { spacing: 0.5 })}
						/>
						<ResponsiveText
							x={w / 2}
							y={h * LAYOUT.name.y}
							anchor={0.5}
							text={NAMES[i]}
							maxWidth={w * 0.86}
							style={printStyle(w * LAYOUT.name.size, CARD_COLOURS.ink, {
								bold: true,
								spacing: 0.04,
							})}
						/>
						<Container x={w / 2} y={h * LAYOUT.rule.y}>
							<Graphics draw={drawRule(w, accent)} />
						</Container>
						{#each CAPTIONS[i] as line, l}
							<ResponsiveText
								x={w / 2}
								y={h * (LAYOUT.caption.y + l * LAYOUT.caption.gap)}
								anchor={0.5}
								text={line}
								maxWidth={w * 0.88}
								style={printStyle(w * LAYOUT.caption.size, CARD_COLOURS.caption)}
							/>
						{/each}

						<!-- and each card's own picture -->
						{#if i === 0}
							{@const c = w * PLAYGROUND.board.cell}
							<Container x={(w - c * PLAYGROUND.board.cols) / 2} y={h * PLAYGROUND.board.top}>
								<Graphics draw={drawMiniBoard(w)} />
								<Sprite
									key="bN"
									anchor={0.5}
									x={(PLAYGROUND.knight[0] + 0.5) * c}
									y={(PLAYGROUND.knight[1] + 0.5) * c}
									width={c * 0.72}
									height={c * 0.72}
								/>
								<Sprite
									key="wK"
									anchor={0.5}
									x={(PLAYGROUND.king[0] + 0.5) * c}
									y={(PLAYGROUND.king[1] + 0.5) * c}
									width={c * 0.72}
									height={c * 0.72}
								/>
							</Container>
						{:else if i === 1}
							{#each MAX_WIN_LINES as line}
								<ResponsiveText
									x={w / 2}
									y={h * line.y}
									anchor={0.5}
									text={line.text}
									maxWidth={w * 0.86}
									style={line.big
										? printStyle(w * line.size, CARD_COLOURS.red, { bold: true })
										: printStyle(w * line.size, CARD_COLOURS.ink, { spacing: 0.3 })}
								/>
							{/each}
						{:else}
							<Sprite
								key="gK"
								anchor={0.5}
								x={w / 2}
								y={h * SUPER_KING.y}
								width={w * SUPER_KING.size}
								height={w * SUPER_KING.size}
							/>
						{/if}
					{/snippet}
				</InfoCard>
			{/each}
		{/if}
	</MainContainer>
</FadeContainer>

<!-- press to continue, once the cards are in -->
<FadeContainer show={!leaving && context.stateApp.loaded && intro.current >= 1}>
	<PressToContinue onpress={() => (leaving = true)} />
</FadeContainer>
