<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_BONUS/book',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		StoryLocale,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';
	import { randomInteger } from 'utils-shared/random';

	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { playBet } from '../game/utils';
	import books from './data/bonus_books';

	setContext();

	// For seeing the tall wild in the bonus (it turns back into the ring once each free spin is done):
	// the books whose free spins land bat rings on the board (rows 1-4), the most such spins first.
	const spinsWithRings = (data: (typeof books)[number]) =>
		data.events.filter(
			(event) =>
				event.type === 'reveal' &&
				'board' in event &&
				event.gameType === 'freegame' &&
				event.board.some((reel) => reel.slice(1, -1).some((s) => s.name === 'W')),
		).length;
	const wildBooks = books
		.filter((data) => spinsWithRings(data) > 0)
		.sort((a, b) => spinsWithRings(b) - spinsWithRings(a));
	let nextWildBook = 0;
</script>

{#snippet template(args: TemplateArgs<any>)}
	<StoryGameTemplate
		skipLoadingScreen={args.skipLoadingScreen}
		action={async () => {
			await args.action?.(args.data);
		}}
	>
		<StoryLocale lang="en">
			<Game />
		</StoryLocale>
	</StoryGameTemplate>
{/snippet}

<Story
	name="random"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const index = randomInteger({ min: 0, max: books.length - 1 });
			const data = books[index];
			console.log('Running a book at index', index);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<!-- each press of Action plays the next bonus with bat rings in its free spins (the most first) -->
<Story
	name="tall wild"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const data = wildBooks[nextWildBook++ % wildBooks.length];
			console.log('Running a book at index', books.indexOf(data), `(tall wild ${nextWildBook} of ${wildBooks.length})`);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>
