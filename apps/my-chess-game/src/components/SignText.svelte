<script lang="ts" module>
	export type SignTextColour = 'cream' | 'gold' | 'bronze';
</script>

<script lang="ts">
	type Props = {
		text: string;
		colour?: SignTextColour;
		// a CSS font size; the text wraps to the width it is given
		size?: string;
	};

	const props: Props = $props();
</script>

<!--
	Text in carved lettering for the HTML menus (as the cluster game's SignText): Germania One (loaded
	with the game's assets, see assets.ts), a gradient light at the top and deep at the bottom, outlined
	in dark brown. Two copies laid over each other, so the outline stays under the gradient: the outline
	one behind, the gradient one on top.
-->
<span class="sign {props.colour ?? 'cream'}" style:font-size={props.size}>
	<span class="outline" aria-hidden="true">{props.text}</span>
	<span class="fill">{props.text}</span>
</span>

<style lang="scss">
	.sign {
		/* cream, the start screen cards' paper */
		--top: #fffaf0;
		--middle: #f7f2e6;
		--lower: #e8dcc2;
		--bottom: #cdb88f;

		display: inline-grid;
		font-family: 'Germania One', serif;
		font-weight: bold;
		line-height: 1.05;
		letter-spacing: 0.02em;
		text-align: center;

		/* the board's gold */
		&.gold {
			--top: #fff3c4;
			--middle: #ffd34d;
			--lower: #f2a93b;
			--bottom: #b8671a;
		}

		/* the CHECKMATE BONUS's bronze */
		&.bronze {
			--top: #ffe0b8;
			--middle: #f0a860;
			--lower: #d07a34;
			--bottom: #8f4a1a;
		}

		> * {
			grid-area: 1 / 1;
		}
	}

	.outline {
		color: #1a0d06;
		-webkit-text-stroke: 0.2em #1a0d06;
		text-shadow: 0 0.08em 0 #1a0d06;
	}

	.fill {
		background: linear-gradient(
			180deg,
			var(--top) 0%,
			var(--top) 30%,
			var(--middle) 50%,
			var(--lower) 66%,
			var(--bottom) 80%,
			var(--bottom) 100%
		);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
</style>
