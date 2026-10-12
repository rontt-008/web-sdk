<script lang="ts" module>
	export type EmitterEventFreeSpinRetrigger = { type: 'freeSpinRetriggerShow'; extraSpins: number };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { Text } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { createBoardTextStyle } from '../game/textStyles';

	// "+2 FREE SPINS" popping up over the board when FS symbols add spins during free spins, then
	// fading away by itself, in the light yellow of the free spin intro's title. Faster in turbo.
	const OUTLINE_COLOR = 0x4a1c00;
	const COLORS = { top: 0xfffbe6, bottom: 0xffe27a };
	const AMOUNT_STYLE = createBoardTextStyle({
		fontSize: SYMBOL_SIZE * 1.1,
		...COLORS,
		outline: OUTLINE_COLOR,
	});
	const LABEL_STYLE = createBoardTextStyle({
		fontSize: SYMBOL_SIZE * 0.45,
		...COLORS,
		outline: OUTLINE_COLOR,
	});
	// down from the board's middle, in rows
	const LINES_MEET_Y = 0.35;
	const POP_SCALE = 0.5;
	const POP_DURATION = 350;
	const HOLD_DURATION = 1200;
	const FADE_DURATION = 300;

	const context = getContext();

	let show = $state(false);
	let extraSpins = $state(0);
	const scale = new Tween(1, { easing: backOut });

	context.eventEmitter.subscribeOnMount({
		freeSpinRetriggerShow: async (emitterEvent) => {
			const timeScale = stateBetDerived.timeScale();
			extraSpins = emitterEvent.extraSpins;
			show = true;
			await scale.set(POP_SCALE, { duration: 0 });
			await scale.set(1, { duration: POP_DURATION / timeScale });
			await waitForTimeout(HOLD_DURATION / timeScale);
			show = false;
			await waitForTimeout(FADE_DURATION);
		},
	});
</script>

<MainContainer>
	<FadeContainer
		{show}
		duration={FADE_DURATION}
		x={context.stateGameDerived.boardLayout().x}
		y={context.stateGameDerived.boardLayout().y}
		scale={scale.current}
	>
		<!-- the two lines meet a little below the board's middle, which centres them together -->
		<Text
			anchor={{ x: 0.5, y: 1 }}
			y={SYMBOL_SIZE * LINES_MEET_Y}
			text={`+${extraSpins}`}
			style={AMOUNT_STYLE}
		/>
		<Text
			anchor={{ x: 0.5, y: 0 }}
			y={SYMBOL_SIZE * (LINES_MEET_Y - 0.05)}
			text={extraSpins === 1 ? 'FREE SPIN' : 'FREE SPINS'}
			style={LABEL_STYLE}
		/>
	</FadeContainer>
</MainContainer>
