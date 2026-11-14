<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'DESIGN/prints',
	});
</script>

<script lang="ts">
	import { StoryGameTemplate, StoryLocale, type TemplateArgs, templateArgs } from 'components-storybook';
	import { OnMount } from 'components-shared';

	import Game from '../components/Game.svelte';
	import { getContext, setContext } from '../game/context';
	import { eventEmitter } from '../game/eventEmitter';
	import { stateGame } from '../game/stateGame.svelte';
	import { winLevelMap, type WinLevel } from '../game/winLevelMap';
	import type { MoveLabelKind } from '../components/MoveLabel.svelte';

	setContext();
	const context = getContext();

	// The game's printed things (print.ts), each on its own, without playing a round for it: the words
	// over the board, a capture's pay, the wins small and big, and the bonus's start and end. Press
	// Action; with `&auto=1` on the story's address the action starts by itself once the game is up.
	const auto = new URLSearchParams(window.location.search).has('auto');
	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	const label = (text: string, kind: MoveLabelKind, mark?: string, hold = 4000) =>
		eventEmitter.broadcastAsync({ type: 'moveLabel', text, kind, mark, hold });

	const LABELS: [string, MoveLabelKind, string?][] = [
		['CHECK', 'good', '+'],
		['CHECK', 'bad', '+'],
		['CHECKMATE!', 'mate', '#'],
		['CHECKMATED', 'bad', '#'],
		['NO CAPTURE', 'info', '–'],
		['NO FORCING MOVE', 'info', '–'],
		['STALEMATE', 'info', '½'],
		['MOVE LIMIT', 'info', '10'],
		['FREE SPINS', 'good', '+3'],
		['QUEEN!', 'good', '=Q'],
		['THE KING THROWS', 'good', 'K'],
		['THE QUEEN COLLECTS', 'good', 'Q'],
		['MAX SQUARE!', 'mate', '!!'],
	];

	const win = async (level: WinLevel, amount: number) => {
		eventEmitter.broadcast({ type: 'winShow' });
		await eventEmitter.broadcastAsync({ type: 'winUpdate', amount, winLevelData: winLevelMap[level] });
		eventEmitter.broadcast({ type: 'winHide' });
	};

	const pays = async () => {
		stateGame.sandbox = false;
		stateGame.multiplier = 5;
		await Promise.all([
			eventEmitter.broadcastAsync({ type: 'moveWinShow', position: { reel: 2, row: 4 }, amount: 20, multiplier: 1 }),
			eventEmitter.broadcastAsync({
				type: 'moveWinShow',
				position: { reel: 5, row: 5 },
				amount: 500,
				multiplier: 5,
				spot: { op: '+', value: 3 },
			}),
		]);
	};
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
		{#if auto && context.stateApp.loaded && !context.stateLayout.showLoadingScreen}
			<OnMount onmount={() => setTimeout(() => args.action?.(args.data), 1200)} />
		{/if}
	</StoryGameTemplate>
{/snippet}

<!-- every word over the board, one after another -->
<Story
	name="labels"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			for (const [text, kind, mark] of LABELS) await label(text, kind, mark, 1800);
		},
	})}
	{template}
/>

<!-- a capture's pay on its square: a plain one, and one with a spot and the multiplier thrown at it -->
<Story name="pays" args={templateArgs({ skipLoadingScreen: true, data: {}, action: pays })} {template} />

<!-- the wins: a small one, a medium one, and the big ones up to the max win -->
<Story name="win small" args={templateArgs({ skipLoadingScreen: true, data: {}, action: () => win(3, 125) })} {template} />
<Story name="win medium" args={templateArgs({ skipLoadingScreen: true, data: {}, action: () => win(5, 1250) })} {template} />
<Story name="win big" args={templateArgs({ skipLoadingScreen: true, data: {}, action: () => win(6, 2500) })} {template} />
<Story name="win mega" args={templateArgs({ skipLoadingScreen: true, data: {}, action: () => win(8, 112500) })} {template} />
<Story name="win max" args={templateArgs({ skipLoadingScreen: true, data: {}, action: () => win(10, 2500000) })} {template} />

<!-- the wipe between the game and the bonus (Transition): the bonus's card comes up behind it -->
<Story
	name="transition"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await eventEmitter.broadcastAsync({ type: 'transition' });
			eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
			await eventEmitter.broadcastAsync({ type: 'freeSpinIntroUpdate', totalFreeSpins: 10 });
			eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		},
	})}
	{template}
/>

<!-- the bonus's start and end -->
<Story
	name="bonus start"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
			await eventEmitter.broadcastAsync({ type: 'freeSpinIntroUpdate', totalFreeSpins: 10 });
			eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		},
	})}
	{template}
/>
<Story
	name="bonus end"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.freeSpins = { current: 13, total: 13 };
			eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
			await eventEmitter.broadcastAsync({ type: 'freeSpinOutroCountUp', amount: 72944, winLevelData: winLevelMap[5] });
			eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		},
	})}
	{template}
/>
<Story
	name="bonus end big"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.freeSpins = { current: 16, total: 16 };
			eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
			await eventEmitter.broadcastAsync({ type: 'freeSpinOutroCountUp', amount: 4500000, winLevelData: winLevelMap[9] });
			eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		},
	})}
	{template}
/>
