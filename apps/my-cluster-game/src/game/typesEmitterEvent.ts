import type { EmitterEventBoard } from '../components/Board.svelte';
import type { EmitterEventClusterWinAmounts } from '../components/ClusterWinAmounts.svelte';
import type { EmitterEventTumbleBoard } from '../components/TumbleBoard.svelte';
import type { EmitterEventFreeSpinIntro } from '../components/FreeSpinIntro.svelte';
import type { EmitterEventFreeSpinCounter } from '../components/FreeSpinCounter.svelte';
import type { EmitterEventFreeSpinOutro } from '../components/FreeSpinOutro.svelte';
import type { EmitterEventWin } from '../components/Win.svelte';
import type { EmitterEventSound } from '../components/Sound.svelte';
import type { EmitterEventRunes } from '../components/RuneBoard.svelte';
import type { EmitterEventPowerSpinsIntro } from '../components/PowerSpinsIntro.svelte';
import type { EmitterEventBonusMeter } from '../components/BonusMeter.svelte';
import type { EmitterEventWind } from '../components/Wind.svelte';
import type { EmitterEventWindTransition } from '../components/WindTransition.svelte';
import type { EmitterEventMannaz } from '../components/MannazBoard.svelte';

export type EmitterEventGame =
	| EmitterEventBoard
	| EmitterEventClusterWinAmounts
	| EmitterEventTumbleBoard
	| EmitterEventWin
	| EmitterEventFreeSpinIntro
	| EmitterEventFreeSpinCounter
	| EmitterEventFreeSpinOutro
	| EmitterEventSound
	| EmitterEventRunes
	| EmitterEventPowerSpinsIntro
	| EmitterEventBonusMeter
	| EmitterEventWind
	| EmitterEventWindTransition
	| EmitterEventMannaz;
