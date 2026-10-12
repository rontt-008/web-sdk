<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Text } from 'pixi-svelte';

	import { getContext } from '../game/context';

	type Props = {
		onpress: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// in the same chunky font as the free spin intro's text
	const FONT_SIZE = 26;
	const STYLE = {
		fontFamily: 'Titan One',
		fontSize: FONT_SIZE,
		fill: 0xfff6e2,
		stroke: { color: 0x4a1c00, width: FONT_SIZE * 0.17, join: 'round' },
	} as const;
	// from the bottom of the screen to the middle of the text
	const BOTTOM_OFFSET = 70;
</script>

<MainContainer alignVertical="bottom">
	<Text
		anchor={0.5}
		x={context.stateLayoutDerived.mainLayout().width * 0.5}
		y={context.stateLayoutDerived.mainLayout().height - BOTTOM_OFFSET}
		text="PRESS ANYWHERE TO CONTINUE"
		style={STYLE}
	/>
</MainContainer>
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
