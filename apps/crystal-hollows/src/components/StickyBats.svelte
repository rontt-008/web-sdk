<script lang="ts">
	import { Container } from 'pixi-svelte';

	import SymbolSpineMain from './SymbolSpineMain.svelte';
	import { stateStickyBats, type StickyBat } from '../game/stickyBats.svelte';
	import { stateTallWilds } from '../game/tallWilds.svelte';
	import {
		REEL_WIDTH,
		SYMBOL_SIZE,
		BOARD_DIMENSIONS,
		TALL_WILD,
		WILD_SIZE,
	} from '../game/constants';

	// The bonus's sticky bats (stickyBats): each the bat ring (the wild's skeleton), over the board,
	// spinning reels included: hovering in its reel's middle as small as the way back leaves it
	// (ringSize), then growing to the wild's size as it takes off, fluttering round and leaning into its
	// flight (its idle), and swooping onto a symbol of its new reel. There, as a ring that lands does, it
	// spins once (the skeleton's `spin`), then flies to the reel's middle, shrinking to the morph's ring
	// and beating its wings once (`fly`, as long as the glide; the morph's first frame fades in under it
	// near the end, TallWild), and is hidden while the tall wild is the WILD. Shown again when the WILD
	// turns back into it, its idle starts over, on the way back's last frame (the idle's first). Each of
	// its animations starts on the setup pose and the spin and the fly end on it.

	const MIDDLE = (BOARD_DIMENSIONS.y - 1) / 2;
	const spine = (animationName: string, play: boolean) =>
		({
			type: 'spine',
			assetKey: 'wild',
			animationName,
			...(play ? { play: true } : { loop: true }),
			sizeRatios: { width: WILD_SIZE, height: WILD_SIZE },
		}) as const;
	const ANIMATIONS = { idle: spine('idle', false), spin: spine('spin', true), fly: spine('fly', true) };

	// where it is (in cells), how big, how much it shows and what it plays: by its own flight, or by its
	// reel's tall wild once it is down
	const look = (bat: StickyBat) => {
		const own = { x: bat.pos.x, y: bat.pos.y, size: bat.size.current, alpha: 1, play: 'idle' as const };
		const tallWild = stateTallWilds.reels[bat.reel];
		if (tallWild?.bat !== bat || tallWild.phase === 'arrive' || tallWild.phase === 'gone') return own;
		if (tallWild.phase === 'hold') return { ...own, play: 'spin' as const };
		if (tallWild.phase !== 'glide') return { ...own, alpha: 0 };
		const glide = tallWild.glide.current;
		return {
			x: bat.reel,
			y: tallWild.ringRow + (MIDDLE - tallWild.ringRow) * glide,
			size: WILD_SIZE + (TALL_WILD.ringSize - WILD_SIZE) * glide,
			alpha: 1,
			play: 'fly' as const,
		};
	};
</script>

{#each stateStickyBats.bats as bat (bat)}
	{@const at = look(bat)}
	{@const alpha = at.alpha * bat.alpha.current}
	{#if alpha > 0}
		<Container
			x={REEL_WIDTH * (at.x + 0.5)}
			y={SYMBOL_SIZE * (at.y + 0.5 - bat.rise.current)}
			rotation={bat.tilt}
			scale={at.size / WILD_SIZE}
			{alpha}
		>
			{#key `${at.play}/${bat.hovers}`}
				<SymbolSpineMain symbolInfo={ANIMATIONS[at.play]} loop={at.play === 'idle'} listener={{}} />
			{/key}
		</Container>
	{/if}
{/each}
