<script lang="ts">
	import { Text, Rectangle } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { WHITE } from 'constants-shared/colors';

	import { UI_BASE_SIZE } from '../constants';
	import { getUiTheme } from '../theme';

	const theme = getUiTheme();

	const fontSizeMultiplier = $derived.by(() => {
		if (stateBet.autoSpinsCounter === Infinity) return 3;
		if (stateBet.autoSpinsCounter > 99) return 1.5;
		if (stateBet.autoSpinsCounter > 9) return 2;
		return 2.5;
	});
</script>

{#if stateBet.autoSpinsCounter > 0}
	{#if theme}
		<!-- covers the auto spin icon with the number of spins left -->
		<Rectangle
			anchor={0.5}
			width={UI_BASE_SIZE * theme.button.scale * 0.8}
			height={UI_BASE_SIZE * theme.button.scale * 0.8}
			borderRadius={UI_BASE_SIZE * theme.button.scale * 0.4}
			backgroundColor={theme.button.fillActive}
		/>
	{:else}
		<Rectangle
			anchor={0.5}
			width={UI_BASE_SIZE * 0.9}
			height={UI_BASE_SIZE * 0.9}
			borderRadius={50}
		/>
	{/if}
	<Text
		anchor={0.5}
		text={stateBet.autoSpinsCounter === Infinity ? '∞' : stateBet.autoSpinsCounter}
		style={{
			fontFamily: theme?.fontFamily ?? 'proxima-nova',
			fill: theme?.button.iconActive ?? WHITE,
			fontWeight: 'bold',
			fontSize: fontSizeMultiplier * UI_BASE_SIZE * (theme ? 0.16 : 0.2),
		}}
	/>
{/if}
