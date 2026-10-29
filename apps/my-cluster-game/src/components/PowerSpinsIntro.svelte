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
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Container, Graphics, Text } from 'pixi-svelte';
	import { waitForResolve } from 'utils-shared/wait';

	import PressToContinue from './PressToContinue.svelte';
	import RuneGlyph from './RuneGlyph.svelte';
	import { getContext } from '../game/context';
	import { LAYOUT_UNIT } from '../game/constants';
	import { RUNES } from '../game/runes';
	import { uiTheme } from '../game/uiTheme';

	const context = getContext();

	// a flat charcoal panel over the board, like the boxes: the title, how many spins, and each
	// collected rune with its power under it
	const WIDTH = LAYOUT_UNIT * 7.6;
	const HEIGHT = { runes: LAYOUT_UNIT * 3.45, none: LAYOUT_UNIT * 1.75 };
	const GLYPH = LAYOUT_UNIT * 1.15;
	const ITEM = LAYOUT_UNIT * 1.75;
	const PANEL = 0x232227;
	const OUTLINE = 0x0a0a0c;
	const WHITE = 0xffffff;

	let show = $state(false);
	let totalSpins = $state(0);
	let runes = $state<RuneName[]>([]);
	let oncomplete = $state(() => {});

	const board = $derived(context.stateGameDerived.boardLayout());
	const height = $derived(runes.length ? HEIGHT.runes : HEIGHT.none);

	context.eventEmitter.subscribeOnMount({
		powerSpinsIntro: async (emitterEvent) => {
			totalSpins = emitterEvent.totalSpins;
			runes = emitterEvent.runes;
			show = true;
			await waitForResolve((resolve) => (oncomplete = resolve));
			show = false;
		},
	});

	const textStyle = (fontSize: number, fill: number, fontWeight: '700' | '800') => ({
		fontFamily: uiTheme.fontFamily,
		fontSize,
		fontWeight,
		fill,
		align: 'center' as const,
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

	<MainContainer>
		<Container x={board.x} y={board.y} pivot={{ x: WIDTH / 2, y: height / 2 }}>
			<Graphics
				draw={(graphics) =>
					graphics
						.roundRect(0, 0, WIDTH, height, LAYOUT_UNIT * 0.3)
						.fill({ color: PANEL })
						.stroke({ width: LAYOUT_UNIT * 0.06, color: OUTLINE })}
			/>
			<Text
				x={WIDTH / 2}
				y={LAYOUT_UNIT * 0.35}
				anchor={{ x: 0.5, y: 0 }}
				text="POWER SPINS"
				style={{ ...textStyle(LAYOUT_UNIT * 0.62, WHITE, '800'), letterSpacing: LAYOUT_UNIT * 0.03 }}
			/>
			<Text
				x={WIDTH / 2}
				y={LAYOUT_UNIT * 1.1}
				anchor={{ x: 0.5, y: 0 }}
				text={runes.length
					? `${totalSpins} SPINS WITH THE RUNES' POWERS`
					: `${totalSpins} SPINS, NO RUNES COLLECTED`}
				style={{
					...textStyle(LAYOUT_UNIT * 0.24, uiTheme.label.label, '700'),
					letterSpacing: LAYOUT_UNIT * 0.02,
				}}
			/>
			{#each runes as rune, i}
				<Container x={WIDTH / 2 + (i - (runes.length - 1) / 2) * ITEM} y={LAYOUT_UNIT * 1.65}>
					<RuneGlyph {rune} size={GLYPH} x={-GLYPH / 2} glows={[]} flash={1} grid />
					<Text
						y={GLYPH + LAYOUT_UNIT * 0.12}
						anchor={{ x: 0.5, y: 0 }}
						text={RUNES[rune].powerText}
						style={{
							...textStyle(LAYOUT_UNIT * 0.2, WHITE, '800'),
							wordWrap: true,
							wordWrapWidth: ITEM * 0.9,
						}}
					/>
				</Container>
			{/each}
		</Container>
	</MainContainer>

	{#if show}
		<PressToContinue onpress={() => oncomplete()} />
	{/if}
</FadeContainer>
