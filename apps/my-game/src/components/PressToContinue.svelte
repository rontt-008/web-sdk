<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Text } from 'pixi-svelte';
	import { stateModal, stateUi } from 'state-shared';

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
	// it breathes gently, fading a little and back every so many seconds
	const BREATHE_PERIOD = 1.8;
	const BREATHE_ALPHA = 0.45;
	const BREATHE_SCALE = 0.04;

	let time = $state(0);
	const breathe = $derived(0.5 - 0.5 * Math.cos((time * 2 * Math.PI) / BREATHE_PERIOD));

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		const tick = () => (time += ticker.deltaMS / 1000);
		ticker.add(tick);
		return () => ticker.remove(tick);
	});
</script>

<MainContainer alignVertical="bottom">
	<Text
		anchor={0.5}
		x={context.stateLayoutDerived.mainLayout().width * 0.5}
		y={context.stateLayoutDerived.mainLayout().height - BOTTOM_OFFSET}
		alpha={1 - BREATHE_ALPHA * breathe}
		scale={1 - BREATHE_SCALE * breathe}
		text="PRESS ANYWHERE TO CONTINUE"
		style={STYLE}
	/>
</MainContainer>
<!-- the space bar does nothing to the screen behind a menu or a modal -->
<OnHotkey
	hotkey="Space"
	disabled={!!stateModal.modal || stateUi.menuOpen}
	onpress={() => props.onpress()}
/>
<OnPressFullScreen onpress={() => props.onpress()} />
