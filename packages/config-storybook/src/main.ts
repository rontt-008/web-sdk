import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
	addons: ['@storybook/addon-svelte-csf', '@storybook/addon-docs'],
	framework: {
		name: '@storybook/sveltekit',
		options: {},
	},
	staticDirs: ['../static'],
	// The svelte docgen plugin runs the TypeScript compiler on every .svelte file to fill in the
	// docs tables. On Windows that makes the dev server so slow that story modules time out, so it's
	// left out (the stories don't use the generated docs).
	// The stories and everything they import (the whole game) are compiled as soon as the server
	// starts (Vite's warmup), not when the first story is opened, which otherwise took ~18 s.
	viteFinal: (config) => ({
		...config,
		plugins: config.plugins?.filter(
			(plugin) => !(plugin && 'name' in plugin && plugin.name === 'storybook:svelte-docgen-plugin'),
		),
		server: {
			...config.server,
			warmup: {
				...config.server?.warmup,
				clientFiles: [...(config.server?.warmup?.clientFiles ?? []), './src/stories/*.stories.svelte'],
			},
		},
	}),
};

export default config;
