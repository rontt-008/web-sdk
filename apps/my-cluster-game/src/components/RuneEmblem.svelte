<script lang="ts">
	import SignText from './SignText.svelte';
	import { BONUS_MODE, BOOSTER_MODE, SUPER_MODE } from '../game/betModes';
	import { BONUS_POWERS, RUNES, RUNE_COLOURS, RUNE_NAMES, type RuneName } from '../game/runes';

	type Props = {
		// the bonus's bet mode
		mode: string;
		// the emblem's height, a CSS length
		size?: string;
		// bright, flaring: as the bonus is bought
		flare?: boolean;
	};

	const props: Props = $props();

	// A bonus's emblem in the menu, carved into its slate and glowing as the board's lit runes do:
	// the BOOSTER three rising chevrons in gold (more FREE SPINS), the BONUS the four runes it is
	// about, each in its colour, the SUPER BONUS the RED RUNE with its bigger multiplier.
	type Point = [number, number];
	type Glyph = { strokes: Point[][]; neon: string; glow: string; core: string };

	const hex = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`;
	const rune = (name: RuneName): Glyph => ({
		strokes: RUNES[name].strokes as Point[][],
		neon: hex(RUNE_COLOURS[name].neon),
		glow: hex(RUNE_COLOURS[name].glow),
		core: hex(RUNE_COLOURS[name].core),
	});
	const CHEVRONS: Glyph = {
		strokes: [0, 1, 2].map((step) => [
			[0, 1.6 + step],
			[1, 0.6 + step],
			[2, 1.6 + step],
		]),
		neon: '#ffd23f',
		glow: '#ffab1a',
		core: '#fff8e1',
	};

	const glyphs = $derived(
		props.mode === BOOSTER_MODE
			? [CHEVRONS]
			: props.mode === SUPER_MODE
				? [rune('fehu')]
				: props.mode === BONUS_MODE
					? RUNE_NAMES.map(rune)
					: RUNE_NAMES.map(rune),
	);

	// a glyph's lines in a box round them, its sides `pad` beyond them
	const PAD = 0.45;
	const view = ({ strokes }: Glyph) => {
		const points = strokes.flat();
		const xs = points.map(([x]) => x);
		const ys = points.map(([, y]) => y);
		const left = Math.min(...xs) - PAD;
		const top = Math.min(...ys) - PAD;
		return {
			box: `${left} ${top} ${Math.max(...xs) + PAD - left} ${Math.max(...ys) + PAD - top}`,
			ratio: (Math.max(...xs) - Math.min(...xs) + 2 * PAD) / (Math.max(...ys) - Math.min(...ys) + 2 * PAD),
		};
	};
	const line = (stroke: Point[]) => stroke.map(([x, y]) => `${x},${y}`).join(' ');
</script>

<div class="emblem" class:flare={props.flare} style:--size={props.size ?? '3.4rem'} aria-hidden="true">
	{#each glyphs as glyph}
		{@const { box, ratio } = view(glyph)}
		<svg
			viewBox={box}
			class="glyph"
			class:small={glyphs.length > 1}
			style:aspect-ratio={ratio}
			style:--neon={glyph.neon}
			style:--glow={glyph.glow}
			style:--core={glyph.core}
		>
			{#each glyph.strokes as stroke}
				<polyline class="groove" points={line(stroke)} />
				<polyline class="neon" points={line(stroke)} />
				<polyline class="core" points={line(stroke)} />
			{/each}
		</svg>
	{/each}
	{#if props.mode === SUPER_MODE}
		<span class="mult"><SignText text={`${BONUS_POWERS.super.mult}x`} colour="orange" size="1.5rem" /></span>
	{/if}
</div>

<style lang="scss">
	.emblem {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		height: var(--size);
	}

	.glyph {
		height: 100%;
		overflow: visible;
		filter: drop-shadow(0 0 0.12rem var(--glow)) drop-shadow(0 0 0.4rem var(--glow));
		transition: filter 200ms ease;

		/* the four runes of the BONUS side by side, smaller */
		&.small {
			height: 72%;
		}

		polyline {
			fill: none;
			stroke-linecap: round;
			stroke-linejoin: round;
		}

		/* the groove the rune is carved into the slate */
		.groove {
			stroke: rgba(0, 0, 0, 0.55);
			stroke-width: 0.5;
			transform: translate(0.05px, 0.07px);
		}

		.neon {
			stroke: var(--neon);
			stroke-width: 0.3;
		}

		.core {
			stroke: var(--core);
			stroke-width: 0.1;
		}
	}

	.mult {
		align-self: flex-end;
		margin-bottom: 0.2rem;
	}

	/* bought: the runes flare, brighter and wider */
	.flare .glyph {
		filter: brightness(1.35) drop-shadow(0 0 0.25rem var(--glow)) drop-shadow(0 0 1.1rem var(--glow));
	}
</style>
