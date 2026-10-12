<script lang="ts" module>
	import { SYMBOL_SIZE } from '../game/constants';

	export const BOOSTER_SWITCH_SIZES = { width: SYMBOL_SIZE * 0.5, height: SYMBOL_SIZE * 0.27 };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Circle, Container, Rectangle, Text } from 'pixi-svelte';

	import { createBoardTextStyle } from '../game/textStyles';

	type Props = { x?: number; y?: number; on: boolean };

	const { on, ...containerProps }: Props = $props();

	// A pill-shaped switch, drawn around its centre: the knob slides right and the track turns
	// green when on.
	const { width, height } = BOOSTER_SWITCH_SIZES;
	const OUTLINE_COLOR = 0x4a1c00;
	const BORDER_WIDTH = 3;
	const OFF_TRACK_COLOR = 0x173a6b;
	const ON_TRACK_COLOR = 0x55d43c;
	const KNOB_COLOR = 0xfff2c2;
	const KNOB_INSET = 5;
	const KNOB_DIAMETER = height - KNOB_INSET * 2;
	// how far the knob centre is from the middle at either end
	const KNOB_TRAVEL = width * 0.5 - KNOB_INSET - KNOB_DIAMETER * 0.5;
	// the label sits in the free part of the track, on the side away from the knob
	const LABEL_X = (KNOB_INSET + KNOB_DIAMETER) * 0.5;
	const LABEL_STYLE = createBoardTextStyle({
		fontSize: SYMBOL_SIZE * 0.1,
		top: 0xffffff,
		bottom: 0xfff2c2,
		outline: OUTLINE_COLOR,
	});
	const SLIDE_DURATION = 220;

	// 0 is off, 1 is on; slides whenever the booster changes, whatever changed it
	const progress = new Tween(on ? 1 : 0, { duration: SLIDE_DURATION, easing: cubicOut });

	$effect(() => {
		progress.target = on ? 1 : 0;
	});
</script>

<Container {...containerProps}>
	<Rectangle
		anchor={0.5}
		{width}
		{height}
		borderRadius={height * 0.5}
		backgroundColor={OFF_TRACK_COLOR}
		borderColor={OUTLINE_COLOR}
		borderWidth={BORDER_WIDTH}
	/>
	<Rectangle
		anchor={0.5}
		{width}
		{height}
		borderRadius={height * 0.5}
		backgroundColor={ON_TRACK_COLOR}
		borderColor={OUTLINE_COLOR}
		borderWidth={BORDER_WIDTH}
		alpha={progress.current}
	/>
	<Text anchor={0.5} x={-LABEL_X} text="ON" style={LABEL_STYLE} alpha={progress.current} />
	<Text anchor={0.5} x={LABEL_X} text="OFF" style={LABEL_STYLE} alpha={1 - progress.current} />
	<Circle
		anchor={0.5}
		x={(progress.current * 2 - 1) * KNOB_TRAVEL}
		diameter={KNOB_DIAMETER}
		backgroundColor={KNOB_COLOR}
		borderColor={OUTLINE_COLOR}
		borderWidth={BORDER_WIDTH}
	/>
</Container>
