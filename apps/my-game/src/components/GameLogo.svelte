<script lang="ts">
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
</script>

<Sprite key="gameLogo" anchor={0.5} {...context.stateGameDerived.logoLayout()} />
