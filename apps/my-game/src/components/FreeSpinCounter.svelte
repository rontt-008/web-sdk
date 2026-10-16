<script lang="ts" module>
	import { SYMBOL_SIZE } from '../game/constants';

	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };

	// During free spins the buy bonus button's wooden sign, a bit bigger, takes the place of the
	// feature buttons under the logo and shows how many spins have been played.
	const SIGN_WIDTH = SYMBOL_SIZE * 3;
	const SIGN_SIZES = { width: SIGN_WIDTH, height: (SIGN_WIDTH * 209) / 800 };
	// between the logo and the sign, as for the feature buttons
	const GAP = SYMBOL_SIZE * 0.15;
	// how far below the logo's bottom the sign reaches (things under the logo keep below it)
	export const FREE_SPIN_COUNTER_SPACE = GAP + SIGN_SIZES.height;
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { BONUS_NAME } from '../game/constants';
	import { popOut } from '../game/motion';
	import { createBoardTextStyle, fitBoardFontSize } from '../game/textStyles';

	// the leaves stick out past the panel, so the text only gets the middle of it
	const TEXT_MAX_WIDTH = SIGN_WIDTH * 0.68;
	// it is wider than the logo, so it sits a little left of the logo's centre to keep its leaves
	// clear of the board's frame
	const SHIFT_LEFT = SYMBOL_SIZE * 0.12;

	// white, in the same chunky outlined text as the rest of the game
	const COLORS = { top: 0xffffff, bottom: 0xfff2c2 };
	const OUTLINE_COLOR = 0x4a1c00;
	const TITLE_FONT_SIZE = SYMBOL_SIZE * 0.2;
	const COUNT_FONT_SIZE = SYMBOL_SIZE * 0.27;
	// where the two lines meet; text boxes include room below the letters, so this sits a little
	// above the sign's middle to centre the letters themselves
	const TEXT_Y = -SYMBOL_SIZE * 0.033;

	const context = getContext();
	const position = $derived({
		x: context.stateGameDerived.logoLayout().x - SHIFT_LEFT,
		y:
			context.stateGameDerived.logoLayout().y +
			context.stateGameDerived.logoLayout().height * 0.5 +
			GAP +
			SIGN_SIZES.height * 0.5,
	});

	const bonusName = $derived(BONUS_NAME[context.stateGame.bonusType ?? 'normal']);
	const title = $derived(bonusName ? `${bonusName} FREE SPINS` : 'FREE SPINS');

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	const count = $derived(`${current} OF ${total}`);

	// the count kicks each time it changes: a new spin, or spins added
	const COUNT_KICK = 1.3;
	const countScale = new Tween(1);
	let countHeight = $state(COUNT_FONT_SIZE * 1.2);
	const kick = async () => {
		const timeScale = stateBetDerived.timeScale();
		await countScale.set(COUNT_KICK, { duration: 110 / timeScale });
		await countScale.set(1, { duration: 360 / timeScale, easing: (t) => popOut(t, 3) });
	};

	const getStyle = (text: string, fontSize: number) =>
		createBoardTextStyle({
			fontSize: fitBoardFontSize({ text, fontSize, maxWidth: TEXT_MAX_WIDTH }),
			...COLORS,
			outline: OUTLINE_COLOR,
		});
	const titleStyle = $derived(getStyle(title, TITLE_FONT_SIZE));
	const countStyle = $derived(getStyle(count, COUNT_FONT_SIZE));

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (emitterEvent) => {
			const previous = count;
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
			if (show && count !== previous) kick();
		},
	});
</script>

<MainContainer>
	<FadeContainer {show} {...position}>
		<Sprite key="buttonBuyBonus" anchor={0.5} {...SIGN_SIZES} />
		<Text
			anchor={{ x: 0.5, y: 1 }}
			y={TEXT_Y + SYMBOL_SIZE * 0.01}
			text={title}
			style={titleStyle}
		/>
		<!-- its top where the title ends, scaled about its middle -->
		<Container y={TEXT_Y - SYMBOL_SIZE * 0.01 + countHeight * 0.5} scale={countScale.current}>
			<Text
				anchor={0.5}
				text={count}
				style={countStyle}
				onresize={(sizes) => (countHeight = sizes.height)}
			/>
		</Container>
	</FadeContainer>
</MainContainer>
