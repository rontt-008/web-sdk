import type { Reroute } from '@sveltejs/kit';

// Stake Engine opens replays at .../index.html?replay=true&...: that is the game's one page, as
// .../ is, not a route of its own, which would log "Not found" in the console
export const reroute: Reroute = ({ url }) => url.pathname.replace(/\/index\.html$/, '/');
