<script lang="ts" module>
	// the bonus meter: how many symbols a base game spin's clusters have had, all its tumbles together;
	// full (BONUS_TRIGGER), the free spins start
	export type EmitterEventBonusMeter =
		| { type: 'bonusMeterShow' }
		| { type: 'bonusMeterHide' }
		| { type: 'bonusMeterUpdate'; amount: number }
		| { type: 'bonusMeterReset' }
		| { type: 'bonusMeterFull' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { BONUS_TRIGGER } from '../game/constants';
	import { BONUS_METER_ART } from '../game/stateGame.svelte';
	import { uiTheme } from '../game/uiTheme';

	const context = getContext();

	// The meter's art (static/assets/bonus-meter-frame.webp, from art-source/wood-frames.py), in its
	// pixels: its planks green alone (static/assets/bonus-meter-fill.webp, from the same script), where
	// they are and how big, and the middle of the sign over them, where the count goes, with the
	// height the text has there.
	const ART = {
		planks: { x: 138, y: 259, width: 1504, height: 189 },
		sign: { x: 885, y: 146, height: 150 },
	};
	// the count dark brown, as if burnt into the sign
	const COUNT = 0x1e0d05;

	const layout = $derived(context.stateGameDerived.bonusMeterLayout());
	// the frame's pixels to the layout's
	const scale = $derived(layout.width / BONUS_METER_ART.width);
	const planks = $derived({
		x: ART.planks.x * scale,
		y: ART.planks.y * scale,
		width: ART.planks.width * scale,
		height: ART.planks.height * scale,
	});

	let show = $state(true);
	let amount = $state(0);
	const filled = new Tween(0, { duration: 350, easing: cubicOut });
	const flash = new Tween(0, { duration: 160 });

	context.eventEmitter.subscribeOnMount({
		bonusMeterShow: () => (show = true),
		bonusMeterHide: () => (show = false),
		bonusMeterUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			await filled.set(Math.min(1, amount / BONUS_TRIGGER));
		},
		bonusMeterReset: () => {
			amount = 0;
			filled.set(0, { duration: 200 });
			flash.set(0, { duration: 0 });
		},
		// it flashes when it is full (a bought bonus may start without it)
		bonusMeterFull: async () => {
			if (amount < BONUS_TRIGGER) return;
			for (let i = 0; i < 3; i++) {
				await flash.set(1);
				await flash.set(0.25);
			}
			await flash.set(1);
		},
	});

	const countSize = $derived(ART.sign.height * scale * 0.9);
</script>

<MainContainer>
	<FadeContainer {show} x={layout.x} y={layout.y}>
		<Sprite key="bonusMeterFrame" width={layout.width} height={layout.height} />

		<!-- the planks turning green from the left as it fills, and flashing light once full -->
		{#each [false, true] as flashing}
			<Container
				x={planks.x}
				y={planks.y}
				blendMode={flashing ? 'add' : 'normal'}
				alpha={flashing ? flash.current * 0.5 : 1}
				visible={filled.current > 0 && (!flashing || flash.current > 0)}
			>
				<Graphics
					isMask
					draw={(graphics) => graphics.rect(0, 0, planks.width * filled.current, planks.height).fill(0xffffff)}
				/>
				<Sprite key="bonusMeterFill" width={planks.width} height={planks.height} />
			</Container>
		{/each}

		<!-- the count on the sign -->
		<Text
			x={ART.sign.x * scale}
			y={ART.sign.y * scale}
			anchor={{ x: 0.5, y: 0.5 }}
			text={`${Math.min(amount, BONUS_TRIGGER)} / ${BONUS_TRIGGER}`}
			style={{
				fontFamily: uiTheme.fontFamily,
				fontSize: countSize,
				fontWeight: '800',
				fill: COUNT,
			}}
		/>
	</FadeContainer>
</MainContainer>
