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
	import type { MockRounds } from './mockRgs';

	setContext();
</script>

<!-- the game as it runs on Stake Engine, against a mock RGS; changing the balance restarts it -->
{#snippet play(balance: number, rounds: MockRounds)}
	{#key balance}
		<MockRgs {balance} {rounds}>
			<Authenticate>
				<StoryLocale lang="en">
					<Game />
				</StoryLocale>
			</Authenticate>
		</MockRgs>
	{/key}
{/snippet}

<!-- The real game with the current math: the mock RGS picks each round by its real odds. Start with a
balance, spin and buy bonuses. -->
<Story name="real odds" args={{ balance: 1000 }}>
	{#snippet template(args)}
		{@render play(args.balance, 'real odds')}
	{/snippet}
</Story>

<!-- Every round is a top win, whichever way it is played (a spin, or either bonus bought): one of the
mode's 20 biggest wins, half of them the 25,000x max win. -->
<Story name="top win" args={{ balance: 1000 }}>
	{#snippet template(args)}
		{@render play(args.balance, 'top win')}
	{/snippet}
</Story>
