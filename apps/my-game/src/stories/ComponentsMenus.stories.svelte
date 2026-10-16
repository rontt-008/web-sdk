<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'COMPONENTS/<Modals>',
	});
</script>

<script lang="ts">
	import StoryMenus from './StoryMenus.svelte';
</script>

<!-- the HTML menus in the SDK's default theme -->
<Story name="buyBonus (clean)">
	<StoryMenus modal="buyBonus" sampleVolatility />
</Story>
<Story name="buyBonus (clean, sample levels)">
	<StoryMenus modal="buyBonus" sampleVolatility sampleLevels />
</Story>
<Story name="buyBonusConfirm (clean)">
	<StoryMenus modal="buyBonusConfirm" sampleVolatility />
</Story>
<Story name="betAmountMenu (clean)">
	<StoryMenus modal="betAmountMenu" />
</Story>
<Story name="autoSpin (clean)">
	<StoryMenus modal="autoSpin" />
</Story>
<Story name="settings (clean)">
	<StoryMenus modal="settings" />
</Story>
<Story name="gameRules (clean)">
	<StoryMenus modal="gameRules" />
</Story>
