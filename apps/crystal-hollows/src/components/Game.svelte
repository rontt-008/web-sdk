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
	import { uiTheme, uiHtmlTheme } from '../game/uiTheme';
	import { setBetModeMeta } from '../game/betModes';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import Bat from './Bat.svelte';
	import Logo from './Logo.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	import Anticipations from './Anticipations.svelte';
	import Win from './Win.svelte';
	import WinLines from './WinLines.svelte';
	import WinsHurry from './WinsHurry.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import GameInfo from './GameInfo.svelte';

	const context = getContext();

	// the buy menu's booster and its three buys, at this game's prices (not the SDK's sample modes)
	setBetModeMeta();

	onMount(() => (context.stateLayout.showLoadingScreen = true));

	// the bat hovers beside the board only on wide screens (Bat), but it brings the free spins screens'
	// sign on every screen (BatSign), so it is loaded once the game is in (lazily: the logo is on the start
	// screen too, so it loads first, assets.ts)
	$effect(() => {
		context.stateApp.loadLazyAssets(['bat']);
	});

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

	<Background />

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

		<MainContainer>
			<BoardFrame />
		</MainContainer>

		<MainContainer>
			<Board />
			<!-- a winning payline over the board, with its win on it -->
			<WinLines />
			<Anticipations />
		</MainContainer>

		<!-- the logo at the top right, and the crystal bat hovering in the air below it, right of the
			 board, its far wing over the frame -->
		<MainContainer>
			<Logo />
			<Bat />
		</MainContainer>

		<!-- while the line wins show, a click anywhere but the UI's buttons plays them fast -->
		<WinsHurry />

		<!-- the charcoal UI of RuneFall and Lazy Evening (see uiTheme) -->
		<UI theme={uiTheme}>
			<!-- the name at the top left where the logo isn't shown (it is on wide screens, Logo) -->
			{#snippet gameName()}
				{#if !context.stateGameDerived.logoLayout().shown}
					<UiGameName name="CRYSTAL HOLLOWS" />
				{/if}
			{/snippet}
			<!-- no logo in the corner, as in RuneFall and Lazy Evening -->
			{#snippet logo()}{/snippet}
		</UI>
		<Win />
		<FreeSpinIntro />
		{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
			<FreeSpinCounter />
		{/if}
		<FreeSpinOutro />
	{/if}
</App>

<!-- the menus in the UI's black; a replay's card waits for the loading screen to be pressed -->
<Modals theme={uiHtmlTheme} hideReplayCard={context.stateLayout.showLoadingScreen}>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
	<!-- no pay table: the rules hold the symbol wins and paylines too (see uiTheme's hidePayTable) -->
	{#snippet gameRules()}
		<GameInfo />
	{/snippet}
</Modals>
