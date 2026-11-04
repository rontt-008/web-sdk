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
	import type { Bet } from '../game/typesBookEvent';
	import books from './data/base_books';
	import topBooks from './data/base_books_top';

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

<!-- any base game round, picked at random (features far more often than their real odds) -->
<Story
	name="random"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
		action: async () => await playOne(books, () => true),
	})}
	{template}
/>

<!-- a spin that wins: one or more captures -->
<Story
	name="capture"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
		action: async () =>
			await playOne(books, (book) => book.payoutMultiplier > 0 && !hasEvent(book, 'freeSpinTrigger')),
	})}
	{template}
/>

<!-- a spin that checkmates: the CHECKMATE BONUS follows -->
<Story
	name="checkmate"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
		action: async () => await playOne(books, (book) => hasEvent(book, 'freeSpinTrigger')),
	})}
	{template}
/>

<!-- a spin where the other side gives check, or checkmates you -->
<Story
	name="checked"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
		action: async () =>
			await playOne(books, (book) =>
				events(book).some((event) => event.type === 'move' && event.side === 'them' && event.check),
			),
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
