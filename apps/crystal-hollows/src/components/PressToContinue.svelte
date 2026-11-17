<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';

	import { getContext } from '../game/context';
	import { LOGO_TEXT_COLORS } from '../game/textStyles';
	import LogoText from './LogoText.svelte';

	type Props = {
		onpress: () => void;
		// a tap still goes on, but nothing is written (e.g. small wins)
		hideText?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	// the sample's Mining Mayhem picture of the words was replaced by plain text in the UI's look, and
	// that by the game's rock lettering in pale stone (LogoText; the user, 2026-11-16: every text in the
	// game but the UI's), centred half a line above its old bottom edge
	const FONT_SIZE = 40;
	const BOTTOM_GAP = 60;
</script>

{#if !props.hideText}
	<MainContainer alignVertical="bottom">
		<LogoText
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height - BOTTOM_GAP - FONT_SIZE * 0.6}
			text="PRESS ANYWHERE TO CONTINUE"
			fontSize={FONT_SIZE}
			maxWidth={context.stateLayoutDerived.mainLayout().width * 0.92}
			colors={LOGO_TEXT_COLORS.stone}
			look="logo"
		/>
	</MainContainer>
{/if}
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
