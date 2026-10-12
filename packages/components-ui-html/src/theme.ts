// The look of the HTML menus drawn over the game (buy bonus, bet, auto play, settings, ...).
// Every value is CSS, so a theme can use colours, gradients and a game's own art and textures.
// Spread UI_HTML_THEME_CLEAN and override what a game needs, the same way as the pixi UI's UiTheme:
// { ...UI_HTML_THEME_CLEAN, accent: { ...UI_HTML_THEME_CLEAN.accent, background: '#ffc83d' } }
export type UiHtmlTheme = {
	font: {
		body: string;
		// titles, prices and button labels
		heading: string;
		headingWeight: number;
		headingTransform: 'none' | 'uppercase';
	};
	text: {
		color: string;
		muted: string;
		// titles; a colour or a gradient
		heading: string;
		// a thick edge around titles, prices and button labels for cartoon styles, or 'transparent'
		outline: string;
	};
	// laid over the blurred game behind a menu
	backdrop: string;
	// dialogs: bet menu, auto play, settings, confirm, ...
	panel: {
		background: string;
		border: string;
		radius: string;
		shadow: string;
		// a frame drawn around panels from the game's art (the border-image shorthand), or 'none'
		borderImage: string;
		// how far that frame sticks out past the panel, so what is next to it leaves room for it
		outset: string;
	};
	// the bonuses in the buy bonus menu
	card: {
		background: string;
		border: string;
		radius: string;
		shadow: string;
		// a frame drawn around each card (the border-image shorthand), or 'none'
		borderImage: string;
		// how far that frame sticks out past the card
		outset: string;
		// behind each bonus's picture: a soft light by default; a colour, a gradient or a texture
		// (`url(...) center / cover`) also work. artRadius rounds its corners.
		artBackground: string;
		artRadius: string;
		text: string;
		// titles and prices; a colour or a gradient
		heading: string;
		price: string;
	};
	// how volatile each bonus is, on its card and in its confirm dialog
	meter: {
		filled: string;
		empty: string;
	};
	// the balance and bet bar at the bottom of the buy bonus menu
	dock: {
		background: string;
		border: string;
		radius: string;
		shadow: string;
		label: string;
	};
	// option buttons, round +/- buttons and the close button
	control: {
		background: string;
		backgroundHovered: string;
		border: string;
		text: string;
		radius: string;
		// the chosen option (bet amount, number of auto spins, ...)
		selectedBackground: string;
		selectedText: string;
	};
	// main buttons: buy, confirm, start auto play; and slider fills
	accent: {
		background: string;
		backgroundHovered: string;
		// a solid colour for what cannot take a gradient: slider fills, focus rings, the active bonus
		color: string;
		// label colour; a colour or a gradient
		text: string;
		// an image for main buttons from the game's art (the border-image shorthand), or 'none'
		borderImage: string;
		// space kept clear at each end of the label, e.g. for art on the ends of the button image
		labelInset: string;
	};
	// buttons that switch a bet mode on, like a booster, so they look different from buying
	activate: {
		background: string;
		backgroundHovered: string;
		// a solid colour for the titles of these bonuses and their glow when on
		color: string;
		text: string;
		borderImage: string;
	};
	// prices in dialogs; a colour or a gradient
	price: string;
	danger: string;
};

const CHARCOAL = '#1f2128';
const WHITE = '#ffffff';
const GOLD = '#ffcf4a';
const SKY = '#62d0ff';
// see-through charcoal: the blurred game shows through panels, cards and the dock
const GLASS = 'linear-gradient(180deg, rgba(42, 45, 53, 0.72) 0%, rgba(27, 29, 35, 0.72) 100%)';

// Matches the pixi UI's UI_THEME_CLEAN: see-through charcoal panels, white text and charcoal
// buttons, so it sits on top of any game art. Buying is light blue, switching a mode on is gold.
export const UI_HTML_THEME_CLEAN: UiHtmlTheme = {
	font: {
		body: "'proxima-nova', 'Helvetica Neue', Arial, sans-serif",
		heading: "'proxima-nova', 'Helvetica Neue', Arial, sans-serif",
		headingWeight: 800,
		headingTransform: 'uppercase',
	},
	text: {
		color: WHITE,
		muted: '#b9bdc7',
		heading: WHITE,
		outline: 'transparent',
	},
	backdrop: 'rgba(8, 9, 12, 0.55)',
	panel: {
		background: GLASS,
		border: '1px solid rgba(255, 255, 255, 0.08)',
		radius: '1rem',
		shadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 1.25rem 2.5rem rgba(0, 0, 0, 0.45)',
		borderImage: 'none',
		outset: '0rem',
	},
	card: {
		background: GLASS,
		border: '1px solid rgba(255, 255, 255, 0.08)',
		radius: '1.1rem',
		shadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 1rem 2rem rgba(0, 0, 0, 0.4)',
		borderImage: 'none',
		outset: '0rem',
		artBackground:
			'radial-gradient(closest-side, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0))',
		artRadius: '0.8rem',
		text: '#b9bdc7',
		heading: WHITE,
		price: WHITE,
	},
	meter: {
		filled: GOLD,
		empty: 'rgba(255, 255, 255, 0.16)',
	},
	dock: {
		background: 'rgba(22, 23, 28, 0.62)',
		border: '1px solid rgba(255, 255, 255, 0.08)',
		radius: '1rem',
		shadow: '0 0.75rem 2rem rgba(0, 0, 0, 0.45)',
		label: '#b9bdc7',
	},
	control: {
		background: '#343741',
		backgroundHovered: '#40444f',
		border: '1px solid rgba(255, 255, 255, 0.06)',
		text: WHITE,
		radius: '0.625rem',
		selectedBackground: WHITE,
		selectedText: CHARCOAL,
	},
	accent: {
		background: SKY,
		backgroundHovered: '#86dcff',
		color: SKY,
		text: CHARCOAL,
		borderImage: 'none',
		labelInset: '0.75rem',
	},
	activate: {
		background: GOLD,
		backgroundHovered: '#ffd96e',
		color: GOLD,
		text: CHARCOAL,
		borderImage: 'none',
	},
	price: WHITE,
	danger: '#ff5c5c',
};

// the theme as CSS custom properties, set on an element that wraps the menus
export const uiHtmlThemeStyle = (theme: UiHtmlTheme) =>
	Object.entries({
		'--ui-font': theme.font.body,
		'--ui-font-heading': theme.font.heading,
		'--ui-heading-weight': theme.font.headingWeight,
		'--ui-heading-transform': theme.font.headingTransform,
		'--ui-text': theme.text.color,
		'--ui-text-muted': theme.text.muted,
		'--ui-heading': theme.text.heading,
		'--ui-outline': theme.text.outline,
		'--ui-backdrop': theme.backdrop,
		'--ui-panel-bg': theme.panel.background,
		'--ui-panel-border': theme.panel.border,
		'--ui-panel-radius': theme.panel.radius,
		'--ui-panel-shadow': theme.panel.shadow,
		'--ui-panel-border-image': theme.panel.borderImage,
		'--ui-panel-outset': theme.panel.outset,
		'--ui-card-bg': theme.card.background,
		'--ui-card-border': theme.card.border,
		'--ui-card-radius': theme.card.radius,
		'--ui-card-shadow': theme.card.shadow,
		'--ui-card-border-image': theme.card.borderImage,
		'--ui-card-outset': theme.card.outset,
		'--ui-card-art-bg': theme.card.artBackground,
		'--ui-card-art-radius': theme.card.artRadius,
		'--ui-card-text': theme.card.text,
		'--ui-card-heading': theme.card.heading,
		'--ui-card-price': theme.card.price,
		'--ui-meter-filled': theme.meter.filled,
		'--ui-meter-empty': theme.meter.empty,
		'--ui-dock-bg': theme.dock.background,
		'--ui-dock-border': theme.dock.border,
		'--ui-dock-radius': theme.dock.radius,
		'--ui-dock-shadow': theme.dock.shadow,
		'--ui-dock-label': theme.dock.label,
		'--ui-control-bg': theme.control.background,
		'--ui-control-bg-hovered': theme.control.backgroundHovered,
		'--ui-control-border': theme.control.border,
		'--ui-control-text': theme.control.text,
		'--ui-control-radius': theme.control.radius,
		'--ui-selected-bg': theme.control.selectedBackground,
		'--ui-selected-text': theme.control.selectedText,
		'--ui-accent-bg': theme.accent.background,
		'--ui-accent-bg-hovered': theme.accent.backgroundHovered,
		'--ui-accent-color': theme.accent.color,
		'--ui-accent-text': theme.accent.text,
		'--ui-accent-border-image': theme.accent.borderImage,
		'--ui-accent-inset': theme.accent.labelInset,
		'--ui-activate-bg': theme.activate.background,
		'--ui-activate-bg-hovered': theme.activate.backgroundHovered,
		'--ui-activate-color': theme.activate.color,
		'--ui-activate-text': theme.activate.text,
		'--ui-activate-border-image': theme.activate.borderImage,
		'--ui-price': theme.price,
		'--ui-danger': theme.danger,
	})
		.map(([name, value]) => `${name}: ${value}`)
		.join('; ');
