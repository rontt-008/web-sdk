<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventWinLine = {
		type: 'winLineShow';
		positions: Position[];
		// in book units, like the amounts in book events
		amount: number;
		// with a big wild's multiplier on the line (above 1): the win before it (book units)
		multiplier?: number;
		base?: number;
	};
</script>

<script lang="ts">
	import _ from 'lodash';
	import type { ComponentProps } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { CanvasTextMetrics, TextStyle } from 'pixi.js';
	import { Container, Graphics, Text } from 'pixi-svelte';
	import { stateBet, stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import { createBoardTextStyle } from '../game/textStyles';
	import { popOut } from '../game/motion';
	import BoardContainer from './BoardContainer.svelte';

	type Point = { x: number; y: number };

	// A winning line draws itself from its first symbol to its last while they hop (see winInfo), its
	// win amount pops up in the middle, it stays a moment, then fades as the next one is drawn.
	// With a big wild's multiplier on it, the amount pops up as the win before the multiplier, the
	// multiplier pops in beside it ("× 3X", coloured as on the big wild), then vanishes as the amount
	// slides back to the middle and counts up to the win, and kicks (not in turbo, which shows the win
	// straight away).
	const DRAW_DURATION = 150;
	const HOLD_DURATION = 500;
	const FADE_DURATION = 100;
	// the amount swells in from small with a little overshoot as the line reaches it
	const AMOUNT_POP_START = 0.4;
	const AMOUNT_POP_DURATION = 300;
	// light blue fading down to light green, with a dark navy outline so it reads on the line
	const AMOUNT_STYLE = createBoardTextStyle({
		fontSize: SYMBOL_SIZE * 0.5,
		top: 0x5ad8ff,
		bottom: 0x6dff7a,
		outline: 0x0a2350,
	});
	// the multiplier, in the big wild's colours (see Symbol), the same size as the amount
	const MULTIPLIER_STYLE = createBoardTextStyle({
		fontSize: SYMBOL_SIZE * 0.5,
		top: 0xffe234,
		bottom: 0xff8c1a,
		outline: 0x4a1c00,
	});
	const MULTIPLIER_GAP = SYMBOL_SIZE * 0.12;
	// after the base amount is up: the multiplier pops in, stays, then slides into the amount as it
	// counts up to the win, which kicks at the end
	const MULTIPLY = {
		wait: 150,
		pop: 250,
		hold: 350,
		merge: 250,
		count: 450,
		kick: 1.25,
		kickDuration: 250,
	};
	const SAMPLES_PER_SEGMENT = 16;
	// a soft wide light blue glow under a bright, nearly white blue core
	const STROKES = [
		{ width: SYMBOL_SIZE * 0.11, color: 0x4cc3ff, alpha: 0.4 },
		{ width: SYMBOL_SIZE * 0.04, color: 0xd8f3ff, alpha: 1 },
	];

	const context = getContext();

	// how wide a text is drawn: measured up front, so nothing is placed by last frame's width while
	// the amount counts up
	const widthOf = (text: string, style: typeof AMOUNT_STYLE) =>
		CanvasTextMetrics.measureText(text, new TextStyle(style)).width;

	let line = $state<{
		centres: Point[];
		// with a multiplier: it, and the widths of the amount before it and of "× 3X"
		multiplier?: { value: number; text: string; baseWidth: number; width: number };
	}>();
	const progress = new Tween(0);
	const alpha = new Tween(0);
	const amountScale = new Tween(1);
	// the amount shown, counting up as the multiplier goes in (book units)
	const amount = new Tween(0);
	// the multiplier: how far it has popped in, and how far it has gone into the amount
	const multiplierIn = new Tween(0);
	const merge = new Tween(0);

	// Catmull-Rom spline: a smooth curve through every centre, sampled into short straight steps
	const smoothPath = (points: Point[]) => {
		if (points.length < 2) return points;
		const path: Point[] = [];
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[i - 1] ?? points[i];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[i + 2] ?? p2;
			for (let step = 0; step < SAMPLES_PER_SEGMENT; step++) {
				const t = step / SAMPLES_PER_SEGMENT;
				const along = (a: number, b: number, c: number, d: number) =>
					0.5 *
					(2 * b +
						(c - a) * t +
						(2 * a - 5 * b + 4 * c - d) * t ** 2 +
						(3 * b - a - 3 * c + d) * t ** 3);
				path.push({ x: along(p0.x, p1.x, p2.x, p3.x), y: along(p0.y, p1.y, p2.y, p3.y) });
			}
		}
		path.push(points[points.length - 1]);
		return path;
	};

	const path = $derived(line ? smoothPath(line.centres) : []);
	// the amount sits on the middle of the line; while the multiplier is beside it, the two together
	// are centred there
	const amountPosition = $derived(path[Math.round((path.length - 1) / 2)]);
	// side by side, the amount (before the multiplier) and "× 3X" with a gap between, centred; as they
	// merge the multiplier vanishes where it is and the amount slides back to the middle
	const amountX = $derived.by(() => {
		const centre = amountPosition?.x ?? 0;
		const multiplier = line?.multiplier;
		if (!multiplier) return centre;
		return centre - ((MULTIPLIER_GAP + multiplier.width) / 2) * (1 - merge.current);
	});
	const multiplierX = $derived.by(() => {
		const centre = amountPosition?.x ?? 0;
		const multiplier = line?.multiplier;
		if (!multiplier) return centre;
		return centre + (multiplier.baseWidth + MULTIPLIER_GAP) / 2;
	});
	// gone almost at once as they merge (in the first part of it, a frame or two with its easing),
	// rather than shrinking and sliding into the amount
	const MULTIPLIER_VANISH = 0.25;
	const multiplierAlpha = $derived(Math.max(0, 1 - merge.current / MULTIPLIER_VANISH));

	// in the player's currency, like every other amount: ¥40, $0.004 or 1.40 SC
	const toAmountText = (bookEventAmount: number) =>
		bookEventAmountToCurrencyString(bookEventAmount);

	// the drawn part of the path, ending part way along a step so the line grows smoothly
	const shownPath = () => {
		const end = progress.current * (path.length - 1);
		const whole = Math.floor(end);
		const shown = path.slice(0, whole + 1);
		const next = path[whole + 1];
		if (next) {
			const fraction = end - whole;
			const last = path[whole];
			shown.push({
				x: last.x + (next.x - last.x) * fraction,
				y: last.y + (next.y - last.y) * fraction,
			});
		}
		return shown;
	};

	const draw: ComponentProps<typeof Graphics>['draw'] = (graphics) => {
		const shown = shownPath();
		if (shown.length < 2) return;
		for (const stroke of STROKES) {
			graphics.moveTo(shown[0].x, shown[0].y);
			for (const point of shown.slice(1)) graphics.lineTo(point.x, point.y);
			graphics.stroke({ ...stroke, cap: 'round', join: 'round' });
		}
	};

	context.eventEmitter.subscribeOnMount({
		// resolves as the line starts to fade, so the next line or the end of the spin comes in over it
		winLineShow: async ({ positions, amount: win, multiplier, base }) => {
			const timeScale = stateBetDerived.timeScale();
			// in turbo the line just shows its win, as one without a multiplier does
			const multiplied =
				!stateBet.isTurbo && !!multiplier && multiplier > 1 && base !== undefined && base < win;
			const multiplierText = `× ${multiplier}X`;
			line = {
				centres: _.sortBy(positions, ['reel', 'row']).map((position) => ({
					x: getSymbolX(position.reel),
					y: context.stateGame.board[position.reel].reelState.symbols[position.row].symbolY(),
				})),
				multiplier: multiplied
					? {
							value: multiplier,
							text: multiplierText,
							baseWidth: widthOf(toAmountText(base), AMOUNT_STYLE),
							width: widthOf(multiplierText, MULTIPLIER_STYLE),
						}
					: undefined,
			};
			amount.set(multiplied ? base : win, { duration: 0 });
			multiplierIn.set(0, { duration: 0 });
			merge.set(0, { duration: 0 });
			alpha.set(1, { duration: 0 });
			progress.set(0, { duration: 0 });
			amountScale.set(AMOUNT_POP_START, { duration: 0 });
			amountScale.set(1, { duration: AMOUNT_POP_DURATION / timeScale, easing: (t) => popOut(t) });
			await progress.set(1, { duration: DRAW_DURATION / timeScale, easing: cubicOut });

			if (multiplied) {
				// the base amount, then × the multiplier beside it, then into it, counting up to the win
				await waitForTimeout(MULTIPLY.wait / timeScale);
				// eased where it is drawn (popOut)
				await multiplierIn.set(1, { duration: MULTIPLY.pop / timeScale });
				await waitForTimeout(MULTIPLY.hold / timeScale);
				merge.set(1, { duration: MULTIPLY.merge / timeScale, easing: cubicOut });
				await amount.set(win, { duration: MULTIPLY.count / timeScale, easing: cubicOut });
				await amountScale.set(MULTIPLY.kick, { duration: (MULTIPLY.kickDuration * 0.4) / timeScale });
				await amountScale.set(1, {
					duration: (MULTIPLY.kickDuration * 0.6) / timeScale,
					easing: (t) => popOut(t),
				});
			}

			await waitForTimeout(HOLD_DURATION / timeScale);
			alpha.set(0, { duration: FADE_DURATION / timeScale });
		},
	});
</script>

<BoardContainer>
	<Container alpha={alpha.current}>
		<Graphics {draw} />
		{#if line && amountPosition}
			<!-- the multiplier beside the amount, under it as the amount slides back over its place -->
			{#if line.multiplier}
				<Container
					x={multiplierX}
					y={amountPosition.y}
					scale={popOut(multiplierIn.current)}
					alpha={multiplierAlpha}
				>
					<Text anchor={0.5} text={line.multiplier.text} style={MULTIPLIER_STYLE} />
				</Container>
			{/if}
			<Container x={amountX} y={amountPosition.y} scale={amountScale.current}>
				<Text anchor={0.5} text={toAmountText(amount.current)} style={AMOUNT_STYLE} />
			</Container>
		{/if}
	</Container>
</BoardContainer>
