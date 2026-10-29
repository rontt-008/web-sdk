<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';

	import { Container, type ContainerProps } from 'pixi-svelte';

	type Props = ContainerProps & {
		show: boolean;
		persistent?: boolean;
		duration?: number;
		oncomplete?: () => void;
	};

	const { show, persistent, duration, oncomplete, children, ...restProps }: Props = $props();
	const alpha = new Tween(show ? 1 : 0, { duration: duration });

	$effect(() => {
		alpha.set(show ? 1 : 0, { duration: duration }).then(() => oncomplete?.());
	});

	onMount(async () => {
		if (show) {
			await alpha.set(0, { duration: 0 });
			await alpha.set(1);
			oncomplete?.();
		}
	});
</script>

{#if alpha.current > 0 || persistent}
	<Container {...restProps} alpha={alpha.current} visible={alpha.current > 0}>
		{@render children()}
	</Container>
{/if}
