import { untrack } from 'svelte';
import type { PixiPoint, Sizes } from './types';

export const REM = 16;
export const MIN_CLICKABLE_SIZE = 3 * REM; // 44 x 44 is minimum clickable size

export const getPointValues = ({
	point,
	defaultValue,
}: {
	point: PixiPoint;
	defaultValue: number;
}) => {
	const finalDefaultValue = defaultValue === undefined ? 0 : defaultValue;
	if (typeof point === 'number') return [point, point];
	return [point?.x || finalDefaultValue, point?.y || finalDefaultValue];
};

export const anchorToPivot = ({ anchor, sizes }: { anchor: PixiPoint; sizes: Sizes }) => {
	const { width, height } = sizes;
	const [anchorX, anchorY] = getPointValues({ point: anchor, defaultValue: 0 });
	return { x: width * anchorX, y: height * anchorY };
};

/**
 * Detects if WebGL is enabled.
 * Inspired from http://www.browserleaks.com/webgl#howto-detect-webgl
 *
 * @return { number } -1 for not Supported,
 *										0 for disabled
 *										1 for enabled
 */
export function detectWebGL() {
	// Check for the WebGL rendering context
	if (window && !!window.WebGLRenderingContext) {
		let canvas = document.createElement('canvas'),
			names = ['webgl', 'experimental-webgl', 'moz-webgl', 'webkit-3d'],
			context = false;

		for (const i in names) {
			try {
				// @ts-ignore
				context = canvas.getContext(names[i]);
				// @ts-ignore
				if (context && typeof context.getParameter === 'function') {
					// WebGL is enabled.
					return 1;
				}
			} catch (e) {}
		}

		// WebGL is supported, but disabled.
		return 0;
	}

	// WebGL not supported.
	return -1;
}

// props that change what a target measures (a sprite's texture, a text's text or style): when one
// changes, its size props are set again after it, so it keeps the size it was given
const RESIZING_PROPS = ['texture', 'textures', 'text', 'style'];
const SIZE_PROPS = ['width', 'height'];

export function propsSyncEffect<TProps extends object, TTarget>({
	props,
	target,
	ignore,
}: {
	props: TProps;
	target?: TTarget | (() => TTarget);
	ignore?: (keyof TProps)[];
}) {
	// Each prop is set on the target by an effect of its own, which runs again only when that prop
	// changes: one prop changing every frame (a tweened position, say) sets just that one, not every
	// prop of the component again. Which props there are is read once, as the component starts:
	// listing the keys of props passed on with a spread (`{...rest}`, as Sprite does) reads every
	// prop's value through Svelte's proxies, so following the list would list them all again each
	// time any prop changes (every frame a tweened one moves). The props given at a call site stay
	// the same; one that only appears later in a spread object is not set.
	$effect(() => {
		const keys = untrack(() => Object.keys(props) as (keyof TProps)[]).filter((key) =>
			ignore ? !ignore.includes(key) : true,
		);
		const sizeKeys = keys.filter((key) => SIZE_PROPS.includes(key as string));
		for (const key of keys) {
			$effect(() => {
				const value = props[key];
				const targetInstance = target instanceof Function ? target() : target;
				if (!targetInstance || value === undefined) return;
				// @ts-ignore
				targetInstance[key] = value;
				if (!RESIZING_PROPS.includes(key as string)) return;
				untrack(() => {
					for (const sizeKey of sizeKeys) {
						// @ts-ignore
						if (props[sizeKey] !== undefined) targetInstance[sizeKey] = props[sizeKey];
					}
				});
			});
		}
	});
}
