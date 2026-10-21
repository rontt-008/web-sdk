<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Container, Sprite, type Texture } from 'pixi.js';
	import { getContextParent } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { getSymbolInfo, getSymbolX } from '../game/utils';
	import { BIG_WILD_NO_FISH_ASSET_KEY, BOARD_DIMENSIONS, SYMBOL_SIZE } from '../game/constants';
	import type { Reel, ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reel: Reel;
		reelIndex: number;
	};

	const props: Props = $props();
	const context = getContext();

	// A reel's symbols while it spins (see reelState.scrolling), drawn as a few plain sprites moved
	// every frame. Scrolling, they are all at rest, so each is just its art, its soft shadow and (a
	// big wild without its fish) the empty mouth over it, as a Symbol draws them at rest; the rest
	// of the time each symbol has its own ReelSymbol (see BoardBase). Building a ReelSymbol for every
	// symbol scrolling in and taking it down as it left was most of what a spin cost a phone.
	//   SLOTS: enough for all that can be in the frame at once, a big wild coming in included
	const SLOTS = 10;
	const SHADOW_ALPHA = 0.6;
	const SHADOW_OFFSET = { x: SYMBOL_SIZE * 0.03, y: SYMBOL_SIZE * 0.05 };
	// in the frame while the middle of any of its rows is (as SymbolWrap); a big wild reaches this
	// far up and down from its middle to the middles of its top and bottom rows
	const TOP = 0;
	const BOTTOM = SYMBOL_SIZE * BOARD_DIMENSIONS.y;
	const BIG_WILD_REACH = ((BOARD_DIMENSIONS.y - 1) / 2) * SYMBOL_SIZE;

	type Slot = {
		container: Container;
		shadow: Sprite;
		art: Sprite;
		over: Sprite;
		// what it shows, to redo its sprites only when that changes
		rawSymbol?: ReelSymbol['rawSymbol'];
		state?: ReelSymbol['symbolState'];
	};

	const texture = (key: string) => context.stateApp.loadedAssets[key] as Texture;

	const layer = new Container({ sortableChildren: true, visible: false });
	getContextParent().addToParent(layer);
	const slots: Slot[] = Array.from({ length: SLOTS }, () => {
		const container = new Container({ visible: false });
		const shadow = new Sprite({ anchor: 0.5, alpha: SHADOW_ALPHA, ...SHADOW_OFFSET });
		const art = new Sprite({ anchor: 0.5 });
		const over = new Sprite({ anchor: 0.5 });
		container.addChild(shadow, art, over);
		layer.addChild(container);
		return { container, shadow, art, over };
	});
	// each symbol in the frame keeps its slot until it leaves
	const slotOf = new Map<ReelSymbol, Slot>();

	const show = (slot: Slot, reelSymbol: ReelSymbol) => {
		const { rawSymbol, symbolState } = reelSymbol;
		if (slot.rawSymbol === rawSymbol && slot.state === symbolState) return;
		slot.rawSymbol = rawSymbol;
		slot.state = symbolState;
		const info = getSymbolInfo({ rawSymbol, state: symbolState });
		const width = SYMBOL_SIZE * info.sizeRatios.width;
		const height = SYMBOL_SIZE * info.sizeRatios.height;
		slot.art.texture = texture(info.assetKey);
		slot.art.setSize(width, height);
		slot.shadow.visible = 'shadow' in info;
		if ('shadow' in info) {
			slot.shadow.texture = texture(info.shadow.assetKey);
			slot.shadow.setSize(
				SYMBOL_SIZE * info.shadow.sizeRatios.width,
				SYMBOL_SIZE * info.shadow.sizeRatios.height,
			);
		}
		slot.over.visible = !!rawSymbol.bigWild && !rawSymbol.bigWild.fish;
		if (slot.over.visible) {
			slot.over.texture = texture(BIG_WILD_NO_FISH_ASSET_KEY);
			slot.over.setSize(width, height);
		}
	};

	const update = () => {
		const reelState = props.reel.reelState;
		layer.visible = reelState.scrolling;
		if (!reelState.scrolling) {
			// emptied for the next spin, or what they showed would come back with it
			if (slotOf.size) {
				slotOf.clear();
				for (const slot of slots) slot.container.visible = false;
			}
			return;
		}
		const hiddenReel = context.stateGame.hiddenReels.includes(props.reelIndex);
		// the symbols in the frame, and where each is drawn (a big wild by its top W, centred on the
		// reel below it); one the cat ate stays gone until it's off the board. Only those near the
		// frame are looked at, by where the reel is (a symbol's place in the strip is its index):
		// the strip can be dozens long, and reading each symbol's state every frame adds up.
		const inFrame = new Map<ReelSymbol, number>();
		if (!hiddenReel) {
			const symbols = reelState.symbols;
			const reelY = props.reel.position();
			const at = (y: number) => (y - reelY) / SYMBOL_SIZE - 0.5;
			const first = Math.max(0, Math.ceil(at(TOP - BIG_WILD_REACH * 2)));
			const last = Math.min(symbols.length - 1, Math.floor(at(BOTTOM)));
			for (let index = first; index <= last; index++) {
				const reelSymbol = symbols[index];
				const { rawSymbol } = reelSymbol;
				if (rawSymbol.eaten || (rawSymbol.bigWild && !rawSymbol.bigWild.anchor)) continue;
				const reach = rawSymbol.bigWild ? BIG_WILD_REACH : 0;
				const y = reelY + (index + 0.5) * SYMBOL_SIZE + reach;
				if (y >= TOP - reach && y <= BOTTOM + reach) inFrame.set(reelSymbol, y);
			}
		}
		// free the slots of those that left, then give the new ones the free slots
		for (const reelSymbol of slotOf.keys()) {
			if (!inFrame.has(reelSymbol)) slotOf.delete(reelSymbol);
		}
		const used = new Set(slotOf.values());
		const free = slots.filter((slot) => !used.has(slot));
		const x = getSymbolX(props.reelIndex);
		for (const [reelSymbol, y] of inFrame) {
			let slot = slotOf.get(reelSymbol);
			if (!slot) {
				slot = free.shift();
				if (!slot) break;
				slotOf.set(reelSymbol, slot);
			}
			show(slot, reelSymbol);
			slot.container.position.set(x, y);
			// drawn top to bottom, as the symbols are, so their shadows overlap the same way
			slot.container.zIndex = reelSymbol.symbolIndex;
		}
		// only the slots showing a symbol now are drawn
		const showing = new Set(slotOf.values());
		for (const slot of slots) slot.container.visible = showing.has(slot);
	};

	$effect(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (!ticker) return;
		ticker.add(update);
		return () => ticker.remove(update);
	});

	// the layer goes with the component (see addToParent); the slots' sprites too, not their textures
	onDestroy(() => slots.forEach((slot) => slot.container.destroy({ children: true })));
</script>
