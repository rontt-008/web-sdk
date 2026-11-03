<script lang="ts">
	import { getContextApp, getContextSpine } from 'pixi-svelte';

	type Props = {
		animation: string;
		time: () => number;
		loop?: boolean;
	};

	const props: Props = $props();
	const context = getContextApp();
	const spine = getContextSpine();

	// its skeleton doesn't play on its own (autoUpdate off): each frame it is posed where its clock
	// says, so it can follow a clock shared by many (the idles) or a tween (the hits)
	$effect(() => {
		const entry = spine.state.setAnimation(0, props.animation, props.loop ?? false);
		const time = props.time;
		const pose = () => {
			entry.trackTime = time();
			spine.update(0);
		};
		pose();
		const ticker = context.stateApp.pixiApplication?.ticker;
		ticker?.add(pose);
		return () => ticker?.remove(pose);
	});
</script>
