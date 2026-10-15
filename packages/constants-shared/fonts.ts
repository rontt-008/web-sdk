// The UI's font. Proxima Nova is used only if the game hosts it itself (an @font-face pointing at its
// own files; it's an Adobe font, so only under licence), otherwise the device's own UI font. Nothing
// is loaded from other hosts: games are served as static files only.
export const UI_FONT_FAMILY =
	"'proxima-nova', system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
