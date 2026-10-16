<script lang="ts">
	import type { BetModeData } from 'state-shared';
	import { HeadingText } from 'components-ui-html';

	import assets from '../game/assets';
	import {
		BONUS_MODE,
		SUPER_MODE,
		MYSTERY_MODE,
		BOOSTER_MODE,
		FEATURE_MODE,
	} from '../game/betModes';

	type Props = {
		betModeData: BetModeData;
	};

	const props: Props = $props();

	// Free spins are picked by how many FS symbols land (3, 4 or 5), so each bonus shows that many.
	// The mystery bonus could be any of them and the booster makes FS symbols more likely.
	const SCATTER_COUNT: Record<string, number> = {
		[BONUS_MODE]: 3,
		[SUPER_MODE]: 4,
	};
	const BADGE: Record<string, string> = {
		[MYSTERY_MODE]: '?',
		[BOOSTER_MODE]: '+',
	};

	// the chunky orange text of the game, whatever the menu's colours
	const BADGE_FILL = 'linear-gradient(180deg, #ffe234 0%, #ff8c1a 100%)';

	// the feature spin gives a big wild rather than free spins, so it shows a WILD
	const IMAGE: Record<string, string> = {
		[FEATURE_MODE]: assets.symbolW.src,
	};

	const count = $derived(SCATTER_COUNT[props.betModeData.mode] ?? 1);
	const image = $derived(IMAGE[props.betModeData.mode] ?? assets.symbolS.src);
	const badge = $derived(BADGE[props.betModeData.mode]);

	// fanned out like a hand of cards, the middle one in front
	const getStyle = (index: number) => {
		const offset = index - (count - 1) / 2;
		return [
			`transform: translateY(${(Math.abs(offset) * 0.3).toFixed(2)}em) rotate(${offset * 9}deg)`,
			`z-index: ${10 - Math.round(Math.abs(offset) * 2)}`,
		].join('; ');
	};
</script>

<div class="art" class:single={count === 1}>
	{#each { length: count } as _, index}
		<img class="scatter" src={image} alt="" style={getStyle(index)} />
	{/each}
	{#if badge}
		<span class="badge"><HeadingText fill={BADGE_FILL}>{badge}</HeadingText></span>
	{/if}
</div>

<style lang="scss">
	.art {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		/* the size of one fanned FS symbol */
		font-size: 3.4rem;
	}

	.single {
		font-size: 4.2rem;
	}

	.scatter {
		position: relative;
		width: 1em;
		height: auto;
		filter: drop-shadow(0 0.06em 0.06em rgba(0, 0, 0, 0.35));

		& + & {
			margin-left: -0.6em;
		}
	}

	.badge {
		--ui-outline: #4a1c00;
		position: absolute;
		z-index: 20;
		right: calc(50% - 0.75em);
		bottom: -0.1em;
		font-size: 0.6em;
	}
</style>
