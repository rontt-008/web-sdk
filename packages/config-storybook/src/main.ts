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
	viteFinal: (config) => ({
		...config,
		plugins: config.plugins?.filter(
			(plugin) => !(plugin && 'name' in plugin && plugin.name === 'storybook:svelte-docgen-plugin'),
		),
	}),
};

export default config;
