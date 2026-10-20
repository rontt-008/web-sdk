<script lang="ts" module>
	export type EmitterEventTumbleWinAmount =
		| { type: 'tumbleWinAmountShow' }
		| { type: 'tumbleWinAmountHide' }
		| { type: 'tumbleWinAmountReset' }
		| { type: 'tumbleWinAmountUpdate'; amount: number; animate: boolean };
</script>

<script lang="ts">
	import { waitForResolve } from 'utils-shared/wait';

	import TumbleWinAmountWrap from './TumbleWinAmountWrap.svelte';
	import TumbleWinAmountFrame from './TumbleWinAmountFrame.svelte';
	import TumbleWinAmountText from './TumbleWinAmountText.svelte';
	import { getContext } from '../game/context';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let animate = $state(false);
	let oncomplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		tumbleWinAmountShow: () => (show = true),
		tumbleWinAmountHide: () => (show = false),
		tumbleWinAmountReset: () => {
			amount = 0;
			animate = false;
			oncomplete = () => {};
		},
		tumbleWinAmountUpdate: async (emitterEvent) => {
			if (amount !== emitterEvent.amount) {
				amount = emitterEvent.amount;
				animate = emitterEvent.animate;
				await waitForResolve((resolve) => (oncomplete = resolve));
			}
		},
	});
</script>

<TumbleWinAmountWrap {show}>
	<TumbleWinAmountFrame>
		{#snippet children({ frameSizes })}
			<TumbleWinAmountText {amount} {animate} {oncomplete} width={frameSizes.width} />
		{/snippet}
	</TumbleWinAmountFrame>
</TumbleWinAmountWrap>
