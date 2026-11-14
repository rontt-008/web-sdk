<script lang="ts">
	import { BaseSprite, Container, Sprite, type LoadedSpriteSheet } from 'pixi-svelte';
	import { getContextBoard } from 'components-shared';

	import SymbolSpineMain from './SymbolSpineMain.svelte';
	import WildMultiplier from './WildMultiplier.svelte';
	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE, BOARD_DIMENSIONS, TALL_WILD, WILD_SIZE } from '../game/constants';
	import type { TallWild } from '../game/tallWilds.svelte';

	// A reel's tall wild (tallWilds): the ring that landed (after its spin, which ReelSymbol shows) flying
	// from its row to the reel's middle as it shrinks to the morph's ring, playing the wild skeleton's
	// `fly` (one beat of its wings, ending on the morph's first pose) as the morph's first frame fades in
	// under it near the end (the same picture there, so it doesn't dim as two half-faded pictures would);
	// the morph, frame by frame (its frames have
	// room each side of the WILD, TALL_WILD.frameWidth, for the bat as it swells and flashes); then the
	// WILD at rest, 1 cell wide and 4 tall (the WILD's picture is 1:4, a little narrower than the reel's
	// REEL_WIDTH, and fills nearly all of it). It is drawn over the board's mask while its reel is at
	// rest (the gliding ring and the swelling bat reach past the board's edge) and under it once the
	// reel drops its next set, falling out with the symbols it covered (then it is let go). When they win,
	// its bat reacts (the hit, over the still; the win waits for it). In the bonus, once its spin is done, it goes back: the way back's frames (the WILD
	// closing into the ring), after which the bat hovers there as a sticky bat (StickyBats). A sticky
	// bat's own tall wild starts once it is on its symbol: it spins and flies as a ring that landed does,
	// but StickyBats draws it, so here only the morph's first frame fades in under it. Its multiplier is
	// written in the cave above its bat (WildMultiplier), doubling with every winning line it is in.

	type Props = { reelIndex: number; tallWild: TallWild };

	const props: Props = $props();
	const context = getContext();
	const boardContext = getContextBoard();

	const HEIGHT = SYMBOL_SIZE * BOARD_DIMENSIONS.y;
	const WIDTH = HEIGHT / 4;
	const MORPH_WIDTH = WIDTH * TALL_WILD.frameWidth;
	const FADE_FROM = 0.75; // of the glide: from here the morph's first frame fades in under the bat

	const reel = $derived(context.stateGame.board[props.reelIndex].reelState);
	const atRest = $derived(reel.motion === 'stopped');
	const top = $derived(props.tallWild.covered[0].symbolY.current - SYMBOL_SIZE / 2);
	const present = $derived(reel.symbols.includes(props.tallWild.covered[0]) && top < HEIGHT);
	const show = $derived(present && boardContext.animate === atRest);

	const textures = $derived(
		context.stateApp.loadedAssets?.wildMorph as LoadedSpriteSheet | undefined,
	);
	const backTextures = $derived(
		context.stateApp.loadedAssets?.wildUnmorph as LoadedSpriteSheet | undefined,
	);
	const at = (sheet: LoadedSpriteSheet | undefined, frame: number) =>
		sheet?.length ? sheet[Math.min(sheet.length - 1, Math.max(0, Math.floor(frame)))] : undefined;
	// the frame shown: gliding there, the morph's first; the morph's; the way back's
	const phase = $derived(props.tallWild.phase);
	const gliding = $derived(phase === 'glide');
	const sticky = $derived(!!props.tallWild.bat);
	const texture = $derived(
		phase === 'glide'
			? at(textures, 0)
			: phase === 'morph'
				? at(textures, props.tallWild.morph.current)
				: phase === 'unmorph'
					? at(backTextures, props.tallWild.unmorph.current)
					: undefined,
	);
	// the frames show for longer at the tall wild's pace (TALL_WILD.pace): the next one fades in over
	// this one as its time comes, so it moves smoothly
	const playing = $derived(
		phase === 'morph'
			? { sheet: textures, frame: props.tallWild.morph.current }
			: phase === 'unmorph'
				? { sheet: backTextures, frame: props.tallWild.unmorph.current }
				: undefined,
	);
	const nextTexture = $derived(playing && at(playing.sheet, Math.floor(playing.frame) + 1));
	const blend = $derived(playing ? playing.frame - Math.floor(playing.frame) : 0);

	// the glide: from its row and the wild's size to the reel's middle and the morph's ring
	const glide = $derived(props.tallWild.glide.current);
	const ringY = $derived(
		(props.tallWild.ringRow + 0.5) * SYMBOL_SIZE * (1 - glide) + (HEIGHT / 2) * glide,
	);
	const ringSize = $derived((WILD_SIZE * (1 - glide) + TALL_WILD.ringSize * glide) * SYMBOL_SIZE);
	const fade = $derived.by(() => {
		const u = Math.min(1, Math.max(0, (glide - FADE_FROM) / (1 - FADE_FROM)));
		return u * u * (3 - 2 * u);
	});
	// the flying bat: the wild skeleton's `fly` (at the wild's size; scaled down to ringSize as it goes)
	const FLY = {
		type: 'spine',
		assetKey: 'wild',
		animationName: 'fly',
		play: true,
		sizeRatios: { width: WILD_SIZE, height: WILD_SIZE },
	} as const;

	// its hit when the symbols it covers win (hitTallWild): the frames of the user's wild_bat_hit.blend,
	// each only what changes (the bat, its glow and sparkles, the WILD's letters hopping), on the still's
	// grid with room for the wing tips each side, drawn over the still
	const hitTextures = $derived(
		context.stateApp.loadedAssets?.wildHit as LoadedSpriteSheet | undefined,
	);
	const hitTexture = $derived(
		phase === 'still' && props.tallWild.hitting
			? at(hitTextures, props.tallWild.hit.current)
			: undefined,
	);
	// (its frames are 30 fps: the next fades in over this one as its time comes)
	const hitNext = $derived(hitTexture && at(hitTextures, Math.floor(props.tallWild.hit.current) + 1));
	const hitBlend = $derived(props.tallWild.hit.current - Math.floor(props.tallWild.hit.current));
	const HIT_ROOM = WIDTH * TALL_WILD.hit.room;

	// its multiplier (WildMultiplier), in the cave between the stalactites and the bat: showing once
	// the morph has opened the cave, gone before the way back closes it
	const multiplierAlpha = $derived.by(() => {
		const { fadeIn, fadeOut } = TALL_WILD.multiplier;
		if (phase === 'still') return 1;
		if (phase === 'morph') {
			const u = (props.tallWild.morph.current - fadeIn.from) / (fadeIn.to - fadeIn.from);
			return Math.min(1, Math.max(0, u));
		}
		if (phase === 'unmorph') return Math.max(0, 1 - props.tallWild.unmorph.current / fadeOut);
		return 0;
	});
</script>

{#if show}
	<Container x={getSymbolX(props.reelIndex)} y={top + HEIGHT / 2} pivot={{ x: WIDTH / 2, y: HEIGHT / 2 }}>
		<!-- (its pictures in a container of their own, always there: a picture shown later is added last,
			 which would put it over the multiplier) -->
		<Container>
			{#if phase === 'still'}
				<Sprite key="wildTall" width={WIDTH} height={HEIGHT} />
				{#if hitTexture}
					<BaseSprite texture={hitTexture} x={-HIT_ROOM} width={WIDTH + 2 * HIT_ROOM} height={HEIGHT} />
					{#if hitNext && hitNext !== hitTexture && hitBlend > 0}
						<BaseSprite
							texture={hitNext}
							x={-HIT_ROOM}
							width={WIDTH + 2 * HIT_ROOM}
							height={HEIGHT}
							alpha={hitBlend}
						/>
					{/if}
				{/if}
			{:else if texture}
				<BaseSprite
					{texture}
					x={(WIDTH - MORPH_WIDTH) / 2}
					width={MORPH_WIDTH}
					height={HEIGHT}
					alpha={gliding ? fade : 1}
				/>
				{#if nextTexture && nextTexture !== texture && blend > 0}
					<BaseSprite
						texture={nextTexture}
						x={(WIDTH - MORPH_WIDTH) / 2}
						width={MORPH_WIDTH}
						height={HEIGHT}
						alpha={blend}
					/>
				{/if}
			{/if}
			{#if gliding && !sticky}
				<Container x={WIDTH / 2} y={ringY} scale={ringSize / (WILD_SIZE * SYMBOL_SIZE)}>
					<SymbolSpineMain symbolInfo={FLY} listener={{}} />
				</Container>
			{/if}
		</Container>
		<WildMultiplier
			multiplier={props.tallWild.multiplier}
			pop={props.tallWild.pop.current}
			x={WIDTH / 2}
			y={HEIGHT * TALL_WILD.multiplier.y}
			maxWidth={WIDTH * TALL_WILD.multiplier.maxWidth}
			alpha={multiplierAlpha}
		/>
	</Container>
{/if}
