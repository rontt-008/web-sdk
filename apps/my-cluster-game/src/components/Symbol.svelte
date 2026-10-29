<script lang="ts">
	import SymbolSpine from './SymbolSpine.svelte';
	import SymbolSprite from './SymbolSprite.svelte';
	import SymbolSpriteSheet from './SymbolSpriteSheet.svelte';
	import SymbolIdle from './SymbolIdle.svelte';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { getSymbolInfo } from '../game/utils';
	import { getContext } from '../game/context';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
		// how many frames on an idle loop is (see idleClock)
		phase?: number;
	};

	const props: Props = $props();
	const context = getContext();
	const symbolInfo = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
	const isSprite = $derived(symbolInfo.type === 'sprite');
</script>

{#if isSprite}
	<SymbolSprite {symbolInfo} x={props.x} y={props.y} oncomplete={props.oncomplete} />
{:else if symbolInfo.type === 'spriteSheet'}
	<SymbolSpriteSheet {symbolInfo} x={props.x} y={props.y} oncomplete={props.oncomplete} />
{:else if symbolInfo.type === 'idle'}
	<SymbolIdle
		{symbolInfo}
		x={props.x}
		y={props.y}
		phase={props.phase}
		oncomplete={props.oncomplete}
	/>
{:else}
	<SymbolSpine
		loop={props.loop}
		{symbolInfo}
		x={props.x}
		y={props.y}
		listener={{
			complete: props.oncomplete,
			event: (_, event) => {
				if (event.data?.name === 'wildExplode') {
					context.eventEmitter?.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
				}
			},
		}}
	/>
{/if}
