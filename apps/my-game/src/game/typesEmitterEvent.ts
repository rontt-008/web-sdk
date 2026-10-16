import type { EmitterEventBoard } from '../components/Board.svelte';
import type { EmitterEventFreeSpinIntro } from '../components/FreeSpinIntro.svelte';
import type { EmitterEventFreeSpinCounter } from '../components/FreeSpinCounter.svelte';
import type { EmitterEventFreeSpinOutro } from '../components/FreeSpinOutro.svelte';
import type { EmitterEventFreeSpinRetrigger } from '../components/FreeSpinRetrigger.svelte';
import type { EmitterEventBigWin } from '../components/BigWin.svelte';
import type { EmitterEventSound } from '../components/Sound.svelte';
import type { EmitterEventWildThrow } from '../components/WildThrow.svelte';
import type { EmitterEventWinLine } from '../components/WinLine.svelte';

export type EmitterEventGame =
	| EmitterEventBoard
	| EmitterEventBigWin
	| EmitterEventFreeSpinIntro
	| EmitterEventFreeSpinCounter
	| EmitterEventFreeSpinOutro
	| EmitterEventFreeSpinRetrigger
	| EmitterEventSound
	| EmitterEventWildThrow
	| EmitterEventWinLine;
