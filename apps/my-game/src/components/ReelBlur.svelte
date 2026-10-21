<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { BlurFilter } from 'pixi.js';
	import { Container } from 'pixi-svelte';
	import { getContextBoard } from 'components-shared';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { Reel } from '../game/stateGame.svelte';

	type Props = {
		reel: Reel;
		children: Snippet;
	};

	const props: Props = $props();
	const context = getContext();
	// only the board's layer of resting and spinning symbols; the one of animating symbols (see
	// SymbolWrap) has nothing that spins
	const boardContext = getContextBoard();

	// A spinning reel's symbols blur up and down with its speed, so they streak by rather than
	// strobe: at full speed they move about half a symbol a frame, where the eye can't follow them.
	// None below a crawl, so a reel slowing to land (or teased) stays sharp.
	//   from: the speed (board pixels per ms) it starts at; strength: of how far the symbols move on
	//   the screen in a 60 Hz frame above that speed; quality: blur passes
	const BLUR = { from: 1, strength: 0.02, quality: 2 };
	const FRAME_MS = 1000 / 60;
	// moved further than this in a frame, the reel jumped back for its next lap rather than moved
	const JUMP = SYMBOL_SIZE * 3;

	const blur = new BlurFilter({
		strengthX: 0,
		strengthY: 0,
		quality: BLUR.quality,
		resolution: 'inherit',
	});
	let blurring = $state(false);

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker || boardContext.animate) return;
		// untracked, or the effect would run again (and start over) each time the reel moves
		let last = untrack(() => props.reel.position());
		// before the frame is drawn: how far the reel moved since the last one
		const tick = () => {
			const now = props.reel.position();
			const moved = Math.abs(now - last);
			last = now;
			if (moved > JUMP || ticker.deltaMS <= 0) return;
			const speed = moved / ticker.deltaMS;
			const strength =
				BLUR.strength *
				Math.max(0, speed - BLUR.from) *
				FRAME_MS *
				context.stateLayoutDerived.mainLayout().scale;
			blur.strengthY = strength;
			blurring = strength > 0.5;
		};
		ticker.add(tick);
		return () => ticker.remove(tick);
	});
</script>

<Container filters={blurring ? [blur] : []}>
	{@render props.children()}
</Container>
