<script lang="ts">
	import ReelBlur from './ReelBlur.svelte';
	import ReelSymbol from './ReelSymbol.svelte';
	import { getContext } from '../game/context';

	const context = getContext();
</script>

{#each context.stateGame.board as reel, reelIndex (reelIndex)}
	<!-- each reel blurs with its own speed (see ReelBlur) -->
	<ReelBlur {reel}>
		{#each reel.reelState.symbols as reelSymbol, rowIndex}
			<ReelSymbol {reelIndex} {rowIndex} {reelSymbol} />
		{/each}
	</ReelBlur>
{/each}
