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

	setContext();

	// For seeing the tall wild: the books whose base spin (their first reveal; some go on into free
	// spins) lands bat rings on the board (rows 1-4, not the padding rows), most rings first, so each
	// one turns into a tall wild.
	const ringsOnBoard = (data: (typeof books)[number]) =>
		(data.events.find((event) => event.type === 'reveal')?.board ?? []).filter((reel) =>
			reel.slice(1, -1).some((s) => s.name === 'W'),
		).length;
	const wildBooks = books
		.filter((data) => ringsOnBoard(data) > 0)
		.sort((a, b) => ringsOnBoard(b) - ringsOnBoard(a));
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

<!-- each press of Action plays the next book with bat rings on the board (three at once first) -->
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
