import { CanvasTextMetrics, TextStyle, type TextStyleOptions } from 'pixi.js';

// The width a Text with this style would have, to fit text to a space before it is drawn (e.g. to
// shrink a long amount). For packages that use pixi through this one.
export const measureTextWidth = (text: string, style: TextStyleOptions) =>
	CanvasTextMetrics.measureText(text, new TextStyle(style)).width;

export type { TextStyleOptions };
