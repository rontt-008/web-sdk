<script lang="ts">
	import type { Snippet } from 'svelte';

	import { SpineProvider, SpineTrack, SpineSlot, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { signTextStyle } from '../game/signText';
	import SpineHideSlots from './SpineHideSlots.svelte';

	type AnimationState = 'intro' | 'idle' | 'outro';

	type Props = {
		animationMap: {
			intro:
				| 'big_win_intro'
				| 'epic_win_intro'
				| 'max_win_intro'
				| 'mega_win_intro'
				| 'super_win_intro';
			idle: 'big_win_idle' | 'epic_win_idle' | 'max_win_idle' | 'mega_win_idle' | 'super_win_idle';
			outro: 'big_win_exit' | 'epic_win_exit' | 'max_win_exit' | 'mega_win_exit' | 'super_win_exit';
		};
		children: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	let oncomplete = $state(() => {});
	let animationState = $state<AnimationState>('intro');

	// The win's name (BIG WIN, SUPER WIN, ...) in the logo's lettering in place of the sample's
	// pictures of it (the BIG_WIN slot and its glow), moving and fading as they did, and there only
	// while the picture would be (`wordShown`): the intro puts it in as the amount pops in, so they
	// come together (without that the name showed from the start, full size and see-through as the
	// screen faded in, then shrank away and popped back with the amount). Their picture is
	// 1080 x 300 in the skeleton, its letters about 57% of that high.
	const WORD_SIZE = 470;
	const word = $derived(
		props.animationMap.intro.replace('_intro', '').replace('_', ' ').toUpperCase(),
	);
	let wordShown = $state(false);
</script>

<SpineProvider width={context.stateGameDerived.boardLayout().width} key="bigwin">
	<SpineTrack
		trackIndex={0}
		animationName={props.animationMap[animationState]}
		loop={animationState === 'idle'}
		listener={{
			complete: () => {
				if (animationState === 'intro') animationState = 'idle';
				if (animationState === 'outro') oncomplete();
			},
		}}
	/>
	<SpineHideSlots
		slots={['BIG_WIN', 'BIG_WIN_GLOW']}
		onshown={(slot, shown) => {
			if (slot === 'BIG_WIN') wordShown = shown;
		}}
	/>
	<SpineSlot slotName="BIG_WIN">
		{#if wordShown}
			<Text anchor={0.5} text={word} style={signTextStyle(WORD_SIZE)} />
		{/if}
	</SpineSlot>
	<SpineSlot slotName="slot_win_count">
		{@render props.children()}
	</SpineSlot>
</SpineProvider>
