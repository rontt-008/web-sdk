<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { BOARD_SIZES } from '../game/constants';

	// the pieces falling in and out are only seen on the board (in the board container's own units)
</script>

<Rectangle isMask width={BOARD_SIZES.width} height={BOARD_SIZES.height} />
