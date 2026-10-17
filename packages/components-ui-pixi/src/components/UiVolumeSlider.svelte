<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { FederatedPointerEvent } from 'pixi.js';
	import { Container, Rectangle } from 'pixi-svelte';

	import { getPanelCornerRadius, getUiTheme } from '../theme';

	type Props = {
		x?: number;
		y?: number;
		// the volume, 0 to 100
		value: number;
		// the square around the button (centred on it) that keeps the slider open
		buttonSize: number;
		// between that square and the slider above it
		gap: number;
		// the button, centred on this component's x and y
		children: Snippet;
	};

	let { x, y, value = $bindable(), buttonSize, gap, children }: Props = $props();
	const theme = getUiTheme();

	// A volume slider that opens above a button while the pointer is over the button (or the slider):
	// a panel with a track filled up to the volume and a knob at its top. Pressing or dragging anywhere
	// on the panel sets the volume.
	const WIDTH = 64;
	const HEIGHT = 230;
	// from the ends of the panel to the ends of the track
	const PADDING = 32;
	const TRACK_WIDTH = 6;
	const TRACK_ALPHA = 0.25;
	const KNOB_SIZE = 26;
	// how long the pointer can be off the button and slider before the slider closes
	const CLOSE_DELAY = 250;
	const TRACK_LENGTH = HEIGHT - PADDING * 2;

	const iconColor = theme?.button.icon ?? 0xffffff;
	// from the button's middle to the bottom of the slider
	const bottom = $derived(buttonSize * 0.5 + gap);
	const filled = $derived((value / 100) * TRACK_LENGTH);
	// while open, the button, the slider and the gap between them all keep it open
	const halfWidth = $derived(Math.max(WIDTH, buttonSize) * 0.5);
	const openArea = $derived({
		contains: (px: number, py: number) =>
			Math.abs(px) <= halfWidth && py >= -(bottom + HEIGHT) && py <= buttonSize * 0.5,
	});

	let open = $state(false);
	let hovered = false;
	let dragging = false;
	let closeTimeout: ReturnType<typeof setTimeout> | undefined;

	const close = () => {
		clearTimeout(closeTimeout);
		closeTimeout = setTimeout(() => (open = false), CLOSE_DELAY);
	};

	const endDrag = () => {
		dragging = false;
		if (!hovered) close();
	};

	// the slider's origin is the middle of its bottom; the track runs up from PADDING above it
	const setFromPointer = (event: FederatedPointerEvent) => {
		const { y: localY } = event.getLocalPosition(event.currentTarget);
		const share = Math.min(Math.max((-localY - PADDING) / TRACK_LENGTH, 0), 1);
		value = Math.round(share * 100);
	};

	$effect(() => () => clearTimeout(closeTimeout));
</script>

<Container
	{x}
	{y}
	eventMode="static"
	hitArea={open ? openArea : null}
	onpointerenter={() => {
		hovered = true;
		clearTimeout(closeTimeout);
		open = true;
	}}
	onpointerleave={() => {
		hovered = false;
		if (!dragging) close();
	}}
>
	{@render children()}

	{#if open}
		<Container
			y={-bottom}
			eventMode="static"
			cursor="pointer"
			onpointerdown={(event) => {
				dragging = true;
				setFromPointer(event);
			}}
			onglobalpointermove={(event) => {
				if (dragging) setFromPointer(event);
			}}
			onpointerup={endDrag}
			onpointerupoutside={endDrag}
		>
			<Rectangle
				anchor={{ x: 0.5, y: 1 }}
				width={WIDTH}
				height={HEIGHT}
				borderRadius={getPanelCornerRadius(theme, WIDTH)}
				backgroundColor={theme?.label.panel ?? 0x000000}
				backgroundAlpha={theme?.label.panelAlpha ?? 0.8}
				borderColor={theme?.outline}
				borderWidth={theme?.outlineWidth}
				borderAlpha={theme?.outlineAlpha}
			/>

			<Rectangle
				anchor={{ x: 0.5, y: 1 }}
				y={-PADDING}
				width={TRACK_WIDTH}
				height={TRACK_LENGTH}
				borderRadius={TRACK_WIDTH * 0.5}
				backgroundColor={iconColor}
				backgroundAlpha={TRACK_ALPHA}
			/>

			{#if filled > 0}
				<Rectangle
					anchor={{ x: 0.5, y: 1 }}
					y={-PADDING}
					width={TRACK_WIDTH}
					height={filled}
					borderRadius={TRACK_WIDTH * 0.5}
					backgroundColor={iconColor}
				/>
			{/if}

			<Rectangle
				anchor={0.5}
				y={-PADDING - filled}
				width={KNOB_SIZE}
				height={KNOB_SIZE}
				borderRadius={KNOB_SIZE * 0.5}
				backgroundColor={iconColor}
			/>
		</Container>
	{/if}
</Container>
