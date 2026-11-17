// Where the crystal bat hovering right of the board is (Bat; in the main layout's units: the middle of
// its loop's box, and its scale), so the free spins screens' bat (BatSign) can take off from there and
// come back to it. `away` while that one is out: Bat hides its own meanwhile.
export const stateBatPerch = $state({ shown: false, x: 0, y: 0, scale: 1, away: false });

// Where the bat's feet are (BatSpine, each frame), in the units of its skeleton's parent: between them
// (x, y), and each foot (the tip of its leg's bone: left the one further left as drawn)
export type BatFeet = {
	x: number;
	y: number;
	left: { x: number; y: number };
	right: { x: number; y: number };
};
