<script lang="ts">
	import { onMount, untrack } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App } from 'pixi-svelte';
	import { stateModal } from 'state-shared';

	import { UI } from 'components-ui-pixi';
	import { GameVersion, Modals } from 'components-ui-html';

	import { getContext } from '../game/context';
	import { setBetModeMeta } from '../game/betModes';
	import { SMOOTH_TEXTURE_KEYS, smoothTexture } from '../game/smoothTextures';
	import { loadedTextureSources } from '../game/prepareTextures';
	import { FOX_ASSET_KEYS } from '../game/assets';
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
	import BonusTablet from './BonusTablet.svelte';
	import ConfirmTablet from './ConfirmTablet.svelte';
	import BonusGust from './BonusGust.svelte';

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

	// the fox is only on wide screens (see Fox), so it is only loaded once the screen is one
	$effect(() => {
		if (context.stateLayoutDerived.layoutType() === 'desktop')
			context.stateApp.loadLazyAssets(FOX_ASSET_KEYS);
	});

	// once everything is loaded (and smoothed, above), it is all sent to the graphics card while
	// the loading screen shows, not each texture the first time it is drawn (see prepareTextures)
	$effect(() => {
		const renderer = context.stateApp.pixiApplication?.renderer;
		const loadedAssets = context.stateApp.loadedAssets;
		if (!context.stateApp.loaded || !renderer) return;
		untrack(() => renderer.prepare.upload(loadedTextureSources(context.stateApp.assets, loadedAssets)));
	});


	context.eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateModal.modal = { name: 'buyBonusConfirm' };
		},
	});
</script>

<App>
	<!-- the sound (4-5 MB) starts downloading only once the pictures have loaded, so it doesn't take
	their bandwidth while the loading screen shows; it is only heard after the loading screen is
	pressed, and any sound played before it has arrived plays as it does (Howler queues it) -->
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
			<!-- no clock or game name at the top left -->
			{#snippet gameName()}{/snippet}
			<!-- no logo in the corner, as in Cat Hunt -->
			{#snippet logo()}{/snippet}
		</UI>
		<Win />
		<FreeSpinIntro />
		<FreeSpinCounter />
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
	<!-- the bonuses hang as rune slates from a branch, as Lazy Evening's towels hang from a line -->
	{#snippet bonusCard({ levels, levelRow })}
		<BonusTablet {levels} {levelRow} />
	{/snippet}
	<!-- buying one, or switching one on, is confirmed on its slate, bigger -->
	{#snippet bonusConfirm({ betModeData, confirm, cancel })}
		<ConfirmTablet {betModeData} onconfirm={confirm} oncancel={cancel} />
	{/snippet}
	<!-- a bonus once bought: its runes flare and a gust blows it away in leaves, then it starts -->
	{#snippet bonusBought({ betModeData, start })}
		<BonusGust {betModeData} onstart={start} />
	{/snippet}
	<!-- no pay table: the rules hold the symbol wins too (see uiTheme's hidePayTable) -->
	{#snippet gameRules()}
		<GameInfo />
	{/snippet}
</Modals>
