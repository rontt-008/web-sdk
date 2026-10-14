<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Container, Graphics, Text, getContextApp } from 'pixi-svelte';

	import { LOADING_BAR_THEME_CLEAN, type LoadingBarTheme } from '../loadingBarTheme';

	type Props = {
		// centre of the bar
		x?: number;
		y?: number;
		// size of the track inside the outline and rim
		width: number;
		height: number;
		theme?: LoadingBarTheme;
		// 0 to 100; defaults to the app's asset loading progress
		progress?: number;
	};

	const props: Props = $props();
	const context = getContextApp();

	const theme = $derived(props.theme ?? LOADING_BAR_THEME_CLEAN);
	const progress = $derived(props.progress ?? context.stateApp.loadingProgress);

	// assets finish loading in steps, so the fill eases towards each new value instead of jumping
	const shown = new Tween(0, { duration: 350, easing: cubicOut });
	$effect(() => {
		shown.target = Math.min(100, Math.max(0, progress));
	});

	type Box = { x: number; y: number; w: number; h: number };
	const pill = (g: PIXI.Graphics, { x, y, w, h }: Box) => g.roundRect(x, y, w, h, Math.min(w, h) / 2);
	const inset = ({ x, y, w, h }: Box, by: number): Box => ({ x: x + by, y: y + by, w: w - by * 2, h: h - by * 2 });

	const border = $derived(theme.outlineWidth + theme.rimWidth);
	const track = $derived<Box>({ x: -props.width / 2, y: -props.height / 2, w: props.width, h: props.height });

	// the fill sits inside the track with a small gap, and grows from a circle at the left end
	const fillBox = $derived.by<Box>(() => {
		const inner = inset(track, props.height * 0.14);
		return { ...inner, w: inner.h + (inner.w - inner.h) * (shown.current / 100) };
	});

	const drawFrame = (g: PIXI.Graphics) => {
		const outer = inset(track, -border);
		if (theme.shadowAlpha > 0) pill(g, { ...outer, y: outer.y + props.height * 0.18 }).fill({ color: 0x000000, alpha: theme.shadowAlpha });
		// outline and rim are rings, so a see-through track doesn't show them through it
		if (theme.outlineWidth > 0) {
			pill(g, outer).fill(theme.outline);
			pill(g, inset(outer, theme.outlineWidth)).cut();
		}
		if (theme.rimWidth > 0) {
			pill(g, inset(outer, theme.outlineWidth)).fill(theme.rim);
			pill(g, track).cut();
		}
		if (theme.trackAlpha < 1) {
			pill(g, track).fill({ color: theme.track, alpha: theme.trackAlpha });
			return;
		}
		// darker along the top, so the track looks sunk into the frame
		const drop = props.height * 0.16;
		pill(g, track).fill(theme.track);
		pill(g, track).fill({ color: 0x000000, alpha: 0.3 });
		pill(g, { x: track.x + 1, y: track.y + drop, w: track.w - 2, h: track.h - drop }).fill(theme.track);
	};

	const drawFill = (g: PIXI.Graphics) => {
		pill(g, fillBox).fill(theme.fillShade);
		pill(g, { ...fillBox, h: fillBox.h * 0.78 }).fill(theme.fill);
		const inset = fillBox.h * 0.3;
		if (theme.shineAlpha > 0 && fillBox.w > inset * 2) {
			const shine = { x: fillBox.x + inset, y: fillBox.y + fillBox.h * 0.14, w: fillBox.w - inset * 2, h: fillBox.h * 0.2 };
			pill(g, shine).fill({ color: theme.shine, alpha: theme.shineAlpha });
		}
	};

	// drawn around 0,0, sized from the whole bar's height; a paw points its toes along +x, the way
	// the bar fills, and pokes out a little above and below the bar
	const drawMarker = (g: PIXI.Graphics) => {
		const barHeight = props.height + border * 2;
		const line = Math.max(2, barHeight * 0.07);
		const layers = [
			[theme.markerOutline, line],
			[theme.markerFill, 0],
		] as const;
		if (theme.marker === 'dot') {
			for (const [color, grow] of layers) g.circle(0, 0, barHeight * 0.36 + grow).fill(color);
			return;
		}
		const s = barHeight * 1.2;
		// toes fanned around the pad, as [x, y] in units of s
		const toes = [
			[0.06, -0.344],
			[0.234, -0.135],
			[0.234, 0.135],
			[0.06, 0.344],
		];
		for (const [color, grow] of layers) {
			g.ellipse(-s * 0.1, 0, s * 0.21 + grow, s * 0.25 + grow).fill(color);
			for (const [x, y] of toes) g.circle(x * s, y * s, s * 0.12 + grow).fill(color);
		}
	};

	const percentStyle = $derived(
		theme.percent && {
			fontFamily: theme.percent.fontFamily,
			fontSize: theme.percent.fontSize,
			fill: theme.percent.fill,
			stroke: { color: theme.percent.stroke, width: theme.percent.strokeWidth, join: 'round' as const },
		},
	);
</script>

<Container x={props.x} y={props.y}>
	<Graphics draw={drawFrame} />
	<Graphics draw={drawFill} />
	{#if theme.marker !== 'none'}
		<Graphics x={fillBox.x + fillBox.w - fillBox.h / 2} draw={drawMarker} />
	{/if}
	{#if percentStyle}
		<Text
			anchor={{ x: 0.5, y: 0 }}
			y={props.height / 2 + border + props.height * 0.35}
			text={`${Math.round(shown.current)}%`}
			style={percentStyle}
		/>
	{/if}
</Container>
