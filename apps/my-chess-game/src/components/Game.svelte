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
	import { setBetModeMeta } from '../game/betModes';
	import { uiTheme, uiHtmlTheme } from '../game/uiTheme';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import BoardSquares from './BoardSquares.svelte';
	import Board from './Board.svelte';
	import PlayBoard from './PlayBoard.svelte';
	import MoveWinAmounts from './MoveWinAmounts.svelte';
	import MoveLog from './MoveLog.svelte';
	import MoveLabel from './MoveLabel.svelte';
	import ComboMultiplier from './ComboMultiplier.svelte';
	import SideToggle from './SideToggle.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import GameInfo from './GameInfo.svelte';

	const context = getContext();

	// the buy menu's checkmate bonus, at this game's price
	setBetModeMeta();

	onMount(() => (context.stateLayout.showLoadingScreen = true));

	context.eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateModal.modal = { name: 'buyBonusConfirm' };
		},
	});
</script>

<App>
	{#if context.stateApp.loaded}
		<EnableSound />
	{/if}
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
			<BoardSquares />
		</MainContainer>

		<!-- the reels the pieces drop onto, and the play board that takes over once they have landed -->
		<MainContainer>
			<Board />
		</MainContainer>

		<MainContainer>
			<PlayBoard />
		</MainContainer>

		<MoveWinAmounts />
		<MoveLog />
		<ComboMultiplier />
		<SideToggle />

		<UI theme={uiTheme}>
			{#snippet gameName()}
				<UiGameName name="CHECKMATE" />
			{/snippet}
			{#snippet logo()}{/snippet}
		</UI>
		<MoveLabel />
		<Win />
		<FreeSpinIntro />
		{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
			<FreeSpinCounter />
		{/if}
		<FreeSpinOutro />
		<Transition />
	{/if}
</App>

<Modals theme={uiHtmlTheme} hideReplayCard={context.stateLayout.showLoadingScreen}>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
	<!-- no pay table: the rules hold the pays too (see uiTheme's hidePayTable) -->
	{#snippet gameRules()}
		<GameInfo />
	{/snippet}
</Modals>
