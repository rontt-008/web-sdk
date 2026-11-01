<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { ResponsiveText } from 'components-pixi';

	import { RUNES, type RuneName } from '../game/runes';
	import { signTextStyle } from '../game/signText';
	import RuneGlyph from './RuneGlyph.svelte';

	type Props = {
		// the card's slate (InfoCard)
		width: number;
		height: number;
	};

	const props: Props = $props();

	// The start screen's first card, with one thing to look at: the four runes lit in their own
	// colours (RuneGlyph), huddled side by side in a shallow arch (the tall two in the middle,
	// higher), the word RUNES big across their feet, and under it in small what they are for. Sizes
	// and places are in the slate's width (`w`) or height (`h`): the runes' order, their middle, how
	// far apart they are, how much lower the outer two sit, their size; the word's; the caption's.
	const CLUSTER = {
		order: ['othala', 'fehu', 'ingwaz', 'hagall'] as RuneName[],
		y: 0.32,
		apart: 0.235,
		drop: 0.05,
		glyph: 0.38,
	};
	const WORD = { y: 0.58, size: 0.3 };
	const CAPTION = { y: 0.84, size: 0.085, lines: ['COLLECT RUNES', 'FOR POWER SPINS'] };

	const w = $derived(props.width);
	const h = $derived(props.height);
	const glyph = $derived(w * CLUSTER.glyph);

	// a rune's middle in its 5 x 5 cells, from where its spots are, so each is centred on its place
	const centreOf = (rune: RuneName) => {
		const reels = RUNES[rune].spots.map(([reel]) => reel);
		const rows = RUNES[rune].spots.map(([, row]) => row);
		return {
			reel: 2.5 - (Math.min(...reels) + Math.max(...reels) + 1) / 2,
			row: 2.5 - (Math.min(...rows) + Math.max(...rows) + 1) / 2,
		};
	};
</script>

{#each CLUSTER.order as rune, i}
	{@const outer = i === 0 || i === CLUSTER.order.length - 1}
	<Container
		x={w * (0.5 + (i - (CLUSTER.order.length - 1) / 2) * CLUSTER.apart)}
		y={h * (CLUSTER.y + (outer ? CLUSTER.drop : 0))}
	>
		<RuneGlyph
			{rune}
			size={glyph}
			x={-glyph / 2}
			y={-glyph / 2}
			offset={centreOf(rune)}
			glows={[]}
			flash={1}
			spots={false}
		/>
	</Container>
{/each}

<ResponsiveText
	x={w / 2}
	y={h * WORD.y}
	anchor={0.5}
	text="RUNES"
	maxWidth={w * 0.94}
	style={signTextStyle(w * WORD.size)}
/>
<ResponsiveText
	x={w / 2}
	y={h * CAPTION.y}
	anchor={0.5}
	text={CAPTION.lines.join('\n')}
	maxWidth={w * 0.92}
	style={{
		...signTextStyle(w * CAPTION.size),
		align: 'center',
		lineHeight: w * CAPTION.size * 1.15,
	}}
/>
