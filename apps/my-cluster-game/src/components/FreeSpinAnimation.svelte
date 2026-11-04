<script lang="ts" module>
	import { signTextStyle } from '../game/signText';

	// The free spins' intro and end screens' words in the logo's lettering, in the panel's space (see
	// children): over the number, CONGRATULATIONS! and YOU WON (on a small win just YOU WON, bigger),
	// under it FREE SPINS (SUPER FREE SPINS for the super bonus) or TOTAL WIN.
	const word = (text: string, y: number, size: number) => ({
		anchor: 0.5,
		y,
		text,
		style: signTextStyle(size),
	});
	export const FREE_SPIN_WORDS = {
		congratulations: word('CONGRATULATIONS!', -320, 150),
		youWon: word('YOU WON', -175, 100),
		youWonSmall: word('YOU WON', -250, 190),
		freeSpins: word('FREE SPINS', 323, 112),
		superFreeSpins: word('SUPER FREE SPINS', 323, 112),
		mythicFreeSpins: word('MYTHIC FREE SPINS', 323, 112),
		totalWin: word('TOTAL WIN', 340, 112),
		totalWinSmall: word('TOTAL WIN', 315, 140),
	};

	// The number between them (the free spins, the total win), in the same space: where its middle is
	// and how big it is, as the sample's number used to be drawn (its spine drew the text 2.24 times as
	// big, a little below the middle).
	export const FREE_SPIN_NUMBER = { y: 34, size: 84 * 2.24 };

	// in seconds: the panel's fall (it lands then, see FreeSpinPop), the swing after it lands (how far,
	// in radians, how long a swing takes, how soon it dies away), how much it leans as it falls, and
	// how long all of it takes
	export const PANEL_DROP = { fall: 0.55, swing: 0.045, period: 0.95, settle: 0.5, lean: -0.05 };
	const PANEL_DROP_TOTAL = 2.6;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { linear } from 'svelte/easing';
	import { Container, Sprite, type Sizes } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { stateBetDerived } from 'state-shared';

	import Celebration from './Celebration.svelte';
	import { getContext } from '../game/context';
	import { SIGN_FLOAT, SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';

	type Props = {
		// how strong the backdrop is (Celebration's power), 0 to 1
		power?: number;
		// once it has landed, it floats gently as the spins' sign does (SIGN_FLOAT): the power spins'
		// panel does
		float?: boolean;
		children: Snippet<[{ sizes: Sizes }]>;
	};

	const props: Props = $props();
	const context = getContext();

	// The free spins' intro and end screens and the power spins' intro (PowerSpinsIntro): the user's
	// board of planks in a frame of branches with maple leaves (screen-panel, see
	// art-source/wood-frames.py) drops in from above the screen as if let down on its ropes, lands with
	// a burst of leaves and swings to rest from its top, over the game's backdrop (Celebration: the
	// screen darkened, leaves whirling round a warm glow); it took the place of the sample's free spin
	// screen and its rays. The words and number are laid out in its planks (1174 x 687 of its
	// 1415 x 932, about centred), at WORDS_SCALE, in the middle of the screen (not of the board, which
	// sits left of it). It is as big and as placed as the sample's spine drew it (560 wide, its data
	// 1854.58 wide loaded at twice the size, its popup bone 1.3 times, what is in a slot twice again),
	// so the words keep their sizes.
	const SCREEN_PANEL_WIDTH = 1650;
	const SCREEN_PANEL = { width: SCREEN_PANEL_WIDTH, height: (SCREEN_PANEL_WIDTH * 932) / 1415 };
	const WORDS_SCALE = 0.85;
	const PANEL_SCALE = (560 / (1854.58 * 2)) * 1.3 * 2;
	const PANEL_Y = 4.8;
	// how far above the screen's top edge its bottom starts
	const DROP_CLEAR = 40;

	// the words' space the screens lay out in (as the sample's)
	const BACKGROUND_WIDTH = SYMBOL_SIZE * BOARD_DIMENSIONS.y;
	const BACKGROUND_SIZES = { width: BACKGROUND_WIDTH, height: BACKGROUND_WIDTH / (920 / 720) };

	const main = $derived(context.stateLayoutDerived.mainLayout());
	const half = (SCREEN_PANEL.height * PANEL_SCALE) / 2;
	// its top edge (it hangs from there), where it comes to rest, and how far it falls to get there
	const restTop = $derived(main.height / 2 + PANEL_Y - half);
	const fallFrom = $derived(main.height / 2 - main.y / main.scale - half * 2 - DROP_CLEAR);

	// coming down fast and caught by its ropes, just past its place and back
	const caught = (t: number) => {
		const s = 0.9;
		return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
	};

	const clock = new Tween(0, { easing: linear });
	let bursts = $state(0);
	const fell = $derived(Math.min(1, clock.current / PANEL_DROP.fall));
	const top = $derived(fallFrom + (restTop - fallFrom) * caught(fell));
	const rotation = $derived.by(() => {
		const { fall, swing, period, settle, lean } = PANEL_DROP;
		if (clock.current < fall) return lean * (1 - fell);
		const t = clock.current - fall;
		return swing * Math.exp(-t / settle) * Math.sin((t / period) * Math.PI * 2);
	});
	// a burst of leaves as it lands
	$effect(() => {
		if (clock.current >= PANEL_DROP.fall && bursts === 0) bursts = 1;
	});

	// Floating (props.float): from where it lands, easing in over FLOAT_IN seconds (each sway starting
	// from its rest, so nothing jumps), in seconds since it came, as the screen's clock goes (an idle
	// motion, not quicker in turbo)
	const FLOAT_IN = 1.5;
	let seconds = $state(0);
	let landsAt = 0;
	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker || !props.float) return;
		const tick = () => (seconds += ticker.deltaMS / 1000);
		ticker.add(tick);
		return () => ticker.remove(tick);
	});
	const float = $derived.by(() => {
		const t = seconds - landsAt;
		if (!props.float || t <= 0) return { y: 0, rotation: 0 };
		const share = Math.min(1, t / FLOAT_IN);
		const eased = share * share * (3 - 2 * share);
		return {
			y: eased * SIGN_FLOAT.height * Math.sin((2 * Math.PI * t) / SIGN_FLOAT.period),
			rotation:
				eased *
				((SIGN_FLOAT.tilt * Math.PI) / 180) *
				Math.sin((2 * Math.PI * t) / SIGN_FLOAT.tiltPeriod),
		};
	});

	onMount(() => {
		const timeScale = stateBetDerived.timeScale();
		landsAt = PANEL_DROP.fall / timeScale;
		clock.set(PANEL_DROP_TOTAL, { duration: (PANEL_DROP_TOTAL * 1000) / timeScale });
	});
</script>

<Celebration power={props.power ?? 0.55} {bursts}>
	<MainContainer>
		<Container x={main.width / 2} y={top + float.y} rotation={rotation + float.rotation}>
			<Container y={half} scale={PANEL_SCALE}>
				<Sprite key="screenPanel" anchor={0.5} {...SCREEN_PANEL} />
				<Container scale={WORDS_SCALE}>
					{@render props.children({ sizes: BACKGROUND_SIZES })}
				</Container>
			</Container>
		</Container>
	</MainContainer>
</Celebration>
