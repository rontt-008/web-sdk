<script lang="ts">
	type Props = {
		sign: 'minus' | 'plus';
	};

	const { sign }: Props = $props();
</script>

<!-- The − or + of a round button, drawn rather than typed: a font puts them a little above or below
	 the middle of the button. Its size follows the button's font size. -->
<svg
	class="sign"
	viewBox="0 0 12 12"
	role="img"
	aria-label={sign === 'minus' ? 'minus' : 'plus'}
>
	<path d={sign === 'minus' ? 'M2 6h8' : 'M2 6h8M6 2v8'} />
</svg>

<style lang="scss">
	.sign {
		display: block;
		width: 0.5em;
		height: 0.5em;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.4;
		stroke-linecap: round;
	}
</style>
