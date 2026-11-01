<script lang="ts" module>
	import { signTextStyle } from '../game/signText';

	// The free spins' intro and end screens' words in the logo's lettering, where the sample's
	// pictures of them were, in the panel's space (see children): over the number, CONGRATULATIONS!
	// and YOU WON (on a small win just YOU WON, bigger), under it FREE SPINS (SUPER FREE SPINS for the
	// super bonus) or TOTAL WIN.
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
		totalWin: word('TOTAL WIN', 340, 112),
		totalWinSmall: word('TOTAL WIN', 315, 140),
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	import {
		anchorToPivot,
		Container,
		SpineProvider,
		SpineSlot,
		SpineTrack,
		Sprite,
		type Sizes,
	} from 'pixi-svelte';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';
	import SpineHideSlots from './SpineHideSlots.svelte';

	// The user's board of planks in a frame of branches with maple leaves (screen-panel, see
	// art-source/wood-frames.py) instead of the sample's purple panel (its slots, FS_Frame_A and its
	// flash, left out), on the panel's bone, so it pops in as the panel did, the rays still behind it
	// (orange: fs_screen.json's animations tinted them purple and blue, now its setup pose's oranges).
	// The free spins' intro and end screens and the power spins' intro (PowerSpinsIntro) are on it.
	// The sample's panel was 1288 x 1008 there; this one is wider, its planks (1174 x 687 of its
	// 1415 x 932, about centred) holding the words and number, which were laid out for the old panel
	// and so are drawn at WORDS_SCALE.
	const SCREEN_PANEL_WIDTH = 1650;
	const SCREEN_PANEL = { width: SCREEN_PANEL_WIDTH, height: (SCREEN_PANEL_WIDTH * 932) / 1415 };
	const WORDS_SCALE = 0.85;

	type Props = {
		children: Snippet<[{ sizes: Sizes }]>;
	};

	const props: Props = $props();

	type AnimationName = 'intro' | 'idle';

	const context = getContext();
	const BACKGROUND_RATIO = 920 / 720;
	const BACKGROUND_WIDTH = SYMBOL_SIZE * BOARD_DIMENSIONS.y;
	const BACKGROUND_SIZES = {
		width: BACKGROUND_WIDTH,
		height: BACKGROUND_WIDTH / BACKGROUND_RATIO,
	};
	const PANEL_SIZES = {
		width: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
		height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
	};

	let animationName = $state<AnimationName>('intro');
</script>

<!-- in the middle of the screen (not of the board, which sits left of it) -->
<MainContainer>
	<Container
		x={context.stateLayoutDerived.mainLayout().width * 0.5}
		y={context.stateLayoutDerived.mainLayout().height * 0.5}
		pivot={anchorToPivot({ anchor: 0.5, sizes: BACKGROUND_SIZES })}
	>
		<SpineProvider
			key="fsIntro"
			width={PANEL_SIZES.width}
			x={PANEL_SIZES.width * 0.5}
			y={PANEL_SIZES.height * 0.4}
		>
			<SpineTrack
				trackIndex={0}
				{animationName}
				loop={animationName === 'idle'}
				listener={{
					complete: () => (animationName = 'idle'),
				}}
			/>
			<SpineHideSlots slots={['FS_Frame_A', 'FS_Frame_A2']} />
			<SpineSlot slotName="slot_text_placeholder">
				<Sprite key="screenPanel" anchor={0.5} {...SCREEN_PANEL} />
				<Container scale={WORDS_SCALE}>
					{@render props.children({ sizes: BACKGROUND_SIZES })}
				</Container>
			</SpineSlot>
		</SpineProvider>
	</Container>
</MainContainer>
