<script lang="ts" module>
	export type SignTextColour = 'yellow' | 'green' | 'orange' | 'cream';
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
	Text in the logo's lettering for the HTML menus, as signText.ts draws it on the canvas: Germania
	One (loaded with the game's assets, see assets.ts), a gradient light at the top and deep at the
	bottom, outlined in dark brown. Two copies laid over each other, so the outline stays under the
	gradient: the outline one behind, the gradient one on top.
-->
<span class="sign {props.colour ?? 'yellow'}" style:font-size={props.size}>
	<span class="outline" aria-hidden="true">{props.text}</span>
	<span class="fill">{props.text}</span>
</span>

<style lang="scss">
	.sign {
		/* the gradient's colours, as SIGN_FILLS in signText.ts */
		--top: #ffe14d;
		--middle: #ffc933;
		--lower: #f7921e;
		--bottom: #d9480f;

		display: inline-grid;
		font-family: 'Germania One', serif;
		font-weight: bold;
		line-height: 1.05;
		letter-spacing: 0.02em;
		text-align: center;

		&.green {
			--top: #a6f07a;
			--middle: #62d94c;
			--lower: #2fb53c;
			--bottom: #17802b;
		}

		&.orange {
			--top: #ff8c3a;
			--middle: #ff6526;
			--lower: #e83c16;
			--bottom: #b81e0a;
		}

		&.cream {
			--top: #fffaf0;
			--middle: #fff1d6;
			--lower: #f1d9a8;
			--bottom: #d9b77a;
		}

		> * {
			grid-area: 1 / 1;
		}
	}

	.outline {
		color: #2a1206;
		-webkit-text-stroke: 0.2em #2a1206;
		text-shadow: 0 0.08em 0 #2a1206;
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
