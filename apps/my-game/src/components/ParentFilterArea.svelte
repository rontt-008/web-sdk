<script lang="ts">
	import type { Rectangle } from 'pixi.js';
	import { getContextParent } from 'pixi-svelte';

	// Sets the filter area of the container it is placed in: the area its filters draw, instead of
	// the bounds of everything in it. pixi-svelte's Container has no prop for it.
	type Props = { area: Rectangle };

	const props: Props = $props();
	const parentContext = getContextParent();

	$effect(() => {
		parentContext.parent.filterArea = props.area;
	});
</script>
