<script lang="ts">
	import type { Snippet } from 'svelte';

	import HeadingText from './HeadingText.svelte';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();
</script>

<div class="ui-modal-title-wrap">
	<HeadingText>{@render props.children()}</HeadingText>
</div>

<style lang="scss">
	.ui-modal-title-wrap {
		text-align: center;
		font-size: 1.75rem;
	}
</style>
