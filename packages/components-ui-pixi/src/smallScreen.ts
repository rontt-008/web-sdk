// The UI is laid out on the standard layout (1920x1080 on wide screens) and shrunk to fit the screen.
// On very small screens, like Engine's 400x225 popout, that leaves text a few pixels tall, so the
// layouts there enlarge their buttons and labels by this much (and space them to fit). Screens where
// the standard layout is shown at SMALL_SCREEN_SCALE or more keep 1.
const SMALL_SCREEN_SCALE = 0.3;
const MAX_BOOST = 1.4;

export const getSmallScreenBoost = (standardScale: number) =>
	Math.min(MAX_BOOST, Math.max(1, SMALL_SCREEN_SCALE / standardScale));
