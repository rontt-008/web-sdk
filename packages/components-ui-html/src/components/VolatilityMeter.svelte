<script lang="ts">
	import { i18nDerived } from '../i18n/i18nDerived';

	type Props = {
		// 1 (low) to 5 (high)
		value: number;
	};

	const props: Props = $props();

	const BARS = 5;
	const filled = $derived(Math.max(0, Math.min(BARS, Math.round(props.value))));
</script>

<div class="meter" role="img" aria-label="{i18nDerived.volatility()} {filled}/{BARS}">
	<span class="label">{i18nDerived.volatility()}</span>
	<span class="bars">
		{#each { length: BARS } as _, index}
			<span class="bar" class:filled={index < filled} style:--height="{40 + index * 15}%"></span>
		{/each}
	</span>
</div>

<style lang="scss">
	.meter {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
	}

	.label {
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		color: var(--ui-card-text, var(--ui-text-muted, white));
	}

	/* bars that rise from left to right, filled up to the bonus's volatility */
	.bars {
		display: flex;
		align-items: flex-end;
		gap: 0.18rem;
		height: 1.05rem;
	}

	.bar {
		width: 0.36rem;
		height: var(--height);
		border-radius: 0.1rem;
		background: var(--ui-meter-empty, rgba(255, 255, 255, 0.16));

		&.filled {
			background: var(--ui-meter-filled, white);
		}
	}
</style>
