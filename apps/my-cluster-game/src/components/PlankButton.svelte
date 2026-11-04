<script lang="ts">
	import SignText, { type SignTextColour } from './SignText.svelte';

	type Props = {
		label: string;
		onclick: () => void;
		disabled?: boolean;
		// the label's colour, the bonus's own
		colour?: SignTextColour;
		// a lighter, plainer plank (CANCEL), so the one that buys stands out
		quiet?: boolean;
		'data-test'?: string;
	};

	const props: Props = $props();

	// longer labels (NOT ENOUGH BALANCE) are smaller, and may take two lines
	const LABEL_SIZE_REM = 1.05;
	const LABEL_FULL_LENGTH = 8;
	const size = $derived(`${LABEL_SIZE_REM * Math.min(1, LABEL_FULL_LENGTH / props.label.length) ** 0.6}rem`);
</script>

<!-- a button as a wooden plank, like the spin sign's: grained wood, a dark outline, the label carved
in the logo's lettering; it sinks a little as it is pressed -->
<button
	class="plank"
	class:quiet={props.quiet}
	disabled={props.disabled}
	data-test={props['data-test']}
	onclick={props.onclick}
>
	<SignText text={props.label} colour={props.quiet ? 'cream' : (props.colour ?? 'yellow')} {size} />
</button>

<style lang="scss">
	.plank {
		box-sizing: border-box;
		width: 100%;
		min-height: 2.05rem;
		padding: 0.2rem 0.5rem;
		border: 0.12rem solid #2a1206;
		border-radius: 0.5rem;
		background:
			/* the grain, and a knot */
			radial-gradient(ellipse 0.9rem 0.3rem at 78% 62%, rgba(42, 18, 6, 0.35), transparent 70%),
			repeating-linear-gradient(180deg, transparent 0 0.5rem, rgba(42, 18, 6, 0.16) 0.5rem 0.58rem),
			linear-gradient(180deg, #925a32, #6c3b1b 55%, #4e2910);
		box-shadow:
			inset 0 0.1rem 0 rgba(255, 214, 160, 0.3),
			0 0.18rem 0 #2a1206,
			0 0.28rem 0.35rem rgba(0, 0, 0, 0.45);
		cursor: pointer;
		transition:
			transform 80ms ease,
			box-shadow 80ms ease,
			filter 120ms ease;

		&:hover:not(:disabled) {
			filter: brightness(1.12);
		}

		&:active:not(:disabled) {
			transform: translateY(0.12rem);
			box-shadow:
				inset 0 0.1rem 0 rgba(255, 214, 160, 0.3),
				0 0.06rem 0 #2a1206,
				0 0.15rem 0.25rem rgba(0, 0, 0, 0.45);
		}

		&:disabled {
			filter: grayscale(0.75) brightness(0.9);
			cursor: not-allowed;
		}

		&:focus-visible {
			outline: 0.15rem solid #ffd23f;
			outline-offset: 0.15rem;
		}
	}

	.quiet {
		background:
			repeating-linear-gradient(180deg, transparent 0 0.5rem, rgba(42, 18, 6, 0.12) 0.5rem 0.58rem),
			linear-gradient(180deg, #5a4a3e, #43362c 55%, #33281f);
	}
</style>
