<script lang="ts">
	import { Rectangle, Sprite, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { setYourColour } from '../game/stateGame.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { sidePanelLayout } from '../game/sideLayout';

	// the toggle of the colour your pieces are drawn in, white or black. The maths is the same either
	// way (you always move first): it only changes the pictures, as the rules say.
	const context = getContext();
	const layout = $derived(sidePanelLayout());
	const colour = $derived(context.stateGame.yourColour);
</script>

<MainContainer>
	<Button
		x={layout.toggle.x}
		y={layout.toggle.y}
		anchor={0.5}
		sizes={{ width: layout.width, height: layout.height }}
		onpress={() => setYourColour(colour === 'white' ? 'black' : 'white')}
	>
		{#snippet children({ center, hovered, pressed })}
			<Rectangle
				width={layout.width}
				height={layout.height}
				borderRadius={SYMBOL_SIZE * 0.18}
				backgroundColor={pressed ? 0x2a2930 : hovered ? 0x403f47 : 0x34333a}
				borderColor={0x0a0a0c}
				borderWidth={4}
			/>
			<Sprite
				key={colour === 'white' ? 'wK' : 'bK'}
				anchor={0.5}
				x={SYMBOL_SIZE * 0.42}
				y={center.y}
				width={SYMBOL_SIZE * 0.6}
				height={SYMBOL_SIZE * 0.6}
			/>
			<Text
				text={`YOU PLAY\n${colour.toUpperCase()}  ⇄`}
				anchor={{ x: 0, y: 0.5 }}
				x={SYMBOL_SIZE * 0.8}
				y={center.y}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: SYMBOL_SIZE * 0.2,
					fontWeight: '800',
					lineHeight: SYMBOL_SIZE * 0.25,
					fill: 0xffffff,
				}}
			/>
		{/snippet}
	</Button>
</MainContainer>
