<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import type * as PIXI from 'pixi.js';
	import { App, Graphics, Sprite } from 'pixi-svelte';
	import { stateModal } from 'state-shared';

	import { UI } from 'components-ui-pixi';
	import { GameVersion, Modals } from 'components-ui-html';

	import { getContext } from '../game/context';
	import { setBetModeMeta } from '../game/betModes';
	import { uiTheme, uiHtmlTheme } from '../game/uiTheme';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import CameraContainer from './CameraContainer.svelte';
	import TiltedPlane from './TiltedPlane.svelte';
	import { BOARD_SIZES, BOARD_FRAME, SYMBOL_SIZE } from '../game/constants';
	import { LAMP_SHADOW, lampShade } from '../game/tilt';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardSquares from './BoardSquares.svelte';
	import Board from './Board.svelte';
	import PlayBoard from './PlayBoard.svelte';
	import Sandbox from './Sandbox.svelte';
	import BoardHints from './BoardHints.svelte';
	import SandboxControls from './SandboxControls.svelte';
	import ModalSandboxLevel from './ModalSandboxLevel.svelte';
	import MoveWinAmounts from './MoveWinAmounts.svelte';
	import SidePanel from './SidePanel.svelte';
	import NotebookStrip from './NotebookStrip.svelte';
	import NotebookOverlay from './NotebookOverlay.svelte';
	import StickyNote from './StickyNote.svelte';
	import MoveLabel from './MoveLabel.svelte';
	import FistSlam from './FistSlam.svelte';
	import SideToggle from './SideToggle.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import GameInfo from './GameInfo.svelte';
	import BonusCard from './BonusCard.svelte';

	const context = getContext();

	// the buy menu's checkmate bonus, at this game's price
	setBetModeMeta();

	onMount(() => (context.stateLayout.showLoadingScreen = true));

	// the board's shade from the lamp (lampShade, tilt.ts): over it and its wooden frame, a little lighter
	// than the notepad's so the pieces and the squares' lights stay clear
	const BOARD_SHADE = lampShade(0.24);
	const drawBoardShade = (graphics: PIXI.Graphics) => {
		const rim = BOARD_FRAME.reach;
		graphics.rect(-rim, -rim, BOARD_SIZES.width + rim * 2, BOARD_SIZES.height + rim * 2).fill(BOARD_SHADE);
	};

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

		<!-- the board scene, lying tilted on the table (TiltedPlane), seen through the camera
		     (CameraContainer), which zooms in on the moves: the board's picture, its squares' lights, the
		     reels the pieces drop onto, and the play board that takes over once they have landed -->
		<MainContainer>
			<CameraContainer>
				<TiltedPlane
					size={BOARD_SIZES}
					project={context.stateGameDerived.boardPoint}
					pad={BOARD_FRAME.margin + SYMBOL_SIZE * 0.15}
					detail={context.stateGameDerived.boardLayout().scale * 1.3}
					rim={BOARD_FRAME.reach}
					shadow={LAMP_SHADOW.alpha}
					shadowOffset={LAMP_SHADOW.offset}
				>
					<Sprite key="board" width={BOARD_SIZES.width} height={BOARD_SIZES.height} />
					<!-- the wooden frame round it, under the squares' lights and the pieces -->
					<Sprite
						key="boardFrame"
						x={-BOARD_FRAME.margin}
						y={-BOARD_FRAME.margin}
						width={BOARD_SIZES.width + BOARD_FRAME.margin * 2}
						height={BOARD_SIZES.height + BOARD_FRAME.margin * 2}
					/>
					<BoardSquares />
					<Board />
					<PlayBoard />
					<BoardHints />
					<!-- shade where the lamp's light reaches less, over the board, its frame and the pieces -->
					<Graphics draw={drawBoardShade} />
				</TiltedPlane>
				<!-- the start screen's game of chess: the clicks, taken flat over the tilted board -->
				<Sandbox />
			</CameraContainer>
		</MainContainer>
		<!-- the start screen's game's buttons: restart, and the strength to play against -->
		<SandboxControls />

		<!-- the notebook (sideLayout.ts): on tall and almost square screens a strip under the board (the
		     multipliers thrown from it fly over it); on desktop and phones held sideways lying on the table
		     beside the board; on phones it opens over the board, and the engine's reason for a quiet end
		     goes up on a sticky note -->
		<NotebookStrip />
		<MoveWinAmounts />
		<SidePanel />
		<SideToggle />
		<NotebookOverlay />

		<UI theme={uiTheme}>
			<!-- no clock and game name in the screen's corner, as in my-game -->
			{#snippet gameName()}{/snippet}
			{#snippet logo()}{/snippet}
		</UI>
		<!-- over the UI: while it's up, a press anywhere puts it away and the game goes on -->
		<StickyNote />
		<MoveLabel />
		<FistSlam />
		<Win />
		<FreeSpinIntro />
		<!-- elsewhere the notebook has the free spins left -->
		{#if context.stateLayoutDerived.layoutType() === 'desktop'}
			<FreeSpinCounter />
		{/if}
		<FreeSpinOutro />
		<Transition />
	{/if}
</App>

<Modals theme={uiHtmlTheme} hideReplayCard={context.stateLayout.showLoadingScreen}>
	<!-- the buy bonus menu's cards, the game's own: dark and flat, the bonus's piece on each -->
	{#snippet bonusCard({ levels, levelRow })}
		<BonusCard {levels} {levelRow} />
	{/snippet}
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
	<!-- no pay table: the rules hold the pays too (see uiTheme's hidePayTable) -->
	{#snippet gameRules()}
		<GameInfo />
	{/snippet}
	<!-- the practice board's opponent strength, opened by SandboxControls' cog -->
	<ModalSandboxLevel />
</Modals>
