<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { gameTextStyle } from '../game/textStyles';

	type Props = {
		onpress: () => void;
		// a tap still goes on, but nothing is written (e.g. small wins)
		hideText?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	// the sample's Mining Mayhem picture of the words was replaced by plain text in the UI's look
	const FONT_SIZE = 40;
	const BOTTOM_GAP = 60;
</script>

{#if !props.hideText}
	<MainContainer alignVertical="bottom">
		<Text
			anchor={{ x: 0.5, y: 1 }}
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height - BOTTOM_GAP}
			text="PRESS ANYWHERE TO CONTINUE"
			style={gameTextStyle(FONT_SIZE)}
		/>
	</MainContainer>
{/if}
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
