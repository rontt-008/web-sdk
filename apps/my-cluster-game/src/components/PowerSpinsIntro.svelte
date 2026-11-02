<script lang="ts" module>
	import type { RuneName } from '../game/runes';

	// shows the power spins and the collected runes' powers, and resolves when the player presses on
	export type EmitterEventPowerSpinsIntro = {
		type: 'powerSpinsIntro';
		totalSpins: number;
		runes: RuneName[];
	};
</script>

<script lang="ts">
	import { CanvasSizeRectangle } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Container, Text } from 'pixi-svelte';
	import { waitForResolve } from 'utils-shared/wait';

	import FreeSpinAnimation from './FreeSpinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import RuneGlyph from './RuneGlyph.svelte';
	import { getContext } from '../game/context';
	import { RUNES } from '../game/runes';
	import { signTextStyle } from '../game/signText';

	const context = getContext();

	// On the free spins screens' wooden panel, popping in with the same rays behind it (see
	// FreeSpinAnimation), in its words' space (its planks about 1610 x 940 round the middle): the
	// title with how many spins ("2 POWER SPINS"), and each collected rune with its power under it,
	// room for all four (each power's words wrap in its rune's width, the longest, MULTIPLIER, just
	// fitting); just the title, bigger, when there are none.
	const TITLE = { runes: { y: -290, size: 150 }, none: { y: 0, size: 200 } };
	const GLYPH = 280;
	const ITEM = 380;
	const GLYPH_TOP = -130;
	const POWER = { gap: 36, size: 84 };

	let show = $state(false);
	let totalSpins = $state(0);
	let runes = $state<RuneName[]>([]);
	let oncomplete = $state(() => {});

	const title = $derived(runes.length ? TITLE.runes : TITLE.none);

	context.eventEmitter.subscribeOnMount({
		powerSpinsIntro: async (emitterEvent) => {
			totalSpins = emitterEvent.totalSpins;
			runes = emitterEvent.runes;
			show = true;
			await waitForResolve((resolve) => (oncomplete = resolve));
			show = false;
		},
	});

	// in the logo's lettering (signText), centred
	const textStyle = (fontSize: number) => ({
		...signTextStyle(fontSize),
		align: 'center' as const,
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

	<FreeSpinAnimation>
		{#snippet children()}
			<Text
				anchor={0.5}
				y={title.y}
				text={`${totalSpins} POWER SPINS`}
				style={{ ...textStyle(title.size), letterSpacing: title.size * 0.05 }}
			/>
			{#each runes as rune, i}
				<Container x={(i - (runes.length - 1) / 2) * ITEM} y={GLYPH_TOP}>
					<RuneGlyph {rune} size={GLYPH} x={-GLYPH / 2} glows={[]} flash={1} grid />
					<Text
						y={GLYPH + POWER.gap}
						anchor={{ x: 0.5, y: 0 }}
						text={RUNES[rune].powerText(context.stateGame.bonusType, context.stateGame)}
						style={{
							...textStyle(POWER.size),
							wordWrap: true,
							wordWrapWidth: ITEM,
						}}
					/>
				</Container>
			{/each}
		{/snippet}
	</FreeSpinAnimation>

	{#if show}
		<PressToContinue onpress={() => oncomplete()} />
	{/if}
</FadeContainer>
