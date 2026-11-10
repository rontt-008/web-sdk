<script lang="ts" module>
	import { stateGameDerived } from '../game/stateGame.svelte';

	// the card's height to its width
	export const WIN_CARD = { aspect: 1.12 };

	// the card as wide as fits, in the main layout's units: across the board, and on the screen
	export const winCardWidth = () => {
		const screen = stateGameDerived.screenBounds();
		return Math.min(
			stateGameDerived.boardLayout().width * 0.8,
			(screen.right - screen.left) * 0.86,
			((screen.bottom - screen.top) * 0.8) / WIN_CARD.aspect,
		);
	};
</script>

<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';
	import { ResponsiveText } from 'components-pixi';

	import { getContext } from '../game/context';
	import { PRINT_COLOURS, WIN_RANKS, drawChecker, drawPaper, printResolution, printStyle } from '../game/print';

	// A win printed on a card, the start screen cards' kind (cream paper, ink, red; print.ts), with a band
	// of chessboard squares along its top and foot. From the top: a piece, a small line in red, the big
	// line in ink with a short rule under it, the figure big in red, and at the foot either the pieces'
	// ranks in a row (`rank`: those reached in ink, the rest faint) or a line of small print.
	// - the big wins (Win): the piece and the big line are the win's rank, climbing as it counts up
	// - the bonus's start and end (FreeSpinIntro, FreeSpinOutro): the bonus's piece, its free spins or
	//   what it won
	type Props = {
		// its middle, and its width (its height follows)
		x: number;
		y: number;
		width: number;
		piece: string;
		heading: string;
		title: string;
		figure: string;
		// the rank reached (WIN_RANKS' index): the row of pieces at its foot
		rank?: number;
		caption?: string;
	};

	const props: Props = $props();
	const context = getContext();

	const w = $derived(props.width);
	const h = $derived(props.width * WIN_CARD.aspect);
	const resolution = $derived(printResolution(context.stateLayoutDerived.mainLayout().scale));

	// places in the card's height, sizes in its width
	const BAND = { cols: 24, rows: 2 };
	const LAYOUT = {
		piece: { y: 0.255, size: 0.29 },
		heading: { y: 0.435, size: 0.04 },
		title: { y: 0.52, size: 0.105 },
		rule: { y: 0.593, width: 0.123, height: 0.0066 },
		figure: { y: 0.705, size: 0.15 },
		foot: { y: 0.845, size: 0.04, piece: 0.085, gap: 0.118 },
	};

	// it comes in with a little bounce; the piece and the big line bounce again as the rank climbs
	const enter = new Tween(0);
	enter.set(1, { duration: 420, easing: backOut });
	const climb = new Tween(1);
	let lastPiece = props.piece;
	$effect(() => {
		if (props.piece === lastPiece) return;
		lastPiece = props.piece;
		climb.set(1.3, { duration: 0 });
		climb.set(1, { duration: 480, easing: backOut });
	});

	const draw = (graphics: PIXI.Graphics) => {
		const border = Math.max(1.5, w * 0.0066);
		drawPaper(graphics, { width: w, height: h, offset: w * 0.022, border });
		// the bands of squares, inside the border
		const cell = (w - border * 2) / BAND.cols;
		drawChecker(graphics, { x: border, y: border, cols: BAND.cols, rows: BAND.rows, cell });
		drawChecker(graphics, {
			x: border,
			y: h - border - cell * BAND.rows,
			cols: BAND.cols,
			rows: BAND.rows,
			cell,
			dark: false,
		});
		// and a hairline closing each
		for (const y of [border + cell * BAND.rows, h - border - cell * BAND.rows]) {
			graphics.rect(border, y - border / 2, w - border * 2, border).fill(PRINT_COLOURS.ink);
		}
		const rule = LAYOUT.rule;
		graphics
			.rect(w / 2 - (w * rule.width) / 2, h * rule.y, w * rule.width, Math.max(1.5, w * rule.height))
			.fill(PRINT_COLOURS.red);
	};
</script>

<Container x={props.x} y={props.y} scale={0.8 + 0.2 * enter.current} alpha={Math.min(1, enter.current * 1.6)}>
	<Container x={-w / 2} y={-h / 2}>
		<Graphics {draw} />
		<Sprite
			key={props.piece}
			anchor={0.5}
			x={w / 2}
			y={h * LAYOUT.piece.y}
			width={w * LAYOUT.piece.size * climb.current}
			height={w * LAYOUT.piece.size * climb.current}
		/>
		<ResponsiveText
			anchor={0.5}
			x={w / 2}
			y={h * LAYOUT.heading.y}
			text={props.heading}
			maxWidth={w * 0.86}
			{resolution}
			style={printStyle(w * LAYOUT.heading.size, PRINT_COLOURS.red, { bold: true, spacing: 0.4 })}
		/>
		<Container x={w / 2} y={h * LAYOUT.title.y} scale={climb.current}>
			<ResponsiveText
				anchor={0.5}
				text={props.title}
				maxWidth={w * 0.86}
				{resolution}
				style={printStyle(w * LAYOUT.title.size, PRINT_COLOURS.ink, { bold: true, spacing: 0.04 })}
			/>
		</Container>
		<ResponsiveText
			anchor={0.5}
			x={w / 2}
			y={h * LAYOUT.figure.y}
			text={props.figure}
			maxWidth={w * 0.86}
			{resolution}
			style={printStyle(w * LAYOUT.figure.size, PRINT_COLOURS.red, { bold: true })}
		/>
		{#if props.rank !== undefined}
			<!-- the pieces' ranks: those the win has reached in ink, the rest faint -->
			{#each WIN_RANKS as rank, index}
				{@const reached = index <= props.rank}
				<Sprite
					key={rank.piece}
					anchor={0.5}
					x={w / 2 + (index - (WIN_RANKS.length - 1) / 2) * w * LAYOUT.foot.gap}
					y={h * LAYOUT.foot.y}
					width={w * LAYOUT.foot.piece * (index === props.rank ? 1.2 : 1)}
					height={w * LAYOUT.foot.piece * (index === props.rank ? 1.2 : 1)}
					alpha={reached ? 1 : 0.16}
				/>
			{/each}
		{:else if props.caption}
			<ResponsiveText
				anchor={0.5}
				x={w / 2}
				y={h * LAYOUT.foot.y}
				text={props.caption}
				maxWidth={w * 0.86}
				{resolution}
				style={printStyle(w * LAYOUT.foot.size, PRINT_COLOURS.caption, { spacing: 0.06 })}
			/>
		{/if}
	</Container>
</Container>
