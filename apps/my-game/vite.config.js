// @ts-ignore
import config from 'config-vite';

import { removeInlineBundle } from './scripts/remove-inline-bundle.mjs';

const base = config();

export default {
	...base,
	plugins: [
		...base.plugins,
		// once SvelteKit has written the site (its own last step), drop the bundle it inlined
		{
			name: 'remove-inline-bundle',
			apply: 'build',
			closeBundle: { sequential: true, order: 'post', handler: removeInlineBundle },
		},
	],
};
