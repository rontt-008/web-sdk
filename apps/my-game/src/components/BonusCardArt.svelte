<script lang="ts">
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
		// the bonus's bet mode (a bonus menu card's betModeData.mode)
		mode?: string;
		// this many fanned FS symbols instead, as for the mythic free spins (5), which can't be bought
		scatters?: number;
		// the size of one of three fanned FS symbols, in rem; a single symbol is bigger and four or
		// five are a little smaller, to fill about the same room
		size?: number;
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

	const mode = $derived(props.mode ?? '');
	const count = $derived(props.scatters ?? SCATTER_COUNT[mode] ?? 1);
	const SIZE_BY_COUNT: Record<number, number> = { 1: 1.3, 4: 0.9, 5: 0.8 };
	const fontSize = $derived(
		props.size ? `${props.size * (SIZE_BY_COUNT[count] ?? 1)}rem` : undefined,
	);
	const image = $derived(IMAGE[mode] ?? assets.symbolS.src);
	const badge = $derived(BADGE[mode]);

	// fanned out like a hand of cards, the middle one in front, the outer ones lower and tilted
	const FAN_DROP = 0.3;
	const FAN_TILT = 9;
	const offsetOf = (index: number) => index - (count - 1) / 2;
	const getStyle = (index: number) => {
		const offset = offsetOf(index);
		return [
			`transform: translateY(${(Math.abs(offset) * FAN_DROP).toFixed(2)}em) rotate(${offset * FAN_TILT}deg)`,
			`z-index: ${10 - Math.round(Math.abs(offset) * 2)}`,
		].join('; ');
	};
	// Raised so the fan is in the middle: each symbol (1em square) is dropped, and tilted, which makes
	// it reach (sin + cos - 1) / 2 em further up and down.
	const fanLift = $derived.by(() => {
		const reach = Array.from({ length: count }, (_, index) => {
			const offset = offsetOf(index);
			const tilt = (Math.abs(offset) * FAN_TILT * Math.PI) / 180;
			const grow = (Math.sin(tilt) + Math.cos(tilt) - 1) / 2;
			const drop = Math.abs(offset) * FAN_DROP;
			return { top: drop - grow, bottom: drop + 1 + grow };
		});
		const top = Math.min(...reach.map((symbol) => symbol.top));
		const bottom = Math.max(...reach.map((symbol) => symbol.bottom));
		return `${((top + bottom) / 2 - 0.5).toFixed(3)}em`;
	});
</script>

<div class="art" style:font-size={fontSize} class:single={count === 1}>
	<div class="fan" style:transform="translateY(-{fanLift})">
		{#each { length: count } as _, index}
			<img class="scatter" src={image} alt="" style={getStyle(index)} />
		{/each}
		<!-- on the symbol's bottom right corner, like a badge -->
		{#if badge}
			<span class="badge"><HeadingText fill={BADGE_FILL}>{badge}</HeadingText></span>
		{/if}
	</div>
</div>

<style lang="scss">
	.art {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		/* the size of one fanned FS symbol, unless given */
		font-size: 3.4rem;
	}

	.single {
		font-size: 4.2rem;
	}

	.fan {
		position: relative;
		display: flex;
		align-items: center;
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
		/* on the coin's lower right edge (the symbol has a see-through margin) */
		right: -0.37em;
		bottom: -0.37em;
		font-size: 0.6em;
		line-height: 1;
	}
</style>
