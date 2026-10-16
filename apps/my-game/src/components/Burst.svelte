<script lang="ts" module>
	// cream, the warm yellow of the titles and the pink of the paw symbol
	export const BURST_COLORS = [0xfff4d6, 0xffd45a, 0xffb3c7];
</script>

<script lang="ts">
	import _ from 'lodash';
	import type { ComponentProps } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Graphics } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	// A one-off puff of little four-pointed stars and dots flying out from a point, slowing down,
	// spinning and shrinking away. It plays once, when it is put on screen.
	type Props = {
		x?: number;
		y?: number;
		count?: number;
		// how far the pieces fly, and the size of the biggest star
		distance: number;
		size: number;
		duration?: number;
		colors?: number[];
		// flatten the spread (e.g. 0.4 for a puff of dust along the ground)
		squashY?: number;
		// only fly upwards, as from the ground
		upwards?: boolean;
	};

	const props: Props = $props();
	const progress = new Tween(0);

	// pieces are spread evenly round the circle (or the top half), each a little off its slot
	const count = props.count ?? 10;
	const spread = props.upwards ? Math.PI : Math.PI * 2;
	const pieces = _.range(count).map((index) => ({
		angle:
			(props.upwards ? Math.PI : 0) + ((index + _.random(0.2, 0.8, true)) / count) * spread,
		distance: _.random(0.55, 1, true),
		size: _.random(0.5, 1, true),
		// every third piece is a dot, the rest stars
		star: index % 3 !== 0,
		color: (props.colors ?? BURST_COLORS)[index % (props.colors ?? BURST_COLORS).length],
		spin: _.random(-1, 1, true) * Math.PI,
	}));

	$effect(() => {
		progress.set(1, {
			duration: (props.duration ?? 500) / stateBetDerived.timeScale(),
			easing: (t) => t,
		});
	});

	const draw: ComponentProps<typeof Graphics>['draw'] = (graphics) => {
		const t = progress.current;
		if (t >= 1) return;
		const travel = cubicOut(t);
		// full size for the first part of the way, then shrinking to nothing
		const grow = Math.min(1, t / 0.15) * (1 - Math.max(0, (t - 0.45) / 0.55));
		for (const piece of pieces) {
			const reach = props.distance * piece.distance * travel;
			const px = Math.cos(piece.angle) * reach;
			const py = Math.sin(piece.angle) * reach * (props.squashY ?? 1);
			const size = props.size * piece.size * grow;
			if (size <= 0) continue;
			if (piece.star) {
				graphics.star(px, py, 4, size, size * 0.38, piece.spin * t);
			} else {
				graphics.circle(px, py, size * 0.35);
			}
			graphics.fill({ color: piece.color });
		}
	};
</script>

<Graphics x={props.x ?? 0} y={props.y ?? 0} {draw} />
