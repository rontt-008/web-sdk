<script lang="ts" module>
	export type EmitterEventComboMultiplier = { type: 'multiplierPulse' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { BOARD_COLOURS } from '../game/constants';
	import { sidePanelLayout } from '../game/sideLayout';

	// the spin's multiplier, the number alone inside the user's astrology circle (multiplier-frame.webp):
	// 1, one more for every piece you take; in the free spins it never resets. It pulses as it grows.
	const context = getContext();
	const layout = $derived(sidePanelLayout());
	const pulse = new Tween(1);
	// the number fits the circle's clear middle (about 0.6 of the picture across); none where the side
	// panel shows the multiplier (desktop)
	const size = $derived(layout.multiplier?.size ?? 0);
	const fontSize = $derived(size * (String(context.stateGame.multiplier).length > 2 ? 0.26 : 0.36));

	context.eventEmitter.subscribeOnMount({
		multiplierPulse: () => {
			pulse.set(1.25, { duration: 0 });
			pulse.set(1, { duration: 450 / stateBetDerived.timeScale(), easing: backOut });
		},
	});
</script>

{#if layout.multiplier}
<MainContainer>
	<Container x={layout.multiplier.x} y={layout.multiplier.y} scale={pulse.current}>
		<Sprite key="multiplierFrame" anchor={0.5} width={size} height={size} />
		<Text
			text={`x${context.stateGame.multiplier}`}
			anchor={0.5}
			style={{
				fontFamily: 'proxima-nova',
				fontSize,
				fontWeight: '800',
				fill: BOARD_COLOURS.spot,
				stroke: { color: 0x1a1208, width: 4 },
			}}
		/>
	</Container>
</MainContainer>
{/if}
