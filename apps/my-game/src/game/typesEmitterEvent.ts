import type { EmitterEventBoard } from '../components/Board.svelte';
import type { EmitterEventFreeSpinIntro } from '../components/FreeSpinIntro.svelte';
import type { EmitterEventFreeSpinCounter } from '../components/FreeSpinCounter.svelte';
import type { EmitterEventFreeSpinOutro } from '../components/FreeSpinOutro.svelte';
import type { EmitterEventFreeSpinRetrigger } from '../components/FreeSpinRetrigger.svelte';
import type { EmitterEventWin } from '../components/Win.svelte';
import type { EmitterEventSound } from '../components/Sound.svelte';
import type { EmitterEventTransition } from '../components/Transition.svelte';
import type { EmitterEventWildThrow } from '../components/WildThrow.svelte';
import type { EmitterEventWinLine } from '../components/WinLine.svelte';

export type EmitterEventGame =
	| EmitterEventBoard
	| EmitterEventWin
	| EmitterEventFreeSpinIntro
	| EmitterEventFreeSpinCounter
	| EmitterEventFreeSpinOutro
	| EmitterEventFreeSpinRetrigger
	| EmitterEventSound
	| EmitterEventTransition
	| EmitterEventWildThrow
	| EmitterEventWinLine;
