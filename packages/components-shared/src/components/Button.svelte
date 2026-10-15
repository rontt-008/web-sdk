<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		debug?: boolean;
		disabled?: boolean;
		onclick: () => any;
		children: Snippet;
		'data-test'?: string;
	};

	const { debug, disabled = false, onclick, children, ...rest }: Props = $props();
</script>

<button class="button" class:debug class:disabled {disabled} {onclick} {...rest}>
	{@render children()}
</button>

<style lang="scss">
	.button {
		width: 100%;
		position: relative;
		font-family: 'proxima-nova', system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		cursor: pointer;
		display: inline-flex;
		justify-content: center;
		background-color: transparent;
		border-color: transparent;
		padding: 0;
	}

	.button.debug {
		border-color: white;
		border-width: 2px;
	}

	.button.disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
</style>
