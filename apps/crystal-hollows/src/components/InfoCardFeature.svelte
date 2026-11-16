<script lang="ts" module>
	import type { LogoTextColors } from '../game/textStyles';

	// what a card shows big at the top: a symbol's still (its asset key), a row of `count` of them
	// (overlapping a little, in a gentle arch), or a word in the logo's lettering
	export type InfoCardPicture =
		| { sprite: string }
		| { sprite: string; count: number }
		| { word: string; colors?: LogoTextColors };
</script>

<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';

	import LogoText from './LogoText.svelte';
	import { gameTextStyle, LOGO_TEXT_COLORS } from '../game/textStyles';

	type Props = {
		// the card's panel (InfoCard)
		width: number;
		height: number;
		picture: InfoCardPicture;
		// the feature's name under it, in the logo's lettering, in `colors`
		title: string;
		colors: LogoTextColors;
		// and under that, in small, what it does
		caption: string[];
	};

	const props: Props = $props();

	// A start screen card's one feature (LoadingScreen): its picture big at the top, its name in the
	// logo's lettering under it and what it does in small at the bottom, as RuneFall's cards are. Places
	// are in the panel's height (`h`), sizes in its width (`w`). A row of symbols: each `rowSize`, `rowStep`
	// apart, the middle ones `arch` higher.
	const PICTURE = { y: 0.29, size: 0.74, word: 0.42, rowSize: 0.34, rowStep: 0.19, arch: 0.07 };
	const TITLE = { y: 0.63, size: 0.2 };
	const CAPTION = { y: 0.84, size: 0.072 };

	const w = $derived(props.width);
	const h = $derived(props.height);
	const size = $derived(w * PICTURE.size);
	// the row's symbols, back to front (the middle one in front)
	const row = $derived.by(() => {
		if (!('count' in props.picture)) return [];
		const n = props.picture.count;
		const middle = (n - 1) / 2;
		return Array.from({ length: n }, (_, i) => i)
			.sort((a, b) => Math.abs(b - middle) - Math.abs(a - middle))
			.map((i) => {
				const off = middle ? (i - middle) / middle : 0;
				return { x: w / 2 + (i - middle) * w * PICTURE.rowStep, y: h * PICTURE.y + w * PICTURE.arch * off * off };
			});
	});
</script>

{#if 'word' in props.picture}
	<LogoText
		text={props.picture.word}
		x={w / 2}
		y={h * PICTURE.y}
		fontSize={w * PICTURE.word}
		maxWidth={w * 0.92}
		colors={props.picture.colors ?? LOGO_TEXT_COLORS.logo}
		look="logo"
	/>
{:else if 'count' in props.picture}
	{#each row as at}
		<Sprite
			key={props.picture.sprite}
			anchor={0.5}
			x={at.x}
			y={at.y}
			width={w * PICTURE.rowSize}
			height={w * PICTURE.rowSize}
		/>
	{/each}
{:else}
	<Sprite
		key={props.picture.sprite}
		anchor={0.5}
		x={w / 2}
		y={h * PICTURE.y}
		width={size}
		height={size}
	/>
{/if}

<LogoText
	text={props.title}
	x={w / 2}
	y={h * TITLE.y}
	fontSize={w * TITLE.size}
	maxWidth={w * 0.94}
	colors={props.colors}
	look="logo"
/>

<Container x={w / 2} y={h * CAPTION.y}>
	<Text
		anchor={0.5}
		text={props.caption.join('\n')}
		style={{
			...gameTextStyle(w * CAPTION.size),
			lineHeight: w * CAPTION.size * 1.2,
		}}
	/>
</Container>
