import { FillGradient } from 'pixi.js';

// The chunky cartoon text used for numbers on the board (win amounts, big wild multipliers):
// Titan One (loaded in assets.ts) with a top-to-bottom colour fade and a thick dark outline.
// Titan One only comes in one weight, which is already bold.
export const createBoardTextStyle = ({
	fontSize,
	top,
	bottom,
	outline,
}: {
	fontSize: number;
	top: number;
	bottom: number;
	outline: number;
}) =>
	({
		fontFamily: 'Titan One',
		fontSize,
		fill: new FillGradient({
			type: 'linear',
			start: { x: 0, y: 0 },
			end: { x: 0, y: 1 },
			textureSpace: 'local',
			colorStops: [
				{ offset: 0, color: top },
				{ offset: 1, color: bottom },
			],
		}),
		stroke: { color: outline, width: fontSize * 0.12, join: 'round' },
	}) as const;

// Titan One characters are about 0.67 of the font size wide, plus the outline: shrinks the font
// size of long text so it fits in maxWidth
export const fitBoardFontSize = ({
	text,
	fontSize,
	maxWidth,
}: {
	text: string;
	fontSize: number;
	maxWidth: number;
}) => Math.min(fontSize, maxWidth / (text.length * 0.67 + 0.12));
