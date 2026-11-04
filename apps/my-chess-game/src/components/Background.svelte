<script lang="ts">
	import { Rectangle } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';

	// a plain dark room behind the board; a deep blue one in the free spins
	const context = getContext();
	const showFeatureBackground = $derived(context.stateGame.gameType === 'freegame');
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x121116} zIndex={-3} />

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={-2}>
	<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x161a33} />
</FadeContainer>
