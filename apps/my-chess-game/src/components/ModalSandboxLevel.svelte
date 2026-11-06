<script lang="ts" module>
	// stateModal.modal = { name: 'game', id: SANDBOX_LEVEL_MODAL } opens it
	export const SANDBOX_LEVEL_MODAL = 'sandboxLevel';
</script>

<script lang="ts">
	import { Button, Popup } from 'components-shared';
	import { BaseButtonWrap, BaseContent, BaseScrollable, BaseTitle, ButtonFace } from 'components-ui-html';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import { getContext } from '../game/context';
	import { SANDBOX_LEVELS } from '../game/constants';
	import { setSandboxElo } from '../game/stateGame.svelte';

	// The practice board's opponent, in the middle of the screen like the bet menu and built from the
	// same pieces (Modals' theme): a strength a button, in Elo with its name, the one in use lit; a pick
	// counts at once (the engine's next move), CONFIRM, the ×, Escape or a click outside close it.
	const context = getContext();
	const open = $derived(stateModal.modal?.name === 'game' && stateModal.modal.id === SANDBOX_LEVEL_MODAL);
	const close = () => (stateModal.modal = null);
</script>

{#if open}
	<Popup zIndex={zIndex.modal} onclose={close}>
		<BaseContent maxWidth="100%">
			<BaseTitle>OPPONENT</BaseTitle>
			<BaseScrollable type="column">
				<span class="subtitle">How strong the engine plays on the practice board</span>
				<div class="levels">
					{#each SANDBOX_LEVELS as level (level.elo)}
						{@const selected = level.elo === context.stateGame.sandboxElo}
						<div class="level">
							<Button data-test="sandbox-level" onclick={() => setSandboxElo(level.elo)}>
								<ButtonFace variant="control" height="3.75rem" {selected}>
									<span class="face">
										<span class="elo">{level.elo}</span>
										<span class="name">{level.name}</span>
									</span>
								</ButtonFace>
							</Button>
						</div>
					{/each}
				</div>
			</BaseScrollable>
			<BaseButtonWrap type="full-width">
				<Button data-test="confirm-button" onclick={close}>
					<ButtonFace variant="primary" height="3rem" fontSize="1.25rem">CONFIRM</ButtonFace>
				</Button>
			</BaseButtonWrap>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.subtitle {
		color: var(--ui-text-muted, white);
	}

	/* four a row, the last row centred */
	.levels {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		max-width: 28.5rem;
	}

	.level {
		width: 6.5rem;
	}

	.face {
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.1;
	}

	.elo {
		font-size: 1.35rem;
		font-family: var(--ui-font-heading, inherit);
		font-weight: var(--ui-heading-weight, 800);
		font-variant-numeric: tabular-nums;
	}

	.name {
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		opacity: 0.75;
	}
</style>
