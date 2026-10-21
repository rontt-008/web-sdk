<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { FadeContainer, LoadingBar } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { loadingBarTheme } from '../game/uiTheme';
	import FloatingLogo from './FloatingLogo.svelte';
	import PressToContinue from './PressToContinue.svelte';

	type Props = {
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// pressing fades the logo out, then the game fades in (see Game)
	let loadingType = $state<'start' | 'done'>('start');

	// the game logo, a little above the middle so it clears the progress bar under it
	const LOGO_WIDTH = 700;
	const LOGO_SIZES = { width: LOGO_WIDTH, height: (LOGO_WIDTH * 596) / 1400 };
	const LOGO_Y = -40;
	// centre of the loading bar, under the logo, with its percentage below it
	const BAR_Y = 200;
	const BAR_SIZES = { width: 420, height: 26 };
</script>

<!-- logo and loading progress -->
<FadeContainer
	show={loadingType === 'start'}
	oncomplete={() => loadingType === 'done' && props.onloaded()}
>
	<MainContainer>
		<Container
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height * 0.5}
		>
			<!-- floating, with its Zs, as beside the board -->
			<FloatingLogo x={0} y={LOGO_Y} {...LOGO_SIZES} />
			<!-- fades away once everything has loaded, as "press anywhere" fades in -->
			<FadeContainer show={!context.stateApp.loaded}>
				<LoadingBar y={BAR_Y} {...BAR_SIZES} theme={loadingBarTheme} />
			</FadeContainer>
		</Container>
	</MainContainer>
</FadeContainer>

<!-- press to continue -->
<FadeContainer show={loadingType === 'start' && context.stateApp.loaded}>
	<PressToContinue onpress={() => (loadingType = 'done')} />
</FadeContainer>
