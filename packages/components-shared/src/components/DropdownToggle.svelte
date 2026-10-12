<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		disabled?: boolean;
		onchange: (open: boolean) => void;
		children: Snippet;
	};

	const props: Props = $props();
</script>

<label class="toggle" class:disabled={props.disabled}>
	<span class="content" data-test="drop-down" class:toggled={props.open}>
		{@render props.children()}
	</span>
	<input
		disabled={props.disabled}
		class="checkbox"
		type="checkbox"
		checked={props.open}
		onchange={() => props.onchange(!props.open)}
	/>
</label>

<style lang="scss">
	.toggle {
		position: relative;
		display: inline-block;
		color: var(--ui-text, white);
		font-weight: normal;
		cursor: pointer;

		&.disabled {
			opacity: 0.5;
		}
	}

	.toggle input {
		width: 0;
		height: 0;
		opacity: 0;
		position: absolute;
	}

	.content {
		font-weight: bold;
		white-space: nowrap;
	}

	.content:after {
		content: '▼';
		vertical-align: middle;
		color: var(--ui-text, white);
		margin-left: 0.5rem;
	}

	.content.toggled:after {
		content: '▲';
		vertical-align: top;
	}
</style>
