<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { UiIcon, type UiIconName } from 'components-ui-pixi';
	import { stateModal } from 'state-shared';

	import { getContext } from '../game/context';
	import { uiTheme } from '../game/uiTheme';
	import CameraContainer from './CameraContainer.svelte';
	import { SANDBOX_LEVEL_MODAL } from './ModalSandboxLevel.svelte';

	// Three icons lying on the table, left of the board's near corner, while the start screen's game is
	// on (Sandbox): just the bet bar's icons (UiIcon), no button round them, with a soft shadow on the
	// table like the pieces' kings of the colour toggle (SideToggle), and seen through the camera so they
	// keep their place as the board zooms. RESTART (a circling arrow) puts the pieces back to the start
	// and begins again; SETTINGS (a cog) opens the opponent's strengths, in Elo, in a menu in the middle
	// of the screen (ModalSandboxLevel); HINT (a lightbulb) has the engine show the player's three best
	// moves on the board (BoardHints) without playing them. Hovered (or the menu open) an icon turns the
	// board's gold. The strength in use is written under them. Flat over the table (the board's mesh
	// takes no presses).
	const context = getContext();
	const quad = $derived(context.stateGameDerived.boardQuad());
	const corner = $derived({ x: Math.min(quad[0], quad[6]), y: Math.max(quad[5], quad[7]) });
	const shown = $derived(context.stateGame.sandbox && context.stateXstateDerived.isIdle());

	// what takes the press, each a square; the icon in it; the space between them; how far left of the
	// board's corner the column stands
	const SIZE = 48;
	const ICON = 36;
	const GAP = 12;
	const LEFT = 44;
	const COLOURS = { icon: uiTheme.label.value, hot: uiTheme.buyBonus?.icon ?? 0xf2c94c, shadow: 0x000000 };
	const SHADOW = { dy: 2.5, alpha: 0.45 };

	const settingsOpen = $derived(stateModal.modal?.name === 'game' && stateModal.modal.id === SANDBOX_LEVEL_MODAL);
	// the menu goes with the practice game (a spin, the loading of a bet)
	$effect(() => {
		if (!shown && settingsOpen) stateModal.modal = null;
	});

	const hint = () => context.eventEmitter.broadcast({ type: 'sandboxHint' });
	const restart = () => context.eventEmitter.broadcast({ type: 'sandboxRestart' });
	const settings = () => (stateModal.modal = { name: 'game', id: SANDBOX_LEVEL_MODAL });

	// from the corner up: restart, settings, hint
	const buttons: { icon: UiIconName; onpress: () => void; active?: () => boolean }[] = [
		{ icon: 'restart', onpress: restart },
		{ icon: 'cog', onpress: settings, active: () => settingsOpen },
		{ icon: 'hint', onpress: hint },
	];

	const level = $derived(context.stateGame.sandboxElo);
</script>

{#if shown}
	<MainContainer>
		<CameraContainer>
			<Container x={corner.x - SIZE - LEFT} y={corner.y - SIZE}>
				{#each buttons as button, index (button.icon)}
					{@const active = button.active?.() ?? false}
					<Button x={0} y={-index * (SIZE + GAP)} sizes={{ width: SIZE, height: SIZE }} onpress={button.onpress}>
						{#snippet children({ center, hovered, pressed })}
							<Container x={center.x} y={center.y} scale={pressed ? 0.9 : hovered ? 1.08 : 1}>
								<Container alpha={SHADOW.alpha}>
									<UiIcon icon={button.icon} y={SHADOW.dy} size={ICON} color={COLOURS.shadow} />
								</Container>
								<UiIcon icon={button.icon} size={ICON} color={active || hovered ? COLOURS.hot : COLOURS.icon} />
							</Container>
						{/snippet}
					</Button>
				{/each}
				<!-- the strength in use, under the icons, with the same shadow -->
				{#each [{ dy: SHADOW.dy, fill: COLOURS.shadow, alpha: SHADOW.alpha }, { dy: 0, fill: COLOURS.icon, alpha: 1 }] as layer}
					<Text
						text={`ELO ${level}`}
						anchor={{ x: 0.5, y: 0 }}
						x={SIZE / 2}
						y={SIZE + 2 + layer.dy}
						alpha={layer.alpha}
						style={{ fontFamily: uiTheme.fontFamily, fontSize: 13, fontWeight: '800', fill: layer.fill, letterSpacing: 1 }}
					/>
				{/each}
			</Container>
		</CameraContainer>
	</MainContainer>
{/if}
