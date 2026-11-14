<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		// counts the attacks asked for: each time it goes up, one is played
		attacks: number;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	// The bat's skeleton (Bat, art-source/bat-spine.py): its `fly` loop, and when an attack is asked for,
	// `attack` once (1.8 s, the user's bat_attack.blend: it rears back flushing red, quivers, lunges at the
	// viewer, snaps, recovers and blinks), blending in from wherever the fly loop is over MIX seconds (the
	// attack starts on the loop's first frame, hovering, so the blend is a wingbeat merging into another),
	// then straight back into `fly` from its first frame, which is where the attack ends (no blend needed).
	// Asked for again while it attacks (several bat rings landing in one drop, or the free spins
	// triggering as one lands), it carries on with the one it is in: it isn't cut short and started over.
	const MIX = 0.3;

	spine.state.setAnimation(0, 'fly', true);

	let played = props.attacks;
	$effect(() => {
		if (props.attacks === played) return;
		played = props.attacks;
		if (spine.state.getCurrent(0)?.animation?.name === 'attack') return;
		const entry = spine.state.setAnimation(0, 'attack', false);
		entry.mixDuration = MIX;
		spine.state.addAnimation(0, 'fly', true, 0).mixDuration = 0;
	});

	onDestroy(() => {
		spine.state.clearTracks();
	});
</script>
