<script lang="ts">
	import type { ButtonProps } from 'components-pixi';
	import { stateBet, stateBetDerived, stateConfig } from 'state-shared';

	import UiButton from './UiButton.svelte';
	import { getContext } from '../context';
	import { UI_BASE_SIZE } from '../constants';

	type Props = Partial<Omit<ButtonProps, 'children'>> & {
		// a down arrow instead of a minus, for a pair of arrows stacked beside the bet
		arrow?: boolean;
	};

	const { arrow, ...props }: Props = $props();
	const context = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const smallest = $derived(stateConfig.betAmountOptions[0]);
	const disabled = $derived(
		!context.stateXstateDerived.isIdle() || stateBet.betAmount === smallest,
	);

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });

		const nextSmaller = [...stateConfig.betAmountOptions]
			.sort((a, b) => b - a)
			.find((option) => option < stateBet.betAmount);

		stateBetDerived.setBetAmount(nextSmaller || smallest);
	};
</script>

<UiButton
	{...props}
	{sizes}
	{onpress}
	{disabled}
	icon="decrease"
	themeIcon={arrow ? 'arrowDown' : undefined}
/>
