<script lang="ts" module>
	import type { MeterSoul } from './MeterSouls.svelte';

	// the bonus meter: how many symbols a base game spin's clusters have had, all its tumbles together;
	// full (BONUS_TRIGGER), the free spins start, and on to SUPER_TRIGGER, the super bonus. Winning
	// leaves' souls fly into it (MeterSouls).
	export type EmitterEventBonusMeter =
		| { type: 'bonusMeterShow' }
		| { type: 'bonusMeterHide' }
		| { type: 'bonusMeterUpdate'; amount: number }
		| { type: 'bonusMeterReset' }
		| { type: 'bonusMeterFull' }
		| { type: 'bonusMeterSouls'; souls: MeterSoul[] };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { CanvasTextMetrics, TextStyle } from 'pixi.js';
	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { BONUS_TRIGGER, SUPER_TRIGGER } from '../game/constants';
	import { BONUS_METER_ART } from '../game/stateGame.svelte';
	import {
		SIGN_FONT,
		bonusSignTextStyle,
		signTextStyle,
		superSignTextStyle,
	} from '../game/signText';
	import MeterSouls from './MeterSouls.svelte';

	const context = getContext();

	// The meter's art (static/assets/bonus-meter-frame.webp, from art-source/wood-frames.py), in its
	// pixels: its planks green alone (static/assets/bonus-meter-fill.webp, from the same script), where
	// they are and how big, and the middle of the sign over them, where the count goes, with the
	// height and the width (the sign's planks are about 545 wide) the text has there.
	const ART = {
		planks: { x: 138, y: 259, width: 1504, height: 189 },
		sign: { x: 885, y: 146, height: 150, width: 500 },
	};
	// the count in lettering like the logo's (see signText), once its font is ready: text drawn
	// before it would stay in the fallback
	let fontReady = $state(false);
	onMount(() => {
		document.fonts
			.load(`16px ${SIGN_FONT}`)
			.catch(() => {})
			.finally(() => (fontReady = true));
	});

	const layout = $derived(context.stateGameDerived.bonusMeterLayout());
	// the frame's pixels to the layout's
	const scale = $derived(layout.width / BONUS_METER_ART.width);
	const planks = $derived({
		x: ART.planks.x * scale,
		y: ART.planks.y * scale,
		width: ART.planks.width * scale,
		height: ART.planks.height * scale,
	});

	// The bar shows the bonuses as zones that start at their counts, so the player sees both ahead:
	// up to BONUS_AT along it plain planks, which fill yellow on the way to BONUS_TRIGGER
	// (`progress`, 0 to 1); from BONUS_AT the bonus's zone, faintly green (ZONE_ALPHA) with BONUS on
	// it, which fills green from BONUS_TRIGGER on to SUPER_TRIGGER (`filled`, 0 to 1); from SUPER_AT
	// the super bonus's zone, faintly orange with SUPER on it, which fills orange at SUPER_TRIGGER
	// (`superFilled`); a mark where each starts. (The user's layout: green only in the bonus's zone.)
	const BONUS_AT = 0.45;
	const SUPER_AT = 0.75;
	const ZONE_ALPHA = 0.3;
	let show = $state(true);
	let amount = $state(0);
	const progress = new Tween(0, { duration: 350, easing: cubicOut });
	const filled = new Tween(0, { duration: 350, easing: cubicOut });
	const superFilled = new Tween(0, { duration: 350, easing: cubicOut });
	const flash = new Tween(0, { duration: 160 });

	// It counts up as the souls flying to it (MeterSouls) land, one each, as each lands; the books'
	// count (`target`, from bonusMeterUpdate) also has the cluster's premiums and wilds, which don't
	// fly, so the last soul in flight brings it to that, and with none in flight an update shows at
	// once. `flying`: souls on their way; `landed`: waiting for them all to have landed; `fill`: its
	// latest fill; a reset (a new spin) forgets souls still on their way (`round`).
	let target = 0;
	let flying = 0;
	let landed: (() => void)[] = [];
	let fill = Promise.resolve();
	let round = 0;

	// a soul landing fills it quicker than an update does
	const SOUL_FILL = 150;
	const fillTo = (count: number, duration?: number) => {
		amount = count;
		const intoBonus = (count - BONUS_TRIGGER) / (SUPER_TRIGGER - BONUS_TRIGGER);
		fill = Promise.all([
			progress.set(Math.min(1, count / BONUS_TRIGGER), { duration }),
			filled.set(Math.min(1, Math.max(0, intoBonus)), { duration }),
			superFilled.set(count >= SUPER_TRIGGER ? 1 : 0, { duration }),
		]).then(() => {});
	};
	// souls setting off: how each, landing, counts
	const onlaunch = (count: number) => {
		const at = round;
		flying += count;
		return () => {
			if (at !== round) return;
			flying--;
			const count = flying > 0 ? Math.min(target, amount + 1) : target;
			fillTo(Math.max(amount, count), SOUL_FILL);
			if (flying === 0) landed.splice(0).forEach((resolve) => resolve());
		};
	};
	const allLanded = () =>
		flying === 0 ? Promise.resolve() : new Promise<void>((resolve) => landed.push(resolve));

	context.eventEmitter.subscribeOnMount({
		bonusMeterShow: () => (show = true),
		bonusMeterHide: () => (show = false),
		bonusMeterUpdate: (emitterEvent) => {
			target = emitterEvent.amount;
			if (flying === 0) fillTo(target);
		},
		bonusMeterReset: () => {
			round++;
			target = 0;
			flying = 0;
			landed.splice(0).forEach((resolve) => resolve());
			amount = 0;
			fill = Promise.all([
				progress.set(0, { duration: 200 }),
				filled.set(0, { duration: 200 }),
				superFilled.set(0, { duration: 200 }),
			]).then(() => {});
			flash.set(0, { duration: 0 });
		},
		// it flashes when it is full (a bought bonus may start without it), once the souls on their way
		// have landed and it has filled
		bonusMeterFull: async () => {
			await allLanded();
			await fill;
			if (amount < BONUS_TRIGGER) return;
			for (let i = 0; i < 3; i++) {
				await flash.set(1);
				await flash.set(0.25);
			}
			await flash.set(1);
		},
	});

	// The count on the sign, "12 / 35 / 50": the bonus's 35 in green and the super bonus's 50 in
	// orange-red, as their zones are (bonusSignTextStyle, superSignTextStyle), the rest in the sign's
	// lettering, side by side, all together in the middle of the sign, as big as fits its height and
	// width (sized for the longest count, so it keeps one size as it counts).
	const countPartsAt = (count: number) => [
		{ text: `${count} / `, style: signTextStyle },
		{ text: `${BONUS_TRIGGER}`, style: bonusSignTextStyle },
		{ text: ' / ', style: signTextStyle },
		{ text: `${SUPER_TRIGGER}`, style: superSignTextStyle },
	];
	const measure = (parts: ReturnType<typeof countPartsAt>, size: number) =>
		parts.map(
			(part) => CanvasTextMetrics.measureText(part.text, new TextStyle(part.style(size))).width,
		);
	const sum = (widths: number[]) => widths.reduce((total, width) => total + width, 0);
	const countParts = $derived(countPartsAt(Math.min(amount, SUPER_TRIGGER)));
	const countSize = $derived.by(() => {
		const full = ART.sign.height * scale * 0.9;
		if (!fontReady) return full;
		const widest = sum(measure(countPartsAt(SUPER_TRIGGER), full));
		return full * Math.min(1, (ART.sign.width * scale) / widest);
	});
	const countLayout = $derived.by(() => {
		const widths = measure(countParts, countSize);
		let x = ART.sign.x * scale - sum(widths) / 2;
		return countParts.map((part, i) => {
			const at = x;
			x += widths[i];
			return { ...part, x: at };
		});
	});
	// how far along the bar it is filled, 0 to 1: the yellow on the way to the bonus, the green in
	// its zone, then the super's
	const progressTo = $derived(BONUS_AT * progress.current);
	const bonusFilledTo = $derived(BONUS_AT + (SUPER_AT - BONUS_AT) * filled.current);
	const superFilledTo = $derived(SUPER_AT + (1 - SUPER_AT) * superFilled.current);
	const filledTo = $derived(
		superFilled.current > 0 ? superFilledTo : filled.current > 0 ? bonusFilledTo : progressTo,
	);
	// where the souls fly into, in the main layout: the end of the filled part of the planks, at
	// least a little way in from the left
	const soulTarget = $derived({
		x: layout.x + planks.x + Math.max(planks.width * filledTo, planks.height * 0.6),
		y: layout.y + planks.y + planks.height / 2,
	});
	// the planks coloured over the stretches of the bar (from, to: 0 to 1) they show: the two zones
	// faintly green and orange, then yellow on the way to the bonus as it fills, green in its zone and
	// orange in the super's; the flash once full lights the fills and the zones reached
	const fills = $derived([
		{
			key: 'bonusMeterFill',
			from: BONUS_AT,
			to: SUPER_AT,
			alpha: ZONE_ALPHA,
			flashes: amount >= BONUS_TRIGGER,
		},
		{
			key: 'bonusMeterFillSuper',
			from: SUPER_AT,
			to: 1,
			alpha: ZONE_ALPHA,
			flashes: amount >= SUPER_TRIGGER,
		},
		{ key: 'bonusMeterFillProgress', from: 0, to: progressTo, alpha: 1, flashes: true },
		{ key: 'bonusMeterFill', from: BONUS_AT, to: bonusFilledTo, alpha: 1, flashes: true },
		{ key: 'bonusMeterFillSuper', from: SUPER_AT, to: superFilledTo, alpha: 1, flashes: true },
	]);
	// a mark where each zone starts, as wide as the planks' seams, and each zone's name in the middle
	// of it, BONUS in the sign's lettering (green on green would be hard to read) and SUPER in its own
	const MARK = { width: 0.05, colour: 0x2a1206, alpha: 0.85 };
	const marks = [BONUS_AT, SUPER_AT];
	const ZONE_LABEL_SIZE = 0.5;
	const zoneLabels = [
		{ text: 'BONUS', middle: (BONUS_AT + SUPER_AT) / 2, style: signTextStyle },
		{ text: 'SUPER', middle: (SUPER_AT + 1) / 2, style: superSignTextStyle },
	];
</script>

<MainContainer>
	<FadeContainer {show} x={layout.x} y={layout.y}>
		<Sprite key="bonusMeterFrame" width={layout.width} height={layout.height} />

		<!-- the bonuses' faint zones, the planks in them turning green, then orange, as it fills, and
		flashing light once full -->
		{#each [false, true] as flashing}
			{#each fills as fill}
				<Container
					x={planks.x}
					y={planks.y}
					blendMode={flashing ? 'add' : 'normal'}
					alpha={flashing ? flash.current * 0.5 : fill.alpha}
					visible={fill.to > fill.from && (!flashing || (flash.current > 0 && fill.flashes))}
				>
					<Graphics
						isMask
						draw={(graphics) =>
							graphics
								.rect(
									planks.width * fill.from,
									0,
									planks.width * (fill.to - fill.from),
									planks.height,
								)
								.fill(0xffffff)}
					/>
					<Sprite key={fill.key} width={planks.width} height={planks.height} />
				</Container>
			{/each}
		{/each}

		<!-- the marks where the zones start, and BONUS and SUPER on them -->
		{#each marks as at}
			<Graphics
				draw={(graphics) =>
					graphics
						.rect(
							planks.x + planks.width * at - (planks.height * MARK.width) / 2,
							planks.y,
							planks.height * MARK.width,
							planks.height,
						)
						.fill({ color: MARK.colour, alpha: MARK.alpha })}
			/>
		{/each}
		{#if fontReady}
			{#each zoneLabels as label}
				<Text
					x={planks.x + planks.width * label.middle}
					y={planks.y + planks.height / 2}
					anchor={{ x: 0.5, y: 0.5 }}
					text={label.text}
					style={label.style(planks.height * ZONE_LABEL_SIZE)}
				/>
			{/each}
		{/if}

		<!-- the count on the sign, out of the bonus's 35 and the super bonus's 50 -->
		{#if fontReady}
			{#each countLayout as part}
				<Text
					x={part.x}
					y={ART.sign.y * scale}
					anchor={{ x: 0, y: 0.5 }}
					text={part.text}
					style={part.style(countSize)}
				/>
			{/each}
		{/if}
	</FadeContainer>
</MainContainer>

<!-- the souls in their own container, over the meter's: beside it in the same one they went under
it, as a FadeContainer goes once faded out and comes back (it does as it mounts, too) added after
them -->
<MainContainer>
	<MeterSouls target={soulTarget} {onlaunch} />
</MainContainer>
