import type { EmitterEventBoard } from '../components/Board.svelte';
import type { EmitterEventFreeSpinIntro } from '../components/FreeSpinIntro.svelte';
import type { EmitterEventFreeSpinCounter } from '../components/FreeSpinCounter.svelte';
import type { EmitterEventFreeSpinOutro } from '../components/FreeSpinOutro.svelte';
import type { EmitterEventWin } from '../components/Win.svelte';
import type { EmitterEventWinLines } from '../components/WinLines.svelte';
import type { EmitterEventSound } from '../components/Sound.svelte';
import type { EmitterEventBat } from '../components/Bat.svelte';

export type EmitterEventGame =
	| EmitterEventBat
	| EmitterEventBoard
	| EmitterEventWin
	| EmitterEventWinLines
	| EmitterEventFreeSpinIntro
	| EmitterEventFreeSpinCounter
	| EmitterEventFreeSpinOutro
	| EmitterEventSound;
