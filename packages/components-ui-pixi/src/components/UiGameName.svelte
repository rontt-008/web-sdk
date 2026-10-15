<script lang="ts">
	import { SvelteDate } from 'svelte/reactivity';

	import { Text, REM } from 'pixi-svelte';
	import { UI_FONT_FAMILY } from 'constants-shared/fonts';
	import { WHITE } from 'constants-shared/colors';

	type Props = {
		name: string;
	};

	const props: Props = $props();
	const reactiveDate = new SvelteDate();
	const clock = $derived(
		reactiveDate.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: 'numeric',
			hour12: false,
		}),
	);
	const textProps = {
		style: {
			fontFamily: UI_FONT_FAMILY,
			fontSize: REM * 1.5,
			fontWeight: '600',
			lineHeight: REM * 2,
			fill: WHITE,
		},
	} as const;

	let clockSizes = $state({ width: 0, height: 0 });

	$effect(() => {
		const interval = setInterval(() => {
			reactiveDate.setTime(Date.now());
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	});
</script>

<Text text={clock} onresize={(value) => (clockSizes = value)} {...textProps} />
<Text text={props.name} x={clockSizes.width + 5} {...textProps} />
