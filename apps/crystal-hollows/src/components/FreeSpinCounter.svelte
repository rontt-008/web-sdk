<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { stateUi } from 'state-shared';
	import { Sprite } from 'pixi-svelte';

	import LogoText from './LogoText.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { LOGO_TEXT_COLORS } from '../game/textStyles';

	// FREE SPINS over "n OF m" on the user's sign (2026-11-13: "make this the free spins sign and also
	// change the font to the same as the multiplier"): their stone frame with moss round a dark blue panel
	// (art-source/stone-frames.py), the words in the logo's lettering (LogoText, as the tall WILD's
	// multiplier) inside the panel. Left of the board: on wide screens under the logo, centred under it, as
	// wide as it at most; on phones held sideways by the board's top (Game.svelte mounts it there). It was a
	// flat charcoal panel with the UI's font till then.

	// the sign's picture: its height over its width, and its panel inside it (fractions of it), as
	// stone-frames.py prints them
	const SIGN = {
		aspect: 0.6548,
		inner: { x: 0.086, y: 0.1942, width: 0.8106, height: 0.6499 },
		// its width: on wide screens, at most maxWidth and the logo's width; on phones, phoneWidth
		maxWidth: SYMBOL_SIZE * 2.6,
		phoneWidth: SYMBOL_SIZE * 2.1,
	};
	// the words in the panel: their middles this far down it (of its height), their font sizes (of its
	// height; shrunk to fit fill of its width)
	const WORDS = {
		label: { y: 0.3, fontSize: 0.36 },
		count: { y: 0.71, fontSize: 0.46 },
		fill: 0.9,
	};
	const GAP = SYMBOL_SIZE * 0.4;
	// where the logo is shown left of the board (wide screens), it goes below it, centred under it, this
	// far down from the logo's bottom (2026-11-13, the user: "move free spins sign down")
	const UNDER_LOGO = SYMBOL_SIZE * 0.25;

	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
	const logo = $derived(context.stateGameDerived.logoLayout());
	const width = $derived(logo.shown ? Math.min(SIGN.maxWidth, logo.width) : SIGN.phoneWidth);
	const height = $derived(width * SIGN.aspect);
	const position = $derived(
		logo.shown
			? { x: logo.middle - width / 2, y: logo.bottom + UNDER_LOGO }
			: {
					// (the board is drawn at its scale)
					x: board.x - board.width * 0.5 * board.scale - GAP - width,
					y: board.y - board.height * 0.5 * board.scale,
				},
	);
	const inner = $derived({
		x: width * SIGN.inner.x,
		y: height * SIGN.inner.y,
		width: width * SIGN.inner.width,
		height: height * SIGN.inner.height,
	});

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);

	// the phones' bars (LayoutPortraitBar, LayoutLandscapeBar) show the count too, in the bet's place,
	// from stateUi
	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => {
			show = true;
			stateUi.freeSpinCounterShow = true;
		},
		freeSpinCounterHide: () => {
			show = false;
			stateUi.freeSpinCounterShow = false;
		},
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
			stateUi.freeSpinCounterCurrent = current;
			stateUi.freeSpinCounterTotal = total;
			stateUi.freeSpinCounterLabel = 'FREE SPINS';
		},
	});
</script>

<MainContainer>
	<FadeContainer {show} {...position}>
		<Sprite key="freeSpinsSign" {width} {height} />
		<LogoText
			text="FREE SPINS"
			x={inner.x + inner.width / 2}
			y={inner.y + inner.height * WORDS.label.y}
			fontSize={inner.height * WORDS.label.fontSize}
			maxWidth={inner.width * WORDS.fill}
			colors={LOGO_TEXT_COLORS.blue}
			look="logo"
		/>
		<LogoText
			text={`${current} OF ${total}`}
			x={inner.x + inner.width / 2}
			y={inner.y + inner.height * WORDS.count.y}
			fontSize={inner.height * WORDS.count.fontSize}
			maxWidth={inner.width * WORDS.fill}
			colors={LOGO_TEXT_COLORS.pink}
			look="logo"
		/>
	</FadeContainer>
</MainContainer>
