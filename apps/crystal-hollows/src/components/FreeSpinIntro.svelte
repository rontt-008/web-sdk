<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { LOGO_TEXT_COLORS } from '../game/textStyles';
	import PressToContinue from './PressToContinue.svelte';
	import LogoText from './LogoText.svelte';
	import BatSign from './BatSign.svelte';

	// The free spins won (2026-11-17, the user: "using the bats animation can you make a animation/custom
	// screen for these screenshots"): over the dimmed game the crystal bat dives to the bottom of the
	// screen and fishes the free spins sign up on two ropes (BatSign), YOU WON and FREE SPINS on it; it
	// roars as it pulls it up, and at the roar's snap the number slams onto the sign. Pressed, it lets go of
	// the sign, which falls away, and flies back. In the game's rock lettering (LogoText): the words blue,
	// the number pink. (Till then: the words over the dimmed board.)
	// Font sizes and middles (from the panel's middle) of the panel's height, at most `fill` of its width.
	const WORDS = { won: { size: 0.2, y: -0.33 }, count: { size: 0.46, y: 0.01 }, label: { size: 0.24, y: 0.34 }, fill: 0.9 };
	// the roar begins this long after it appears, so its snap comes just as it has pulled the sign up
	// (BatSign FETCH: down 0.7 + grab 0.24 + up 1.05 s)
	const ROAR_AT = 1.15;
	// the number slamming on: from this much bigger, over this long
	const SLAM = { from: 1.9, ms: 420 };

	const context = getContext();

	let show = $state(false);
	let freeSpins = $state(0);
	let leaving = $state(false);
	let left = false;
	let oncomplete = $state(() => {});
	// the number: 0 till it slams on, then its scale
	const number = new Tween(0);

	const slam = () => {
		if (number.target !== 0) return;
		number.set(SLAM.from, { duration: 0 });
		number.set(1, { duration: SLAM.ms, easing: backOut });
	};
	const leave = () => {
		slam();
		leaving = true;
	};

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => {
			show = true;
			leaving = false;
			left = false;
			number.set(0, { duration: 0 });
		},
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async (emitterEvent) => {
			freeSpins = emitterEvent.totalFreeSpins;
			if (left) return;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.62} />

	<MainContainer>
		<BatSign
			{leaving}
			roars={0}
			roarAt={ROAR_AT}
			onsnap={slam}
			onleft={() => {
				left = true;
				oncomplete();
			}}
		>
			{#snippet panel({ width, height })}
				<LogoText
					text="YOU WON"
					y={height * WORDS.won.y}
					fontSize={height * WORDS.won.size}
					maxWidth={width * WORDS.fill}
					colors={LOGO_TEXT_COLORS.blue}
					look="logo"
				/>
				<Container y={height * WORDS.count.y} scale={number.current} visible={number.current > 0}>
					<LogoText
						text={`${freeSpins}`}
						fontSize={height * WORDS.count.size}
						maxWidth={width * WORDS.fill}
						colors={LOGO_TEXT_COLORS.pink}
						look="logo"
					/>
				</Container>
				<LogoText
					text="FREE SPINS"
					y={height * WORDS.label.y}
					fontSize={height * WORDS.label.size}
					maxWidth={width * WORDS.fill}
					colors={LOGO_TEXT_COLORS.blue}
					look="logo"
				/>
			{/snippet}
		</BatSign>
	</MainContainer>

	{#if show && !leaving}
		<PressToContinue onpress={leave} />
	{/if}
</FadeContainer>
