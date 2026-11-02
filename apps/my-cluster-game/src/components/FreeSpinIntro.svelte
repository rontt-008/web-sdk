<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { CanvasSizeRectangle } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { SpineProvider, SpineSlot, SpineTrack, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { signTextStyle } from '../game/signText';
	import PressToContinue from './PressToContinue.svelte';
	import FreeSpinAnimation, { FREE_SPIN_WORDS } from './FreeSpinAnimation.svelte';
	import SpineHideSlots from './SpineHideSlots.svelte';

	type AnimationName = 'intro' | 'idle';

	const context = getContext();

	let show = $state(false);
	let animationName = $state<AnimationName>('intro');
	let freeSpinsFromEvent = $state(0);
	let oncomplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => (show = true),
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async (emitterEvent) => {
			// if (emitterEvent.extraSpins) {
			// 	context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fs_respins' });
			// }
			// freeSpinsFromEvent = emitterEvent.extraSpins ?? emitterEvent.totalFreeSpins;
			freeSpinsFromEvent = emitterEvent.totalFreeSpins;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

	<FreeSpinAnimation>
		{#snippet children({ sizes })}
			<Text {...FREE_SPIN_WORDS.congratulations} />
			<Text {...FREE_SPIN_WORDS.youWon} />

			<SpineProvider key="fsIntroNumber" width={sizes.width * 0.4}>
				<!-- the number on the planks without the sample's silver-rimmed box round it, as on the end
				screen -->
				<SpineHideSlots slots={['Frame_FSCounter', 'Frame_FSCounter2']} />
				<SpineTrack
					trackIndex={0}
					{animationName}
					loop={animationName === 'idle'}
					listener={{
						complete: () => (animationName = 'idle'),
					}}
				/>
				<SpineSlot slotName="slot_number">
					<Text anchor={0.5} text={freeSpinsFromEvent} style={signTextStyle(sizes.width * 0.15)} />
				</SpineSlot>
			</SpineProvider>

			<Text
				{...{
					normal: FREE_SPIN_WORDS.freeSpins,
					super: FREE_SPIN_WORDS.superFreeSpins,
					mythic: FREE_SPIN_WORDS.mythicFreeSpins,
				}[context.stateGame.bonusType]}
			/>
		{/snippet}
	</FreeSpinAnimation>

	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
