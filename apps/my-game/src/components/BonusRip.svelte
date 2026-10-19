<script lang="ts">
	import { onMount } from 'svelte';
	import type { BetModeData } from 'state-shared';

	import ClotheslineCard from './ClotheslineCard.svelte';
	import { getContext } from '../game/context';

	type Props = {
		// the bonus just bought
		betModeData: BetModeData;
		// called when the bonus should start, as the pieces fly off
		onstart: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// A bonus once bought: its towel comes up in the middle of the screen, is tugged, and rips into
	// pieces, threads flying, and the bonus starts.
	const POP_MS = 240;
	const TUG_MS = 320;
	const RIP_MS = 800;
	// the bonus starts this far into the rip, the pieces still flying off
	const START_AT = 0.7;
	// how far the tug stretches it, just before it gives
	const TUGGED = 'scale(1.07, 0.97)';

	// Where the towel tears, in % of it: twice across (left to right) and once down the middle (top to
	// bottom), the tear down the middle passing through where the ones across cross x = 50.
	type Point = [number, number];
	const ACROSS: Point[][] = [
		[[0, 38], [9, 34], [18, 40], [27, 35], [36, 41], [44, 36], [50, 39], [57, 35], [65, 41], [74, 36], [83, 40], [92, 35], [100, 38]],
		[[0, 70], [8, 66], [17, 72], [26, 67], [35, 73], [43, 68], [50, 71], [58, 67], [66, 73], [75, 68], [84, 72], [93, 67], [100, 70]],
	];
	const DOWN: Point[] = [
		[50, 0], [46, 9], [53, 18], [47, 28], [50, 39], [54, 47], [46, 55], [53, 63], [50, 71], [46, 79], [53, 87], [47, 94], [50, 100],
	];
	const EDGES: Point[][] = [[[0, 0], [50, 0], [100, 0]], ...ACROSS, [[0, 100], [50, 100], [100, 100]]];

	const polygon = (points: Point[]) => `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
	const leftOf = (line: Point[]) => line.filter(([x]) => x <= 50);
	const rightOf = (line: Point[]) => line.filter(([x]) => x >= 50);
	const middleY = (line: Point[]) => line.find(([x]) => x === 50)![1];

	// two pieces (left and right) in each of the three rows, and where each flies (in % of the towel):
	// out to its side, the top ones up a little, all of them falling
	const PIECES = [0, 1, 2].flatMap((row) => {
		const top = EDGES[row];
		const bottom = EDGES[row + 1];
		const middle = DOWN.filter(([, y]) => y >= middleY(top) && y <= middleY(bottom));
		const left = [...leftOf(top), ...middle.slice(1), ...leftOf(bottom).reverse().slice(1)];
		const right = [...rightOf(top), ...rightOf(bottom).reverse(), ...middle.slice(1, -1).reverse()];
		return [
			{ clip: polygon(left), x: -55 - row * 8, y: (row - 1) * 18 + 30, rotate: -18 - row * 9 },
			{ clip: polygon(right), x: 55 + row * 8, y: (row - 1) * 18 + 30, rotate: 18 + row * 9 },
		];
	});

	// threads and fluff of the cloth thrown out of the tears (distances in rem)
	const THREAD_COLORS = ['#8ed8fa', '#5bbdeb', '#ffffff', '#1d5f8a'];
	const THREADS = Array.from({ length: 22 }, (_, index) => {
		const angle = (index / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
		const distance = 5 + Math.random() * 7;
		return {
			x: Math.cos(angle) * distance,
			y: Math.sin(angle) * distance * 0.8,
			fall: 3 + Math.random() * 3,
			rotate: (Math.random() - 0.5) * 720,
			// along a tear: across (wide) or down the middle (tall)
			wide: index % 3 !== 0,
			top: index % 2 ? 38 : 70,
			color: THREAD_COLORS[index % THREAD_COLORS.length],
		};
	});

	let backdrop: HTMLDivElement;
	let towel: HTMLDivElement;
	let whole: HTMLDivElement;
	const pieces: HTMLDivElement[] = [];
	const threads: HTMLDivElement[] = [];

	const rip = () => {
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
		whole.style.visibility = 'hidden';

		PIECES.forEach((piece, index) =>
			pieces[index].animate(
				[
					// from as stretched as the tug left it
					{ transform: TUGGED, opacity: 1 },
					{ opacity: 1, offset: 0.35 },
					{ transform: `translate(${piece.x}%, ${piece.y}%) rotate(${piece.rotate}deg)`, opacity: 0 },
				],
				{ duration: RIP_MS, easing: 'cubic-bezier(0.2, 0.6, 0.5, 1)', fill: 'forwards' },
			),
		);

		THREADS.forEach((thread, index) =>
			threads[index].animate(
				[
					{ transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
					{
						transform: `translate(calc(-50% + ${thread.x}rem), calc(-50% + ${thread.y}rem)) rotate(${thread.rotate / 2}deg)`,
						opacity: 1,
						offset: 0.45,
						easing: 'ease-in',
					},
					{
						transform: `translate(calc(-50% + ${thread.x * 1.1}rem), calc(-50% + ${thread.y + thread.fall}rem)) rotate(${thread.rotate}deg)`,
						opacity: 0,
					},
				],
				{ duration: RIP_MS, easing: 'cubic-bezier(0.1, 0.7, 0.5, 1)', fill: 'forwards' },
			),
		);

		backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: RIP_MS * START_AT,
			easing: 'ease-in',
			fill: 'forwards',
		});
	};

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
			props.onstart();
			return;
		}

		backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: POP_MS, fill: 'backwards' });
		towel.animate(
			[
				{ transform: 'scale(0.6)', opacity: 0 },
				{ transform: 'scale(1.05)', opacity: 1, offset: 0.7 },
				{ transform: 'scale(1)', opacity: 1 },
			],
			{ duration: POP_MS, easing: 'ease-out', fill: 'backwards' },
		);
		// pulled at from both sides, harder and harder, until it gives
		whole.animate(
			[
				{ transform: 'none' },
				{ transform: 'scale(1.02, 0.99) rotate(-1deg)' },
				{ transform: 'scale(1.03, 0.985) rotate(1.2deg)' },
				{ transform: 'scale(1.05, 0.98) rotate(-1.5deg)' },
				{ transform: TUGGED },
			],
			{ duration: TUG_MS, delay: POP_MS, fill: 'forwards' },
		);

		const ripping = setTimeout(rip, POP_MS + TUG_MS);
		const starting = setTimeout(props.onstart, POP_MS + TUG_MS + RIP_MS * START_AT);
		return () => {
			clearTimeout(ripping);
			clearTimeout(starting);
		};
	});
</script>

<div class="rip" aria-hidden="true">
	<div class="backdrop" bind:this={backdrop}></div>

	<div class="towel" bind:this={towel}>
		<div bind:this={whole}>
			<ClotheslineCard levels={[props.betModeData]} levelRow={false} picture />
		</div>
		{#each PIECES as piece, index}
			<div class="piece" style:clip-path={piece.clip} bind:this={pieces[index]}>
				<ClotheslineCard levels={[props.betModeData]} levelRow={false} picture />
			</div>
		{/each}

		{#each THREADS as thread, index}
			<div
				class="thread"
				class:wide={thread.wide}
				style:top="{thread.top}%"
				style:background={thread.color}
				bind:this={threads[index]}
			></div>
		{/each}
	</div>
</div>

<style lang="scss">
	.rip {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
	}

	.towel {
		position: relative;
	}

	/* hidden until the towel rips into them */
	.piece {
		position: absolute;
		inset: 0;
		opacity: 0;
	}

	.thread {
		position: absolute;
		left: 50%;
		width: 0.2rem;
		height: 0.9rem;
		border-radius: 0.1rem;
		opacity: 0;

		&.wide {
			width: 0.9rem;
			height: 0.2rem;
		}
	}
</style>
