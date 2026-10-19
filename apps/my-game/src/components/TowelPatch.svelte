<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		// across, in rem
		size: number;
		children: Snippet;
	};

	const props: Props = $props();
</script>

<!-- a round patch sewn on a towel (TowelCloth), a picture in it -->
<div class="patch" style:--size="{props.size}rem">
	{@render props.children()}
</div>

<style lang="scss">
	.patch {
		flex: none;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: radial-gradient(closest-side, var(--patch-in), var(--patch-out));
		box-shadow:
			0 0 0 4px var(--cloth-top),
			0 0 0 6px var(--patch-ring),
			inset 0 3px 8px rgba(0, 0, 0, 0.7);
		outline: 2px dashed var(--patch-dash);
		outline-offset: calc(var(--size) * -0.07);
	}
</style>
