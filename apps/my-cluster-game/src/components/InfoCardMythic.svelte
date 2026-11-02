<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { ResponsiveText } from 'components-pixi';

	import { signTextStyle } from '../game/signText';
	import RuneGlyph from './RuneGlyph.svelte';

	type Props = {
		// the card's slate (InfoCard)
		width: number;
		height: number;
	};

	const props: Props = $props();

	// The start screen's third card, with one thing to look at: Mannaz, the base game's rune, lit in
	// its orange (RuneGlyph; it fills its 5 x 5 cells, so it is centred as it is), the word MYTHIC big
	// across its feet, and under it in small what lighting it does, as the first card has the runes.
	// Places are in the slate's height (`h`), sizes in its width (`w`): the rune's middle and size;
	// the word's; the caption's.
	const RUNE = { y: 0.3, glyph: 0.7 };
	const WORD = { y: 0.6, size: 0.27 };
	const CAPTION = { y: 0.84, size: 0.085, lines: ['LIGHT THE ORANGE RUNE', 'FOR THE MYTHIC BONUS'] };

	const w = $derived(props.width);
	const h = $derived(props.height);
	const glyph = $derived(w * RUNE.glyph);
</script>

<Container x={w / 2} y={h * RUNE.y}>
	<RuneGlyph
		rune="mannaz"
		size={glyph}
		x={-glyph / 2}
		y={-glyph / 2}
		glows={[]}
		flash={1}
		spots={false}
	/>
</Container>

<ResponsiveText
	x={w / 2}
	y={h * WORD.y}
	anchor={0.5}
	text="MYTHIC"
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
