<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_BONUS/bookEvent',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		StoryLocale,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';

	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { playBookEvent, playBookEvents } from '../game/utils';
	import events from './data/bonus_events';
	import { RUNES, type RuneName, type RuneOffset } from '../game/runes';
	import { stateGame } from '../game/stateGame.svelte';

	// all of a rune's spots where it lies, as a book's positions (rows counted from 1)
	const spotsOf = (rune: RuneName, offset: RuneOffset) =>
		RUNES[rune].spots.map(([reel, row]) => ({ reel: reel + offset.reel, row: row + offset.row + 1 }));

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
	name="reveal"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.reveal,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="setTotalWin"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.setTotalWin,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="freeSpinTrigger"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.freeSpinTrigger,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="freeSpinRetrigger"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.freeSpinRetrigger,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="updateFreeSpin"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.updateFreeSpin,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="winInfo"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.winInfo,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="updateTumbleWin"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.updateTumbleWin,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="tumbleBoard"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.tumbleBoard,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="updateGlobalMult"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.updateGlobalMult,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="setWin"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.setWin,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="setWinMega"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.setWinMega,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="freeSpinEnd"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.freeSpinEnd,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="finalWin"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.finalWin,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="runeShow"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.runeShow,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="runeLight"
	args={templateArgs({
		skipLoadingScreen: false,
		data: { show: events.runeLightShow, light: events.runeLight },
		action: async (data) => {
			await playBookEvent(data.show, { bookEvents: [] });
			await playBookEvent(data.light, { bookEvents: [] });
		},
	})}
	{template}
/>

<Story
	name="runeComplete"
	args={templateArgs({
		skipLoadingScreen: false,
		data: { show: events.runeCompleteShow, complete: events.runeComplete },
		action: async (data) => {
			const { rune, offset } = data.show;
			await playBookEvent(data.show, { bookEvents: [] });
			await playBookEvent(
				{ index: 0, type: 'runeLight', rune, positions: spotsOf(rune, offset) },
				{ bookEvents: [] },
			);
			await playBookEvent(data.complete, { bookEvents: [] });
		},
	})}
	{template}
/>

<Story
	name="powerSpinsTrigger"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.powerSpinsTrigger,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="updatePowerSpin"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.updatePowerSpin,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<!-- a power spin with Hagall's block of wilds, 2x2 in the bonus, drawn as one big wild: it lands,
wins and goes -->
<Story
	name="wildBlock"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.wildBlock,
		action: async (data) => await playBookEvents(data),
	})}
	{template}
/>

<!-- a free spin with a gust of wind: wilds blow in onto the landed board, then it wins (lighting
the rune's spots) and tumbles -->
<Story
	name="windWilds"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.windWilds,
		action: async (data) => await playBookEvents(data),
	})}
	{template}
/>

<!-- a free spin with a stronger gust taking every symbol of one kind off the board: they shiver
and are carried off, the board tumbles to fill their cells, then it wins -->
<Story
	name="windSweep"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.windSweep,
		action: async (data) => await playBookEvents(data),
	})}
	{template}
/>

<!-- the super bonus (50+ connected symbols): its start, its power spins with its bigger powers, and
its 3x3 block of wilds -->
<Story
	name="superFreeSpinTrigger"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.superFreeSpinTrigger,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="superPowerSpinsTrigger"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.superPowerSpinsTrigger,
		action: async (data) => {
			stateGame.bonusType = 'super';
			await playBookEvent(data, { bookEvents: [] });
		},
	})}
	{template}
/>

<Story
	name="superWildBlock"
	args={templateArgs({
		skipLoadingScreen: false,
		data: events.superWildBlock,
		action: async (data) => await playBookEvents(data),
	})}
	{template}
/>
