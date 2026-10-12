<script lang="ts">
	import { blur } from 'svelte/transition';
	import { onMount, type Snippet } from 'svelte';

	import { waitForTimeout } from 'utils-shared/wait';

	import OnHotkey from './OnHotkey.svelte';

	type Props = {
		children: Snippet;
		zIndex: number;
		persistent?: boolean;
		onclose: () => void;
	};

	const props: Props = $props();

	const zIndexInternal = {
		topLayer: 2,
		clickToCloseLayer: 2,
		closeButton: 101,
		contentLayer: 100,
	};

	const closeModal = () => (props.persistent ? undefined : props.onclose());

	let disabled = $state(true);

	onMount(async () => {
		await waitForTimeout(300);

		disabled = false;
	});
</script>

<OnHotkey hotkey="Escape" onpress={closeModal} />

<div class="pop-up-wrap" class:disabled style={`z-index: ${props.zIndex};`}>
	<div class="blur-layer"></div>
	<div
		class="top-layer"
		style="--zIndex: {zIndexInternal.topLayer}"
		in:blur={{ duration: 300, opacity: 0 }}
	>
		<div
			tabindex={0}
			class="click-to-close-layer"
			onclick={closeModal}
			onkeypress={closeModal}
			role="button"
			style="--zIndex: {zIndexInternal.clickToCloseLayer}"
		></div>

		{#if !props.persistent}
			<div class="close-button-wrap" style="--zIndex: {zIndexInternal.closeButton}">
				<button class="close-button" data-test="close-button" onclick={closeModal}>×</button>
			</div>
		{/if}
		{@render props.children()}
	</div>
</div>

<style lang="scss">
	/* the --ui-* colours come from components-ui-html's theme when the popup is inside its <Modals> */
	.pop-up-wrap {
		font-family: var(--ui-font, 'proxima-nova', sans-serif);
		touch-action: manipulation;
		color: var(--ui-text, white);
		position: fixed;
		left: 0;
		top: 0;
		bottom: 0;
		right: 0;

		display: flex !important;
		justify-content: center;
		align-items: center;
		/* content scaled down to fit still takes its full size in the layout */
		overflow: hidden;

		&.disabled {
			pointer-events: none;
		}
	}

	.blur-layer {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		right: 0;
		background: var(--ui-backdrop, rgba(0, 0, 0, 0.5));
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
	}

	.top-layer {
		width: 100%;
		height: 100%;
		z-index: var(--zIndex);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.click-to-close-layer {
		z-index: var(--zIndex);

		position: absolute;
		width: 100%;
		height: 100%;
	}

	.close-button-wrap {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: var(--zIndex);
	}

	.close-button {
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 0 0.15em;
		color: var(--ui-control-text, white);
		font-family: var(--ui-font-heading, inherit);
		font-size: 2rem;
		font-weight: 900;
		line-height: 1;
		background: var(--ui-control-bg, transparent);
		border: var(--ui-control-border, none);
		border-radius: 50%;
		width: 2.75rem;
		height: 2.75rem;
		transition:
			transform 120ms ease,
			background 120ms ease;

		&:hover {
			background: var(--ui-control-bg-hovered, transparent);
			transform: scale(1.06);
		}

		&:active {
			transform: scale(0.95);
		}
	}
</style>
