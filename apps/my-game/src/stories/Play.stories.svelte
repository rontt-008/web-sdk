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

<!-- the game as it runs on Stake Engine, against a mock RGS; changing the balance restarts it -->
{#snippet play(balance: number, maxWin: boolean)}
	{#key balance}
		<MockRgs {balance} {maxWin}>
			<Authenticate>
				<StoryLocale lang="en">
					<Game />
				</StoryLocale>
			</Authenticate>
		</MockRgs>
	{/key}
{/snippet}

<!-- The mock RGS plays the math with its real odds: start with a balance, spin, turn the booster or
the feature spin on and buy bonuses. -->
<Story name="real odds" args={{ balance: 1000 }}>
	{#snippet template(args)}
		{@render play(args.balance, false)}
	{/snippet}
</Story>

<!-- Every round pays the max win, whichever way it is played: a normal spin, with the booster or the
feature spin on, or any bonus bought. -->
<Story name="max win" args={{ balance: 1000 }}>
	{#snippet template(args)}
		{@render play(args.balance, true)}
	{/snippet}
</Story>
