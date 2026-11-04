<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { signTextStyle } from '../game/signText';
	import PressToContinue from './PressToContinue.svelte';
	import FreeSpinAnimation, { FREE_SPIN_NUMBER, FREE_SPIN_WORDS } from './FreeSpinAnimation.svelte';
	import FreeSpinPop from './FreeSpinPop.svelte';

	const context = getContext();

	let show = $state(false);
	let freeSpinsFromEvent = $state(0);
	let oncomplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => (show = true),
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async (emitterEvent) => {
			freeSpinsFromEvent = emitterEvent.totalFreeSpins;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	<FreeSpinAnimation>
		{#snippet children()}
			<Text {...FREE_SPIN_WORDS.congratulations} />
			<Text {...FREE_SPIN_WORDS.youWon} />

			<FreeSpinPop y={FREE_SPIN_NUMBER.y}>
				<Text anchor={0.5} text={freeSpinsFromEvent} style={signTextStyle(FREE_SPIN_NUMBER.size)} />
			</FreeSpinPop>

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
