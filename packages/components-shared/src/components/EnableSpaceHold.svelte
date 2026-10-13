<script lang="ts" module>
	import { stateBet, stateBetDerived, stateModal, stateUi } from 'state-shared';
</script>

<script lang="ts">
	import OnHotkey from './OnHotkey.svelte';

	const spaceHoldOn = () => {
		stateBet.autoSpinsCounter = 0;
		stateBet.isSpaceHold = true;
		stateBetDerived.updateIsTurbo(true, { persistent: true });
	};

	const spaceHoldOff = () => {
		stateBet.isSpaceHold = false;
		stateBetDerived.updateIsTurbo(false, { persistent: true });
	};
</script>

<!-- holding space does nothing while a menu or a modal is open over the game -->
<OnHotkey
	hotkey="Space"
	disabled={!!stateModal.modal || stateUi.menuOpen}
	onhold={spaceHoldOn}
	onholdend={spaceHoldOff}
/>
