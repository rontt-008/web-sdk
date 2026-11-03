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
	import superBooks from './data/super_books';

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
		skipLoadingScreen: false,
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

<!-- one book by its index (set it in the controls, or with ?args=data.index:22): e.g. 22 lands a Fehu
symbol in its first free spin, 103 an Ingwaz symbol, 109 a Fehu symbol with a tumble -->
<Story
	name="by index"
	args={templateArgs({
		skipLoadingScreen: false,
		data: { index: 22 },
		action: async (data: { index: number | string }) => {
			const book = books[Number(data.index)];
			if (!book) return console.error('No bonus book at index', data.index);
			await playBet({ ...book, state: book.events });
		},
	})}
	{template}
/>

<!-- a bought super bonus (50+ connected symbols): Fehu bigger, x10 -->
<Story
	name="super random"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
		action: async () => {
			const index = randomInteger({ min: 0, max: superBooks.length - 1 });
			const data = superBooks[index];
			console.log('Running a super book at index', index);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>
