<script lang="ts" module>
	export type MoveLabelKind = 'good' | 'bad' | 'mate' | 'info';

	export type EmitterEventMoveLabel =
		// `mark`: the sign in the square at the slip's left end (+ for a check, # for a mate...)
		| { type: 'moveLabel'; text: string; kind: MoveLabelKind; hold: number; mark?: string }
		| { type: 'moveLabelHide' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { Container } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import PrintSlip from './PrintSlip.svelte';

	// A word over the board: CHECK, CHECKMATE!, STALEMATE... printed on a slip of the start screen cards'
	// paper (PrintSlip), a little askew, with the move's sign as a chess book writes it in a square at its
	// left end: + for a check, # for a mate, – for a quiet move, ½ for a draw. It pops up and stays for
	// its hold, then fades; a new one replaces it at once.
	// - good and info: in ink
	// - bad (your king in check, or mated): in red
	// - mate (your checkmate, the MAX square): in red, bigger, a row of chessboard squares along its top
	//   and foot
	const context = getContext();
	const LOOKS: Record<MoveLabelKind, { size: number; tone: 'ink' | 'red'; band: boolean }> = {
		info: { size: SYMBOL_SIZE * 0.4, tone: 'ink', band: false },
		good: { size: SYMBOL_SIZE * 0.46, tone: 'ink', band: false },
		bad: { size: SYMBOL_SIZE * 0.46, tone: 'red', band: false },
		mate: { size: SYMBOL_SIZE * 0.66, tone: 'red', band: true },
	};
	const TILT = -0.035;

	let show = $state(false);
	let text = $state('');
	let mark = $state<string>();
	let kind = $state<MoveLabelKind>('info');
	let latest = 0;
	const pop = new Tween(1);

	context.eventEmitter.subscribeOnMount({
		moveLabel: async (emitterEvent) => {
			const call = ++latest;
			text = emitterEvent.text;
			mark = emitterEvent.mark;
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
			rotation={TILT}
		>
			{#key `${kind}|${mark ?? ''}`}
				<PrintSlip {text} {mark} {...LOOKS[kind]} />
			{/key}
		</Container>
	</MainContainer>
</FadeContainer>
