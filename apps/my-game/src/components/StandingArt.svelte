<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';

	import { SYMBOL_IMAGES, type SymbolImageKey } from '../game/constants';
	import { REST_POSE, type SymbolPose } from '../game/motion';

	// Symbol art off the board (on the free spin and win screens): standing on (x, y) with its soft
	// shadow, so a pose squashes it onto the ground and leans it about its feet, like on the board.
	type Props = {
		key: SymbolImageKey;
		height: number;
		x?: number;
		y?: number;
		pose?: SymbolPose;
		// turned about its middle, as a ball rolls
		spin?: number;
		alpha?: number;
	};

	const props: Props = $props();

	// as on the board: the shadow a little down and right, see-through
	const SHADOW_OFFSET = { x: 0.04, y: 0.06 };
	const SHADOW_ALPHA = 0.6;

	const art = $derived(SYMBOL_IMAGES[props.key]);
	const scale = $derived(props.height / art.image[1]);
	const pose = $derived(props.pose ?? REST_POSE);
</script>

<Container
	x={props.x ?? 0}
	y={(props.y ?? 0) + pose.y}
	scale={{ x: pose.scaleX, y: pose.scaleY }}
	rotation={pose.rotation}
	alpha={props.alpha ?? 1}
>
	<Container y={-props.height / 2} rotation={props.spin ?? 0}>
		<Sprite
			key={`${props.key}Shadow`}
			anchor={0.5}
			x={props.height * SHADOW_OFFSET.x}
			y={props.height * SHADOW_OFFSET.y}
			width={art.shadow[0] * scale}
			height={art.shadow[1] * scale}
			alpha={SHADOW_ALPHA}
		/>
		<Sprite key={props.key} anchor={0.5} width={art.image[0] * scale} height={props.height} />
	</Container>
</Container>
