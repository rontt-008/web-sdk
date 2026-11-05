import type { EmitterEventBoard } from '../components/Board.svelte';
import type { EmitterEventPlayBoard } from '../components/PlayBoard.svelte';
import type { EmitterEventMoveWinAmounts } from '../components/MoveWinAmounts.svelte';
import type { EmitterEventMoveLabel } from '../components/MoveLabel.svelte';
import type { EmitterEventComboMultiplier } from '../components/ComboMultiplier.svelte';
import type { EmitterEventFreeSpinIntro } from '../components/FreeSpinIntro.svelte';
import type { EmitterEventFreeSpinCounter } from '../components/FreeSpinCounter.svelte';
import type { EmitterEventFreeSpinOutro } from '../components/FreeSpinOutro.svelte';
import type { EmitterEventWin } from '../components/Win.svelte';
import type { EmitterEventSound } from '../components/Sound.svelte';
import type { EmitterEventTransition } from '../components/Transition.svelte';
import type { EmitterEventFistSlam } from '../components/FistSlam.svelte';

export type EmitterEventGame =
	| EmitterEventBoard
	| EmitterEventPlayBoard
	| EmitterEventMoveWinAmounts
	| EmitterEventMoveLabel
	| EmitterEventComboMultiplier
	| EmitterEventWin
	| EmitterEventFreeSpinIntro
	| EmitterEventFreeSpinCounter
	| EmitterEventFreeSpinOutro
	| EmitterEventSound
	| EmitterEventTransition
	| EmitterEventFistSlam;
