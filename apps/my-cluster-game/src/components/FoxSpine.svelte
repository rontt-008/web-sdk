<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextApp, getContextSpine } from 'pixi-svelte';

	type Props = {
		// the animation to play once (in the skeleton it is in, SpineProvider): changed while it plays,
		// the new one blends in from where the fox is over `mix` seconds
		animation: string;
		mix: number;
		oncomplete: (animation: string) => void;
		// where its face bone is every frame, in the skeleton's container (y down)
		onface: (at: { x: number; y: number }) => void;
	};

	const props: Props = $props();
	const context = getContextApp();
	const spine = getContextSpine();

	// The fox's own animations on its mesh rig (Fox: the look-around, the surprise). The first is posed
	// at its start as soon as it is made, so the first frame drawn is already its own (bent onto the
	// idle's first frame, fox-spine.py) and the game switches from the idle to it with nothing to see;
	// one following it while it plays blends in, bone by bone. It tells where the face bone is, for
	// the blink to follow the eyes as they slide.
	type Entry = ReturnType<typeof spine.state.setAnimation>;
	let entry: Entry | undefined;

	$effect(() => {
		const animation = props.animation;
		const previous = entry;
		const next = spine.state.setAnimation(0, animation, false);
		if (previous) {
			previous.listener = null;
			next.mixDuration = props.mix;
		}
		next.listener = { complete: () => props.oncomplete(animation) };
		entry = next;
		if (!previous) spine.update(0);
	});
	onDestroy(() => {
		if (entry) entry.listener = null;
	});

	$effect(() => {
		const bone = spine.skeleton.findBone('face');
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!bone || !ticker) return;
		const read = () => props.onface({ x: bone.worldX, y: bone.worldY });
		read();
		ticker.add(read);
		return () => ticker.remove(read);
	});
</script>
