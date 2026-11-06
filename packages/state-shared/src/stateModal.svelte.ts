type ModalEmpty = null;

type ModalError = {
	name: 'error';
	error: any;
};

type ModalBetMenu = {
	name: 'betAmountMenu';
};

type ModalBuyBonus = {
	name: 'buyBonus';
};

type ModalBuyBonusConfirm = {
	name: 'buyBonusConfirm';
};

type ModalAutoSpin = {
	name: 'autoSpin';
};

type ModalAutoSpinMessage = {
	name: 'autoSpinMessage';
	message: 'insufficientFunds' | 'lossLimitReached' | 'singleWinLimitReached';
};

type ModalPayTable = {
	name: 'payTable';
};

type ModalGameRules = {
	name: 'gameRules';
};

type ModalSettings = {
	name: 'settings';
};

// a game's own menu (rendered in <Modals>' children), told apart by its id; open like the others, so
// the spin hotkeys wait while it's up
type ModalGame = {
	name: 'game';
	id: string;
};

type Modal =
	| ModalEmpty
	| ModalGame
	| ModalError
	| ModalBetMenu
	| ModalBuyBonus
	| ModalBuyBonusConfirm
	| ModalAutoSpin
	| ModalAutoSpinMessage
	| ModalPayTable
	| ModalGameRules
	| ModalSettings;

export const stateModal = $state({
	modal: null as Modal,
});
