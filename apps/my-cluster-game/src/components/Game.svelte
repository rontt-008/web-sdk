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
	import Anticipations from './Anticipations.svelte';
	import ClusterWinAmounts from './ClusterWinAmounts.svelte';
	import TumbleBoard from './TumbleBoard.svelte';
	import TumbleWinAmount from './TumbleWinAmount.svelte';
	import GlobalMultiplier from './GlobalMultiplier.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import RuneBoard from './RuneBoard.svelte';
	import RuneTablets from './RuneTablets.svelte';
	import BonusMeter from './BonusMeter.svelte';
	import Logo from './Logo.svelte';
	import PowerSpinsIntro from './PowerSpinsIntro.svelte';

	const context = getContext();

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

		<MainContainer>
			<Board />
			<Anticipations />
			<TumbleWinAmount />
			<GlobalMultiplier />
		</MainContainer>

		<MainContainer>
			<TumbleBoard />
			<ClusterWinAmounts />
		</MainContainer>

		<RuneTablets />
		<Logo />
		<BonusMeter />

		<UI theme={uiTheme}>
			{#snippet gameName()}
				<UiGameName name="CLUSTER GAME" />
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
		<Transition />
	{/if}
</App>

<Modals theme={uiHtmlTheme}>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
</Modals>
