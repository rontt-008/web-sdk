<script lang="ts" generics="TValue extends string | number">
	import type { Snippet } from 'svelte';

	type Props = {
		value: TValue;
		options: Readonly<TValue[]>;
		onchange: (value: TValue) => void;
		children: Snippet<
			[
				{
					disabledDown: boolean;
					disabledUp: boolean;
					toggleDown: () => any;
					toggleUp: () => any;
				},
			]
		>;
	};

	const props: Props = $props();

	const valueIndex = $derived(props.options.findIndex((option) => option === props.value));
	// a number that isn't one of the (ascending) options, e.g. the bet of a resumed round, steps to
	// the nearest option below or above it
	const optionsBelow = $derived(
		props.options.filter(
			(option) => typeof option === 'number' && option < (props.value as number),
		).length,
	);
	const downIndex = $derived(valueIndex === -1 ? optionsBelow - 1 : valueIndex - 1);
	const upIndex = $derived(valueIndex === -1 ? optionsBelow : valueIndex + 1);
	const disabledDown = $derived(downIndex < 0);
	const disabledUp = $derived(upIndex > props.options.length - 1);

	const toggleDown = () => props.onchange(props.options[downIndex]);
	const toggleUp = () => props.onchange(props.options[upIndex]);
</script>

{@render props.children({
	disabledDown,
	disabledUp,
	toggleDown,
	toggleUp,
})}
