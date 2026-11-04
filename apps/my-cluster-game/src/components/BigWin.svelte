<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { backOut, cubicOut, linear } from 'svelte/easing';
	import { Container } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { ResponsiveText } from 'components-pixi';
	import { stateBetDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForTimeout } from 'utils-shared/wait';

	import Celebration from './Celebration.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import RuneGlyph from './RuneGlyph.svelte';
	import { getContext } from '../game/context';
	import { LAYOUT_UNIT } from '../game/constants';
	import { runeShape, type BoardRuneName } from '../game/runes';
	import { signTextStyle, type SignColour } from '../game/signText';

	type Props = {
		// in book units (100 is the bet), as in the book's setWin
		amount: number;
		// its win level (6 BIG to 10 MAX, see winLevelMap)
		level: number;
		// when it has gone (pressed on, or by itself a while after the count)
		oncomplete: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// A big win (15x the bet or more): the screen darkens behind the game's own backdrop (Celebration,
	// leaves whirling round a warm glow) and the win counts up under its name. The name climbs as the
	// count passes each level, BIG WIN up to the round's own, slamming in each time in its own colour
	// with a burst of leaves, and a row of five runes under the amount lights one more for each level,
	// so the climb shows (all five for a max win); the whirl grows with it. When the count ends the
	// amount kicks and the leaves burst once more. A press skips to the end of the count, then closes;
	// it closes by itself a moment after the count (for autoplay). Where each level starts is the
	// math's (its win levels, in book units).
	type Tier = {
		level: number;
		text: string;
		from: number;
		colour: SignColour;
		rune: BoardRuneName;
	};
	const TIERS: Tier[] = [
		{ level: 6, text: 'BIG WIN', from: 15 * 100, colour: 'yellow', rune: 'ingwaz' },
		{ level: 7, text: 'SUPER WIN', from: 30 * 100, colour: 'green', rune: 'othala' },
		{ level: 8, text: 'MEGA WIN', from: 50 * 100, colour: 'orange', rune: 'mannaz' },
		{ level: 9, text: 'EPIC WIN', from: 100 * 100, colour: 'red', rune: 'fehu' },
		{ level: 10, text: 'MAX WIN', from: 25000 * 100, colour: 'purple', rune: 'hagall' },
	];

	// in milliseconds: each level's count, how long the name takes to slam in (from this big), and how
	// long the screen stays once the count is done
	const STEP_MS = 2300;
	const SLAM = { ms: 420, from: 1.9 };
	const KICK = { ms: 500, to: 1.16 };
	const HOLD_MS = 2000;

	// in the main layout, from its middle, in layout units: the name, the amount, the runes' row (each
	// rune this big, this far apart, lighting up from this big; those still to come faintly lit, so
	// the five levels show)
	const TITLE = { y: -1.25, size: 1.75 };
	const AMOUNT = { y: 0.3, size: 1.45 };
	const RUNES = { y: 1.72, size: 0.82, apart: 1.12, pop: 1.5, unlit: 0.2 };

	const timeScale = () => stateBetDerived.timeScale();

	// the levels the count climbs through, each with the amounts it counts between
	const steps = $derived.by(() => {
		const climb = TIERS.filter((tier) => tier.level <= props.level);
		const tiers = climb.length ? climb : [TIERS[0]];
		return tiers.map((tier, index) => {
			const start = index === 0 ? 0 : Math.min(tier.from, props.amount);
			const end =
				index === tiers.length - 1 ? props.amount : Math.min(tiers[index + 1].from, props.amount);
			return { ...tier, start, end: Math.max(start, end) };
		});
	});

	// how far the count is, from 0 to steps.length, one for each level
	const count = new Tween(0, { easing: linear });
	let done = $state(false);
	let closed = false;
	const stepIndex = $derived(Math.min(Math.floor(count.current), steps.length - 1));
	const step = $derived(steps[stepIndex]);
	const countAmount = $derived.by(() => {
		if (done) return props.amount;
		// slowing into the end of each level, before the next name slams in
		const within = cubicOut(Math.min(1, count.current - stepIndex));
		return step.start + (step.end - step.start) * within;
	});

	let bursts = $state(0);
	const power = $derived(done ? 1 : (stepIndex + 1) / TIERS.length);

	// the name slams in whenever the level changes; its rune lights with a pop
	const titleScale = new Tween(1);
	const titleAlpha = new Tween(1);
	const runeLight = TIERS.map(() => new Tween(0));
	const runeScale = TIERS.map(() => new Tween(1));
	let shownStep = -1;
	$effect(() => {
		const index = stepIndex;
		if (index === shownStep) return;
		for (let i = shownStep + 1; i <= index; i++) {
			runeLight[i].set(1, { duration: 250 / timeScale() });
			runeScale[i].set(RUNES.pop, { duration: 0 });
			runeScale[i].set(1, { duration: 500 / timeScale(), easing: cubicOut });
		}
		shownStep = index;
		titleScale.set(SLAM.from, { duration: 0 });
		titleAlpha.set(0, { duration: 0 });
		titleScale.set(1, { duration: SLAM.ms / timeScale(), easing: backOut });
		titleAlpha.set(1, { duration: (SLAM.ms * 0.4) / timeScale() });
		bursts++;
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_reveal' });
	});

	const amountScale = new Tween(1);

	const close = () => {
		if (closed) return;
		closed = true;
		props.oncomplete();
	};

	const finish = async () => {
		if (done) return;
		done = true;
		count.set(steps.length, { duration: 0 });
		bursts++;
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_end' });
		amountScale.set(KICK.to, { duration: (KICK.ms * 0.3) / timeScale(), easing: cubicOut });
		await waitForTimeout((KICK.ms * 0.3) / timeScale());
		amountScale.set(1, { duration: (KICK.ms * 0.7) / timeScale(), easing: cubicOut });
		await waitForTimeout(HOLD_MS / timeScale());
		close();
	};

	onMount(async () => {
		await count.set(steps.length, { duration: (STEP_MS * steps.length) / timeScale() });
		finish();
	});

	const main = $derived(context.stateLayoutDerived.mainLayout());
	// no wider than the screen
	const maxWidth = $derived(
		Math.min((context.stateLayoutDerived.canvasSizes().width / main.scale) * 0.92, LAYOUT_UNIT * 9),
	);

	// a rune's middle in its 5 x 5 cells, from where its spots are, so each is centred on its place
	const centreOf = (rune: BoardRuneName) => {
		const spots = runeShape(rune).spots;
		const reels = spots.map(([reel]) => reel);
		const rows = spots.map(([, row]) => row);
		return {
			reel: 2.5 - (Math.min(...reels) + Math.max(...reels) + 1) / 2,
			row: 2.5 - (Math.min(...rows) + Math.max(...rows) + 1) / 2,
		};
	};
	const glyph = LAYOUT_UNIT * RUNES.size;
</script>

<Celebration {power} {bursts} dim={0.68}>
	<MainContainer>
		<Container x={main.width / 2} y={main.height / 2}>
			<Container y={LAYOUT_UNIT * TITLE.y} scale={titleScale.current} alpha={titleAlpha.current}>
				<ResponsiveText
					anchor={0.5}
					{maxWidth}
					text={step.text}
					style={{ ...signTextStyle(LAYOUT_UNIT * TITLE.size, step.colour), align: 'center' }}
				/>
			</Container>

			<Container y={LAYOUT_UNIT * AMOUNT.y} scale={amountScale.current}>
				<ResponsiveText
					anchor={0.5}
					{maxWidth}
					text={bookEventAmountToCurrencyString(countAmount, { counting: !done })}
					style={{ ...signTextStyle(LAYOUT_UNIT * AMOUNT.size), align: 'center' }}
				/>
			</Container>

			{#each TIERS as tier, i}
				<Container
					x={LAYOUT_UNIT * RUNES.apart * (i - (TIERS.length - 1) / 2)}
					y={LAYOUT_UNIT * RUNES.y}
					scale={runeScale[i].current}
				>
					<RuneGlyph
						rune={tier.rune}
						size={glyph}
						x={-glyph / 2}
						y={-glyph / 2}
						offset={centreOf(tier.rune)}
						glows={[]}
						flash={RUNES.unlit + (1 - RUNES.unlit) * runeLight[i].current}
						spots={false}
						alpha={0.55 + 0.45 * runeLight[i].current}
					/>
				</Container>
			{/each}
		</Container>
	</MainContainer>
</Celebration>

<PressToContinue onpress={() => (done ? close() : finish())} />
