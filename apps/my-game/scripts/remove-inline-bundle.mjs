// With the inline bundle strategy (see packages/config-svelte) the whole app is built into
// build/index.html, script and styles, but SvelteKit also leaves what it inlined in
// build/_app/immutable, where nothing loads it: removed, so it isn't uploaded with the game. That is
// the bundle (unless index.html loads it with a script tag; its name is in index.html only as a
// base address) and any other file there that index.html doesn't name (the stylesheets). Run by
// the build (see vite.config.js), or by hand:
//   node scripts/remove-inline-bundle.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'build');

export const removeInlineBundle = () => {
	const immutable = path.join(BUILD, '_app', 'immutable');
	const page = path.join(BUILD, 'index.html');
	if (!fs.existsSync(page) || !fs.existsSync(immutable)) return;
	const html = fs.readFileSync(page, 'utf8');
	const unused = (name) =>
		/^bundle\..+\.js$/.test(name)
			? !new RegExp(`<script[^>]*src="[^"]*${name.replace(/\./g, '\\.')}"`).test(html)
			: !html.includes(name);
	for (const entry of fs.readdirSync(immutable, { recursive: true })) {
		const file = path.join(immutable, entry);
		if (!fs.statSync(file).isFile() || !unused(path.basename(file))) continue;
		const size = fs.statSync(file).size;
		fs.rmSync(file);
		console.log(`  removed _app/immutable/${entry.replace(/\\/g, '/')} (${Math.round(size / 1024)} KB, inlined in index.html)`);
	}
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	removeInlineBundle();
}
