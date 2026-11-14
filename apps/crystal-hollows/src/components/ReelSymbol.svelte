<script lang="ts">
	import { untrack } from 'svelte';

	import Symbol from './Symbol.svelte';
	import SymbolWin from './SymbolWin.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getContext } from '../game/context';
	import { getSymbolX, getSymbolInfo } from '../game/utils';
	import { Container } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';
	import { stateBetDerived } from 'state-shared';

	import { OVERSIZE_SYMBOLS, LAND_POSE, SYMBOL_SIZE } from '../game/constants';
	import { coverAlpha, hitTallWild, underTallWild } from '../game/tallWilds.svelte';
	import { stateLanded, landPose } from '../game/landPose.svelte';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();
	const context = getContext();
	const isWin = $derived(props.reelSymbol.symbolState === 'win');
	// a symbol with its own win animation (the premiums' hits) plays that; the rest pulse (SymbolWin)
	const winInfo = $derived(getSymbolInfo({ rawSymbol: props.reelSymbol.rawSymbol, state: 'win' }));
	const winPlays = $derived('play' in winInfo && winInfo.play);
	// an oversize symbol (the wild) is drawn over the board's mask once its reel is at rest (stopped and
	// bounced back), so it isn't cut at the board's edge; while the reel moves it is its still, under the
	// mask, so its idle starts over the board, on the still, rather than restarting as it moves there
	const reelState = $derived(context.stateGame.board[props.reelIndex].reelState);
	const oversize = $derived(OVERSIZE_SYMBOLS.includes(props.reelSymbol.rawSymbol.name));
	const atRest = $derived(reelState.motion === 'stopped');
	const overBoard = $derived(oversize && atRest);
	const state = $derived(oversize && !atRest ? 'spin' : props.reelSymbol.symbolState);
	// under a tall wild it fades out as the WILD opens over it (the ring at once), and stays hidden as
	// it goes (tallWilds); still there, so its wins run and end as usual
	const alpha = $derived(coverAlpha(props.reelIndex, props.reelSymbol));
	// shown again (the tall wild closing, in the bonus), it starts over, so its idle starts on its
	// still rather than wherever it had got to while hidden
	const hidden = $derived(alpha === 0);
	// under a WILD at rest, its win is the WILD's: the WILD's bat reacts (its hit, TallWild), and the win
	// is done when that is (it doesn't pulse, hidden as it is)
	const winUnderWild = $derived(isWin && underTallWild(props.reelIndex, props.reelSymbol));
	$effect(() => {
		if (!winUnderWild) return;
		untrack(() => hitTallWild(props.reelIndex).then(() => props.reelSymbol.oncomplete()));
	});

	// its slight tumble as it lands (landPose): a symbol that lands as its still (the letters and the
	// premiums; the wild spins and the free spins symbol drops on its own) squashes onto its base as it
	// reaches its place (its reel says when: its count in stateLanded goes up), rebounds a touch and
	// settles. `pose` goes 0 to 1 through it (1: at rest).
	const posesOnLand = $derived(
		getSymbolInfo({ rawSymbol: props.reelSymbol.rawSymbol, state: 'land' }).type === 'sprite',
	);
	const landed = $derived(
		stateLanded.counts[props.reelIndex][props.reelSymbol.symbolIndexOfBoard + 1],
	);
	const pose = new Tween(1);
	let landedBefore = untrack(() => landed);
	$effect(() => {
		const count = landed;
		if (count === landedBefore) return;
		landedBefore = count;
		if (!untrack(() => posesOnLand)) return;
		pose.set(0, { duration: 0 });
		pose.set(1, { duration: LAND_POSE.durationMs / (stateBetDerived.timeScale() || 1) });
	});
	const squash = $derived(landPose(pose.current));
	const POSE_PIVOT = LAND_POSE.pivot * SYMBOL_SIZE;
</script>

<!-- a winning symbol is drawn over the board (not clipped by its mask) while it pulses or plays its
	 hit (which springs up and swells past its cell), and so is an oversize one at rest -->
<SymbolWrap
	x={getSymbolX(props.reelIndex)}
	y={props.reelSymbol.symbolY.current}
	animating={isWin || overBoard}
>
	<Container {alpha} y={POSE_PIVOT} pivot={{ x: 0, y: POSE_PIVOT }} scale={squash}>
		{#if isWin && !winUnderWild}
			<SymbolWin pulse={!winPlays} oncomplete={() => props.reelSymbol.oncomplete()}>
				{#snippet children(done)}
					<Symbol
						state="win"
						rawSymbol={props.reelSymbol.rawSymbol}
						oncomplete={winPlays ? done : undefined}
					/>
				{/snippet}
			</SymbolWin>
		{:else}
			{#key hidden}
				<Symbol
					{state}
					rawSymbol={props.reelSymbol.rawSymbol}
					oncomplete={() => {
						// (only its land itself ends it: not an oversize symbol's still, shown in its place
						// till its reel is at rest, which says it is done as soon as it shows)
						if (props.reelSymbol.symbolState === 'land' && state === 'land')
							props.reelSymbol.symbolState = 'static';
					}}
				/>
			{/key}
		{/if}
	</Container>
</SymbolWrap>
