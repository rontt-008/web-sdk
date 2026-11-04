import { BONUS_MODE, SUPER_MODE } from './betModes';

// How a bonus looks in the buy bonus menu (BonusTablet, ConfirmTablet, BonusGust): its colour, the
// same as its zone on the bonus meter (the BONUS green, the SUPER BONUS orange-red; the BOOSTER the
// game's gold), and the leaf caught on the branch it hangs from, in that colour.
export type BonusColour = 'yellow' | 'green' | 'orange';

export const bonusColour = (mode: string): BonusColour =>
	mode === SUPER_MODE ? 'orange' : mode === BONUS_MODE ? 'green' : 'yellow';

// the leaves' stills (static/assets/symbols), each path written out: Vite leaves a fixed path to the
// static folder alone, but can't resolve one built from a variable
export const LEAF_STILLS: Record<BonusColour, string> = {
	yellow: new URL('../../assets/symbols/leaf-yellow.webp', import.meta.url).href,
	green: new URL('../../assets/symbols/leaf-green.webp', import.meta.url).href,
	orange: new URL('../../assets/symbols/leaf-red.webp', import.meta.url).href,
};
export const BROWN_LEAF = new URL('../../assets/symbols/leaf-brown.webp', import.meta.url).href;
