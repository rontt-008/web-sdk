<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_SUPER/book',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		StoryLocale,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';
	import { stateBet } from 'state-shared';
	import { randomInteger } from 'utils-shared/random';

	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { SUPER_MODE } from '../game/betModes';
	import { playBet } from '../game/utils';
	import type { Bet } from '../game/typesBookEvent';
	import books from './data/super_books';
	import topBooks from './data/super_books_top';

	setContext();

	// a round of the kind picked, from the math's rounds (export_story_books.py), played as the SUPER
	// BONUS (the side panel tells it apart by the bet mode)
	type AnyEvent = { type: string; throws?: { value: number; max?: boolean }[] };
	type Book = { id: number; payoutMultiplier: number; events: unknown[] };
	const playOne = async (list: Book[], filter: (book: Book) => boolean) => {
		const matching = list.filter(filter);
		if (!matching.length) {
			console.log('No such round in the story data: run the math and export_story_books.py --only super');
			return;
		}
		const data = matching[randomInteger({ min: 0, max: matching.length - 1 })];
		console.log('Running book', data.id, 'paying', data.payoutMultiplier, 'x');
		stateBet.activeBetModeKey = SUPER_MODE;
		await playBet({ ...data, state: data.events } as unknown as Bet);
	};
	const events = (book: Book) => book.events as AnyEvent[];
	// the king's throws taking a spot to +200 or more (its look past violet)
	const grewBig = (book: Book) =>
		events(book).some((event) => event.type === 'kingThrow' && event.throws?.some((thrown) => thrown.value >= 200));
	// the king's throws making a MAX square
	const madeMax = (book: Book) =>
		events(book).some((event) => event.type === 'kingThrow' && event.throws?.some((thrown) => thrown.max));
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

<!-- a bought SUPER BONUS, picked at random -->
<Story
	name="random"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
		action: async () => await playOne(books, () => true),
	})}
	{template}
/>

<!-- a SUPER BONUS where the king's throws take a spot to +200 or more -->
<Story
	name="big spot"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
		action: async () => await playOne(books, grewBig),
	})}
	{template}
/>

<!-- a SUPER BONUS where a MAX square is made (from its biggest wins, where they are) -->
<Story
	name="max square"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
		action: async () => await playOne([...topBooks, ...books], madeMax),
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
