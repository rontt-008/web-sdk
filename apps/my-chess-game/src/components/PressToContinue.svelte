<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { titleTextStyle, spacingShift } from '../game/titleText';

	type Props = {
		onpress: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// "press anywhere to continue" at the bottom of the screen, in the start screen title's lettering
	// (titleText): its size, its letter spacing, and how far its middle is from the screen's bottom
	const PRESS = { size: 30, spacing: 0.18, bottom: 68 };
	const main = $derived(context.stateLayoutDerived.mainLayout());
</script>

<!-- any press, or the space bar, goes on -->
<MainContainer alignVertical="bottom">
	<Text
		text="PRESS ANYWHERE TO CONTINUE"
		anchor={0.5}
		x={main.width * 0.5 + spacingShift(PRESS.size, PRESS.spacing)}
		y={main.height - PRESS.bottom}
		style={titleTextStyle(PRESS.size, PRESS.spacing)}
	/>
</MainContainer>
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
