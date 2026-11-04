<script lang="ts" module>
	export type MoveLabelKind = 'good' | 'bad' | 'mate' | 'info';

	export type EmitterEventMoveLabel =
		| { type: 'moveLabel'; text: string; kind: MoveLabelKind; hold: number }
		| { type: 'moveLabelHide' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { Container, Rectangle, Text, type Sizes } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	// a word over the board: CHECK, CHECKMATE!, STALEMATE... It pops up and stays for its hold, then
	// fades; a new one replaces it at once
	const context = getContext();
	const COLOURS: Record<MoveLabelKind, number> = {
		good: 0xf2c94c,
		bad: 0xe8503f,
		mate: 0xffd86b,
		info: 0xe8d9b8,
	};
	const PAD = { x: SYMBOL_SIZE * 0.5, y: SYMBOL_SIZE * 0.22 };

	let show = $state(false);
	let text = $state('');
	let kind = $state<MoveLabelKind>('info');
	let textSizes = $state<Sizes>({ width: 0, height: 0 });
	let latest = 0;
	const pop = new Tween(1);

	const fontSize = $derived(SYMBOL_SIZE * (kind === 'mate' ? 0.8 : 0.5));

	context.eventEmitter.subscribeOnMount({
		moveLabel: async (emitterEvent) => {
			const call = ++latest;
			text = emitterEvent.text;
			kind = emitterEvent.kind;
			show = true;
			pop.set(0.6, { duration: 0 });
			pop.set(1, { duration: 240 / stateBetDerived.timeScale(), easing: backOut });
			await waitForTimeout(emitterEvent.hold / stateBetDerived.timeScale());
			if (call === latest) show = false;
		},
		moveLabelHide: () => {
			latest++;
			show = false;
		},
	});
</script>

<FadeContainer {show}>
	<MainContainer>
		<Container
			x={context.stateGameDerived.boardLayout().x}
			y={context.stateGameDerived.boardLayout().y}
			scale={pop.current}
		>
			<Rectangle
				anchor={0.5}
				width={textSizes.width + PAD.x * 2}
				height={textSizes.height + PAD.y * 2}
				borderRadius={SYMBOL_SIZE * 0.2}
				backgroundColor={0x0a0a0c}
				backgroundAlpha={0.82}
				borderColor={COLOURS[kind]}
				borderWidth={3}
			/>
			<Text
				{text}
				anchor={0.5}
				style={{
					fontFamily: 'proxima-nova',
					fontSize,
					fontWeight: '800',
					letterSpacing: 2,
					fill: COLOURS[kind],
				}}
				onresize={(sizes) => (textSizes = sizes)}
			/>
		</Container>
	</MainContainer>
</FadeContainer>
