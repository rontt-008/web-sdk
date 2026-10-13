<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App } from 'pixi-svelte';
	import { stateModal } from 'state-shared';

	import { UI, UiGameName } from 'components-ui-pixi';
	import { GameVersion, Modals } from 'components-ui-html';

	import { getContext } from '../game/context';
	import { setBetModeMeta, BOOSTER_MODE } from '../game/betModes';
	import { uiTheme } from '../game/uiTheme';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import BoardParticles from './BoardParticles.svelte';
	import GameLogo from './GameLogo.svelte';
	import FeatureButtons from './FeatureButtons.svelte';
	import BonusCardArt from './BonusCardArt.svelte';
	import GameInfo from './GameInfo.svelte';
	import Board from './Board.svelte';
	import Anticipations from './Anticipations.svelte';
	import WildThrow from './WildThrow.svelte';
	import SunShine from './SunShine.svelte';
	import SceneBlur from './SceneBlur.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinRetrigger from './FreeSpinRetrigger.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';

	const context = getContext();

	setBetModeMeta();

	// the booster has its own switch beside the board on these layouts, so the buy menu leaves it out
	const hiddenBetModes = $derived(
		context.stateGameDerived.isLogoBesideBoard() ? [BOOSTER_MODE] : [],
	);

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
			<MainContainer>
				<BoardFrame />
				<BoardParticles />
			</MainContainer>

			<MainContainer>
				<GameLogo />
				<FeatureButtons />
			</MainContainer>

			<MainContainer>
				<Board />
				<Anticipations />
				<WildThrow />
			</MainContainer>

			<!-- over the board, under the UI and the win and free spin screens -->
			<SunShine />
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

		<UI theme={uiTheme}>
			{#snippet gameName()}
				<UiGameName name="CAT HUNT" />
			{/snippet}
			<!-- the game logo is drawn beside the board by <GameLogo /> -->
			{#snippet logo()}{/snippet}
		</UI>
		<Win />
		<FreeSpinIntro />
		{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
			<FreeSpinCounter />
		{/if}
		<FreeSpinRetrigger />
		<FreeSpinOutro />
		<Transition />
	{/if}
</App>

<!-- the menus in the SDK's default theme (UI_HTML_THEME_CLEAN), with the FS symbols on each bonus -->
<Modals {hiddenBetModes}>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
	{#snippet bonusArt(betModeData)}
		<BonusCardArt {betModeData} />
	{/snippet}
	{#snippet payTable()}
		<GameInfo part="payTable" />
	{/snippet}
	{#snippet gameRules()}
		<GameInfo part="gameRules" />
	{/snippet}
</Modals>
