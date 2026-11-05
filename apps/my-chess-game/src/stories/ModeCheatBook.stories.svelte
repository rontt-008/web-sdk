<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_CHEAT/book',
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
	import type { Bet } from '../game/typesBookEvent';
	import books from './data/cheat_books';
	import topBooks from './data/cheat_books_top';

	setContext();

	// a round of the kind picked, from the math's rounds (export_story_books.py)
	type AnyEvent = { type: string; side?: string; check?: boolean };
	type Book = { id: number; payoutMultiplier: number; events: unknown[] };
	const playOne = async (list: Book[], filter: (book: Book) => boolean) => {
		const matching = list.filter(filter);
		if (!matching.length) {
			console.log('No such round in the story data: run the math and export_story_books.py');
			return;
		}
		const data = matching[randomInteger({ min: 0, max: matching.length - 1 })];
		console.log('Running book', data.id, 'paying', data.payoutMultiplier, 'x');
		await playBet({ ...data, state: data.events } as unknown as Bet);
	};
	const events = (book: Book) => book.events as AnyEvent[];
	const hasEvent = (book: Book, type: string) => events(book).some((event) => event.type === type);
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

<!-- a CHEATER MODE spin, picked at random -->
<Story
	name="random"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
		action: async () => await playOne(books, () => true),
	})}
	{template}
/>

<!-- a CHEATER MODE spin that checkmates: the free spins, with the collected multiplier -->
<Story
	name="checkmate"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
		action: async () => await playOne(books, (book) => hasEvent(book, "freeSpinTrigger")),
	})}
	{template}
/>

<!-- one of the mode's biggest wins -->
<Story
	name="top win"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
		action: async () => await playOne(topBooks, () => true),
	})}
	{template}
/>
