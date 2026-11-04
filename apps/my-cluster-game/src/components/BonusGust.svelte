<script lang="ts">
	import { onMount } from 'svelte';
	import type { BetModeData } from 'state-shared';

	import BonusTablet from './BonusTablet.svelte';
	import FitScale from './FitScale.svelte';
	import { getContext } from '../game/context';
	import { BROWN_LEAF, LEAF_STILLS } from '../game/bonusLook';

	type Props = {
		// the bonus just bought
		betModeData: BetModeData;
		// called when the bonus should start, as the gust carries it off
		onstart: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// A bonus once bought: its slate comes up in the middle of the screen, its runes flare, and a gust
	// of wind (the game's own, as the bonus starts under a gale) blows it away to the right in a burst
	// of autumn leaves, and the bonus starts.
	const POP_MS = 260;
	const FLARE_MS = 520;
	const GUST_MS = 950;
	// the bonus starts this far into the gust (the leaves go with this screen), as the last ones fade
	const START_AT = 0.9;

	const LEAVES = [LEAF_STILLS.orange, LEAF_STILLS.yellow, LEAF_STILLS.green, BROWN_LEAF];
	// each leaf: where on the slate it starts (in % of it), how far right and up or down it is blown
	// (in rem), how much it spins and how big it is
	const FLYING = Array.from({ length: 34 }, (_, index) => ({
		src: LEAVES[index % LEAVES.length],
		left: 10 + Math.random() * 80,
		top: 8 + Math.random() * 84,
		x: 26 + Math.random() * 34,
		y: (Math.random() - 0.6) * 18,
		rotate: (Math.random() < 0.5 ? -1 : 1) * (300 + Math.random() * 600),
		size: 2 + Math.random() * 1.8,
		delay: Math.random() * 0.25,
	}));
	// streaks of wind across the screen, at different heights
	const STREAKS = Array.from({ length: 6 }, (_, index) => ({
		top: 12 + index * 14 + Math.random() * 8,
		width: 12 + Math.random() * 14,
		delay: index * 0.06 + Math.random() * 0.1,
	}));

	let flare = $state(false);
	let backdrop: HTMLDivElement;
	let tablet: HTMLDivElement;
	let shaker: HTMLDivElement;
	const leaves: HTMLImageElement[] = [];
	const streaks: HTMLDivElement[] = [];

	const gust = () => {
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wind_gust' });
		shaker.animate(
			[
				{ transform: 'none', opacity: 1 },
				{ transform: 'translateX(-1.5rem) rotate(-4deg)', opacity: 1, offset: 0.15 },
				{ transform: 'translateX(70vw) translateY(-4rem) rotate(28deg) scale(0.7)', opacity: 0 },
			],
			{ duration: GUST_MS * 0.85, easing: 'cubic-bezier(0.5, 0, 0.75, 0.6)', fill: 'forwards' },
		);
		FLYING.forEach((leaf, index) =>
			leaves[index].animate(
				[
					{ transform: 'translate(-50%, -50%) rotate(0deg) scale(0.3)', opacity: 0 },
					{ opacity: 1, offset: 0.12 },
					{
						transform: `translate(calc(-50% + ${leaf.x * 0.4}rem), calc(-50% + ${leaf.y * 0.5 - 2}rem)) rotate(${leaf.rotate * 0.4}deg) scale(1)`,
						offset: 0.4,
					},
					{
						transform: `translate(calc(-50% + ${leaf.x}rem), calc(-50% + ${leaf.y}rem)) rotate(${leaf.rotate}deg) scale(0.9)`,
						opacity: 0,
					},
				],
				{
					duration: GUST_MS * (1 - leaf.delay),
					delay: GUST_MS * leaf.delay,
					easing: 'cubic-bezier(0.3, 0.4, 0.6, 1)',
					fill: 'both',
				},
			),
		);
		STREAKS.forEach((streak, index) =>
			streaks[index].animate(
				[
					{ transform: 'translateX(-70vw)', opacity: 0 },
					{ opacity: 0.85, offset: 0.4 },
					{ transform: 'translateX(70vw)', opacity: 0 },
				],
				{ duration: GUST_MS * 0.8, delay: GUST_MS * streak.delay, easing: 'ease-in', fill: 'both' },
			),
		);
		backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: GUST_MS * START_AT,
			delay: GUST_MS * 0.2,
			easing: 'ease-in',
			fill: 'forwards',
		});
	};

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
			props.onstart();
			return;
		}

		backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: POP_MS, fill: 'backwards' });
		tablet.animate(
			[
				{ transform: 'scale(0.6)', opacity: 0 },
				{ transform: 'scale(1.05)', opacity: 1, offset: 0.7 },
				{ transform: 'scale(1)', opacity: 1 },
			],
			{ duration: POP_MS, easing: 'ease-out', fill: 'backwards' },
		);
		// the runes flare, and the wind picks up: the slate trembles, harder and harder
		const flaring = setTimeout(() => {
			flare = true;
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_reveal' });
			shaker.animate(
				[
					{ transform: 'none' },
					{ transform: 'rotate(-0.8deg)' },
					{ transform: 'rotate(1deg)' },
					{ transform: 'rotate(-1.4deg) translateX(-0.2rem)' },
					{ transform: 'rotate(1.6deg) translateX(0.3rem)' },
					{ transform: 'none' },
				],
				{ duration: FLARE_MS },
			);
		}, POP_MS);
		const gusting = setTimeout(gust, POP_MS + FLARE_MS);
		const starting = setTimeout(props.onstart, POP_MS + FLARE_MS + GUST_MS * START_AT);
		return () => {
			clearTimeout(flaring);
			clearTimeout(gusting);
			clearTimeout(starting);
		};
	});
</script>

<div class="gust" aria-hidden="true">
	<div class="backdrop" bind:this={backdrop}></div>

	{#each STREAKS as streak, index}
		<div
			class="streak"
			style:top="{streak.top}%"
			style:width="{streak.width}rem"
			bind:this={streaks[index]}
		></div>
	{/each}

	<div class="tablet" bind:this={tablet}>
		<FitScale>
			<div class="shaker" bind:this={shaker}>
				<BonusTablet levels={[props.betModeData]} levelRow={false} picture {flare} />
				{#each FLYING as leaf, index}
					<img
						class="leaf"
						src={leaf.src}
						alt=""
						style:left="{leaf.left}%"
						style:top="{leaf.top}%"
						style:width="{leaf.size}rem"
						style:height="{leaf.size}rem"
						bind:this={leaves[index]}
					/>
				{/each}
			</div>
		</FitScale>
	</div>
</div>

<style lang="scss">
	.gust {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
	}

	.tablet {
		position: relative;
	}

	.shaker {
		position: relative;
	}

	.leaf {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		filter: drop-shadow(0 0.15rem 0.15rem rgba(0, 0, 0, 0.45));
	}

	.streak {
		position: absolute;
		left: 50%;
		height: 0.2rem;
		margin-left: -8rem;
		border-radius: 0.1rem;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.85) 40%, transparent);
		opacity: 0;
	}
</style>
