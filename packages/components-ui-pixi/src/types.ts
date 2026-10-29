import type { Snippet } from 'svelte';

import type { ButtonProps } from 'components-pixi';

export type EmitterEventUi =
	| { type: 'hotKeySpace' }
	| { type: 'hotKeyEscape' }
	| { type: 'stopButtonClick' }
	| { type: 'stopButtonEnable' }
	| { type: 'uiShow' }
	| { type: 'uiHide' }
	| { type: 'drawerUnfold' }
	| { type: 'drawerFold' }
	| { type: 'drawerButtonShow' }
	| { type: 'drawerButtonHide' }
	// sound
	| { type: 'soundBetMode'; betModeKey: string }
	| { type: 'soundPressGeneral' }
	| { type: 'soundPressBet' }
	// bet services
	| { type: 'resumeBet' }
	| { type: 'autoBet' }
	| { type: 'bet' };

export type ButtonIcon =
	| 'decrease'
	| 'increase'
	| 'menu'
	| 'turbo'
	| 'autoSpin'
	| 'payTable'
	| 'info'
	| 'settings'
	| 'soundOn'
	| 'soundOff'
	| 'menuExit';

// what a layout can pass to a round button
export type UiButtonOptions = Partial<Omit<ButtonProps, 'children'>> & {
	// with a theme: the icon alone, without its circle, for a button on a panel (a circle shows behind
	// it while hovered, and while it is switched on)
	bare?: boolean;
};

// what a layout can pass to the balance, win and bet
export type UiLabelOptions = {
	stacked?: boolean;
	// with a theme: without its own pill, for a label on a panel. The label sits over the value, both
	// lined up on one side (or the middle) of a box this wide (they shrink to fit it); the label is
	// drawn from there, centred vertically. `outline`: both outlined in the panel's colour, for a
	// label on the game's art instead of a panel.
	plain?: { width: number; align: 'left' | 'right' | 'center'; outline?: boolean };
};

export type LayoutUiProps = {
	gameName: Snippet;
	logo: Snippet;
	amountBalance: Snippet<[UiLabelOptions]>;
	amountWin: Snippet<[UiLabelOptions]>;
	amountBet: Snippet<[UiLabelOptions]>;
	buttonBuyBonus: Snippet<[Partial<ButtonProps>]>;
	buttonBet: Snippet<[Partial<ButtonProps>]>;
	buttonTurbo: Snippet<[UiButtonOptions]>;
	buttonAutoSpin: Snippet<[UiButtonOptions]>;
	// `arrow` draws an up / down arrow instead of a plus / minus
	buttonIncrease: Snippet<[UiButtonOptions & { arrow?: boolean }]>;
	buttonDecrease: Snippet<[UiButtonOptions & { arrow?: boolean }]>;
	buttonMenu: Snippet<[UiButtonOptions]>;
	buttonMenuClose: Snippet<[Partial<ButtonProps>]>;
	buttonPayTable: Snippet<[Partial<ButtonProps>]>;
	buttonGameRules: Snippet<[Partial<ButtonProps>]>;
	buttonSettings: Snippet<[Partial<ButtonProps>]>;
	buttonSoundSwitch: Snippet<[Partial<ButtonProps>]>;
	buttonMuteMusic: Snippet<[UiButtonOptions]>;
	buttonMuteSounds: Snippet<[UiButtonOptions]>;
};
