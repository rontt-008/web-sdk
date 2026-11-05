<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { BitmapText, Container, Rectangle, Text } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_COLOURS } from '../game/constants';
	import { sidePanelLayout } from '../game/sideLayout';

	// what the spin has won so far, in one stable place: it ticks up with every capture (the floating
	// amounts come and go), and says when the last capture fired a multiplier spot
	const context = getContext();
	const layout = $derived(sidePanelLayout());
	const shown = new Tween(0, { duration: 400, easing: cubicOut });
	$effect(() => {
		shown.set(context.stateGame.spinWin);
	});
</script>

<!-- none where the side panel shows the spin's win (desktop) -->
{#if layout.spinWin}
<MainContainer>
	<Container x={layout.spinWin.x} y={layout.spinWin.y}>
		<Rectangle
			anchor={0.5}
			width={layout.width}
			height={layout.height}
			borderRadius={SYMBOL_SIZE * 0.18}
			backgroundColor={0x1b1a1f}
			backgroundAlpha={0.9}
			borderColor={0x0a0a0c}
			borderWidth={4}
		/>
		<Text
			text={context.stateGame.lastSpot ? `SPIN WIN  ·  SPOT x${context.stateGame.lastSpot}` : 'SPIN WIN'}
			anchor={{ x: 0.5, y: 0 }}
			y={-layout.height / 2 + SYMBOL_SIZE * 0.08}
			style={{
				fontFamily: 'proxima-nova',
				fontSize: SYMBOL_SIZE * 0.15,
				fontWeight: '700',
				fill: context.stateGame.lastSpot ? BOARD_COLOURS.spot : 0xb8b4c6,
			}}
		/>
		<BitmapText
			text={bookEventAmountToCurrencyString(Math.round(shown.current))}
			anchor={{ x: 0.5, y: 1 }}
			y={layout.height / 2 - SYMBOL_SIZE * 0.06}
			style={{ fontFamily: 'gold', fontSize: SYMBOL_SIZE * 0.36, fontWeight: 'bold' }}
		/>
	</Container>
</MainContainer>
{/if}
