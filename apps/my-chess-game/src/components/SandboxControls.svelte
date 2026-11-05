<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Container, Graphics, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { SANDBOX_LEVELS } from '../game/constants';
	import { setSandboxElo } from '../game/stateGame.svelte';
	import CameraContainer from './CameraContainer.svelte';

	// Three round buttons on the table, left of the board's near corner, while the start screen's game
	// is on (Sandbox): RESTART (a circling arrow) puts the pieces back to the start and begins again;
	// SETTINGS (a cog) opens a column of strengths to play against, in Elo (SANDBOX_LEVELS), the one in
	// use lit, the choice kept between visits; HINT (a lightbulb) has the engine show the player's three
	// best moves on the board (BoardHints) without playing them. Flat over the table (the board's mesh
	// takes no presses).
	const context = getContext();
	const quad = $derived(context.stateGameDerived.boardQuad());
	const corner = $derived({ x: Math.min(quad[0], quad[6]), y: Math.max(quad[5], quad[7]) });
	const shown = $derived(context.stateGame.sandbox && context.stateXstateDerived.isIdle());

	const SIZE = 46;
	const GAP = 12;
	const COLOURS = { face: 0x2e3b44, faceHot: 0x47606f, rim: 0xdde9f1, icon: 0xdde9f1, lit: 0xf2c14e, ink: 0x2a1d00 };

	let settingsOpen = $state(false);
	$effect(() => {
		if (!shown) settingsOpen = false;
	});

	const face = (graphics: PIXI.Graphics, hovered: boolean) => {
		graphics.clear();
		graphics.circle(SIZE / 2, SIZE / 2, SIZE / 2).fill({ color: hovered ? COLOURS.faceHot : COLOURS.face });
		graphics.circle(SIZE / 2, SIZE / 2, SIZE / 2 - 1.5).stroke({ color: COLOURS.rim, width: 2, alpha: 0.85 });
	};
	// a circling arrow: most of a circle, with a head at its open end
	const resetIcon = (graphics: PIXI.Graphics) => {
		graphics.clear();
		const c = SIZE / 2;
		const r = SIZE * 0.24;
		graphics.arc(c, c, r, -Math.PI * 0.35, Math.PI * 1.35).stroke({ color: COLOURS.icon, width: 3.2, cap: 'round' });
		const tipAngle = -Math.PI * 0.35;
		const tx = c + r * Math.cos(tipAngle);
		const ty = c + r * Math.sin(tipAngle);
		graphics.poly([tx - 7, ty - 1, tx + 2, ty - 8, tx + 3, ty + 4]).fill({ color: COLOURS.icon });
	};
	// a cog: a ring with eight teeth
	const cogIcon = (graphics: PIXI.Graphics) => {
		graphics.clear();
		const c = SIZE / 2;
		const points: number[] = [];
		for (let i = 0; i < 16; i++) {
			const angle = (i / 16) * Math.PI * 2;
			const r = i % 2 === 0 ? SIZE * 0.3 : SIZE * 0.22;
			points.push(c + r * Math.cos(angle), c + r * Math.sin(angle));
		}
		graphics.poly(points).fill({ color: COLOURS.icon });
		graphics.circle(c, c, SIZE * 0.1).fill({ color: COLOURS.face });
	};

	// a lightbulb: the glass, its base in two bars, a filament
	const bulbIcon = (graphics: PIXI.Graphics) => {
		graphics.clear();
		const c = SIZE / 2;
		graphics.circle(c, c - 4, SIZE * 0.19).fill({ color: COLOURS.icon });
		graphics.roundRect(c - 5, c + 4, 10, 4, 1.5).fill({ color: COLOURS.icon });
		graphics.roundRect(c - 4, c + 10, 8, 3, 1.5).fill({ color: COLOURS.icon });
		graphics.moveTo(c - 3, c - 1).lineTo(c, c - 6).lineTo(c + 3, c - 1).stroke({ color: COLOURS.face, width: 1.5 });
	};
	const hint = () => {
		settingsOpen = false;
		context.eventEmitter.broadcast({ type: 'sandboxHint' });
	};

	const restart = () => {
		settingsOpen = false;
		context.eventEmitter.broadcast({ type: 'sandboxRestart' });
	};
	const choose = (elo: number) => {
		setSandboxElo(elo);
		settingsOpen = false;
	};

	const PILL = { width: 92, height: 30 };
</script>

{#if shown}
	<MainContainer>
		<CameraContainer>
			<Container x={corner.x - SIZE - 14} y={corner.y - SIZE}>
				<!-- restart, at the corner -->
				<Button x={0} y={0} sizes={{ width: SIZE, height: SIZE }} onpress={restart}>
					{#snippet children({ hovered })}
						<Graphics draw={(graphics) => face(graphics, hovered)} />
						<Graphics draw={resetIcon} />
					{/snippet}
				</Button>
				<!-- settings, above it -->
				<Button x={0} y={-(SIZE + GAP)} sizes={{ width: SIZE, height: SIZE }} onpress={() => (settingsOpen = !settingsOpen)}>
					{#snippet children({ hovered })}
						<Graphics draw={(graphics) => face(graphics, hovered || settingsOpen)} />
						<Graphics draw={cogIcon} />
					{/snippet}
				</Button>
				<!-- the hint, above that -->
				<Button x={0} y={-2 * (SIZE + GAP)} sizes={{ width: SIZE, height: SIZE }} onpress={hint}>
					{#snippet children({ hovered })}
						<Graphics draw={(graphics) => face(graphics, hovered)} />
						<Graphics draw={bulbIcon} />
					{/snippet}
				</Button>
				<Text
					text={`ELO ${context.stateGame.sandboxElo}`}
					anchor={{ x: 0.5, y: 0 }}
					x={SIZE / 2}
					y={SIZE + 4}
					style={{ fontFamily: 'proxima-nova', fontSize: 12, fontWeight: '800', fill: COLOURS.rim, letterSpacing: 1 }}
				/>
				<!-- the strengths, in a column above the settings button -->
				{#if settingsOpen}
					{#each SANDBOX_LEVELS as level, index (level.elo)}
						{@const lit = level.elo === context.stateGame.sandboxElo}
						<Button
							x={SIZE / 2 - PILL.width / 2}
							y={-2 * (SIZE + GAP) - (SANDBOX_LEVELS.length - index) * (PILL.height + 6)}
							sizes={PILL}
							onpress={() => choose(level.elo)}
						>
							{#snippet children({ hovered })}
								<Graphics
									draw={(graphics) => {
										graphics.clear();
										graphics.roundRect(0, 0, PILL.width, PILL.height, PILL.height / 2).fill({ color: lit ? COLOURS.lit : hovered ? COLOURS.faceHot : COLOURS.face });
										graphics.roundRect(0, 0, PILL.width, PILL.height, PILL.height / 2).stroke({ color: COLOURS.rim, width: 1.5, alpha: 0.7 });
									}}
								/>
								<Text
									text={`${level.elo} ${level.name}`}
									anchor={0.5}
									x={PILL.width / 2}
									y={PILL.height / 2}
									style={{ fontFamily: 'proxima-nova', fontSize: 12, fontWeight: '800', fill: lit ? COLOURS.ink : COLOURS.rim, letterSpacing: 0.5 }}
								/>
							{/snippet}
						</Button>
					{/each}
				{/if}
			</Container>
		</CameraContainer>
	</MainContainer>
{/if}
