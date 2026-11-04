<script lang="ts" module>
	export type EmitterEventComboMultiplier = { type: 'multiplierPulse' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { sidePanelLayout } from '../game/sideLayout';

	// the spin's multiplier, on a badge: 1x, one more for every piece you take; in the free spins it
	// never resets. It pulses as it grows.
	const context = getContext();
	const layout = $derived(sidePanelLayout());
	const pulse = new Tween(1);

	context.eventEmitter.subscribeOnMount({
		multiplierPulse: () => {
			pulse.set(1.25, { duration: 0 });
			pulse.set(1, { duration: 450 / stateBetDerived.timeScale(), easing: backOut });
		},
	});
</script>

<MainContainer>
	<Container x={layout.multiplier.x} y={layout.multiplier.y} scale={pulse.current}>
		<Rectangle
			anchor={0.5}
			width={layout.width}
			height={layout.height}
			borderRadius={SYMBOL_SIZE * 0.18}
			backgroundColor={0x1b1a1f}
			borderColor={0x0a0a0c}
			borderWidth={4}
		/>
		<Text
			text={`x${context.stateGame.multiplier}`}
			anchor={{ x: 0, y: 0.5 }}
			x={-layout.width / 2 + SYMBOL_SIZE * 0.22}
			style={{
				fontFamily: 'proxima-nova',
				fontSize: SYMBOL_SIZE * 0.5,
				fontWeight: '800',
				fill: 0xf2c94c,
			}}
		/>
		<Text
			text={context.stateGame.gameType === 'freegame' ? 'MULTIPLIER\nNEVER RESETS' : 'MULTIPLIER\n+1 A CAPTURE'}
			anchor={{ x: 1, y: 0.5 }}
			x={layout.width / 2 - SYMBOL_SIZE * 0.2}
			style={{
				fontFamily: 'proxima-nova',
				fontSize: SYMBOL_SIZE * 0.15,
				fontWeight: '700',
				lineHeight: SYMBOL_SIZE * 0.19,
				align: 'right',
				fill: 0xb8b4c6,
			}}
		/>
	</Container>
</MainContainer>
