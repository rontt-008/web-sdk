<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventWinLine = {
		type: 'winLinesShow';
		// amount is in book units, like the amounts in book events
		wins: { positions: Position[]; amount: number }[];
	};
</script>

<script lang="ts">
	import _ from 'lodash';
	import type { ComponentProps } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Container, Graphics, Text } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import { createBoardTextStyle } from '../game/textStyles';
	import BoardContainer from './BoardContainer.svelte';

	type Point = { x: number; y: number };

	// The lines are the only sign of a win: the symbols don't pulse and there is no win screen.
	// The winning lines are shown one after another: each draws itself from its first symbol to its
	// last with its win amount in the middle, stays a moment, then fades before the next one.
	const DRAW_DURATION = 150;
	const HOLD_DURATION = 500;
	const FADE_DURATION = 100;
	// light blue fading down to light green, with a dark navy outline so it reads on the line
	const AMOUNT_STYLE = createBoardTextStyle({
		fontSize: SYMBOL_SIZE * 0.5,
		top: 0x5ad8ff,
		bottom: 0x6dff7a,
		outline: 0x0a2350,
	});
	const SAMPLES_PER_SEGMENT = 16;
	// a soft wide light blue glow under a bright, nearly white blue core
	const STROKES = [
		{ width: SYMBOL_SIZE * 0.11, color: 0x4cc3ff, alpha: 0.4 },
		{ width: SYMBOL_SIZE * 0.04, color: 0xd8f3ff, alpha: 1 },
	];

	const context = getContext();

	let line = $state<{ centres: Point[]; amountText: string }>();
	const progress = new Tween(0);
	const alpha = new Tween(0);

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
	// the amount sits on the middle of the line
	const amountPosition = $derived(path[Math.round((path.length - 1) / 2)]);

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
		// resolves when the last line starts fading, so the spin can end while it fades
		winLinesShow: async ({ wins }) => {
			for (const [index, { positions, amount }] of wins.entries()) {
				line = {
					centres: _.sortBy(positions, ['reel', 'row']).map((position) => ({
						x: getSymbolX(position.reel),
						y: context.stateGame.board[position.reel].reelState.symbols[position.row].symbolY(),
					})),
					amountText: toAmountText(amount),
				};
				alpha.set(1, { duration: 0 });
				progress.set(0, { duration: 0 });
				await progress.set(1, {
					duration: DRAW_DURATION / stateBetDerived.timeScale(),
					easing: cubicOut,
				});
				await waitForTimeout(HOLD_DURATION / stateBetDerived.timeScale());

				const fade = alpha.set(0, { duration: FADE_DURATION / stateBetDerived.timeScale() });
				if (index < wins.length - 1) await fade;
			}
		},
	});
</script>

<BoardContainer>
	<Container alpha={alpha.current}>
		<Graphics {draw} />
		<!-- the amount fades in as its line draws -->
		{#if line && amountPosition}
			<Text
				anchor={0.5}
				x={amountPosition.x}
				y={amountPosition.y}
				alpha={progress.current}
				text={line.amountText}
				style={AMOUNT_STYLE}
			/>
		{/if}
	</Container>
</BoardContainer>
