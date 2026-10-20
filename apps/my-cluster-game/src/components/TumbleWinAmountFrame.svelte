<script lang="ts">
	import type { Snippet } from 'svelte';

	import { BitmapText, Container, Sprite, type Sizes } from 'pixi-svelte';

	import { SYMBOL_SIZE } from '../game/constants';

	type Props = {
		children: Snippet<[{ frameSizes: Sizes }]>;
	};

	const props: Props = $props();
	const TITLE_KEY = 'Frame_TumbleWin.png';
	const TITLE_RATIO = 532 / 143;
	const TITLE_HEIGHT = SYMBOL_SIZE * 0.28;
	const TITLE_SIZES = {
		width: TITLE_HEIGHT * TITLE_RATIO,
		height: TITLE_HEIGHT,
	};

	const PANEL_KEY = 'Frame_Tumble.png';
	const PANEL_RATIO = 1442 / 374;
	const PANEL_HEIGHT = SYMBOL_SIZE * 0.8;
	const PANEL_SIZES = {
		width: PANEL_HEIGHT * PANEL_RATIO,
		height: PANEL_HEIGHT,
	};
</script>

<Sprite anchor={0.5} key={PANEL_KEY} {...PANEL_SIZES} />

<Container y={-TITLE_HEIGHT * 1.2}>
	<Sprite anchor={0.5} key={TITLE_KEY} {...TITLE_SIZES} />
	<BitmapText
		anchor={0.5}
		y={-TITLE_HEIGHT * 0.025}
		text="TUMBLE WIN"
		style={{ fontFamily: 'gold', fontSize: TITLE_HEIGHT * 0.45 }}
	/>
</Container>

{@render props.children({ frameSizes: PANEL_SIZES })}
