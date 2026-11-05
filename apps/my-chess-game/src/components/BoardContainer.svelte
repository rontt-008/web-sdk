<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';

	// a layer of the board scene, in the board's own units (SYMBOL_SIZE a square, its top left corner at
	// 0, 0): put inside TiltedPlane, which places the scene on the table
	type Props = {
		children: Snippet;
		sortableChildren?: boolean;
	};

	const props: Props = $props();
</script>

<Container sortableChildren={props.sortableChildren}>
	{@render props.children()}
</Container>
