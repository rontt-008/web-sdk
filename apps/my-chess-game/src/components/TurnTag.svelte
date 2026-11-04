<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { sidePanelLayout } from '../game/sideLayout';
	import { BOOSTER_MODE } from '../game/betModes';

	// whose move it is, in the colour of the side on the move (yours as the toggle has it), with the king
	// glyph; in DUMB MODE the other side is called the beginner. Nothing between spins.
	const context = getContext();
	const layout = $derived(sidePanelLayout());
	const turn = $derived(context.stateGame.turn);
	const white = $derived((turn === 'you') === (context.stateGame.yourColour === 'white'));
	const beginner = $derived(stateBet.activeBetModeKey === BOOSTER_MODE && turn === 'them');
	const text = $derived(turn === 'you' ? 'YOUR MOVE' : beginner ? 'THEIR MOVE · BEGINNER' : 'THEIR MOVE');
	const IVORY = 0xf6eedb;
	const INK = 0x151a26;
</script>

<MainContainer>
	<FadeContainer show={turn !== undefined} duration={200}>
		<Container x={layout.turn.x} y={layout.turn.y}>
			<Rectangle
				anchor={0.5}
				width={layout.width}
				height={layout.tagHeight}
				borderRadius={layout.tagHeight / 2}
				backgroundColor={white ? IVORY : INK}
				borderColor={0xc9a352}
				borderWidth={2}
			/>
			<Text
				text={'♚'}
				anchor={{ x: 0, y: 0.5 }}
				x={-layout.width / 2 + SYMBOL_SIZE * 0.2}
				style={{
					fontFamily: "'Segoe UI Symbol', 'Apple Symbols', 'DejaVu Sans', serif",
					fontSize: SYMBOL_SIZE * 0.38,
					fill: white ? INK : IVORY,
				}}
			/>
			<Text
				{text}
				anchor={{ x: 0, y: 0.5 }}
				x={-layout.width / 2 + SYMBOL_SIZE * 0.62}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: SYMBOL_SIZE * 0.19,
					fontWeight: '800',
					letterSpacing: 1,
					fill: white ? INK : IVORY,
				}}
			/>
		</Container>
	</FadeContainer>
</MainContainer>
