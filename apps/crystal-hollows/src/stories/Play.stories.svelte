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
They are the game's own math's (math-sdk/games/crystal_hollows), at the real odds.
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

<!-- Spin, change the bet, buy the bonus: each round drawn from the story books at the real odds. -->
<Story name="real odds" args={{ balance: 1000 }}>
	{#snippet template(args)}
		{@render play(args.balance, 'real odds')}
	{/snippet}
</Story>

<!-- Every round is a top win, 1000x the bet and up, spin or bonus buy: spread over that range, with a
max win (25,000x) now and then. -->
<Story name="top wins" args={{ balance: 1000 }}>
	{#snippet template(args)}
		{@render play(args.balance, 'top wins')}
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
