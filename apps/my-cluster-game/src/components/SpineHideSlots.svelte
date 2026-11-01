<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		// the slots whose pictures it leaves out
		slots: string[];
		// told when a slot's picture would have come or gone (as the animation sets it), so what takes
		// its place can show only while it would have
		onshown?: (slot: string, shown: boolean) => void;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	// Inside a SpineProvider: the slots' pictures aren't drawn, though the animation keeps setting
	// them (it does each frame, before this clears them). What hangs on them (SpineSlot) still moves
	// and fades with them, so a game's own text can take the place of a picture of words; it shows all
	// the time unless it follows `onshown` (SpineSlot only hides with a SpineEventEmitterProvider).
	const shown: Record<string, boolean> = {};
	const previous = spine.afterUpdateWorldTransforms;
	spine.afterUpdateWorldTransforms = (self) => {
		previous(self);
		for (const name of props.slots) {
			const slot = self.skeleton.findSlot(name);
			const has = Boolean(slot?.attachment);
			if (shown[name] !== has) {
				shown[name] = has;
				props.onshown?.(name, has);
			}
			slot?.setAttachment(null);
		}
	};
	onDestroy(() => (spine.afterUpdateWorldTransforms = previous));
</script>
