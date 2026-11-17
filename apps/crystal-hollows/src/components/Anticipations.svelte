<script lang="ts">
	import { OnMount } from 'components-shared';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import { stateAnticipation } from '../game/anticipation.svelte';
	import Anticipation from './Anticipation.svelte';

	const context = getContext();
	const hasAnticipation = $derived(
		context.stateGame.board.some((reel) => reel.reelState.anticipating),
	);

	// the anticipation's clock, from when the first reel began anticipating till the last is done, the
	// sound's loop playing over it all: the columns and the free spins rocks throb on its beat
	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!hasAnticipation || !ticker) return;
		stateAnticipation.time = 0;
		stateAnticipation.active = true;
		const step = () => (stateAnticipation.time += ticker.deltaMS / 1000);
		ticker.add(step);
		return () => {
			ticker.remove(step);
			stateAnticipation.active = false;
		};
	});
</script>

{#if hasAnticipation}
	<OnMount
		onmount={() => {
			context.eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_anticipation' });
			context.eventEmitter.broadcast({
				type: 'soundFade',
				name: 'sfx_anticipation',
				from: 0,
				to: 1,
				duration: SECOND,
			});

			return () => {
				context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_anticipation' });
			};
		}}
	/>
{/if}

{#each context.stateGame.board as reel}
	{#if reel.reelState.anticipating}
		<Anticipation {reel} oncomplete={() => (reel.reelState.anticipating = false)} />
	{/if}
{/each}
