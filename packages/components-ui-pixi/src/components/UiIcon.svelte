<script lang="ts" module>
	import type { ButtonIcon } from '../types';

	export type UiIconName =
		| ButtonIcon
		| 'spin'
		| 'stop'
		| 'buyBonus'
		| 'arrowUp'
		| 'arrowDown'
		// a straight arrow, shaft and head, pointing down
		| 'arrowDownLong'
		| 'musicOn'
		| 'musicOff';
</script>

<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Graphics } from 'pixi-svelte';

	type Props = {
		icon: UiIconName;
		// width and height of the box the icon is drawn in, centred on (x, y)
		size: number;
		color: number;
		// colour behind the icon, for icons that cut a gap around a line drawn over them
		background?: number;
		x?: number;
		y?: number;
	};

	const props: Props = $props();

	// Each icon is drawn in a 100x100 box centred on 0,0 and scaled to `size`.
	const LINE = 11;

	const line = (g: PIXI.Graphics, color: number, points: number[]) => {
		g.moveTo(points[0], points[1]);
		for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
		g.stroke({ width: LINE, color, cap: 'round', join: 'round' });
	};

	// pixi leaves the pen where the last stroke ended and arc() doesn't lift it, so without the
	// moveTo every arc after the first gets a straight line joining it to the previous shape
	const arc = (g: PIXI.Graphics, x: number, y: number, r: number, start: number, end: number) => {
		g.moveTo(x + Math.cos(start) * r, y + Math.sin(start) * r);
		g.arc(x, y, r, start, end);
	};

	// arrow head: length of each side, angle of each side from the arrow's direction, and how far
	// back along the arc it is aimed (0 = along the tangent at the tip, 0.5 = along the arc's last
	// `length` of travel)
	type ArrowHead = { length: number; spread: number; aim: number };
	const ARROW_HEAD: ArrowHead = { length: 15, spread: 2.4, aim: 0 };
	// the arc curves in just behind the tip, so a head along the tangent folds its inner side onto
	// the line; aiming it along the arc's last stretch keeps both sides clear
	const ARROW_HEAD_AIMED: ArrowHead = { length: 16, spread: 2.3, aim: 0.5 };

	// circular arrow from `start` to `end` (radians, clockwise) with an arrow head at the end
	const circularArrow = (
		g: PIXI.Graphics,
		color: number,
		r: number,
		start: number,
		end: number,
		head = ARROW_HEAD,
	) => {
		arc(g, 0, 0, r, start, end);
		g.stroke({ width: LINE, color, cap: 'round' });
		const tipX = Math.cos(end) * r;
		const tipY = Math.sin(end) * r;
		const direction = end + Math.PI / 2 - (head.aim * head.length) / r;
		line(g, color, [
			tipX + Math.cos(direction - head.spread) * head.length,
			tipY + Math.sin(direction - head.spread) * head.length,
			tipX,
			tipY,
			tipX + Math.cos(direction + head.spread) * head.length,
			tipY + Math.sin(direction + head.spread) * head.length,
		]);
	};

	const speaker = (g: PIXI.Graphics, color: number) => {
		g.poly([-34, -12, -18, -12, 0, -28, 0, 28, -18, 12, -34, 12]);
		g.fill({ color });
	};

	// two beamed eighth notes, shifted by (-2, 4) so the shape is centred
	const musicNotes = (g: PIXI.Graphics, color: number) => {
		const p = (x: number, y: number): [number, number] => [x - 2, y + 4];
		g.ellipse(...p(-19, 22), 13, 10);
		g.fill({ color });
		g.ellipse(...p(19, 14), 13, 10);
		g.fill({ color });
		g.poly([...p(-13.5, -20), ...p(-13.5, -32), ...p(35.5, -40), ...p(35.5, -28)]);
		g.fill({ color });
		g.moveTo(...p(-8, 20));
		g.lineTo(...p(-8, -26));
		g.moveTo(...p(30, 12));
		g.lineTo(...p(30, -34));
		g.stroke({ width: LINE, color, cap: 'round' });
	};

	const DRAW: Record<UiIconName, (g: PIXI.Graphics, color: number, background?: number) => void> = {
		increase: (g, c) => {
			line(g, c, [-26, 0, 26, 0]);
			line(g, c, [0, -26, 0, 26]);
		},
		decrease: (g, c) => line(g, c, [-26, 0, 26, 0]),
		arrowUp: (g, c) => line(g, c, [-28, 14, 0, -14, 28, 14]),
		arrowDown: (g, c) => line(g, c, [-28, -14, 0, 14, 28, -14]),
		arrowDownLong: (g, c) => {
			line(g, c, [0, -34, 0, 32]);
			line(g, c, [-24, 8, 0, 33, 24, 8]);
		},
		menu: (g, c) => {
			line(g, c, [-28, -20, 28, -20]);
			line(g, c, [-28, 0, 28, 0]);
			line(g, c, [-28, 20, 28, 20]);
		},
		menuExit: (g, c) => {
			line(g, c, [-22, -22, 22, 22]);
			line(g, c, [22, -22, -22, 22]);
		},
		turbo: (g, c) => {
			g.poly([8, -40, -24, 6, -2, 6, -10, 40, 24, -8, 2, -8]);
			g.fill({ color: c });
		},
		autoSpin: (g, c) => {
			circularArrow(g, c, 30, -Math.PI * 0.35, Math.PI * 1.25);
			g.poly([-8, -12, 14, 0, -8, 12]);
			g.fill({ color: c });
		},
		// two arrows chasing each other, with a gap so each head stops short of the other's tail
		spin: (g, c) => {
			circularArrow(g, c, 30, -Math.PI * 0.8, -Math.PI * 0.1, ARROW_HEAD_AIMED);
			circularArrow(g, c, 30, Math.PI * 0.2, Math.PI * 0.9, ARROW_HEAD_AIMED);
		},
		stop: (g, c) => {
			g.roundRect(-20, -20, 40, 40, 6);
			g.fill({ color: c });
		},
		info: (g, c) => {
			g.circle(0, -24, 7);
			g.fill({ color: c });
			line(g, c, [0, -6, 0, 28]);
		},
		payTable: (g, c) => {
			for (const y of [-22, 0, 22]) {
				g.circle(-24, y, 5);
				g.fill({ color: c });
				line(g, c, [-10, y, 28, y]);
			}
		},
		settings: (g, c) => {
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * Math.PI * 2;
				line(g, c, [Math.cos(a) * 22, Math.sin(a) * 22, Math.cos(a) * 34, Math.sin(a) * 34]);
			}
			g.circle(0, 0, 21);
			g.stroke({ width: LINE, color: c });
		},
		soundOn: (g, c) => {
			speaker(g, c);
			arc(g, 4, 0, 14, -Math.PI / 4, Math.PI / 4);
			g.stroke({ width: LINE * 0.8, color: c, cap: 'round' });
			arc(g, 4, 0, 28, -Math.PI / 4, Math.PI / 4);
			g.stroke({ width: LINE * 0.8, color: c, cap: 'round' });
		},
		soundOff: (g, c) => {
			speaker(g, c);
			line(g, c, [12, -12, 34, 12]);
			line(g, c, [34, -12, 12, 12]);
		},
		musicOn: (g, c) => musicNotes(g, c),
		// the notes struck through, with a gap in the background colour either side of the line so
		// it stands out where it crosses them
		musicOff: (g, c, background) => {
			musicNotes(g, c);
			if (background !== undefined) {
				g.moveTo(-34, -34);
				g.lineTo(34, 34);
				g.stroke({ width: LINE * 2.2, color: background, cap: 'round' });
			}
			line(g, c, [-34, -34, 34, 34]);
		},
		buyBonus: (g, c) => {
			// gift box
			g.roundRect(-30, -10, 60, 40, 5);
			g.stroke({ width: LINE * 0.8, color: c, join: 'round' });
			g.roundRect(-34, -22, 68, 14, 4);
			g.fill({ color: c });
			line(g, c, [0, -18, 0, 30]);
			g.ellipse(-11, -30, 11, 8);
			g.stroke({ width: LINE * 0.7, color: c });
			g.ellipse(11, -30, 11, 8);
			g.stroke({ width: LINE * 0.7, color: c });
		},
	};
</script>

<Graphics
	x={props.x}
	y={props.y}
	scale={props.size / 100}
	draw={(graphics) => DRAW[props.icon](graphics, props.color, props.background)}
/>
