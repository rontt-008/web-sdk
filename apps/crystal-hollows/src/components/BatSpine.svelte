<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import type { BatFeet } from '../game/batPerch.svelte';

	type Props = {
		// counts the attacks asked for: each time it goes up, one is played
		attacks: number;
		// after each pose: where its feet are (the tips of its legs' bones, and between them), in the units
		// of the skeleton's parent (BatSign's ropes hang from them)
		onfeet?: (feet: BatFeet) => void;
	};

	const props: Props = $props();
	const spine = getContextSpine();
	const context = getContext();

	// The bat's skeleton (Bat, art-source/bat-spine.py): its `fly` loop, and when an attack is asked for,
	// `attack` once (1.8 s, the user's bat_attack.blend: it rears back flushing red, quivers, lunges at the
	// viewer, snaps, recovers and blinks), blending in from wherever the fly loop is over MIX seconds (the
	// attack starts on the loop's first frame, hovering, so the blend is a wingbeat merging into another),
	// then straight back into `fly` from its first frame, which is where the attack ends (no blend needed).
	// Asked for again while it attacks (several bat rings landing in one drop, or the free spins
	// triggering as one lands), it carries on with the one it is in: it isn't cut short and started over.
	const MIX = 0.3;

	spine.state.setAnimation(0, 'fly', true);

	const legL = spine.skeleton.findBone('leg_L');
	const legR = spine.skeleton.findBone('leg_R');
	// a leg bone's tip, in the units of the skeleton's parent
	const tip = (bone: NonNullable<typeof legL>) => ({
		x: spine.x + (bone.worldX + bone.a * bone.data.length - spine.pivot.x) * spine.scale.x,
		y: spine.y + (bone.worldY + bone.c * bone.data.length - spine.pivot.y) * spine.scale.y,
	});
	spine.afterUpdateWorldTransforms = () => {
		if (!props.onfeet || !legL || !legR) return;
		const left = tip(legL);
		const right = tip(legR);
		props.onfeet({ x: (left.x + right.x) / 2, y: (left.y + right.y) / 2, left, right });
	};

	let played = props.attacks;
	$effect(() => {
		if (props.attacks === played) return;
		played = props.attacks;
		if (spine.state.getCurrent(0)?.animation?.name === 'attack') return;
		// its snarl, the wings slamming down, its cry and the snap, timed to the attack
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_bat_attack' });
		const entry = spine.state.setAnimation(0, 'attack', false);
		entry.mixDuration = MIX;
		spine.state.addAnimation(0, 'fly', true, 0).mixDuration = 0;
	});

	onDestroy(() => {
		spine.afterUpdateWorldTransforms = () => {};
		spine.state.clearTracks();
	});
</script>
