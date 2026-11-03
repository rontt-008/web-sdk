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
	import { SMOOTH_TEXTURE_KEYS, smoothTexture } from '../game/smoothTextures';
	import { uiTheme, uiHtmlTheme } from '../game/uiTheme';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import Fox from './Fox.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	import ClusterWinAmounts from './ClusterWinAmounts.svelte';
	import TumbleBoard from './TumbleBoard.svelte';
	import Wind from './Wind.svelte';
	import WindTransition from './WindTransition.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import RuneBoard from './RuneBoard.svelte';
	import MannazBoard from './MannazBoard.svelte';
	import RuneTablets from './RuneTablets.svelte';
	import BonusMeter from './BonusMeter.svelte';
	import Logo from './Logo.svelte';
	import PowerSpinsIntro from './PowerSpinsIntro.svelte';
	import GameInfo from './GameInfo.svelte';

	const context = getContext();

	// the buy menu's bonus and super bonus, at this game's prices
	setBetModeMeta();

	onMount(() => (context.stateLayout.showLoadingScreen = true));

	// the wooden frames smoothed when drawn small, once they are loaded (see smoothTextures)
	$effect(() => {
		for (const key of SMOOTH_TEXTURE_KEYS) {
			const texture = context.stateApp.loadedAssets?.[key];
			if (texture && 'source' in texture) smoothTexture(texture);
		}
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
			<Fox />
		</MainContainer>

		<MainContainer>
			<BoardFrame />
		</MainContainer>

		<MainContainer>
			<RuneBoard />
		</MainContainer>

		<!-- the base game's Mannaz, behind the symbols as the free spins' runes are (see MannazBoard) -->
		<MainContainer>
			<MannazBoard />
		</MainContainer>

		<MainContainer>
			<Board />
		</MainContainer>

		<MainContainer>
			<TumbleBoard />
		</MainContainer>

		<MainContainer>
			<Wind />
		</MainContainer>

		<!-- in their own container, over the tumble board: in its container they went under it, as
		its symbols, drawn only while it tumbles, are added after them -->
		<MainContainer>
			<ClusterWinAmounts />
		</MainContainer>

		<RuneTablets />
		<Logo />
		<BonusMeter />

		<UI theme={uiTheme}>
			{#snippet gameName()}
				<UiGameName name="RUNEFALL" />
			{/snippet}
			<!-- no logo in the corner, as in Cat Hunt -->
			{#snippet logo()}{/snippet}
		</UI>
		<Win />
		<FreeSpinIntro />
		{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
			<FreeSpinCounter />
		{/if}
		<PowerSpinsIntro />
		<FreeSpinOutro />
		<!-- over everything: the gale as the bonus starts and ends -->
		<WindTransition />
	{/if}
</App>

<!-- a replay's card waits for the loading screen to be pressed -->
<Modals theme={uiHtmlTheme} hideReplayCard={context.stateLayout.showLoadingScreen}>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
	<!-- no pay table: the rules hold the symbol wins too (see uiTheme's hidePayTable) -->
	{#snippet gameRules()}
		<GameInfo />
	{/snippet}
</Modals>
