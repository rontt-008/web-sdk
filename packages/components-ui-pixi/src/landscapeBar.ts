import { UI_BASE_SIZE } from './constants';
import { getBuyBonusExtraWidth, type UiTheme } from './theme';

// The measurements of the landscape bar (see LayoutLandscapeBar), for small wide screens like a
// phone held sideways or the miniplayer: a bar along the bottom from one side of the screen to the
// other, and the spin buttons in a column on the right above it:
//                                                                  auto spin
//                                                                  ( SPIN )
//                                                                    turbo
// (menu, music, sound) (BALANCE                  WIN) (BET  − +)  BUY BONUS
// In the standard layout (1920 x 1080, centred across the screen and drawn against its bottom),
// from its bottom (y) and from the screen's sides (x), which can be past the standard layout's.
const MARGIN = 20;
export const LANDSCAPE_BAR = {
	height: 150,
	gap: 16,
	pill: { width: 330, icons: [66, 162, 258], iconDiameter: 112 },
	bet: { width: 450, label: 40, labelWidth: 170, minus: 155, plus: 60, buttonDiameter: 100 },
	// the insets of the balance (from the left) and the win (from the right)
	info: { inset: 45 },
	buyBonusHeight: 150,
	// the column of spin buttons: its middle from the screen's right side, and its buttons' middles
	// and sizes, up from the bottom
	column: {
		fromRight: 250,
		autoSpin: { y: 880, diameter: 134 },
		spin: { y: 620, diameter: 295 },
		turbo: { y: 362, diameter: 134 },
	},
};

type LandscapeBarOptions = {
	theme: UiTheme | undefined;
	// the standard layout's size and its scale on the screen
	standard: { width: number; height: number; scale: number };
	canvas: { width: number; height: number };
};

// Where everything goes, in the standard layout: x of the screen's sides and of each panel and
// button, and y of the bar's middle and of the column's buttons.
export const getLandscapeBar = ({ theme, standard, canvas }: LandscapeBarOptions) => {
	const { height, gap, pill, bet, buyBonusHeight, column } = LANDSCAPE_BAR;
	const halfVisible = (canvas.width * 0.5) / (standard.scale || 1);
	const left = standard.width * 0.5 - halfVisible + MARGIN;
	const right = standard.width * 0.5 + halfVisible - MARGIN;

	const buttonWidth = UI_BASE_SIZE * (theme?.button.scale ?? 1);
	const buyBonusScale = buyBonusHeight / buttonWidth;
	const buyBonusWidth = (buttonWidth + getBuyBonusExtraWidth(theme)) * buyBonusScale;
	const showBuyBonus = !theme?.hideBuyBonusOn?.includes('landscape');

	const buyBonus = right - buyBonusWidth * 0.5;
	const betRight = showBuyBonus ? right - buyBonusWidth - gap : right;
	const betLeft = betRight - bet.width;
	const pillRight = left + pill.width;
	const info = { left: pillRight + gap, right: betLeft - gap };

	return {
		left,
		right,
		y: standard.height - MARGIN - height * 0.5,
		top: standard.height - MARGIN - height,
		pill: { left, right: pillRight },
		info,
		bet: { left: betLeft, right: betRight },
		buyBonus,
		buyBonusScale,
		showBuyBonus,
		column: right - column.fromRight,
		columnY: {
			autoSpin: standard.height - column.autoSpin.y,
			spin: standard.height - column.spin.y,
			turbo: standard.height - column.turbo.y,
		},
	};
};

// The bar's two ends and top, and the left side of the spin buttons' column, in the standard
// layout, for a game to fit its board above the bar and clear of the column.
export const getLandscapeBarBounds = (options: LandscapeBarOptions) => {
	const bar = getLandscapeBar(options);
	const widest = Math.max(
		LANDSCAPE_BAR.column.spin.diameter,
		LANDSCAPE_BAR.column.autoSpin.diameter,
		LANDSCAPE_BAR.column.turbo.diameter,
	);
	return { left: bar.left, right: bar.right, top: bar.top, columnLeft: bar.column - widest * 0.5 };
};
