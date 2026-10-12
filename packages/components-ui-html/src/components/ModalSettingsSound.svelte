<script lang="ts">
	import type { Snippet } from 'svelte';

	import { getContextEventEmitter } from 'utils-event-emitter';
	import { Button } from 'components-shared';

	import ButtonFace from './ButtonFace.svelte';
	import type { EmitterEventModal } from '../types';

	type Props = {
		value: number;
		children: Snippet;
	};

	let { value = $bindable(), children }: Props = $props();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();
</script>

<div class="col">
	<span class="label">{@render children()}</span>
	<div class="row">
		<!-- button -->
		<div class="button-wrap">
			<Button
				onclick={() => {
					eventEmitter.broadcast({ type: 'soundPressGeneral' });
					if (value === 0) {
						value = 50;
					} else {
						value = 0;
					}
				}}
			>
				<ButtonFace
					variant="control"
					round
					width="3rem"
					height="3rem"
					fontSize="0.85rem"
					selected={value > 0}
				>
					{value > 0 ? 'ON' : 'OFF'}
				</ButtonFace>
			</Button>
		</div>

		<!-- range -->
		<input bind:value type="range" min="0" max="100" class="range" style:--percent="{value}%" />

		<!-- value -->
		<div class="value">
			<span>{value}</span>
		</div>
	</div>
</div>

<style lang="scss">
	.col {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.label {
		color: var(--ui-text-muted, white);
	}

	.row {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 1rem;
	}

	.button-wrap {
		display: flex;
		align-items: center;
	}

	.range {
		flex: 1;
		min-width: 0;
		height: 0.5rem;
		margin: 0;
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
		border-radius: 1rem;
		/* the theme's control background can be a gradient, which a colour stop cannot be */
		background: linear-gradient(
			to right,
			var(--ui-accent-color, white) 0 var(--percent),
			rgba(0, 0, 0, 0.3) var(--percent) 100%
		);

		&::-webkit-slider-thumb {
			-webkit-appearance: none;
			appearance: none;
			width: 1.4rem;
			height: 1.4rem;
			border-radius: 50%;
			background: var(--ui-text, white);
			border: 0.2rem solid var(--ui-accent-color, white);
			box-shadow: 0 0.1rem 0.35rem rgba(0, 0, 0, 0.45);
		}

		&::-moz-range-thumb {
			width: 1rem;
			height: 1rem;
			border-radius: 50%;
			background: var(--ui-text, white);
			border: 0.2rem solid var(--ui-accent-color, white);
			box-shadow: 0 0.1rem 0.35rem rgba(0, 0, 0, 0.45);
		}

		&:focus-visible {
			outline: 2px solid var(--ui-accent-color, white);
			outline-offset: 4px;
		}
	}

	.value {
		width: 2.5rem;
		text-align: right;
		font-family: var(--ui-font-heading, inherit);
		font-weight: var(--ui-heading-weight, 800);
		font-variant-numeric: tabular-nums;
	}
</style>
