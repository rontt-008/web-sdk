<script lang="ts">
	import { stateModal, stateUi } from 'state-shared';

	import UiButton from './UiButton.svelte';
	import { UI_BASE_SIZE } from '../constants';
	import { getContext } from '../context';
	import { getUiTheme, isMenuOnlyGameRules } from '../theme';
	import type { UiButtonOptions } from '../types';

	type Props = UiButtonOptions & {
		// opens the menu even when it would hold only the game rules (the replay's menu keeps its
		// sound switch, which the theme's hideSoundSwitch doesn't take out)
		keepMenu?: boolean;
	};

	const { keepMenu = false, ...props }: Props = $props();
	const context = getContext();
	const theme = getUiTheme();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };

	// a menu holding nothing but the game rules isn't opened: the rules are, straight away
	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (!keepMenu && isMenuOnlyGameRules(theme)) stateModal.modal = { name: 'gameRules' };
		else stateUi.menuOpen = true;
	};
</script>

<UiButton {...props} {sizes} {onpress} icon="menu" />
