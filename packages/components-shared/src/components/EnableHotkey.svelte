<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import { getContextEventEmitter } from 'utils-event-emitter';

	import type { EmitterEventHotKey } from '../types';

	const context = getContextEventEmitter<EmitterEventHotKey>();
	const PREVENT_DEFAULT_KEYS = ['Space', 'ArrowUp', 'ArrowDown'];
	const EXCLUDED_TAGS = ['input', 'textarea', 'select'];

	const getValidElement = (e: KeyboardEvent) =>
		!EXCLUDED_TAGS.includes(e?.target?.tagName?.toLowerCase());

	// A held key repeats its keydown; only the first one is a press, so a key held down from before
	// (e.g. through the loading screen) can't press a button that appears under it. Holding is told
	// from the time between keydown and keyup (see OnHotkey).
	function handleKeydown(e: KeyboardEvent) {
		if (getValidElement(e)) {
			const isSpace = e.key === ' ';
			const key = isSpace ? 'Space' : e.key;
			if (PREVENT_DEFAULT_KEYS.includes(key)) e.preventDefault();
			if (e.repeat) return;
			if (key) context.eventEmitter.broadcast({ type: 'hotKey', key, action: 'keyDown' });
		}
	}

	function handleKeyup(e: KeyboardEvent) {
		if (getValidElement(e)) {
			const isSpace = e.key === ' ';
			const key = isSpace ? 'Space' : e.key;
			if (PREVENT_DEFAULT_KEYS.includes(key)) e.preventDefault();
			if (key) context.eventEmitter.broadcast({ type: 'hotKey', key, action: 'keyUp' });
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('keyup', handleKeyup);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		window.removeEventListener('keyup', handleKeyup);
	});
</script>
