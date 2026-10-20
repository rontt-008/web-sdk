<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'PLAY',
		argTypes: {
			balance: { control: { type: 'number', min: 0, step: 100 } },
		},
	});
</script>

<script lang="ts">
	import { Authenticate } from 'components-shared';
	import { StoryLocale } from 'components-storybook';

	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import MockRgs from './MockRgs.svelte';

	setContext();
</script>

<!-- The game as it runs on Stake Engine, against a mock RGS that answers with the sample's rounds:
start with a balance and spin. Changing the balance restarts it. -->
<Story name="sample rounds" args={{ balance: 1000 }}>
	{#snippet template(args)}
		{#key args.balance}
			<MockRgs balance={args.balance}>
				<Authenticate>
					<StoryLocale lang="en">
						<Game />
					</StoryLocale>
				</Authenticate>
			</MockRgs>
		{/key}
	{/snippet}
</Story>
