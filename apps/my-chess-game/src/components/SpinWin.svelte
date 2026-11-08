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
	// amounts come and go), and says when the last capture fired a multiplier spot; in the bonus, where
	// there's no free spin sign by the board (FreeSpinCounter: desktop and phones held sideways only),
	// the free spins left (after the one being played) instead
	const context = getContext();
	const layout = $derived(sidePanelLayout());
	const shown = new Tween(0, { duration: 400, easing: cubicOut });
	$effect(() => {
		shown.set(context.stateGame.spinWin);
	});
	const bonus = $derived(
		context.stateGame.gameType === 'freegame' &&
			!['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType()),
	);
	const freeSpinsLeft = $derived(Math.max(0, context.stateGame.freeSpins.total - context.stateGame.freeSpins.current));
	const lastSpot = $derived(bonus ? undefined : context.stateGame.lastSpot);
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
			text={bonus ? 'SPINS LEFT' : lastSpot ? `SPIN WIN  ·  SPOT ${lastSpot.op}${lastSpot.value}` : 'SPIN WIN'}
			anchor={{ x: 0.5, y: 0 }}
			y={-layout.height / 2 + SYMBOL_SIZE * 0.08}
			style={{
				fontFamily: 'proxima-nova',
				fontSize: SYMBOL_SIZE * 0.15,
				fontWeight: '700',
				fill: lastSpot ? (lastSpot.op === '+' ? BOARD_COLOURS.spotAdd : BOARD_COLOURS.spot) : 0xb8b4c6,
			}}
		/>
		<BitmapText
			text={bonus
				? `${freeSpinsLeft} OF ${context.stateGame.freeSpins.total}`
				: bookEventAmountToCurrencyString(Math.round(shown.current))}
			anchor={{ x: 0.5, y: 1 }}
			y={layout.height / 2 - SYMBOL_SIZE * 0.06}
			style={{ fontFamily: 'gold', fontSize: SYMBOL_SIZE * 0.36, fontWeight: 'bold' }}
		/>
	</Container>
</MainContainer>
{/if}
