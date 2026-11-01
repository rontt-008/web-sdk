<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number; title?: string };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { signTextStyle } from '../game/signText';

	const context = getContext();

	// The free and power spins' count on the user's wooden sign (static/assets/spin-sign.webp, from
	// art-source/wood-frames.py: dark planks in a frame of branches with maple leaves), in the bonus
	// meter's place under the logo (the meter is hidden in the bonus), as wide as the logo: the spins' name
	// over the count, in the logo's lettering (signText), in the middle of the planks. In the art's
	// pixels: its size, and the planks inside the branches (where the top branch dips lowest).
	const SIGN_ART = {
		width: 1612,
		height: 840,
		planks: { left: 240, top: 256, right: 1416, bottom: 624 },
	};
	// in the planks' height
	const TITLE_SIZE = 0.38;
	const COUNT_SIZE = 0.52;

	const layout = $derived.by(() => {
		const meter = context.stateGameDerived.spinSignLayout();
		const scale = meter.width / SIGN_ART.width;
		const { left, top, right, bottom } = SIGN_ART.planks;
		return {
			x: meter.x,
			y: meter.y,
			width: meter.width,
			height: SIGN_ART.height * scale,
			middle: { x: ((left + right) / 2) * scale, y: ((top + bottom) / 2) * scale },
			planksHeight: (bottom - top) * scale,
		};
	});

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	// FREE SPIN, or POWER SPIN after the free spins
	let title = $state('FREE SPIN');

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
			if (emitterEvent.title !== undefined) title = emitterEvent.title;
		},
	});
</script>

<MainContainer>
	<FadeContainer {show} x={layout.x} y={layout.y}>
		<Sprite key="spinSign" width={layout.width} height={layout.height} />
		<Text
			x={layout.middle.x}
			y={layout.middle.y}
			anchor={{ x: 0.5, y: 1 }}
			text={title}
			style={signTextStyle(layout.planksHeight * TITLE_SIZE)}
		/>
		<Text
			x={layout.middle.x}
			y={layout.middle.y}
			anchor={{ x: 0.5, y: 0 }}
			text={`${current} OF ${total}`}
			style={signTextStyle(layout.planksHeight * COUNT_SIZE)}
		/>
	</FadeContainer>
</MainContainer>
