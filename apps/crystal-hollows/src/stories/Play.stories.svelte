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

<!-- For testing spins (2026-11-14, the user: "add a text spins component to the storybook", read as test
spins; as RuneFall's and Cat Hunt's PLAY stories): the whole game as it runs on Stake Engine, start screen and all, against a
mock RGS (mockRgs.ts) that keeps a balance, takes each bet and answers with a round from the story books.
They are the sample game's (no math of its own yet), every round as likely as any other: not the real odds.
Changing the balance restarts it. -->
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

<!-- Spin, change the bet, buy the bonus: each round any of the sample books. -->
<Story name="random" args={{ balance: 1000 }}>
	{#snippet template(args)}
		{@render play(args.balance, 'random')}
	{/snippet}
</Story>

<!-- Every spin triggers the free spins (the FS rocks activate, the bat attacks, then the bonus). -->
<Story name="free spins" args={{ balance: 1000 }}>
	{#snippet template(args)}
		{@render play(args.balance, 'free spins')}
	{/snippet}
</Story>

<!-- Every spin lands bat rings, each turning into a tall WILD with its multiplier. -->
<Story name="tall wild" args={{ balance: 1000 }}>
	{#snippet template(args)}
		{@render play(args.balance, 'tall wild')}
	{/snippet}
</Story>
