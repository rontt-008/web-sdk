<script lang="ts">
	import { ResponsiveText } from 'components-pixi';

	import config from '../game/config';
	import { signTextStyle } from '../game/signText';

	type Props = {
		// the card's slate (InfoCard)
		width: number;
		height: number;
	};

	const props: Props = $props();

	// The start screen's second card, with one thing to look at: MAX WIN big on two lines, and under it
	// in small "win up to" and how much, in bets (config.betModes.base.max_win, so it follows the
	// math). Places are in the slate's height (`h`), sizes in its width (`w`).
	const MAX_WIN = `${config.betModes.base.max_win.toLocaleString('en-US')}X`;
	const LINES = [
		{ text: 'MAX', y: 0.2, size: 0.38 },
		{ text: 'WIN', y: 0.44, size: 0.38 },
		{ text: 'WIN UP TO', y: 0.72, size: 0.09 },
		{ text: MAX_WIN, y: 0.84, size: 0.19 },
	];

	const w = $derived(props.width);
	const h = $derived(props.height);
</script>

{#each LINES as line}
	<ResponsiveText
		x={w / 2}
		y={h * line.y}
		anchor={0.5}
		text={line.text}
		maxWidth={w * 0.92}
		style={signTextStyle(w * line.size)}
	/>
{/each}
