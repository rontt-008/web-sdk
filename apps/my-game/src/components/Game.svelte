<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App, Container } from 'pixi-svelte';
	import { stateModal } from 'state-shared';

	import { UI, UiGameName } from 'components-ui-pixi';
	import { GameVersion, Modals } from 'components-ui-html';

	import { getContext } from '../game/context';
	import { setBetModeMeta } from '../game/betModes';
	import { uiTheme, uiHtmlTheme } from '../game/uiTheme';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import BoardParticles from './BoardParticles.svelte';
	import GameLogo from './GameLogo.svelte';
	import BonusCardArt from './BonusCardArt.svelte';
	import GameInfo from './GameInfo.svelte';
	import Board from './Board.svelte';
	import Anticipations from './Anticipations.svelte';
	import WildThrow from './WildThrow.svelte';
	import SunShine from './SunShine.svelte';
	import SceneBlur from './SceneBlur.svelte';
	import BigWin from './BigWin.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinRetrigger from './FreeSpinRetrigger.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';

	const context = getContext();

	// once the loading screen is pressed away, the board and the UI fade in over the background
	const GAME_FADE_IN_DURATION = 600;
	const gameAlpha = new Tween(context.stateLayout.showLoadingScreen ? 0 : 1, {
		duration: GAME_FADE_IN_DURATION,
	});

	$effect(() => {
		gameAlpha.target = context.stateLayout.showLoadingScreen ? 0 : 1;
	});

	setBetModeMeta();

	onMount(() => (context.stateLayout.showLoadingScreen = true));

	context.eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateModal.modal = { name: 'buyBonusConfirm' };
		},
	});
</script>

<App>
	<EnableSound />
	<EnableHotkey />
	<EnableGameActor />
	<EnablePixiExtension />

	<!-- the scene the UI and the win and free spin screens are drawn over; blurred behind some of them -->
	<SceneBlur>
		<Background />

		{#if !context.stateLayout.showLoadingScreen}
			<Container alpha={gameAlpha.current}>
				<MainContainer>
					<BoardFrame />
					<BoardParticles />
				</MainContainer>

				<MainContainer>
					<GameLogo />
				</MainContainer>

				<MainContainer>
					<Board />
					<Anticipations />
					<WildThrow />
				</MainContainer>

				<!-- over the board, under the UI and the win and free spin screens -->
				<SunShine />
			</Container>
		{/if}
	</SceneBlur>

	{#if context.stateLayout.showLoadingScreen}
		<LoadingScreen onloaded={() => (context.stateLayout.showLoadingScreen = false)} />
	{:else}
		<ResumeBet />
		<!--
			The reason why <Sound /> is rendered after clicking the loading screen:
			"Autoplay with sound is allowed if: The user has interacted with the domain (click, tap, etc.)."
			Ref: https://developer.chrome.com/blog/autoplay
		-->
		<Sound />

		<Container alpha={gameAlpha.current}>
			<UI theme={uiTheme}>
				{#snippet gameName()}
					<UiGameName name="LAZY EVENING" />
				{/snippet}
				<!-- the game logo is drawn beside the board by <GameLogo /> -->
				{#snippet logo()}{/snippet}
			</UI>
		</Container>
		<BigWin />
		<FreeSpinIntro />
		{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
			<FreeSpinCounter />
		{/if}
		<FreeSpinRetrigger />
		<FreeSpinOutro />
	{/if}
</App>

<!-- the menus in the UI's black (uiHtmlTheme), with the FS symbols on each bonus -->
<Modals theme={uiHtmlTheme}>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
	{#snippet bonusArt(betModeData)}
		<BonusCardArt {betModeData} />
	{/snippet}
	<!-- no pay table: the rules hold the symbol wins and paylines too (see uiTheme's hidePayTable) -->
	{#snippet gameRules()}
		<GameInfo />
	{/snippet}
</Modals>
