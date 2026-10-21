import _ from 'lodash';
import { Tween } from 'svelte/motion';
import { sineOut, backIn, linear } from 'svelte/easing';

import { stateBet } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';
import { createInterruptible } from 'utils-shared/interruptible';

import type { SpinningReelCreateOptions, SpinningReelSpinOptions, SpinType } from './types';

export type SpinningReelMotion = 'spinning' | 'bouncing' | 'stopped';
export type SpinningReelSymbolState = 'static' | 'land' | 'spin';

export function createReelForSpinning<TRawSymbol extends object, TSymbolState extends string>(
	reelOptions: SpinningReelCreateOptions<TRawSymbol, TSymbolState>,
) {
	// reelSymbols
	const createReelSymbol = (reelSymbolOptions: { rawSymbol: TRawSymbol; symbolIndex: number }) => {
		const rawSymbol = reelSymbolOptions.rawSymbol;
		const symbolIndex = reelSymbolOptions.symbolIndex;
		const symbolState = reelOptions.initialSymbolState;
		const symbolY = () => reelY.current + (reelSymbol.symbolIndex + 0.5) * reelOptions.symbolHeight;
		const oncomplete = () => {};

		const reelSymbol = $state({
			id: {},
			rawSymbol,
			symbolIndex,
			symbolState,
			symbolY,
			oncomplete,
		});

		return reelSymbol;
	};

	type ReelSymbol = ReturnType<typeof createReelSymbol>;

	const createReelSymbols: (value: TRawSymbol[]) => ReelSymbol[] = (rawSymbols) => {
		const reelSymbols = rawSymbols.map((rawSymbol, symbolIndex) =>
			createReelSymbol({ rawSymbol, symbolIndex }),
		);

		return reelSymbols;
	};

	const updateAllReelSymbolState = (value: SpinningReelSymbolState) => {
		reelState.symbols.forEach((reelSymbol, symbolIndex) => {
			reelSymbol.symbolState = value as TSymbolState;
			if (value === 'land') {
				reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol, symbolIndex });
			}
		});
	};

	// constants
	const defaultY = -reelOptions.symbolHeight;
	const reelLength = reelOptions.initialSymbols.length;

	// interruptible
	const interruptible = createInterruptible();
	// the reels from the first anticipated one on (noStop) ignore stop, so skip interrupts them on its own
	const skipInterruptible = createInterruptible();

	// reactive states
	const reelY = new Tween(defaultY);
	const reelState = $state({
		symbols: createReelSymbols(reelOptions.initialSymbols),
		motion: 'stopped' as SpinningReelMotion,
		spinType: 'normal' as SpinType,
		anticipating: false,
		readyToSpin: () => {},
		spinOptions: () => ({}) as SpinningReelSpinOptions,
	});
	const basePaddingSize = () => reelLength * reelState.spinOptions().reelPaddingMultiplierNormal;
	const anticipatedPaddingSize = () =>
		reelLength * reelState.spinOptions().reelPaddingMultiplierAnticipated;

	// internal states
	let isPreSpinning = false;
	let targetPaddingPosition = reelLength - 1;
	let prevSymbols: ReelSymbol[] = createReelSymbols(reelOptions.initialSymbols);
	let targetSymbols: ReelSymbol[] = createReelSymbols(reelOptions.initialSymbols);
	let paddingRawReel: TRawSymbol[] = reelOptions.initialSymbols;
	let onSpinFinishing: () => void = () => {};
	let noStop = false;
	// set by skip during a spin, until the spin ends
	let skipRequested = false;
	let paddingSize = 0;

	const getPaddingRawSymbol = ({
		paddingRawReel,
		index,
	}: {
		paddingRawReel: TRawSymbol[];
		index: number;
	}) => {
		const length = paddingRawReel.length;
		if (index >= length) return paddingRawReel[index % length];
		if (index <= -1) return paddingRawReel[length + index];
		return paddingRawReel[index];
	};

	const getPaddingRawSymbols = ({
		paddingRawReel,
		start,
		length,
	}: {
		paddingRawReel: TRawSymbol[];
		start: number;
		length: number;
	}) =>
		_.range(length).map((index) => {
			const targetIndex = start + index;
			return getPaddingRawSymbol({ paddingRawReel, index: targetIndex });
		});

	const addPadding = async (paddingSizeValue: number) => {
		const paddingRawSymbols = getPaddingRawSymbols({
			paddingRawReel,
			start: targetPaddingPosition,
			length: paddingSizeValue,
		});
		const paddingSymbols = createReelSymbols(paddingRawSymbols);
		const symbolsForSpin: ReelSymbol[] = [...targetSymbols, ...paddingSymbols, ...prevSymbols];
		symbolsForSpin.forEach((symbol, newSymbolIndex) => (symbol.symbolIndex = newSymbolIndex));
		reelState.symbols = [...symbolsForSpin];

		const topY =
			defaultY -
			symbolsForSpin.length * reelOptions.symbolHeight +
			reelLength * reelOptions.symbolHeight;
		return topY;
	};

	const slideY = async ({
		reelY: targetY,
		speed,
		easing = undefined,
	}: {
		reelY: number;
		speed: number;
		easing?: (value: number) => number;
	}) => {
		const currentY = reelY.current;
		const distance = Math.abs(targetY - currentY);
		const duration = distance / speed; // (speed unit: pixel / ms)

		await reelY.set(targetY, { duration, easing });
	};

	// slides to targetY slowing evenly from one speed to the other (pixel / ms)
	const slideYSlowingDown = async ({
		reelY: targetY,
		fromSpeed,
		toSpeed,
	}: {
		reelY: number;
		fromSpeed: number;
		toSpeed: number;
	}) => {
		const distance = Math.abs(targetY - reelY.current);
		const duration = (2 * distance) / (fromSpeed + toSpeed);
		// the part of the distance covered by time t (0 to 1), as the speed falls in a straight line
		const easing = (t: number) =>
			(2 * (fromSpeed * t - ((fromSpeed - toSpeed) * t * t) / 2)) / (fromSpeed + toSpeed);

		await reelY.set(targetY, { duration, easing });
	};

	// Slides to targetY starting from rest, as reelStart has it: lifted a little against the way it
	// goes and settled, then speeding up smoothly to speed, then keeping it. The easing is where
	// along the way the reel is at each moment (below 0 while lifted).
	const slideYFromRest = async ({ reelY: targetY, speed }: { reelY: number; speed: number }) => {
		const reelStart = reelState.spinOptions().reelStart;
		const distance = Math.abs(targetY - reelY.current);
		if (!reelStart || distance === 0) return slideY({ reelY: targetY, speed });
		const lift = reelStart.lift * reelOptions.symbolHeight;
		const liftDuration = lift > 0 ? reelStart.liftDuration : 0;
		// a short way: it speeds up for as long as the way allows
		const accelerate = Math.min(reelStart.accelerateDuration, (2 * (distance + lift)) / speed);
		const cruise = (distance + lift) / speed - accelerate / 2;
		const duration = liftDuration + accelerate + cruise;
		const at = (time: number) => {
			if (time < liftDuration) return (-lift / 2) * (1 - Math.cos((Math.PI * time) / liftDuration));
			const u = accelerate > 0 ? Math.min(time - liftDuration, accelerate) / accelerate : 1;
			// the speed rises as sin² from 0 to speed, so it neither jerks into nor out of it
			const ramped = speed * accelerate * (u / 2 - Math.sin(Math.PI * u) / (2 * Math.PI));
			return -lift + ramped + speed * Math.max(0, time - liftDuration - accelerate);
		};

		await reelY.set(targetY, { duration, easing: (t) => at(t * duration) / distance });
	};

	// The first stretch of a spin that starts from rest speeds up (see slideYFromRest) rather than
	// starting at full speed; a reel already going (pre-spinning) keeps its speed.
	let fromRest = false;
	const slideYAtSpeed = async (options: { reelY: number; speed: number }) => {
		if (!fromRest) return slideY(options);
		fromRest = false;
		await slideYFromRest(options);
	};

	const placeY = (targetY: number) => reelY.set(targetY, { duration: 0 });

	const removePaddingAndBounceBack = async () => {
		reelState.symbols = [...targetSymbols];
		placeY(defaultY + reelOptions.symbolHeight * reelState.spinOptions().reelBounceSizeMulti);
		await slideY({
			reelY: defaultY,
			speed: reelState.spinOptions().reelBounceBackSpeed,
			easing: sineOut,
		});
		setSymbolsWithReelSymbols(targetSymbols);
	};

	const preSpinPadding = async ({
		preSpinPaddingRawReel,
	}: {
		preSpinPaddingRawReel: TRawSymbol[];
	}) => {
		const randomStart = Math.floor(Math.random() * preSpinPaddingRawReel.length);
		prevSymbols = targetSymbols;
		const targetRawSymbols = getPaddingRawSymbols({
			paddingRawReel: preSpinPaddingRawReel,
			start: randomStart,
			length: reelLength,
		});
		targetSymbols = createReelSymbols(targetRawSymbols);
		const topY = await addPadding(0);
		await placeY(topY);
	};

	const preSpinSlideDownLoop = async ({
		isTurboBeforeAll,
		preSpinPaddingRawReel,
	}: {
		isTurboBeforeAll: boolean;
		preSpinPaddingRawReel: TRawSymbol[];
	}) => {
		let started = false;
		while (isPreSpinning) {
			if (!started && reelState.spinOptions().reelStart) {
				// winds up to the speed of the laps after it, so it goes on into them smoothly
				await slideYFromRest({ reelY: defaultY, speed: reelState.spinOptions().reelSpinSpeed });
			} else {
				const speed = started
					? reelState.spinOptions().reelSpinSpeed
					: reelState.spinOptions().reelPreSpinSpeed;
				const easing = started || isTurboBeforeAll ? linear : backIn;
				await slideY({ reelY: defaultY, speed, easing });
			}
			await preSpinPadding({ preSpinPaddingRawReel });
			if (!started) {
				reelState.motion = 'spinning';
				updateAllReelSymbolState('spin');
				started = true;
			}
		}
	};

	const delaySpinByReelIndex = async () => {
		await waitForTimeout(reelState.spinOptions().reelSpinDelay * reelOptions.reelIndex);
	};

	const preSpin = async ({
		isTurboBeforeAll,
		preSpinPaddingReel,
	}: {
		isTurboBeforeAll: boolean; // To avoid previous spinType has effect on "getSpinOption" in "preSpinSlideDownLoop"
		preSpinPaddingReel: TRawSymbol[];
	}) => {
		const preSpinPaddingRawReel = preSpinPaddingReel;

		isPreSpinning = true;
		skipRequested = false;
		reelState.spinType = isTurboBeforeAll ? 'fast' : 'normal';
		await preSpinPadding({ preSpinPaddingRawReel });
		if (!isTurboBeforeAll) await delaySpinByReelIndex();
		preSpinSlideDownLoop({ isTurboBeforeAll, preSpinPaddingRawReel });
	};

	const generalSpinWith = async ({ slideDown }: { slideDown: () => Promise<void> }) => {
		const isSpinning = reelState.motion === 'spinning';

		const topY = await addPadding(paddingSize);
		await placeY(topY);

		if (!isSpinning) {
			reelState.motion = 'spinning';
			updateAllReelSymbolState('spin');
		}

		// Q: When to skip the slideDown?
		// A: When skip was called, or when it's preSpinning(isSpinning) and stop button is clicked(isTurbo)
		// and is noStop is false. Only skip cuts the noStop reels (e.g. the anticipated ones) short.
		if (skipRequested) {
			// skip
		} else if (noStop) {
			await skipInterruptible.add(slideDown);
		} else if (stateBet.isTurbo && isSpinning) {
			// skip
		} else {
			await interruptible.add(slideDown);
		}

		reelState.motion = 'bouncing';
		onSpinFinishing();
		await removePaddingAndBounceBack();
		reelState.motion = 'stopped';
		updateAllReelSymbolState('land');
	};

	const fastSpin = () =>
		generalSpinWith({
			slideDown: async () => {
				const bounceSize = reelOptions.symbolHeight * reelState.spinOptions().reelBounceSizeMulti;

				await slideYAtSpeed({
					reelY: defaultY + bounceSize,
					speed: reelState.spinOptions().reelSpinSpeed,
				});
			},
		});

	const normalSpin = () =>
		generalSpinWith({
			slideDown: async () => {
				const bounceSize = reelOptions.symbolHeight * reelState.spinOptions().reelBounceSizeMulti;

				await slideYAtSpeed({
					reelY: defaultY * basePaddingSize(),
					speed: reelState.spinOptions().reelSpinSpeed,
				});
				await slideY({
					reelY: defaultY + bounceSize,
					speed: reelState.spinOptions().reelSpinSpeedBeforeBounce,
				});
			},
		});

	const anticipatedSpin = () =>
		generalSpinWith({
			slideDown: async () => {
				const spinOptions = reelState.spinOptions();
				const bounceSize = reelOptions.symbolHeight * spinOptions.reelBounceSizeMulti;
				const slowdown = stateBet.isTurbo ? undefined : spinOptions.reelAnticipatedSlowdown;

				if (slowdown) {
					// full speed until a few symbols before the stop, then it brakes to a crawl and creeps
					// the last symbols in
					const stopY = defaultY + bounceSize;
					const crawlY = stopY - slowdown.crawlSymbols * reelOptions.symbolHeight;
					const brakeY = crawlY - slowdown.brakeSymbols * reelOptions.symbolHeight;
					if (reelY.current < brakeY) {
						await slideYAtSpeed({ reelY: brakeY, speed: spinOptions.reelSpinSpeed });
					}
					await slideYSlowingDown({
						reelY: crawlY,
						fromSpeed: spinOptions.reelSpinSpeed,
						toSpeed: slowdown.crawlSpeed,
					});
					await slideYSlowingDown({
						reelY: stopY,
						fromSpeed: slowdown.crawlSpeed,
						toSpeed: slowdown.endSpeed,
					});
					return;
				}

				await slideYAtSpeed({
					reelY: defaultY * basePaddingSize(),
					speed: reelState.spinOptions().reelSpinSpeed,
				});
				await slideY({
					reelY: defaultY + bounceSize,
					speed: reelState.spinOptions().reelSpinSpeedBeforeBounce,
				});
			},
		});

	const SPIN_MAP = {
		fast: fastSpin,
		normal: normalSpin,
		anticipated: anticipatedSpin,
	};

	const prepareToSpin = (prepareToSpinOptions: {
		noStop: boolean;
		spinType: SpinType;
		symbols: TRawSymbol[];
		paddingPosition: number;
		paddingReel: TRawSymbol[];
		onSpinFinishing: () => void;
		previousPaddingSize: number;
	}) => {
		reelState.spinType = prepareToSpinOptions.spinType;

		noStop = prepareToSpinOptions.noStop;
		prevSymbols = targetSymbols;
		targetPaddingPosition = prepareToSpinOptions.paddingPosition;
		targetSymbols = createReelSymbols(prepareToSpinOptions.symbols);
		paddingRawReel = prepareToSpinOptions.paddingReel;
		onSpinFinishing = prepareToSpinOptions.onSpinFinishing;

		const GET_PADDING_SIZE_MAP = {
			fast: prepareToSpinOptions.previousPaddingSize + 0,
			normal: prepareToSpinOptions.previousPaddingSize + basePaddingSize(),
			anticipated: prepareToSpinOptions.previousPaddingSize + anticipatedPaddingSize(),
		};

		paddingSize = GET_PADDING_SIZE_MAP[prepareToSpinOptions.spinType];

		return paddingSize;
	};

	const spin = async () => {
		// neither pre-spinning nor moving: it starts from rest
		fromRest = !isPreSpinning && reelState.motion === 'stopped';
		isPreSpinning = false;

		await SPIN_MAP[reelState.spinType]();

		fromRest = false;
		interruptible.clear();
		skipInterruptible.clear();
		skipRequested = false;
	};

	const setSymbolsWithReelSymbols = (reelSymbols?: ReelSymbol[]) => {
		reelState.motion = 'stopped';
		placeY(defaultY);
		if (reelSymbols) {
			prevSymbols = [...reelSymbols];
			targetSymbols = [...reelSymbols];
			paddingRawReel = reelOptions.initialSymbols;
			reelState.symbols = [...reelSymbols];
		}
	};

	const setSymbolsWithRawSymbols = (rawSymbols?: TRawSymbol[]) => {
		const newSymbols = rawSymbols ? createReelSymbols(rawSymbols) : undefined;
		setSymbolsWithReelSymbols(newSymbols);
	};

	const stop = () => {
		interruptible.interrupt();
	};

	// Like stop, but it also cuts short the reels stop leaves alone (from the first anticipated reel
	// on), and a reel that hasn't started sliding down yet stops as soon as it would.
	const skip = () => {
		if (isPreSpinning || reelState.motion !== 'stopped') skipRequested = true;
		interruptible.interrupt();
		skipInterruptible.interrupt();
	};

	const readyToSpinEffect = () => {
		$effect(() => {
			if (reelY.current === defaultY) {
				reelState.readyToSpin();
			}
		});
	};

	return {
		// from options
		reelIndex: reelOptions.reelIndex,
		symbolHeight: reelOptions.symbolHeight,
		onReelStopping: reelOptions.onReelStopping,
		reelLength,
		// reactive states
		reelState,
		// where the reel is (pixel), e.g. to tell how fast it moves; it jumps back as it moves its
		// symbols round for each lap
		position: () => reelY.current,
		// methods
		preSpin,
		prepareToSpin,
		spin,
		stop,
		skip,
		setSymbolsWithRawSymbols,
		readyToSpinEffect,
	};
}
