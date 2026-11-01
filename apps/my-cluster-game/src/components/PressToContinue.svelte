<script lang="ts" module>
	// "press anywhere to continue" at the bottom of the screen, in the logo's lettering (signText),
	// where the sample's picture of the words was: its size, and how far its bottom is from the
	// screen's; `room`, how much of the bottom it takes, outline included
	export const PRESS_TEXT = { size: 40, bottom: 28, room: 28 + 40 * 1.2 };
</script>

<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { signTextStyle } from '../game/signText';

	type Props = {
		onpress: () => void;
		// still goes on with a press, without saying so (a small win counting up)
		hideText?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
</script>

<!-- any press, or the space bar, goes on -->
{#if !props.hideText}
	<MainContainer alignVertical="bottom">
		<Text
			anchor={{ x: 0.5, y: 1 }}
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height - PRESS_TEXT.bottom}
			text="PRESS ANYWHERE TO CONTINUE"
			style={signTextStyle(PRESS_TEXT.size)}
		/>
	</MainContainer>
{/if}
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
