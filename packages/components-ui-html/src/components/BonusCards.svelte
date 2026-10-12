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
	};

	const props: Props = $props();
</script>

{#each props.groups as levels (levels[0].mode)}
	<BonusCard {levels} levelRow={props.levelRow} bonusArt={props.bonusArt} />
{/each}
