<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseContent from './BaseContent.svelte';
	import BaseTitle from './BaseTitle.svelte';

	// what an RGS error code means for the player, in words that suit social mode too (no bet, funds,
	// money, ...): the RGS's own message isn't shown, as it can use those words
	const ERROR_TEXT: Record<string, string> = {
		ERR_IPB: 'Your balance is too low for this round.',
		ERR_GLE: 'You have reached a limit set on your account.',
		ERR_VAL: 'The session is not valid. Please reload the game.',
		ERR_IS: 'Your session has ended. Please reload the game.',
		ERR_ATE: 'Your session has ended. Please reload the game.',
		ERR_ACT: 'The game server is busy. Please try again in a moment.',
		ERR_BE: 'A round is still in progress. Please reload the game to finish it.',
		ERR_BNF: 'This round could not be found. Please reload the game.',
	};
	const DEFAULT_TEXT = 'The game server could not complete this. Please reload the game.';

	// the RGS error code, e.g. ERR_IPB, when there is one
	const errorCode = (error: unknown) => {
		const code = typeof error === 'object' && error && 'error' in error ? error.error : error;
		return typeof code === 'string' && code.startsWith('ERR_') ? code : undefined;
	};
</script>

{#if stateModal.modal?.name === 'error'}
	{@const code = errorCode(stateModal.modal.error)}
	<Popup zIndex={zIndex.modal} persistent onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="500px">
			<BaseTitle>Sorry, something went wrong.</BaseTitle>
			<div class="scrollY error-text">
				<p>{(code && ERROR_TEXT[code]) || DEFAULT_TEXT}</p>
				{#if code}
					<span class="code">{code}</span>
				{/if}
			</div>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.error-text {
		box-sizing: border-box;
		width: 100%;
		max-height: 100px;
		max-width: 480px;
		border-radius: var(--ui-control-radius, 8px);
		border: 1px solid var(--ui-danger, red);
		background: rgba(0, 0, 0, 0.2);
		color: var(--ui-text-muted, white);
		white-space: normal;
		overflow-wrap: anywhere;
		padding: 1rem;

		p {
			margin: 0;
		}
	}

	.code {
		display: block;
		margin-top: 0.5rem;
		font-size: 0.85em;
		opacity: 0.7;
	}
</style>
