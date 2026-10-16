<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import SymbolSpine from './SymbolSpine.svelte';
	import SymbolSprite from './SymbolSprite.svelte';
	import { getSymbolInfo, getSymbolMotion } from '../game/utils';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { getContext } from '../game/context';
	import { BIG_WILD_MULTIPLIER } from '../game/constants';
	import { popOut } from '../game/motion';
	import { createBoardTextStyle, fitBoardFontSize } from '../game/textStyles';
	import { Text } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
		// squash and spring back once, as when a cat lands (sprite symbols only)
		jiggle?: boolean;
		// wiggle on a loop (sprite symbols only)
		excited?: boolean;
		// darkened while other symbols win (sprite symbols only)
		dimmed?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const symbolInfo = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
	const isSprite = $derived(symbolInfo.type === 'sprite');
	const motion = $derived(getSymbolMotion({ rawSymbol: props.rawSymbol, state: props.state }));
	// wins have no frame around each symbol: a line is drawn through them instead (see WinLine)
	const bigWildMultiplier = $derived(props.rawSymbol.bigWild?.multiplier);
	const bigWildMultiplierText = $derived(`${bigWildMultiplier}X`);
	// shrink long text to fit the strip
	const bigWildMultiplierFontSize = $derived(
		fitBoardFontSize({
			text: bigWildMultiplierText,
			fontSize: BIG_WILD_MULTIPLIER.fontSize,
			maxWidth: BIG_WILD_MULTIPLIER.maxWidth,
		}),
	);
	// same look as the win amounts on the lines, in yellow fading down to orange
	const bigWildMultiplierStyle = $derived(
		createBoardTextStyle({
			fontSize: bigWildMultiplierFontSize,
			top: 0xffe234,
			bottom: 0xff8c1a,
			outline: 0x4a1c00,
		}),
	);

	// As the big wild lands its multiplier pops onto the strip just after the slam, and it gives an
	// extra kick each time the big wild swells in a win.
	const MULTIPLIER_POP_DELAY = 140;
	const MULTIPLIER_POP_DURATION = 380;
	const MULTIPLIER_WIN_KICK = 0.18;
	const multiplierScale = new Tween(props.state === 'land' ? 0 : 1);
	$effect(() => {
		if (!bigWildMultiplier) return;
		const state = props.state;
		untrack(async () => {
			const timeScale = stateBetDerived.timeScale();
			if (state === 'land') {
				await multiplierScale.set(0, { duration: 0 });
				await waitForTimeout(MULTIPLIER_POP_DELAY / timeScale);
				await multiplierScale.set(1, {
					duration: MULTIPLIER_POP_DURATION / timeScale,
					easing: (t) => popOut(t, 3),
				});
			} else if (state === 'win') {
				await multiplierScale.set(1 + MULTIPLIER_WIN_KICK, {
					duration: 160 / timeScale,
				});
				await multiplierScale.set(1, {
					duration: 420 / timeScale,
					easing: (t) => popOut(t, 3),
				});
			}
		});
	});
</script>

{#if isSprite}
	<SymbolSprite
		{symbolInfo}
		x={props.x}
		y={props.y}
		{motion}
		jiggle={props.jiggle}
		excited={props.excited}
		dimmed={props.dimmed}
		oncomplete={props.oncomplete}
	>
		{#if bigWildMultiplier}
			<Text
				anchor={0.5}
				y={BIG_WILD_MULTIPLIER.y}
				scale={multiplierScale.current}
				text={bigWildMultiplierText}
				style={bigWildMultiplierStyle}
			/>
		{/if}
	</SymbolSprite>
{:else}
	<SymbolSpine
		loop={props.loop}
		{symbolInfo}
		x={props.x}
		y={props.y}
		listener={{
			complete: props.oncomplete,
			event: (_, event) => {
				if (event.data?.name === 'wildExplode') {
					context.eventEmitter?.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
				}
			},
		}}
	/>
{/if}
