<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { Button, FadeContainer } from 'components-pixi';
	import { stateBet, stateModal, stateUi, INFINITY_MARK } from 'state-shared';
	import { stateBonus } from 'components-ui-html';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { createBoardTextStyle, fitBoardFontSize } from '../game/textStyles';
	import {
		MYSTERY_MODE,
		BOOSTER_MODE,
		BONUS_COST,
		MYSTERY_COST,
		BOOSTER_COST,
	} from '../game/betModes';
	import BoosterSwitch, { BOOSTER_SWITCH_SIZES } from './BoosterSwitch.svelte';

	const context = getContext();

	// wooden signs (both about 800x209); the leaves stick out past the panel, so the text only gets
	// the middle of it
	const BUTTON_WIDTH = SYMBOL_SIZE * 2.4;
	const BUTTON_SIZES = { width: BUTTON_WIDTH, height: (BUTTON_WIDTH * 209) / 800 };
	const TEXT_MAX_WIDTH = BUTTON_WIDTH * 0.68;
	const BUTTON_GAP = SYMBOL_SIZE * 0.15;
	// a tint can only darken the sign, so hovering grows it instead
	const HOVER_SCALE = 1.02;
	const PRESS_SCALE = 0.97;
	const PRESS_TINT = 0xdddddd;
	const DISABLED_TINT = 0x8c8c8c;

	// the booster's text sits on the left of its panel and the switch on the right
	const BOOSTER_SWITCH_X = (TEXT_MAX_WIDTH - BOOSTER_SWITCH_SIZES.width) * 0.5;
	const BOOSTER_TEXT_MAX_WIDTH = TEXT_MAX_WIDTH - BOOSTER_SWITCH_SIZES.width - SYMBOL_SIZE * 0.08;
	const BOOSTER_TEXT_X = (BOOSTER_TEXT_MAX_WIDTH - TEXT_MAX_WIDTH) * 0.5;

	// the same chunky text as the big wild multipliers
	const OUTLINE_COLOR = 0x4a1c00;
	const TITLE_FONT_SIZE = SYMBOL_SIZE * 0.22;
	const SUBTITLE_FONT_SIZE = SYMBOL_SIZE * 0.16;
	const TITLE_COLORS = { top: 0xffe234, bottom: 0xff8c1a };
	const SUBTITLE_COLORS = { top: 0xfff2c2, bottom: 0xffffff };

	// buttons sit under the logo in the base game; free spins use this spot for the free spin counter
	const show = $derived(
		context.stateGameDerived.isLogoBesideBoard() && context.stateGame.gameType === 'basegame',
	);
	const position = $derived({
		x: context.stateGameDerived.logoLayout().x,
		y:
			context.stateGameDerived.logoLayout().y +
			context.stateGameDerived.logoLayout().height * 0.5 +
			BUTTON_GAP,
	});

	const isIdle = $derived(context.stateXstateDerived.isIdle());
	const boosterOn = $derived(stateBet.activeBetModeKey === BOOSTER_MODE);
	// the normal bonus is the cheapest one in the buy menu
	const bonusPrice = $derived(stateBet.betAmount * BONUS_COST);
	const buyDisabled = $derived(!isIdle || bonusPrice > stateBet.balanceAmount);
	const mysteryPrice = $derived(stateBet.betAmount * MYSTERY_COST);
	const mysteryDisabled = $derived(!isIdle || mysteryPrice > stateBet.balanceAmount);

	// the SDK's buy menu, listing every bonus that can be bought (the 'buy' bet modes)
	const openBuyMenu = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'buyBonus' };
	};

	// reuses the SDK's confirm dialog, which switches to the bonus mode and spins
	const buy = (betModeKey: string) => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBonus.selectedBetModeKey = betModeKey;
		context.eventEmitter.broadcast({ type: 'buyBonusConfirm' });
	};

	// switches straight away, without the confirm dialog: the sign shows the cost instead. Turning
	// it on does what the dialog's confirm does for an 'activate' bet mode.
	const toggleBooster = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (boosterOn) {
			stateBet.activeBetModeKey = 'BASE';
		} else {
			stateBet.activeBetModeKey = BOOSTER_MODE;
			stateUi.autoSpinsLossLimitText = INFINITY_MARK;
			stateUi.autoSpinsSingleWinLimitText = INFINITY_MARK;
		}
	};

	type ButtonState = { disabled: boolean; hovered: boolean; pressed: boolean };

	const getScale = (state: ButtonState) => {
		if (state.disabled) return 1;
		if (state.pressed) return PRESS_SCALE;
		if (state.hovered) return HOVER_SCALE;
		return 1;
	};

	const getTint = (state: ButtonState) => {
		if (state.disabled) return DISABLED_TINT;
		if (state.pressed) return PRESS_TINT;
		return 0xffffff;
	};

	const getTextStyle = (
		text: string,
		fontSize: number,
		colors: { top: number; bottom: number },
		maxWidth = TEXT_MAX_WIDTH,
	) =>
		createBoardTextStyle({
			fontSize: fitBoardFontSize({ text, fontSize, maxWidth }),
			...colors,
			outline: OUTLINE_COLOR,
		});
</script>

<!-- a title over a smaller line, centred on x -->
{#snippet textLines(title: string, subtitle: string, x: number, maxWidth: number)}
	<Text
		anchor={{ x: 0.5, y: 1 }}
		{x}
		y={SYMBOL_SIZE * 0.04}
		text={title}
		style={getTextStyle(title, TITLE_FONT_SIZE, TITLE_COLORS, maxWidth)}
	/>
	<Text
		anchor={{ x: 0.5, y: 0 }}
		{x}
		y={SYMBOL_SIZE * 0.01}
		text={subtitle}
		style={getTextStyle(subtitle, SUBTITLE_FONT_SIZE, SUBTITLE_COLORS, maxWidth)}
	/>
{/snippet}

<!-- each sign's tint and scale are on a container so its content follows it -->
<FadeContainer {show} {...position}>
	<Button
		sizes={BUTTON_SIZES}
		anchor={{ x: 0.5, y: 0 }}
		disabled={buyDisabled}
		onpress={openBuyMenu}
	>
		{#snippet children({ center, hovered, pressed })}
			{@const state = { disabled: buyDisabled, hovered, pressed }}
			<Container {...center} scale={getScale(state)} tint={getTint(state)}>
				<Sprite key="buttonBuyBonus" anchor={0.5} {...BUTTON_SIZES} />
				{@render textLines(
					'BUY BONUS',
					`FROM ${numberToCurrencyString(bonusPrice)}`,
					0,
					TEXT_MAX_WIDTH,
				)}
			</Container>
		{/snippet}
	</Button>

	<!-- a shortcut to the mystery bonus, on the same sign as the buy menu -->
	<Button
		y={BUTTON_SIZES.height + BUTTON_GAP}
		sizes={BUTTON_SIZES}
		anchor={{ x: 0.5, y: 0 }}
		disabled={mysteryDisabled}
		onpress={() => buy(MYSTERY_MODE)}
	>
		{#snippet children({ center, hovered, pressed })}
			{@const state = { disabled: mysteryDisabled, hovered, pressed }}
			<Container {...center} scale={getScale(state)} tint={getTint(state)}>
				<Sprite key="buttonBuyBonus" anchor={0.5} {...BUTTON_SIZES} />
				{@render textLines('MYSTERY BONUS', numberToCurrencyString(mysteryPrice), 0, TEXT_MAX_WIDTH)}
			</Container>
		{/snippet}
	</Button>

	<Button
		y={(BUTTON_SIZES.height + BUTTON_GAP) * 2}
		sizes={BUTTON_SIZES}
		anchor={{ x: 0.5, y: 0 }}
		disabled={!isIdle}
		onpress={toggleBooster}
	>
		{#snippet children({ center, hovered, pressed })}
			{@const state = { disabled: !isIdle, hovered, pressed }}
			<Container {...center} scale={getScale(state)} tint={getTint(state)}>
				<Sprite key="buttonBooster" anchor={0.5} {...BUTTON_SIZES} />
				{@render textLines(
					'BOOSTER',
					`${BOOSTER_COST}x BET`,
					BOOSTER_TEXT_X,
					BOOSTER_TEXT_MAX_WIDTH,
				)}
				<BoosterSwitch x={BOOSTER_SWITCH_X} on={boosterOn} />
			</Container>
		{/snippet}
	</Button>
</FadeContainer>
