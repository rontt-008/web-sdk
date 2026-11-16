<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'COMPONENTS/<GameInfo>',
	});
</script>

<script lang="ts">
	import { GameVersion, Modals } from 'components-ui-html';
	import { stateModal } from 'state-shared';

	import GameInfo from '../components/GameInfo.svelte';
	import { uiHtmlTheme } from '../game/uiTheme';
	import { setContext } from '../game/context';

	// the menus need the game's context (its event emitter)
	setContext();

	// the rules window open on its own, as the menu's info button opens it in the game
	stateModal.modal = { name: 'gameRules' };
</script>

<Story name="rules">
	<Modals theme={uiHtmlTheme}>
		{#snippet version()}
			<GameVersion version="0.0.0" />
		{/snippet}
		{#snippet gameRules()}
			<GameInfo />
		{/snippet}
	</Modals>
</Story>
