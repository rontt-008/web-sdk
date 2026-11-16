<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { Container, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { gameTextStyle, TEXT_GOLD } from '../game/textStyles';
	import PressToContinue from './PressToContinue.svelte';

	// The free spins won, in plain text over the dimmed board: the number big, FREE SPINS under it.
	// The sample's Mining Mayhem panel animation and word pictures were removed.

	const context = getContext();

	let show = $state(false);
	let freeSpins = $state(0);
	let oncomplete = $state(() => {});

	const board = $derived(context.stateGameDerived.boardLayout());

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => (show = true),
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async (emitterEvent) => {
			freeSpins = emitterEvent.totalFreeSpins;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.6} />

	<MainContainer>
		<Container x={board.x} y={board.y}>
			<Text
				anchor={{ x: 0.5, y: 1 }}
				y={-SYMBOL_SIZE * 0.6}
				text="YOU WON"
				style={gameTextStyle(SYMBOL_SIZE * 0.45)}
			/>
			<Text
				anchor={0.5}
				text={`${freeSpins}`}
				style={gameTextStyle(SYMBOL_SIZE * 1.6, TEXT_GOLD)}
			/>
			<Text
				anchor={{ x: 0.5, y: 0 }}
				y={SYMBOL_SIZE * 0.75}
				text="FREE SPINS"
				style={gameTextStyle(SYMBOL_SIZE * 0.75)}
			/>
		</Container>
	</MainContainer>

	{#if show}
		<PressToContinue onpress={() => oncomplete()} />
	{/if}
</FadeContainer>
