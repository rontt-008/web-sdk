<script lang="ts" module>
	// put the note up and wait for it to be pressed away (none where there's no note: at once)
	export type EmitterEventStickyNote = { type: 'stickyNoteShow' };
</script>

<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { onDestroy } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { backOut, cubicIn } from 'svelte/easing';
	import { Container, Graphics, Rectangle, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { sidePanelLayout } from '../game/sideLayout';
	import { notebook, notebookLabel, notebookText, whyHeading, whyLines } from '../game/notebook.svelte';

	// A yellow sticky note slapped over the board's top right corner, a little askew, when a spin ends
	// before any capture or check (or with none left), on tall and almost square screens, where the
	// notebook is a strip too small for the engine's reasons: its first one ("Qxd7 would lose to Rxd7
	// (-2.4)"). The game waits on it (the spin's end, sequenceEnd) until a press anywhere on the screen
	// puts it away. (On desktop and on phones held sideways the side panel shows
	// the reasons in full, and nothing waits.)
	const context = getContext();
	const note = $derived(sidePanelLayout().note);

	const WIDTH = 300;
	const PAD = 16;
	const BODY = 19;
	const LINE = 24;
	const HINT = 26;

	let show = $state(false);
	let release: (() => void) | undefined;
	const why = $derived(whyLines()[0]);
	const heading = $derived(whyHeading());

	const dismiss = () => {
		show = false;
		release?.();
		release = undefined;
	};

	context.eventEmitter.subscribeOnMount({
		stickyNoteShow: () => {
			if (!note || !why || context.stateGame.sandbox) return;
			release?.();
			show = true;
			return new Promise<void>((resolve) => (release = resolve));
		},
	});
	// opening the notebook to read the rest does for a press too
	$effect(() => {
		if (notebook.open && show) dismiss();
	});
	// nowhere to show it (the screen turned to desktop or sideways): the game goes on
	$effect(() => {
		if (!note && show) dismiss();
	});
	onDestroy(() => release?.());

	const visible = $derived(show && Boolean(note) && Boolean(why));
	const shown = new Tween(0);
	$effect(() => {
		if (visible) shown.set(1, { duration: 380, easing: backOut });
		else shown.set(0, { duration: 200, easing: cubicIn });
	});

	// tall enough for its text, as near as can be told without measuring it
	const lines = $derived(Math.max(1, Math.ceil(((why?.length ?? 0) * BODY * 0.54) / (WIDTH - PAD * 2))));
	const height = $derived(PAD + 22 + lines * LINE + HINT + PAD);

	const screen = $derived(context.stateGameDerived.screenBounds());
	const screenSize = $derived({ width: screen.right - screen.left, height: screen.bottom - screen.top });

	const resolution = $derived(
		Math.max(1, context.stateLayoutDerived.mainLayout().scale * Math.min(window.devicePixelRatio || 1, 2)),
	);

	// the note: a soft shadow, the paper with a deeper band of glue along its top, and its bottom right
	// corner curling up a little
	const drawNote = (graphics: PIXI.Graphics) => {
		graphics.rect(6, 8, WIDTH, height).fill({ color: 0x000000, alpha: 0.28 });
		graphics.rect(0, 0, WIDTH, height).fill(0xfff1a1);
		graphics.rect(0, 0, WIDTH, 12).fill(0xf5e17c);
		graphics.poly([WIDTH - 26, height, WIDTH, height - 18, WIDTH, height]).fill({ color: 0x000000, alpha: 0.12 });
		graphics.poly([WIDTH - 26, height, WIDTH, height - 18, WIDTH - 20, height - 22]).fill(0xfff8c9);
	};
</script>

{#if note && shown.current > 0.01}
	<MainContainer>
		<!-- while it's up, a press anywhere on the screen (the UI too: it's drawn over it) puts it away -->
		{#if show}
			<Button x={screen.left} y={screen.top} sizes={screenSize} onpress={dismiss}>
				{#snippet children()}
					<Rectangle width={screenSize.width} height={screenSize.height} backgroundColor={0x000000} backgroundAlpha={0.001} />
				{/snippet}
			</Button>
		{/if}
		<Container
			x={note.x + (1 - shown.current) * 60}
			y={note.y}
			alpha={Math.min(1, shown.current)}
			rotation={-0.045}
			scale={0.9 + shown.current * 0.1}
		>
			<Button x={-WIDTH} y={0} sizes={{ width: WIDTH, height }} onpress={dismiss}>
				{#snippet children()}
					<Graphics draw={drawNote} />
					<Text text={heading} x={PAD} y={PAD + 2} {resolution} style={notebookLabel(13, 0x8a6d12)} />
					<Text
						text={why ?? ''}
						x={PAD}
						y={PAD + 24}
						{resolution}
						style={notebookText(BODY, 0x3a2e0a, { fontWeight: '600', wordWrap: true, wordWrapWidth: WIDTH - PAD * 2, lineHeight: LINE })}
					/>
					<Text
						text="TAP ANYWHERE TO CONTINUE"
						anchor={{ x: 1, y: 1 }}
						x={WIDTH - PAD - 14}
						y={height - PAD + 2}
						{resolution}
						style={notebookLabel(12, 0x8a6d12)}
					/>
				{/snippet}
			</Button>
		</Container>
	</MainContainer>
{/if}
