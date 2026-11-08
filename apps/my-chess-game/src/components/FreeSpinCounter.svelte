<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { BitmapText, Sprite } from 'pixi-svelte';

	const context = getContext();
	const PANEL_KEY_DESKTOP = 'Frame_FSCounter.png';
	const PANEL_RATIO_DESKTOP = 824 / 622;
	const panelKey = PANEL_KEY_DESKTOP;
	const panelWidth = $derived(SYMBOL_SIZE * 2);
	const panelSizes = $derived({
		width: panelWidth,
		height: panelWidth / PANEL_RATIO_DESKTOP,
	});
	const scale = 1;
	const position = $derived({
		x:
			context.stateGameDerived.boardLayout().x -
			context.stateGameDerived.boardLayout().width * 0.5 -
			context.stateGameDerived.boardLayout().frame -
			panelSizes.width -
			SYMBOL_SIZE * 0.9,
		y:
			context.stateGameDerived.boardLayout().y -
			context.stateGameDerived.boardLayout().height * 0.5,
	});

	const fontSize = SYMBOL_SIZE * 0.34;

	// The free spins left, on their frame left of the board in the bonus: how many are still to come
	// after the one being played, of how many in all ("10 OF 10" as the bonus starts, "9 OF 10" once its
	// first spin is under way), from the game's count (stateGame.freeSpins; the count's updates,
	// freeSpinCounterUpdate, are for the SDK's counter and not needed here)
	let show = $state(false);
	const total = $derived(context.stateGame.freeSpins.total);
	const left = $derived(Math.max(0, total - context.stateGame.freeSpins.current));

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
	});
</script>

<MainContainer>
	<FadeContainer {show} {...position} {scale}>
		<Sprite key={panelKey} {...panelSizes} />
		<BitmapText
			text={`${left} OF ${total}`}
			anchor={0.5}
			x={panelSizes.width * 0.5}
			y={panelSizes.height * 0.48}
			style={{ fontFamily: 'gold', fontSize }}
		/>
	</FadeContainer>
</MainContainer>
