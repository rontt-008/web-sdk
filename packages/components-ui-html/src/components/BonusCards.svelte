<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { BetModeData } from 'state-shared';

	import BonusCard from './BonusCard.svelte';

	type Props = {
		// each card's bet mode followed by its levels
		groups: BetModeData[][];
		// another card in the menu has levels
		levelRow?: boolean;
		bonusArt?: Snippet<[BetModeData]>;
		// the game's own card instead of the default one
		bonusCard?: Snippet<[{ levels: BetModeData[]; levelRow: boolean }]>;
	};

	const props: Props = $props();
</script>

{#each props.groups as levels (levels[0].mode)}
	{#if props.bonusCard}
		{@render props.bonusCard({ levels, levelRow: props.levelRow ?? false })}
	{:else}
		<BonusCard {levels} levelRow={props.levelRow} bonusArt={props.bonusArt} />
	{/if}
{/each}
