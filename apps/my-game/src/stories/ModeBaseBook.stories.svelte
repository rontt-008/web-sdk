<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_BASE/book',
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
	import books from './data/base_books';
	import realBooks from './data/base_books_real';
	import { pickByWeight } from './pickByWeight';

	setContext();
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

<!-- one real odds round by its id, to replay it (set it in the controls, or with ?args=data.id:91) -->
<Story
	name="by id (real odds)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: { id: 704 },
		action: async (data: { id: number | string }) => {
			const book = realBooks.find((realBook) => realBook.id === Number(data.id));
			if (!book) return console.error('No real odds book with id', data.id);
			await playBet({ ...book, state: book.events });
		},
	})}
	{template}
/>

<!-- rounds picked by their lookup table weights, so free spins come as often as in the real game -->
<Story
	name="random (real odds)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const index = pickByWeight(realBooks);
			const data = realBooks[index];
			console.log('Running a book at index', index, '(real odds)');
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>
