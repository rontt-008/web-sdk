// Generates every sound of Crystal Hollows from code (no recordings or samples): new ones under the
// names the sample game had, which the game's code plays, and the game's own (the bats, the tall
// wild, the win lines).
//
//   node scripts/generate-sounds.mjs                  (run from apps/crystal-hollows; pnpm sounds)
//   node scripts/generate-sounds.mjs --preview <dir>  (also writes each sound as <dir>/<name>.wav)
//   node scripts/generate-sounds.mjs --dry ...        (only renders: no sprite written)
//   node scripts/generate-sounds.mjs --only <text>    (renders only the names holding <text>)
//
// Writes static/assets/audio/sounds.{ogg,m4a} + sounds.json (Ogg for most browsers, M4A for Safari).
// ffmpeg isn't installed, so the encoding is done by Blender's own FFmpeg (scripts/sound-io.py;
// BLENDER=<path to blender.exe> if it isn't the Steam one). Each sound is seeded by its name, so
// changing one recipe leaves the others as they were. (The sample's own audio is in git history.)
//
// The game is a dark, blue crystal cave by an underground lake, with bats. There is no music (the
// user, 2026-11-17: "for the music i dont want any just ominous sounds you can hear in a cave like
// wind and water drops"): the "music" loops are the cave itself. Air moving through its tunnels, a
// crevice moaning, the deep rumble of the rock, the lake lapping, drops falling into it and echoing
// off the walls, now and then a stone settling far off or a bat. The bonus's cave is darker and
// more restless; the big wins wake its crystals, which hum.
// The effects are its stone, water, crystal and bats: the symbols land as stone blocks, the wins are
// a drop into the lake and the crystals answering, the free spins rocks land heavily with a crystal
// ringing a step higher each time. Their few notes keep to D minor (D F G A C), the big moments
// resolving to D major. Everything is soft and dark: no hard attacks, nothing shrill (the user's other
// games: little above 3 kHz, no crystal or bell above D6), no fast rattles in the frequent sounds.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------------------------
// basics

const len = (sec) => Math.max(1, Math.round(sec * SR));
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const smooth = (e0, e1, x) => {
	const t = clamp((x - e0) / (e1 - e0), 0, 1);
	return t * t * (3 - 2 * t);
};
// exponential envelope that is -60 dB after `d` seconds
const ex = (t, d) => Math.exp((-6.9 * t) / d);
const release = (t, hold, rel) => (t > hold ? Math.max(0, 1 - (t - hold) / rel) : 1);

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const n = (name) => {
	const [, letter, accidental, octave] = /^([A-G])([#b]?)(-?\d)$/.exec(name);
	return (
		PITCH_CLASS[letter] +
		(accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) +
		(Number(octave) + 1) * 12
	);
};
const notes = (names) => names.split(' ').map(n);

let rand = Math.random;
const seed = (value) => {
	let s = value | 0;
	rand = () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};
const rr = (a, b) => a + (b - a) * rand();
const pick = (list) => list[Math.floor(rand() * list.length)];
const hash = (text) =>
	[...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

// ---------------------------------------------------------------------------------------------
// mono buffers (Float32Array)

const noise = (dur) => {
	const out = new Float32Array(len(dur));
	for (let i = 0; i < out.length; i++) out[i] = rand() * 2 - 1;
	return out;
};
const env = (buf, fn) => {
	for (let i = 0; i < buf.length; i++) buf[i] *= fn(i / SR);
	return buf;
};
const norm = (buf, peak = 1) => {
	let max = 0;
	for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
	if (max > 0) for (let i = 0; i < buf.length; i++) buf[i] *= peak / max;
	return buf;
};
const mixIn = (dst, src, t = 0, g = 1) => {
	const o = Math.round(t * SR);
	for (let i = 0; i < src.length && o + i < dst.length; i++) dst[o + i] += src[i] * g;
	return dst;
};
const fadeEnd = (buf, sec = 0.01) => {
	const k = Math.min(buf.length, len(sec));
	for (let i = 0; i < k; i++) buf[buf.length - 1 - i] *= i / k;
	return buf;
};

class Biquad {
	constructor(type, f, q = 0.707) {
		this.x1 = this.x2 = this.y1 = this.y2 = 0;
		this.set(type, f, q);
	}
	set(type, f, q = 0.707) {
		const w = (TAU * clamp(f, 10, SR * 0.45)) / SR;
		const cs = Math.cos(w);
		const alpha = Math.sin(w) / (2 * q);
		let b0, b1, b2;
		if (type === 'lp') [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
		else if (type === 'hp') [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
		else [b0, b1, b2] = [alpha, 0, -alpha]; // band-pass, 0 dB peak
		const a0 = 1 + alpha;
		this.b0 = b0 / a0;
		this.b1 = b1 / a0;
		this.b2 = b2 / a0;
		this.a1 = (-2 * cs) / a0;
		this.a2 = (1 - alpha) / a0;
	}
	tick(x) {
		const y =
			this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
		this.x2 = this.x1;
		this.x1 = x;
		this.y2 = this.y1;
		this.y1 = y;
		return y;
	}
}

// filters in place; f may be a function of time
const filter = (buf, type, f, q = 0.707) => {
	const moving = typeof f === 'function';
	const bq = new Biquad(type, moving ? f(0) : f, q);
	for (let i = 0; i < buf.length; i++) {
		if (moving && (i & 31) === 0) bq.set(type, f(i / SR), q);
		buf[i] = bq.tick(buf[i]);
	}
	return buf;
};

// sine whose pitch falls from f0 towards f1 (time constant tau), -60 dB after `decay`
const sweep = (decay, f0, f1, tau) => {
	const out = new Float32Array(len(decay));
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = Math.sin(TAU * ph) * ex(t, decay) * Math.min(1, t / 0.002);
		ph += (f1 + (f0 - f1) * Math.exp(-t / tau)) / SR;
	}
	return out;
};

// additive voice: parts = [[ratio, gain, decaySeconds]]; `tremolo` (0-1) at `tremRate` Hz
function partials(freq, dur, parts, { attack = 0.001, hold = Infinity, rel = 0.05, tremolo = 0, tremRate = 5 } = {}) {
	const out = new Float32Array(len(dur));
	for (const [ratio, g, d] of parts) {
		const f = freq * ratio;
		if (f > SR * 0.45) continue;
		const w = (TAU * f) / SR;
		const k = Math.exp(-6.9 / (d * SR));
		let a = g;
		for (let i = 0; i < out.length; i++) {
			out[i] += Math.sin(w * i) * a;
			a *= k;
		}
	}
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] *= Math.min(1, t / attack) * release(t, hold, rel);
		if (tremolo) out[i] *= 1 - tremolo * (0.5 + 0.5 * Math.sin(TAU * tremRate * t));
	}
	return fadeEnd(out, 0.005);
}

// a bank of damped resonators (modes: [[freq, gain, seconds to -60 dB]]) rung by `input`: how a
// struck solid sounds, each mode ringing at its own pitch and dying at its own rate
function resonate(input, modes) {
	const out = new Float32Array(input.length);
	for (const [f, g, d] of modes) {
		if (f > SR * 0.45) continue;
		const w = (TAU * f) / SR;
		const r = Math.exp(-6.9 / (d * SR));
		const c = 2 * r * Math.cos(w);
		const r2 = r * r;
		const s = Math.sin(w) * g;
		let y1 = 0;
		let y2 = 0;
		for (let i = 0; i < input.length; i++) {
			const y = c * y1 - r2 * y2 + input[i] * s;
			y2 = y1;
			y1 = y;
			out[i] += y;
		}
	}
	return out;
}

const polyblep = (t, dt) => {
	if (t < dt) {
		t /= dt;
		return t + t - t * t - 1;
	}
	if (t > 1 - dt) {
		t = (t - 1) / dt;
		return t * t + t + t + 1;
	}
	return 0;
};
const saw = (ph, dt) => 2 * ph - 1 - polyblep(ph, dt);

// band-passed noise gliding from f0 to f1, swelling up to `peakAt` (0..1 of dur) then fading
function whoosh(dur, f0, f1, { q = 1, peakAt = 0.5 } = {}) {
	const out = filter(noise(dur), 'bp', (t) => f0 * Math.pow(f1 / f0, t / dur), q);
	filter(out, 'lp', Math.max(f0, f1) * 1.8);
	return norm(
		env(out, (t) => {
			const u = t / dur;
			return u < peakAt ? smooth(0, peakAt, u) : 1 - smooth(peakAt, 1, u);
		}),
	);
}

// ---------------------------------------------------------------------------------------------
// the cave's voices

// A drop falling into the pool: the tiny dark tick of its hit, then the "plink" of the air bubble it
// traps, its pitch rising quickly as the bubble closes. `second`: a smaller bubble just after it.
function drip(f0, { rise = rr(1.45, 1.85), decay = rr(0.05, 0.09), tick = 0.12, second = 0 } = {}) {
	const dur = decay * 1.4 + 0.08;
	const out = new Float32Array(len(dur));
	const tau = rr(0.008, 0.015);
	const plink = (fa, at, g, dec) => {
		const o = len(at);
		let ph = 0;
		for (let i = 0; o + i < out.length; i++) {
			const t = i / SR;
			const f = Math.min(2600, fa * (1 + (rise - 1) * (1 - Math.exp(-t / tau))));
			out[o + i] += Math.sin(TAU * ph) * g * Math.min(1, t / 0.0012) * ex(t, dec);
			ph += f / SR;
		}
	};
	plink(f0, 0.002, 1, decay);
	if (second) plink(f0 * rr(1.25, 1.6), rr(0.018, 0.04), second, decay * 0.6);
	mixIn(out, filter(env(noise(0.006), (t) => ex(t, 0.003)), 'lp', 2200), 0, tick);
	return fadeEnd(out, 0.005);
}

// a pebble: a little stone's dull tick
const pebble = (pitch = 1) => {
	const hit = new Float32Array(len(0.08));
	mixIn(hit, filter(env(noise(0.004), (t) => ex(t, 0.002)), 'lp', 3000), 0);
	const modes = [
		[640, 0.5, 0.03],
		[950, 1, 0.025],
		[1480, 0.6, 0.018],
		[2150, 0.3, 0.012],
	].map(([f, g, d]) => [f * pitch * rr(0.92, 1.08), g, d]);
	return norm(filter(resonate(hit, modes), 'lp', 3200));
};

// A block of stone meeting stone: a short dark burst at the touch, many damped modes close together
// in the body (so it knocks, solid, and never rings a note: the user hears a ringing knock as
// "hollow"), the thump of its weight under them and a little grit of its surface. pitch: its size
// (lower is bigger); weight: the thump; ring: how long the body sounds.
function stone({ pitch = 1, weight = 1, ring = 1, grit = 0.2, dur = 0.5 } = {}) {
	const N = len(dur);
	const hit = new Float32Array(N);
	mixIn(hit, filter(env(noise(0.012), (t) => ex(t, 0.005 + 0.003 * weight)), 'lp', 2400 * pitch), 0);
	const modes = [];
	for (let k = 0; k < 18; k++) {
		const f = 150 * pitch * Math.pow(1.17, k) * rr(0.93, 1.07);
		modes.push([f, Math.pow(0.86, k) * rr(0.7, 1.15), rr(0.025, 0.06) * ring * (1 - k / 30)]);
	}
	const out = new Float32Array(N);
	mixIn(out, norm(resonate(hit, modes)), 0, 0.8);
	const mass = filter(filter(noise(0.15), 'lp', 650 * pitch), 'hp', 90);
	mixIn(out, norm(env(mass, (t) => smooth(0, 0.002, t) * ex(t, 0.06))), 0, 0.55);
	mixIn(out, norm(sweep(0.12 + 0.08 * weight, 135 * pitch, 58 * pitch, 0.02)), 0, 0.5 * weight);
	if (grit) mixIn(out, norm(filter(env(noise(0.06), (t) => ex(t, 0.035)), 'bp', 1600 * pitch, 0.8)), 0.002, grit);
	filter(out, 'lp', 3400);
	return fadeEnd(norm(out), 0.02);
}

// a deep boom in the rock, falling from f0 towards f1, a rumble round it
const boom = (f0 = 70, f1 = 34, decay = 1.2) => {
	const out = sweep(decay, f0, f1, 0.07);
	const rum = filter(filter(noise(decay), 'lp', 140), 'lp', 140);
	mixIn(out, norm(env(rum, (t) => smooth(0, 0.02, t) * ex(t, decay * 0.7))), 0, 0.5);
	return norm(out);
};

// the rock rumbling, swelling up to `peak` seconds and dying away over `dur`
const rumbleShot = (dur, peak = 0.4, cutoff = 110) =>
	norm(
		env(filter(filter(filter(noise(dur), 'lp', cutoff), 'lp', cutoff), 'hp', 25), (t) =>
			t < peak ? smooth(0, peak, t) : 1 - smooth(peak, dur, t),
		),
	);

// stone sliding on stone: a heavy, smooth slide with the stone's unevenness in it as slow, irregular
// swells (not a rattle: the user disliked a fast "krrrr"); the caller shapes it
function grind(dur, { f = 380, rough = 0.35, low = 0.6 } = {}) {
	const src = filter(filter(noise(dur), 'bp', f, 0.9), 'lp', f * 2.4);
	const wob = norm(filter(noise(dur), 'lp', 14));
	for (let i = 0; i < src.length; i++) src[i] *= 1 - rough + rough * Math.abs(wob[i]);
	norm(src);
	mixIn(src, norm(filter(filter(noise(dur), 'lp', 110), 'lp', 110)), 0, low);
	return norm(src);
}

// breath through teeth
const hiss = (dur, f = 1500) => norm(filter(filter(noise(dur), 'bp', f, 0.9), 'lp', 3000));

// A bat's wing: a soft leathery "fwup" of air and the push of it under that. hard (0-1): a quicker,
// harder stroke.
function flap(f = 520, { dur = 0.11, push = 0.6, hard = 0 } = {}) {
	const atk = 0.022 - 0.012 * hard;
	const shape = (t) => smooth(0, atk, t) * ex(Math.max(0, t - atk), dur * 0.7);
	const air = norm(env(filter(filter(noise(dur), 'bp', f, 0.8), 'lp', 1900), shape));
	const low = env(filter(filter(noise(dur), 'lp', 170), 'lp', 170), shape);
	mixIn(air, norm(low), 0, push);
	return fadeEnd(norm(air), 0.005);
}

// A bat flying by: `beats` wingbeats at `rate` a second, each a little different, from pan `from` to
// `to`, loudest in the middle of its flight (by `arc`); `top`: low-passed, for one far away.
function flutter(mx, t0, { beats = 8, rate = 9, from = -0.5, to = 0.5, gain = 0.5, f = 560, send = 0.4, arc = 0.6, top } = {}) {
	for (let k = 0; k < beats; k++) {
		const p = beats > 1 ? k / (beats - 1) : 0.5;
		const near = 1 - arc + arc * Math.sin(Math.PI * p);
		const w = flap(f * rr(0.88, 1.12), { dur: rr(0.09, 0.12), push: 0.5 });
		if (top) filter(w, 'lp', top);
		mx.add(w, t0 + k / rate + rr(-0.008, 0.008), { gain: gain * near * rr(0.8, 1), pan: from + (to - from) * p, send });
	}
}

// A bat's cry, kept in the middle (not the squeak of a real bat, which would be shrill): a rough,
// buzzing voice gliding down from f0 to f1 through the formants of an open mouth, a hiss of breath in it.
function shriek(dur, { f0 = 980, f1 = 620, rough = 0.5, hiss: breath = 0.35, attack = 0.02 } = {}) {
	const N = len(dur);
	const src = new Float32Array(N);
	const jit = norm(filter(noise(dur), 'lp', 30));
	let ph = 0;
	for (let i = 0; i < N; i++) {
		const t = i / SR;
		const f = (f0 + (f1 - f0) * smooth(0, 1, t / dur)) * (1 + 0.02 * Math.sin(TAU * 21 * t) + 0.03 * jit[i]);
		const dt = f / SR;
		src[i] = saw(ph, dt) * (1 - rough * (0.5 + 0.5 * Math.sin(TAU * 33 * t)));
		ph += dt;
		if (ph >= 1) ph -= 1;
	}
	const out = new Float32Array(N);
	for (const [fc, q, g] of [
		[700, 3, 0.6],
		[1250, 4, 1],
		[2200, 5, 0.4],
	])
		mixIn(out, filter(src.slice(), 'bp', fc, q), 0, g);
	norm(out);
	if (breath) mixIn(out, hiss(dur, 1700), 0, breath);
	env(out, (t) => smooth(0, attack, t) * (1 - smooth(0.55, 1, t / dur)));
	filter(out, 'lp', 3200);
	filter(out, 'lp', 3200);
	return fadeEnd(norm(out), 0.01);
}

// a snarl: a low, rough voice, its roughness at `rate` (fast and deep is a quiver of rage)
function growl(dur, { f = 85, rough = 0.6, rate = 27 } = {}) {
	const N = len(dur);
	const src = new Float32Array(N);
	const jit = norm(filter(noise(dur), 'lp', 20));
	let ph = 0;
	for (let i = 0; i < N; i++) {
		const t = i / SR;
		const dt = (f * (1 + 0.06 * jit[i])) / SR;
		src[i] = saw(ph, dt) * (1 - rough * (0.5 + 0.5 * Math.sin(TAU * rate * t + 2 * jit[i])));
		ph += dt;
		if (ph >= 1) ph -= 1;
	}
	const out = norm(filter(src.slice(), 'lp', 900));
	mixIn(out, norm(filter(src, 'bp', 420, 2)), 0, 0.6);
	mixIn(out, hiss(dur, 900), 0, 0.25);
	env(out, (t) => smooth(0, 0.03, t) * (1 - smooth(dur - 0.06, dur, t)));
	return norm(out);
}

// jaws snapping shut: one hard, short clack of teeth and a thump
const snap = () => {
	const hit = new Float32Array(len(0.12));
	mixIn(hit, filter(env(noise(0.005), (t) => ex(t, 0.0025)), 'lp', 3000), 0);
	const out = norm(resonate(hit, [[620, 1, 0.03], [980, 0.7, 0.025], [1500, 0.4, 0.018], [2300, 0.2, 0.012]]));
	mixIn(out, norm(sweep(0.08, 160, 80, 0.01)), 0, 0.5);
	return norm(out);
};

// A crystal struck softly: a glassy tone, its twin a breath sharp (the slow shimmer of their beat),
// and a few quiet, quicker upper partials. dur: how long it rings; bright (0-1): its upper partials.
const CRYSTAL = [
	[1, 1, 1],
	[1.0022, 0.45, 0.9],
	[2.32, 0.18, 0.3],
	[2.325, 0.1, 0.25],
	[4.25, 0.05, 0.14],
	[6.63, 0.015, 0.07],
];
function crystal(m, { dur = 1.6, soft = 0.004, bright = 1 } = {}) {
	const parts = CRYSTAL.map(([r, g, d]) => [r, r < 1.1 ? g : g * bright, d * dur]);
	return norm(filter(partials(mtof(m), dur * 1.1, parts, { attack: soft }), 'lp', 4200));
}

// a crystal singing: a pure tone swelling in, its twin `beat` Hz off (their slow beat), a faint
// octave, held and fading
function hum(m, hold, { attack = 0.4, rel = 1.2, beat = 0.35, tremolo = 0.12, tremRate = 0.7, upper = 0.08 } = {}) {
	const f = mtof(m);
	const parts = [
		[1, 1, 60],
		[1 + beat / f, 0.7, 60],
		[2, upper, 60],
		[3, upper * 0.3, 60],
	];
	return norm(partials(f, hold + rel, parts, { attack, hold, rel, tremolo, tremRate }));
}

// a low moan in the rock: wind through a crevice, gliding down from f0 to f1, swelling and fading
function groan(dur, { f0 = 125, f1 = 82, q = 5 } = {}) {
	const fn = (t) => f0 * Math.pow(f1 / f0, smooth(0, 1, t / dur));
	const out = norm(filter(filter(noise(dur), 'bp', fn, q), 'bp', fn, q));
	const second = norm(filter(filter(noise(dur), 'bp', (t) => 2 * fn(t), q), 'bp', (t) => 2 * fn(t), q));
	mixIn(out, second, 0, 0.35);
	return norm(env(out, (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t / dur)), 2)));
}

// ---------------------------------------------------------------------------------------------
// mixing: the cave

// stereo Freeverb (Schroeder/Moorer: 8 combs + 4 all-passes per side)
function freeverb(inL, inR, { size = 0.8, damp = 0.4, wet = 3 } = {}) {
	const feedback = size * 0.28 + 0.7;
	const d1 = damp * 0.4;
	const d2 = 1 - d1;
	const side = (spread) => ({
		combs: [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((s) => ({
			buf: new Float32Array(s + spread),
			i: 0,
			store: 0,
		})),
		allpasses: [556, 441, 341, 225].map((s) => ({ buf: new Float32Array(s + spread), i: 0 })),
	});
	const sides = [side(0), side(23)];
	const out = [new Float32Array(inL.length), new Float32Array(inL.length)];
	for (let i = 0; i < inL.length; i++) {
		const input = (inL[i] + inR[i]) * 0.015;
		for (let c = 0; c < 2; c++) {
			let acc = 0;
			for (const cb of sides[c].combs) {
				const y = cb.buf[cb.i];
				cb.store = y * d2 + cb.store * d1;
				cb.buf[cb.i] = input + cb.store * feedback;
				if (++cb.i === cb.buf.length) cb.i = 0;
				acc += y;
			}
			for (const ap of sides[c].allpasses) {
				const b = ap.buf[ap.i];
				ap.buf[ap.i] = acc + b * 0.5;
				if (++ap.i === ap.buf.length) ap.i = 0;
				acc = b - acc;
			}
			out[c][i] = acc * wet;
		}
	}
	return out;
}

const panGains = (p, gain) => {
	const angle = ((clamp(p, -1, 1) + 1) * Math.PI) / 4;
	return [Math.cos(angle) * Math.SQRT2 * gain, Math.sin(angle) * Math.SQRT2 * gain];
};

// stereo mix bus with a reverb send
class Mix {
	constructor(seconds = 1) {
		const size = len(seconds);
		this.L = new Float32Array(size);
		this.R = new Float32Array(size);
		this.sL = new Float32Array(size);
		this.sR = new Float32Array(size);
		this.end = 0;
	}
	ensure(size) {
		if (size <= this.L.length) return;
		const grown = Math.max(size, Math.ceil(this.L.length * 1.5));
		for (const key of ['L', 'R', 'sL', 'sR']) {
			const a = new Float32Array(grown);
			a.set(this[key]);
			this[key] = a;
		}
	}
	// `pan` from -1 (left) to 1 (right), or [from, to] to move across over the sound
	add(src, t = 0, { gain = 1, pan = 0, send = 0.12 } = {}) {
		const o = Math.max(0, Math.round(t * SR));
		this.ensure(o + src.length);
		this.end = Math.max(this.end, o + src.length);
		const [from, to] = Array.isArray(pan) ? pan : [pan, pan];
		let [gl, gr] = panGains(from, gain);
		for (let i = 0; i < src.length; i++) {
			if (from !== to && (i & 63) === 0) [gl, gr] = panGains(from + ((to - from) * i) / src.length, gain);
			const l = src[i] * gl;
			const r = src[i] * gr;
			const j = o + i;
			this.L[j] += l;
			this.R[j] += r;
			if (send) {
				this.sL[j] += l * send;
				this.sR[j] += r * send;
			}
		}
		return this;
	}
	// a stereo pair as it is (a bed: its own two sides)
	addStereo(L, R, t = 0, { gain = 1, send = 0.12 } = {}) {
		const o = Math.max(0, Math.round(t * SR));
		this.ensure(o + L.length);
		this.end = Math.max(this.end, o + L.length);
		for (let i = 0; i < L.length; i++) {
			const j = o + i;
			this.L[j] += L[i] * gain;
			this.R[j] += R[i] * gain;
			this.sL[j] += L[i] * gain * send;
			this.sR[j] += R[i] * gain * send;
		}
		return this;
	}
	// `echoes` ([seconds, gain, pan]): the cave's walls, the first echoes of what is sent to the
	// reverb heard apart, darker, and going on into it. With `loop` (seconds), everything ringing
	// past the loop point is folded back onto its start, so the loop is seamless.
	render({ reverb = {}, loop, echoes = [] } = {}) {
		const tail = reverb ? (reverb.tail ?? (loop ? 3 : 1)) : 0;
		const size = Math.max(this.end, loop ? len(loop) : 0) + len(tail);
		this.ensure(size);
		let L = this.L.slice(0, size);
		let R = this.R.slice(0, size);
		if (reverb) {
			const sL = this.sL.slice(0, size);
			const sR = this.sR.slice(0, size);
			if (echoes.length) {
				const mono = new Float32Array(size);
				for (let i = 0; i < size; i++) mono[i] = (sL[i] + sR[i]) * 0.5;
				filter(mono, 'lp', 2400);
				const eL = new Float32Array(size);
				const eR = new Float32Array(size);
				for (const [d, g, pan] of echoes) {
					const o = len(d);
					const [gl, gr] = panGains(pan, g);
					for (let i = 0; i + o < size; i++) {
						eL[i + o] += mono[i] * gl;
						eR[i + o] += mono[i] * gr;
					}
				}
				for (let i = 0; i < size; i++) {
					L[i] += eL[i];
					R[i] += eR[i];
					sL[i] += eL[i] * 0.6;
					sR[i] += eR[i] * 0.6;
				}
			}
			const [wL, wR] = freeverb(sL, sR, reverb);
			for (let i = 0; i < size; i++) {
				L[i] += wL[i];
				R[i] += wR[i];
			}
		}
		if (loop) {
			const ln = len(loop);
			for (let i = ln; i < size; i++) {
				L[(i - ln) % ln] += L[i];
				R[(i - ln) % ln] += R[i];
			}
			L = L.slice(0, ln);
			R = R.slice(0, ln);
		}
		return { L, R };
	}
}

function peakOf({ L, R }) {
	let peak = 0;
	for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
	return peak;
}

// filters a loop as if it repeated forever, so the seam stays seamless
function circularFilter({ L, R }, type, f, q = 0.707) {
	for (const ch of [L, R]) {
		const bq = new Biquad(type, f, q);
		for (let i = Math.max(0, ch.length - 8192); i < ch.length; i++) bq.tick(ch[i]);
		for (let i = 0; i < ch.length; i++) ch[i] = bq.tick(ch[i]);
	}
}

// the cave's walls, the first echoes off them
const CAVE_ECHOES = [
	[0.13, 0.3, -0.65],
	[0.21, 0.22, 0.7],
	[0.34, 0.14, -0.25],
	[0.52, 0.08, 0.45],
];

// a sound in the big cave: a long, dark reverb and the echoes off its walls, its top softened
const cave = (build, { size = 0.88, damp = 0.55, wet = 2, tail = 2.5, top = 4500, echoes = CAVE_ECHOES, seconds = 3 } = {}) => {
	const mx = new Mix(seconds);
	build(mx);
	const out = mx.render({ reverb: { size, damp, wet, tail }, echoes });
	for (const ch of [out.L, out.R]) {
		filter(ch, 'lp', top);
		filter(ch, 'hp', 30);
	}
	return out;
};

// a sound close by, in a nook of the cave: short and nearly dry (the frequent ones: the buttons, the
// reels landing), so a run of them stays clear
const nook = (build, { tail = 0.7 } = {}) =>
	cave(build, {
		size: 0.55,
		damp: 0.7,
		wet: 1.5,
		tail,
		top: 4000,
		echoes: [
			[0.09, 0.12, -0.5],
			[0.15, 0.07, 0.5],
		],
		seconds: 1,
	});

// a loop of the cave, `loop` seconds, its reverb and echoes folded round so it repeats seamlessly
const caveLoop = (loop, build, { size = 0.92, damp = 0.6, wet = 2, top = 4200, echoes = CAVE_ECHOES } = {}) => {
	const mx = new Mix(loop + 1);
	build(mx);
	const out = mx.render({ reverb: { size, damp, wet, tail: 8 }, loop, echoes });
	circularFilter(out, 'lp', top, 0.6);
	circularFilter(out, 'hp', 28);
	return out;
};

// ---------------------------------------------------------------------------------------------
// beds: what never stops, in loops (noise that repeats seamlessly, its filters and swells in whole
// cycles of the loop)

// `loop` seconds of noise shaped by `shape(buf, at)`, where at(t) is the time in the loop of the
// buffer's time t: it runs in over the loop's own end first, so the filters have settled by the
// start and the seam is seamless
function bed(loop, shape) {
	const N = len(loop);
	const P = Math.min(N, len(4));
	const base = noise(loop);
	const buf = new Float32Array(N + P);
	for (let i = 0; i < N + P; i++) buf[i] = base[(i - P + N) % N];
	const at = (t) => (((t - P / SR) % loop) + loop) % loop;
	shape(buf, at);
	return buf.slice(P);
}
// Evens out noise's own random swells, so it flows steadily, without lumps: its loudness over the last
// `ms` divided out, `amount` of it (1: all). (In a bed the run-in settles it, so the loop stays seamless.)
function steady(buf, ms = 40, amount = 0.75) {
	const a = Math.exp(-1000 / (SR * ms));
	let e = 0;
	const n0 = Math.min(buf.length, len(0.1));
	for (let i = 0; i < n0; i++) e += (buf[i] * buf[i]) / n0;
	for (let i = 0; i < buf.length; i++) {
		e = a * e + (1 - a) * buf[i] * buf[i];
		buf[i] /= Math.pow(e + 1e-12, amount / 2);
	}
	return buf;
}
// `cycles` whole turns over the loop, -1..1
const turn = (loop, cycles, phase = 0) => (x) => Math.sin(TAU * ((cycles * x) / loop + phase));
// 0..1, swelling once each cycle (`sharp`er is a shorter swell)
const swellOf = (loop, cycles, phase = 0, sharp = 2) => {
	const w = turn(loop, cycles, phase);
	return (x) => Math.pow(0.5 + 0.5 * w(x), sharp);
};

// The cave's air moving through its tunnels: a soft, dark breath of a rush, easing up and down slowly
// with its gusts (gusts: [cycles, phase]), never surging; its two sides apart. Brown-ish noise (each sample
// a little of the white added to the last: full lows, falling gently away above ~250 Hz) through one gentle
// low-pass that hardly moves, so it has no edge to it (2026-11-17, the user: "make the wind softer and
// smoother its kinda hard"; it was white noise through two steep low-passes swinging with the gusts),
// its own random lumps evened out (steady).
function air(loop, { cutoff = 480, gusts = [[3, 0]], floor = 0.5 } = {}) {
	const g = gusts.map(([c, ph]) => swellOf(loop, c, ph, 1.5));
	const amount = (x) => floor + ((1 - floor) * g.reduce((s, fn) => s + fn(x), 0)) / g.length;
	const side = () =>
		bed(loop, (buf, at) => {
			let b = 0;
			for (let i = 0; i < buf.length; i++) {
				b = 0.965 * b + 0.1 * buf[i];
				buf[i] = b;
			}
			filter(buf, 'lp', (t) => cutoff * (0.85 + 0.3 * amount(at(t))), 0.5);
			filter(buf, 'hp', 55);
			steady(buf, 45);
			filter(buf, 'lp', cutoff * 1.8, 0.5);
			norm(buf);
			env(buf, (t) => amount(at(t)));
		});
	return { L: side(), R: side() };
}

// wind moaning through a crevice: a soft, breathy tone near `f`, drifting, swelling up `cycles`
// times a loop
function howl(loop, f, { cycles = 2, phase = 0, drift = 0.05, q = 2.5, sharp = 2 } = {}) {
	const s = swellOf(loop, cycles, phase, sharp);
	const d1 = turn(loop, cycles * 2 + 1, phase * 1.7);
	const d2 = turn(loop, cycles * 5 + 2, phase * 0.6);
	const centre = (x) => f * (1 + drift * d1(x) + drift * 0.4 * d2(x));
	return bed(loop, (buf, at) => {
		filter(buf, 'bp', (t) => centre(at(t)), q);
		filter(buf, 'bp', (t) => centre(at(t)), q);
		steady(buf, 70, 0.8);
		filter(buf, 'lp', f * 3, 0.5);
		norm(buf);
		env(buf, (t) => s(at(t)));
	});
}

// the rock's own deep rumble, never quite still
function rumble(loop, { cutoff = 75, cycles = 3, phase = 0, floor = 0.4, sharp = 1.5 } = {}) {
	const s = swellOf(loop, cycles, phase, sharp);
	return bed(loop, (buf, at) => {
		filter(buf, 'lp', cutoff);
		filter(buf, 'lp', cutoff);
		filter(buf, 'hp', 25);
		norm(buf);
		env(buf, (t) => floor + (1 - floor) * s(at(t)));
	});
}

// the lake lapping at the rock, `waves` small waves a loop, never quite even
function lake(loop, { waves = 16, cutoff = 380 } = {}) {
	const m = turn(loop, 3, 0.2);
	const lap = (x) => Math.pow(0.5 + 0.5 * Math.sin(TAU * ((waves * x) / loop) + 0.8 * m(x)), 3);
	const side = () =>
		bed(loop, (buf, at) => {
			filter(buf, 'lp', (t) => cutoff * (0.7 + 0.5 * lap(at(t))), 0.7);
			filter(buf, 'lp', cutoff * 1.4);
			filter(buf, 'hp', 90);
			norm(buf);
			env(buf, (t) => 0.25 + 0.75 * lap(at(t)));
		});
	return { L: side(), R: side() };
}

// water running over stone, babbling
function stream(loop, { centre = 900, cycles = 3 } = {}) {
	const s = turn(loop, cycles, 0.3);
	const b1 = turn(loop, Math.round(loop * 5.3));
	const b2 = turn(loop, Math.round(loop * 7.9), 0.4);
	const side = () =>
		bed(loop, (buf, at) => {
			filter(buf, 'bp', (t) => centre * (1 + 0.15 * s(at(t))), 0.5);
			filter(buf, 'lp', 2400);
			norm(buf);
			env(buf, (t) => 0.6 + 0.2 * b1(at(t)) + 0.2 * b2(at(t)));
		});
	return { L: side(), R: side() };
}

// A crystal singing on its own in the dark, for a whole loop: a pure, low tone and its twin a breath
// apart (their slow beat), swelling and fading `cycles` times; every frequency a whole number of
// cycles per loop, so it loops.
function drone(loop, freq, { beat = 0.3, cycles = 1, phase = 0, sharp = 2, floor = 0, upper = 0.06 } = {}) {
	const q = (f) => Math.round(f * loop) / loop;
	const [f1, f2, f3] = [q(freq), q(freq + beat), q(freq * 2)];
	const s = swellOf(loop, cycles, phase, sharp);
	const out = new Float32Array(len(loop));
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] =
			(Math.sin(TAU * f1 * t) + 0.7 * Math.sin(TAU * f2 * t + 1.3) + upper * Math.sin(TAU * f3 * t + 0.4)) *
			(floor + (1 - floor) * s(t));
	}
	return norm(out);
}

// ---------------------------------------------------------------------------------------------
// the cave's happenings, placed in a loop

// One leak in the roof dripping into the same spot of the pool: a steady drip, never quite even,
// that stops for a while now and then (quiet: [from, to] seconds).
function leak(mx, loop, { f = 820, pan = 0.35, every = 2.6, gain = 0.5, send = 0.5, quiet = [] } = {}) {
	for (let t = rr(0, every); t < loop - 0.2; t += every * rr(0.85, 1.2)) {
		if (quiet.some(([a, b]) => t >= a && t < b)) continue;
		mx.add(drip(f * rr(0.97, 1.03), { decay: 0.07, tick: 0.1 }), t, {
			gain: gain * rr(0.8, 1),
			pan: pan + rr(-0.03, 0.03),
			send,
		});
	}
}

// drops falling here and there, near and far (the far ones darker, quieter and more echo)
function drips(mx, loop, count, { lo = 520, hi = 1500, gain = [0.15, 0.6], spread = 0.9, from = 0, to = loop } = {}) {
	for (let k = 0; k < count; k++) {
		const far = rand();
		const d = drip(rr(lo, hi), { second: rand() < 0.3 ? rr(0.2, 0.45) : 0 });
		filter(d, 'lp', 4000 - 2500 * far);
		mx.add(d, rr(from, to), { gain: rr(gain[0], gain[1]) * (1 - 0.6 * far), pan: rr(-spread, spread), send: 0.3 + 0.7 * far });
	}
}

// a stone settling far off: a dull thud, a few pebbles after it (sparse), a trickle of grit
function settle(mx, t, { pan = 0, gain = 0.35 } = {}) {
	const far = (b) => filter(b, 'lp', 1300);
	mx.add(far(stone({ pitch: 0.7, weight: 1.2 })), t, { gain, pan, send: 0.9 });
	let s = t + rr(0.12, 0.2);
	const count = 4 + Math.floor(rand() * 3);
	for (let k = 0; k < count; k++) {
		mx.add(far(pebble(rr(0.7, 1.1))), s, { gain: gain * rr(0.25, 0.5) * Math.pow(0.8, k), pan: pan + rr(-0.15, 0.15), send: 0.9 });
		s += rr(0.07, 0.22);
	}
	const grit = env(filter(filter(noise(0.9), 'bp', 1100, 0.6), 'lp', 1500), (x) => smooth(0, 0.1, x) * ex(x, 0.7));
	mx.add(norm(grit), t + 0.15, { gain: gain * 0.12, pan, send: 0.9 });
}

// grit and little stones shaken from the roof
function grit(mx, t, { pan = 0, gain = 0.2, dur = 0.6 } = {}) {
	const g = env(filter(filter(noise(dur), 'bp', 1300, 0.6), 'lp', 2000), (x) => smooth(0, 0.08, x) * (1 - smooth(dur * 0.4, dur, x)));
	mx.add(norm(g), t, { gain: gain * 0.4, pan, send: 0.6 });
	mx.add(pebble(rr(0.8, 1.2)), t + rr(0.05, dur * 0.6), { gain: gain * 0.5, pan: pan + rr(-0.1, 0.1), send: 0.6 });
}

// ---------------------------------------------------------------------------------------------
// the "music": the cave itself

// The base game: the cave at rest. Its air moving, gusting softly; two crevices moaning (now one,
// now the other); the deep rumble of the rock; the lake lapping; the leak dripping into the pool,
// stopping now and then; drops here and there; twice a stone settling far off; twice the cave's
// deep groan; once a bat far away. 90 s.
function bgmMain() {
	const loop = 90;
	return caveLoop(loop, (mx) => {
		const a = air(loop, { cutoff: 480, gusts: [[2, 0.1], [3, 0.55]], floor: 0.45 });
		mx.addStereo(a.L, a.R, 0, { gain: 0.4, send: 0.12 });
		mx.add(howl(loop, 196, { cycles: 2, phase: 0.15 }), 0, { gain: 0.08, pan: -0.45, send: 0.35 });
		mx.add(howl(loop, 262, { cycles: 3, phase: 0.6, sharp: 2.5 }), 0, { gain: 0.05, pan: 0.5, send: 0.35 });
		mx.add(rumble(loop, { cutoff: 80, cycles: 3, phase: 0.4 }), 0, { gain: 0.18, send: 0 });
		const w = lake(loop, { waves: 17 });
		mx.addStereo(w.L, w.R, 0, { gain: 0.12, send: 0.15 });
		leak(mx, loop, { f: 830, pan: 0.32, every: 2.7, gain: 0.5, quiet: [[24, 37], [62, 73]] });
		drips(mx, loop, 26, { gain: [0.12, 0.5] });
		settle(mx, 31.5, { pan: -0.55, gain: 0.3 });
		settle(mx, 71, { pan: 0.6, gain: 0.24 });
		mx.add(groan(6), 12, { gain: 0.15, pan: 0.2, send: 0.5 });
		mx.add(groan(7, { f0: 110, f1: 74 }), 52, { gain: 0.13, pan: -0.3, send: 0.5 });
		flutter(mx, 44, { beats: 7, rate: 8.5, from: 0.7, to: 0.3, gain: 0.07, send: 0.9, top: 1600 });
	});
}

// The bonus: deeper in, the bats' cave. Darker and restless: the air stronger and gustier, crevices
// moaning a tritone apart, the rock breathing (its rumble swelling every 4 s), a crystal humming low
// somewhere, more drops and a quicker leak, bats flitting past, two far cries, deep booms far off.
// 72 s.
function bgmFreespin() {
	const loop = 72;
	return caveLoop(loop, (mx) => {
		const a = air(loop, { cutoff: 440, gusts: [[3, 0], [4, 0.4]], floor: 0.4 });
		mx.addStereo(a.L, a.R, 0, { gain: 0.44, send: 0.12 });
		mx.add(howl(loop, 147, { cycles: 2, phase: 0.1 }), 0, { gain: 0.1, pan: -0.4, send: 0.35 });
		mx.add(howl(loop, 208, { cycles: 3, phase: 0.55 }), 0, { gain: 0.07, pan: 0.45, send: 0.35 });
		mx.add(rumble(loop, { cutoff: 90, cycles: 18, phase: 0, floor: 0.35, sharp: 2 }), 0, { gain: 0.24, send: 0 });
		mx.add(drone(loop, mtof(n('D3')), { beat: 0.28, cycles: 2, phase: 0.3, sharp: 2.5 }), 0, { gain: 0.035, pan: 0.2, send: 0.6 });
		mx.add(drone(loop, mtof(n('A3')), { beat: 0.4, cycles: 3, phase: 0.75, sharp: 3 }), 0, { gain: 0.022, pan: -0.25, send: 0.6 });
		const w = lake(loop, { waves: 15, cutoff: 330 });
		mx.addStereo(w.L, w.R, 0, { gain: 0.1, send: 0.15 });
		leak(mx, loop, { f: 700, pan: -0.3, every: 1.9, gain: 0.45, quiet: [[30, 38]] });
		drips(mx, loop, 32, { gain: [0.12, 0.5] });
		for (const [t, from, to, near] of [
			[6, -0.8, 0.2, 0.12],
			[19, 0.7, -0.4, 0.08],
			[33, -0.3, 0.8, 0.15],
			[47, 0.6, -0.7, 0.1],
			[61, -0.6, 0.1, 0.08],
		])
			flutter(mx, t, { beats: 8 + Math.floor(rand() * 5), rate: rr(8.5, 10.5), from, to, gain: near, send: 0.7, top: 1800 });
		mx.add(filter(shriek(0.32, { f0: 900, f1: 640 }), 'lp', 2000), 20.5, { gain: 0.025, pan: 0.5, send: 1 });
		mx.add(filter(shriek(0.28, { f0: 960, f1: 700 }), 'lp', 2000), 49, { gain: 0.02, pan: -0.6, send: 1 });
		mx.add(filter(boom(55, 30, 2), 'lp', 400), 14, { gain: 0.2, pan: -0.3, send: 0.8 });
		mx.add(filter(boom(50, 28, 2), 'lp', 400), 56, { gain: 0.18, pan: 0.4, send: 0.8 });
		settle(mx, 40, { pan: 0.55, gain: 0.26 });
		mx.add(groan(6, { f0: 105, f1: 70 }), 25, { gain: 0.16, pan: 0.1, send: 0.5 });
		mx.add(groan(7, { f0: 120, f1: 80 }), 63, { gain: 0.14, pan: -0.2, send: 0.5 });
	});
}

// The big wins: the cave waking. Its crystals hum, the air rises and the drops quicken into a
// sparkle; each level a little fuller: a stream running (from the second), the rock rumbling (from
// the third), more crystals singing, and at the top the hum turning bright (D major). 12 s loops.
const WIN_DRONES = [
	['D3', 'A3'],
	['D3', 'A3', 'D4'],
	['D3', 'A3', 'D4', 'E4'],
	['D2', 'D3', 'A3', 'D4', 'E4', 'A4'],
	['D2', 'D3', 'A3', 'D4', 'F#4', 'A4', 'D5'],
];
function bgmWin(level) {
	const loop = 12;
	return caveLoop(
		loop,
		(mx) => {
			const a = air(loop, { cutoff: 480 + 60 * level, gusts: [[1, 0.2], [2, 0.7]], floor: 0.6 });
			mx.addStereo(a.L, a.R, 0, { gain: 0.24 + 0.03 * level, send: 0.12 });
			WIN_DRONES[level].forEach((name, i) => {
				const m = n(name);
				mx.add(drone(loop, mtof(m), { beat: 0.25 + 0.08 * (i % 3), cycles: 1 + (i % 2), phase: i * 0.31, sharp: 1.2, floor: 0.35 }), 0, {
					gain: (m < 50 ? 0.04 : 0.06) * Math.pow(0.85, i),
					pan: (i % 2 ? 0.35 : -0.35) * (i ? 1 : 0),
					send: 0.55,
				});
			});
			if (level >= 1) {
				const s = stream(loop, { centre: 850 });
				mx.addStereo(s.L, s.R, 0, { gain: 0.04 + 0.015 * level, send: 0.3 });
			}
			if (level >= 2) mx.add(rumble(loop, { cutoff: 80, cycles: 2, floor: 0.5 }), 0, { gain: 0.12 + 0.04 * (level - 2), send: 0 });
			drips(mx, loop, 10 + 6 * level, { lo: 650, hi: 1700, gain: [0.12, 0.4] });
		},
		{ size: 0.9 },
	);
}

// under a big win (with the win loop): crystal shards falling and tinkling on the stone, little
// stones and drops among them
function crystalsLoop() {
	const loop = 8;
	return caveLoop(loop, (mx) => {
		const shards = notes('A4 C5 D5 F5 G5 A5');
		for (let k = 0; k < 44; k++) {
			mx.add(crystal(pick(shards), { dur: rr(0.25, 0.7), bright: 0.6, soft: 0.003 }), rr(0, loop), {
				gain: rr(0.12, 0.35),
				pan: rr(-0.8, 0.8),
				send: 0.45,
			});
		}
		for (let k = 0; k < 10; k++) mx.add(pebble(rr(0.8, 1.3)), rr(0, loop), { gain: rr(0.08, 0.2), pan: rr(-0.7, 0.7), send: 0.4 });
		drips(mx, loop, 6, { gain: [0.15, 0.35] });
		const s = stream(loop, { centre: 1000 });
		mx.addStereo(s.L, s.R, 0, { gain: 0.05, send: 0.3 });
	});
}

// anticipation (a free spins rock may land): the cave trembling. The rock throbbing, a heavy beat
// every 0.75 s; a crevice howling, shaking; two crystals humming against each other a semitone apart;
// grit falling from the roof. 6 s.
function anticipationLoop() {
	const loop = 6;
	return caveLoop(
		loop,
		(mx) => {
			mx.add(rumble(loop, { cutoff: 95, cycles: 8, floor: 0.35, sharp: 2 }), 0, { gain: 0.3, send: 0 });
			for (let k = 0; k < 8; k++) mx.add(boom(82, 46, 0.5), k * 0.75, { gain: 0.3, send: 0.25 });
			const shake = turn(loop, 36);
			const h = env(howl(loop, 233, { cycles: 1, sharp: 0.6, drift: 0.03 }), (t) => 0.8 + 0.2 * shake(t));
			mx.add(h, 0, { gain: 0.2, pan: -0.2, send: 0.4 });
			mx.add(drone(loop, mtof(n('D3')), { beat: 0.5, cycles: 1, sharp: 0.8, floor: 0.6 }), 0, { gain: 0.07, pan: 0.3, send: 0.5 });
			mx.add(drone(loop, mtof(n('D#3')), { beat: 0.33, cycles: 1, phase: 0.5, sharp: 0.8, floor: 0.6 }), 0, { gain: 0.055, pan: -0.3, send: 0.5 });
			for (const t of [0.4, 1.9, 3.1, 4.6]) grit(mx, t + rr(-0.1, 0.1), { pan: rr(-0.6, 0.6), gain: rr(0.15, 0.25) });
		},
		{ size: 0.85 },
	);
}

// ---------------------------------------------------------------------------------------------
// the effects

// D minor pentatonic: the effects' few notes
const MINOR = notes('D4 F4 G4 A4 C5 D5 F5 G5 A5');

// UI: a pebble's soft tick
const btnGeneral = () =>
	nook((mx) => {
		mx.add(pebble(1.05), 0, { gain: 0.8, send: 0.2 });
		mx.add(norm(sweep(0.05, 300, 180, 0.01)), 0, { gain: 0.3 });
	});

// the spin: a plain, soft, low stone thump (the user's taste in the other games)
const btnSpin = () =>
	nook((mx) => {
		mx.add(norm(sweep(0.3, 100, 44, 0.035)), 0, { gain: 0.9, send: 0.25 });
		mx.add(filter(stone({ pitch: 0.8, weight: 0.6, grit: 0 }), 'lp', 900), 0, { gain: 0.45, send: 0.25 });
	});

// A reel's set landing: one solid stone block set down, dry and short, so five in a row stay clear;
// each reel's a slightly different stone, from the left to the right of the board.
const REEL_PITCH = [1.04, 0.97, 1.02, 0.95, 1.0];
const reelStop = (k) => () =>
	nook((mx) => {
		mx.add(stone({ pitch: REEL_PITCH[k - 1], weight: 0.9 }), 0, { gain: 1, pan: -0.32 + 0.16 * (k - 1), send: 0.18 });
	});

// many stones landing together
const symbolsLanding = () =>
	nook((mx) => {
		mx.add(stone({ pitch: 0.95, weight: 1 }), 0, { gain: 0.9, pan: -0.2, send: 0.2 });
		mx.add(stone({ pitch: 1.05, weight: 0.8 }), 0.05, { gain: 0.7, pan: 0.25, send: 0.2 });
	});

// a premium landing: its stone and a crystal's soft clink
const royalsLanding = () =>
	cave(
		(mx) => {
			mx.add(stone({ pitch: 1, weight: 0.9 }), 0, { gain: 0.9, send: 0.2 });
			mx.add(crystal(n('A4'), { dur: 0.9, bright: 0.6 }), 0.01, { gain: 0.25, send: 0.5 });
		},
		{ tail: 1.4 },
	);

// A bat ring landing (W): its stone, the bat inside startled into two wingbeats, and the ring's red
// glow as a low, dark hum, two tones a tritone apart.
const ringLanding = () =>
	cave(
		(mx) => {
			mx.add(stone({ pitch: 0.85, weight: 1.1, grit: 0.3 }), 0, { gain: 0.8, send: 0.25 });
			mx.add(flap(480, { dur: 0.12, push: 0.7 }), 0.03, { gain: 0.45, pan: -0.15, send: 0.35 });
			mx.add(flap(560, { dur: 0.1, push: 0.5 }), 0.15, { gain: 0.32, pan: 0.15, send: 0.35 });
			mx.add(hum(n('A2'), 0.15, { attack: 0.04, rel: 0.9, beat: 0.6 }), 0, { gain: 0.25, send: 0.4 });
			mx.add(hum(n('D#3'), 0.15, { attack: 0.06, rel: 0.8, beat: 0.5 }), 0.02, { gain: 0.16, send: 0.4 });
		},
		{ tail: 1.5 },
	);

// A free spins rock landing, the k-th this spin: a heavy rock thudding down with a boom in the
// ground, a crystal ringing out a step higher each time (D F A C, the fifth D), a low hum under it
// from the third (the bonus is in), a couple of stones knocked loose.
const SCATTER_NOTES = notes('D4 F4 A4 C5 D5');
const scatterStop = (k) => () =>
	cave(
		(mx) => {
			const m = SCATTER_NOTES[k - 1];
			mx.add(stone({ pitch: 0.7, weight: 1.6, grit: 0.35 }), 0, { gain: 0.85, send: 0.3 });
			mx.add(boom(72, 36, 1.0), 0, { gain: 0.4, send: 0.2 });
			mx.add(crystal(m, { dur: 2.2, soft: 0.006 }), 0.02, { gain: 0.42, send: 0.55 });
			mx.add(hum(m, 0.4, { attack: 0.15, rel: 1.6 }), 0.05, { gain: 0.2, send: 0.6 });
			if (k >= 3) mx.add(hum(m - 12, 0.5, { attack: 0.25, rel: 1.8 }), 0.05, { gain: 0.16 + 0.04 * (k - 3), send: 0.5 });
			mx.add(pebble(0.9), 0.15, { gain: 0.18, pan: -0.3, send: 0.5 });
			mx.add(pebble(1.1), 0.34, { gain: 0.12, pan: 0.35, send: 0.5 });
		},
		{ tail: 3, seconds: 4 },
	);

// the anticipation starting: the rock beginning to tremble
const anticipationStart = () =>
	cave(
		(mx) => {
			mx.add(rumbleShot(1.0, 0.5, 90), 0, { gain: 0.7, send: 0.2 });
			mx.add(boom(62, 36, 0.7), 0.45, { gain: 0.5, send: 0.3 });
			grit(mx, 0.5, { gain: 0.25 });
		},
		{ tail: 1.5 },
	);

// a win: a drop falling into the lake and two crystals answering it, a low hum under them
const winSmall = () =>
	cave(
		(mx) => {
			mx.add(drip(880, { decay: 0.08, tick: 0.12 }), 0, { gain: 0.5, pan: 0.1, send: 0.5 });
			mx.add(crystal(n('A4'), { dur: 1.6 }), 0.05, { gain: 0.38, pan: -0.2, send: 0.5 });
			mx.add(crystal(n('D5'), { dur: 1.4 }), 0.15, { gain: 0.28, pan: 0.25, send: 0.55 });
			mx.add(hum(n('D4'), 0.25, { attack: 0.08, rel: 1.1 }), 0.04, { gain: 0.14, send: 0.5 });
		},
		{ tail: 2 },
	);

// Each further win line (the 2nd to the 5th and on): a drop and one crystal, a step higher each line.
const LINE_NOTES = notes('C5 D5 F5 G5');
const winLine = (k) => () =>
	cave(
		(mx) => {
			const m = LINE_NOTES[k - 1];
			const pan = -0.3 + 0.2 * k;
			mx.add(drip(700 + 90 * k, { decay: 0.07 }), 0, { gain: 0.4, pan, send: 0.5 });
			mx.add(crystal(m, { dur: 1.3 }), 0.03, { gain: 0.35, pan, send: 0.5 });
			mx.add(hum(m - 12, 0.15, { attack: 0.05, rel: 0.8 }), 0.03, { gain: 0.08, send: 0.4 });
		},
		{ tail: 1.6 },
	);

// a run of crystals up the minor scale over a hum, `steps` notes (the bigger wins)
const winRun = ({ steps, chord = false }) => () =>
	cave(
		(mx) => {
			mx.add(drip(900, { decay: 0.08 }), 0, { gain: 0.45, send: 0.5 });
			for (let i = 0; i < steps; i++) {
				mx.add(crystal(MINOR[i + 1], { dur: 1.4 }), 0.05 + i * 0.09, { gain: 0.3, pan: -0.5 + i / steps, send: 0.5 });
			}
			mx.add(hum(n('D4'), 0.3 + 0.08 * steps, { attack: 0.1, rel: 1.2 }), 0.05, { gain: 0.14, send: 0.5 });
			if (chord) {
				mx.add(hum(n('D3'), 0.6, { attack: 0.2, rel: 1.4 }), 0.05, { gain: 0.14, send: 0.5 });
				mx.add(hum(n('A3'), 0.6, { attack: 0.25, rel: 1.4 }), 0.1, { gain: 0.1, send: 0.5 });
			}
		},
		{ tail: 2.4, seconds: 4 },
	);

// another win from a run of wins (tumbles): a drop and a crystal, higher each time
const TUMBLE_NOTES = notes('A4 C5 D5 F5 G5');
const tumbleWin = (k) => () =>
	cave(
		(mx) => {
			mx.add(drip(650 + 110 * k, { decay: 0.07 }), 0, { gain: 0.4, send: 0.5 });
			mx.add(crystal(TUMBLE_NOTES[k - 1], { dur: 1.3 }), 0.03, { gain: 0.35, send: 0.5 });
		},
		{ tail: 1.6 },
	);

// The free spins won, as the rocks light up (the bat attacks with it: its own sound): a deep boom and
// the rock rumbling, the crystals ringing out in D minor and humming on, a gust of wind and a shower of
// drops (long), as if the whole cave answered.
const bonusWon = ({ long = false } = {}) => () =>
	cave(
		(mx) => {
			mx.add(boom(66, 30, 1.8), 0, { gain: 0.7, send: 0.3 });
			mx.add(rumbleShot(long ? 2.6 : 1.6, 0.5), 0, { gain: 0.45, send: 0.2 });
			notes('D4 A4 D5 F5').forEach((m, i) =>
				mx.add(crystal(m, { dur: 2.4 }), 0.05 + i * 0.07, { gain: 0.3 - 0.03 * i, pan: -0.4 + 0.27 * i, send: 0.6 }),
			);
			for (const [name, g] of [
				['D3', 0.18],
				['A3', 0.14],
				['D4', 0.1],
			])
				mx.add(hum(n(name), long ? 1.4 : 0.7, { attack: 0.35, rel: 1.6 }), 0.1, { gain: g, send: 0.55 });
			if (long) {
				mx.add(whoosh(2.4, 160, 480, { q: 0.55, peakAt: 0.45 }), 0.15, { gain: 0.18, pan: [-0.5, 0.5], send: 0.45 });
				for (let k = 0; k < 8; k++) {
					mx.add(drip(rr(700, 1500), { decay: 0.07 }), 0.3 + k * 0.22 + rr(-0.05, 0.05), { gain: rr(0.15, 0.3), pan: rr(-0.7, 0.7), send: 0.7 });
				}
			}
		},
		{ tail: 3, seconds: 5 },
	);

// As the free spins come in: a gale rushing through the tunnels and a deep boom, and the bats
// startled out of the roof, a colony of them streaming past, a couple crying far off.
const superFreeSpin = () =>
	cave(
		(mx) => {
			mx.add(whoosh(3.2, 130, 560, { q: 0.5, peakAt: 0.5 }), 0, { gain: 0.42, pan: [-0.6, 0.6], send: 0.4 });
			mx.add(whoosh(3.0, 90, 320, { q: 0.6, peakAt: 0.5 }), 0.1, { gain: 0.38, pan: [0.4, -0.3], send: 0.35 });
			mx.add(boom(58, 28, 2.2), 0.25, { gain: 0.6, send: 0.3 });
			flutter(mx, 0.35, { beats: 14, rate: 10.5, from: -0.8, to: 0.6, gain: 0.32, f: 600, send: 0.35 });
			flutter(mx, 0.6, { beats: 12, rate: 9.5, from: 0.7, to: -0.5, gain: 0.26, f: 520, send: 0.4 });
			flutter(mx, 0.95, { beats: 10, rate: 11, from: -0.3, to: 0.8, gain: 0.2, f: 680, send: 0.5, top: 2000 });
			flutter(mx, 1.4, { beats: 9, rate: 10, from: 0.5, to: -0.8, gain: 0.14, f: 560, send: 0.7, top: 1600 });
			mx.add(filter(shriek(0.35, { f0: 900, f1: 640 }), 'lp', 2400), 0.7, { gain: 0.08, pan: 0.45, send: 0.8 });
			mx.add(filter(shriek(0.3, { f0: 1000, f1: 720 }), 'lp', 2200), 1.3, { gain: 0.06, pan: -0.5, send: 0.85 });
		},
		{ tail: 3, seconds: 5 },
	);

// The free spins intro: no tune, the cave's own fanfare. A deep, low D booming through the rock and
// the crystals waking into a dark D minor chord that swells and hangs, drops falling round it.
const jingle = () =>
	cave(
		(mx) => {
			mx.add(boom(mtof(n('D2')), mtof(n('D1')), 2.4), 0, { gain: 0.6, send: 0.35 });
			for (const [name, g, t] of [
				['D3', 0.2, 0],
				['A3', 0.16, 0.05],
				['D4', 0.12, 0.1],
				['F4', 0.1, 0.15],
			])
				mx.add(hum(n(name), 1.7, { attack: 0.25, rel: 1.8 }), t, { gain: g, pan: rr(-0.4, 0.4), send: 0.6 });
			mx.add(crystal(n('D5'), { dur: 2.4 }), 0.06, { gain: 0.24, pan: -0.25, send: 0.6 });
			mx.add(crystal(n('A5'), { dur: 2 }), 0.16, { gain: 0.14, pan: 0.3, send: 0.6 });
			for (let k = 0; k < 6; k++) {
				mx.add(drip(1400 - k * 140, { decay: 0.07 }), 0.3 + k * 0.24, { gain: 0.22, pan: rr(-0.6, 0.6), send: 0.7 });
			}
		},
		{ tail: 3.5, size: 0.92, seconds: 6 },
	);

// The total win as the free spins end: the crystals ringing up into D major and humming it, a soft
// boom under them, drops: the cave's darkness turned to a glow.
const youWon = () =>
	cave(
		(mx) => {
			mx.add(boom(mtof(n('D2')), 40, 1.8), 0, { gain: 0.4, send: 0.35 });
			for (const [name, g, t] of [
				['D3', 0.18, 0],
				['A3', 0.14, 0.05],
				['D4', 0.12, 0.1],
				['F#4', 0.1, 0.15],
				['A4', 0.08, 0.2],
			])
				mx.add(hum(n(name), 1.6, { attack: 0.2, rel: 1.8 }), t, { gain: g, pan: rr(-0.4, 0.4), send: 0.6 });
			notes('D4 F#4 A4 D5 F#5').forEach((m, i) =>
				mx.add(crystal(m, { dur: 2.2 }), 0.05 + i * 0.1, { gain: 0.28 - 0.03 * i, pan: -0.5 + 0.25 * i, send: 0.6 }),
			);
			for (let k = 0; k < 5; k++) mx.add(drip(rr(800, 1400), { decay: 0.07 }), 0.7 + k * 0.3, { gain: 0.18, pan: rr(-0.6, 0.6), send: 0.7 });
		},
		{ tail: 3.5, size: 0.9, seconds: 6 },
	);

// a stone slab struck, a low hum and a crystal settling (the bonus bought, a win done)
const winEnd = () =>
	cave(
		(mx) => {
			mx.add(stone({ pitch: 0.55, weight: 2, ring: 1.4 }), 0, { gain: 0.8, send: 0.35 });
			mx.add(boom(60, 32, 1.4), 0, { gain: 0.4, send: 0.3 });
			mx.add(hum(n('D3'), 0.6, { attack: 0.08, rel: 1.4 }), 0.02, { gain: 0.2, send: 0.5 });
			mx.add(crystal(n('D4'), { dur: 1.8 }), 0.03, { gain: 0.3, send: 0.55 });
		},
		{ tail: 2.5 },
	);

// more free spins: crystals rising, a boom, a rush of air
const freeSpinsMore = () =>
	cave(
		(mx) => {
			mx.add(boom(64, 30, 1.6), 0, { gain: 0.55, send: 0.3 });
			mx.add(whoosh(1.4, 200, 700, { q: 0.8, peakAt: 0.4 }), 0, { gain: 0.25, send: 0.4 });
			notes('D4 F4 A4 D5').forEach((m, i) => mx.add(crystal(m, { dur: 2 }), 0.08 + i * 0.12, { gain: 0.3, pan: -0.4 + 0.27 * i, send: 0.6 }));
			mx.add(hum(n('D3'), 1, { attack: 0.3, rel: 1.6 }), 0.1, { gain: 0.16, send: 0.55 });
		},
		{ tail: 3, seconds: 5 },
	);

// two crystals clinking together, a hum under them
const combine = (a, b) => () =>
	cave(
		(mx) => {
			mx.add(crystal(n(a), { dur: 1.3 }), 0, { gain: 0.35, pan: -0.3, send: 0.5 });
			mx.add(crystal(n(b), { dur: 1.3 }), 0.03, { gain: 0.35, pan: 0.3, send: 0.5 });
			mx.add(pebble(1.3), 0.03, { gain: 0.15 });
			mx.add(hum(n(a) - 12, 0.3, { attack: 0.06, rel: 1 }), 0.03, { gain: 0.12, send: 0.5 });
		},
		{ tail: 1.8 },
	);

// a rock bursting: its crack and boom, stones flung out and landing round it, grit
const rockBurst = ({ size = 1 }) => () =>
	cave(
		(mx) => {
			mx.add(stone({ pitch: 0.75 / Math.sqrt(size), weight: 1.2 * size, grit: 0.6 }), 0, { gain: 0.8, send: 0.3 });
			mx.add(boom(68, 32, 0.8 + 0.6 * size), 0, { gain: 0.45 * size, send: 0.3 });
			mx.add(whoosh(0.5 * size, 900, 300, { q: 0.7, peakAt: 0.1 }), 0, { gain: 0.3, send: 0.3 });
			let t = 0.12;
			for (let k = 0; k < Math.round(4 + 4 * size); k++) {
				mx.add(pebble(rr(0.7, 1.2)), t, { gain: rr(0.15, 0.3) * Math.pow(0.88, k), pan: rr(-0.8, 0.8), send: 0.45 });
				t += rr(0.06, 0.16);
			}
			grit(mx, 0.1, { gain: 0.3, dur: 0.8 * size });
		},
		{ tail: 2, seconds: 4 },
	);

// a multiplier going back: crystals falling away, a short slide of stone
const multiplierReset = () =>
	cave(
		(mx) => {
			notes('D5 A4 D4').forEach((m, i) => mx.add(crystal(m, { dur: 0.9 }), i * 0.08, { gain: 0.22, pan: 0.3 - 0.3 * i, send: 0.5 }));
			const g = env(grind(0.3, { f: 320 }), (t) => smooth(0, 0.03, t) * (1 - smooth(0.1, 0.3, t)));
			mx.add(g, 0.05, { gain: 0.25, send: 0.3 });
		},
		{ tail: 1.4 },
	);

// The WILD's multiplier doubling (sfx_multiplier_up; as its bat springs): two crystals ringing up a
// fourth at once, a puff of air and a stone's tick under them.
const multiplierUp = () =>
	cave(
		(mx) => {
			mx.add(crystal(n('A4'), { dur: 1.2 }), 0, { gain: 0.35, pan: -0.15, send: 0.5 });
			mx.add(crystal(n('D5'), { dur: 1.5 }), 0.08, { gain: 0.42, pan: 0.15, send: 0.5 });
			mx.add(whoosh(0.3, 400, 1100, { q: 0.9, peakAt: 0.3 }), 0.02, { gain: 0.14, send: 0.3 });
			mx.add(hum(n('D4'), 0.2, { attack: 0.05, rel: 1 }), 0.06, { gain: 0.14, send: 0.5 });
			mx.add(pebble(0.8), 0, { gain: 0.2 });
		},
		{ tail: 1.8 },
	);

// a multiplier changing: a drop and a crystal's tick
const multiplierUpdate = () =>
	cave(
		(mx) => {
			mx.add(drip(1000, { decay: 0.06 }), 0, { gain: 0.35, send: 0.5 });
			mx.add(crystal(n('G5'), { dur: 0.8, bright: 0.5 }), 0.01, { gain: 0.25, send: 0.5 });
		},
		{ tail: 1.2 },
	);

// a multiplier paying: the crystals bloom over a boom
const multiplierWin = () =>
	cave(
		(mx) => {
			mx.add(boom(66, 32, 1.4), 0, { gain: 0.45, send: 0.3 });
			notes('D4 A4 D5 F5 A5').forEach((m, i) => mx.add(crystal(m, { dur: 1.8 }), 0.04 + i * 0.08, { gain: 0.28, pan: -0.5 + 0.25 * i, send: 0.55 }));
			mx.add(hum(n('D3'), 1, { attack: 0.2, rel: 1.6 }), 0.05, { gain: 0.16, send: 0.55 });
			mx.add(hum(n('A3'), 1, { attack: 0.25, rel: 1.6 }), 0.1, { gain: 0.12, send: 0.55 });
		},
		{ tail: 3, seconds: 5 },
	);

// a reveal: a crystal hum swelling up out of the dark, a shimmer of crystals at its top
const reveal = () =>
	cave(
		(mx) => {
			mx.add(hum(n('D4'), 0.6, { attack: 0.6, rel: 0.9 }), 0, { gain: 0.22, send: 0.5 });
			mx.add(hum(n('A4'), 0.5, { attack: 0.6, rel: 0.9 }), 0.05, { gain: 0.15, send: 0.5 });
			mx.add(whoosh(0.8, 250, 800, { q: 0.8, peakAt: 0.8 }), 0, { gain: 0.15, send: 0.4 });
			notes('D5 F5 A5').forEach((m, i) => mx.add(crystal(m, { dur: 1.1 }), 0.62 + i * 0.07, { gain: 0.22, pan: -0.3 + 0.3 * i, send: 0.6 }));
		},
		{ tail: 2.4 },
	);

// The bat right of the board attacking (bat_attack's `attack`, 1.8 s: frames 10-32 at 60 fps rearing
// back, 34-45 quivering, 44-56 lunging, the snap from 51, recovering from 56): a snarl building as it
// rears back, the wings sweeping up; the snarl shaking with rage; the wings slamming down as it dives
// at you with a cry, its jaws snapping shut; a wingbeat back into its hover.
const batAttack = () =>
	cave(
		(mx) => {
			const rear = env(growl(0.55, { f: 78, rough: 0.5 }), (t) => 0.2 + 0.8 * smooth(0, 0.4, t));
			mx.add(rear, 0.12, { gain: 0.3, send: 0.25 });
			mx.add(env(hiss(0.5), (t) => smooth(0, 0.4, t) * (1 - smooth(0.42, 0.5, t))), 0.12, { gain: 0.1, send: 0.3 });
			mx.add(whoosh(0.4, 260, 520, { q: 0.9, peakAt: 0.8 }), 0.14, { gain: 0.2, send: 0.3 });
			mx.add(growl(0.22, { f: 92, rough: 0.85, rate: 22 }), 0.55, { gain: 0.3, send: 0.25 });
			mx.add(whoosh(0.36, 300, 1000, { q: 0.8, peakAt: 0.78 }), 0.5, { gain: 0.32, send: 0.25 });
			mx.add(flap(380, { dur: 0.2, push: 1, hard: 1 }), 0.76, { gain: 0.7, send: 0.3 });
			mx.add(shriek(0.4, { f0: 880, f1: 560, rough: 0.45 }), 0.74, { gain: 0.42, send: 0.35 });
			mx.add(growl(0.35, { f: 70 }), 0.74, { gain: 0.28, send: 0.3 });
			mx.add(snap(), 0.88, { gain: 0.5, send: 0.3 });
			mx.add(flap(520, { dur: 0.13 }), 1.02, { gain: 0.35, send: 0.35 });
			mx.add(flap(560, { dur: 0.12 }), 1.24, { gain: 0.22, send: 0.35 });
		},
		{ tail: 1.8, seconds: 3 },
	);

// the bonus's sticky bats taking off for their new reels (and flying away as it ends): a flutter
const batFly = () =>
	cave(
		(mx) => {
			flutter(mx, 0, { beats: 9, rate: 8.5, from: -0.25, to: 0.25, gain: 0.5, f: 560, send: 0.3, arc: 0.5 });
		},
		{ tail: 1.2 },
	);

// The ring opening into the tall WILD (as its morph starts; 30 fps, the stones opening from 0.47 s to
// 0.95 s, quickly and then slowing, the multiplier glowing in from 1.07 s): air drawn in as the bat
// swells and flashes; the wall cracking open with a boom and sliding apart, up and down, a few stones
// falling; the hollow inside ringing as its crystals catch the light.
const wildOpen = () =>
	cave(
		(mx) => {
			mx.add(whoosh(0.5, 180, 620, { q: 0.8, peakAt: 0.9 }), 0, { gain: 0.25, send: 0.3 });
			mx.add(hum(n('A2'), 0.3, { attack: 0.3, rel: 0.6, beat: 0.6 }), 0, { gain: 0.15, send: 0.4 });
			mx.add(stone({ pitch: 0.7, weight: 1.4, grit: 0.4 }), 0.46, { gain: 0.7, send: 0.3 });
			mx.add(boom(64, 30, 1.4), 0.46, { gain: 0.5, send: 0.4 });
			const g = env(grind(0.6, { f: 360, rough: 0.3 }), (t) => smooth(0, 0.03, t) * Math.pow(1 - Math.min(1, t / 0.6), 2));
			mx.add(g, 0.47, { gain: 0.45, send: 0.35 });
			for (const [t, p] of [
				[0.62, -0.2],
				[0.78, 0.25],
				[0.97, -0.1],
			])
				mx.add(pebble(rr(0.75, 1.05)), t, { gain: 0.14, pan: p, send: 0.5 });
			mx.add(crystal(n('D5'), { dur: 1.6 }), 1.06, { gain: 0.26, pan: -0.1, send: 0.6 });
			mx.add(crystal(n('A5'), { dur: 1.3 }), 1.16, { gain: 0.16, pan: 0.15, send: 0.6 });
			mx.add(hum(n('D4'), 0.3, { attack: 0.2, rel: 1.2 }), 1.0, { gain: 0.12, send: 0.6 });
		},
		{ tail: 2.4, seconds: 4 },
	);

// The WILD closing back into the ring (its way back; the stones closing from 0.2 s to 0.6 s, slowly
// and then faster): the slide of stone, gathering pace, and the two halves meeting with a thud; the
// bat's wingbeat as it hovers there.
const wildClose = () =>
	cave(
		(mx) => {
			const g = env(grind(0.42, { f: 340, rough: 0.3 }), (t) => Math.pow(Math.min(1, t / 0.4), 2) * (1 - smooth(0.38, 0.42, t)));
			mx.add(g, 0.2, { gain: 0.45, send: 0.35 });
			mx.add(stone({ pitch: 0.75, weight: 1.3, grit: 0.3 }), 0.6, { gain: 0.75, send: 0.3 });
			mx.add(boom(70, 34, 0.9), 0.6, { gain: 0.4, send: 0.35 });
			mx.add(flap(520, { dur: 0.12 }), 1.0, { gain: 0.25, send: 0.35 });
		},
		{ tail: 1.8 },
	);

// The WILD's bat reacting to a win on it (its hit, ~1.1 s; it springs at 0.35 of it): two wingbeats,
// the spring with a rush of air and a short cry, a wingbeat settling.
const wildHit = () =>
	cave(
		(mx) => {
			mx.add(flap(540, { dur: 0.11 }), 0, { gain: 0.35, send: 0.3 });
			mx.add(flap(600, { dur: 0.1 }), 0.11, { gain: 0.28, send: 0.3 });
			mx.add(whoosh(0.28, 320, 900, { q: 0.9, peakAt: 0.7 }), 0.14, { gain: 0.25, send: 0.3 });
			mx.add(shriek(0.14, { f0: 1000, f1: 820, rough: 0.35, hiss: 0.2 }), 0.36, { gain: 0.16, send: 0.4 });
			mx.add(flap(500, { dur: 0.12 }), 0.62, { gain: 0.22, send: 0.35 });
		},
		{ tail: 1.2 },
	);

// ---------------------------------------------------------------------------------------------
// sprite

// level: loudest 400 ms RMS to aim for (dBFS); peak: ceiling
const SOUNDS = {
	bgm_main: { level: -25, loop: true, render: bgmMain },
	bgm_freespin: { level: -23, loop: true, render: bgmFreespin },
	bgm_winlevel_big: { level: -22, loop: true, render: () => bgmWin(0) },
	bgm_winlevel_superwin: { level: -21.5, loop: true, render: () => bgmWin(1) },
	bgm_winlevel_mega: { level: -21, loop: true, render: () => bgmWin(2) },
	bgm_winlevel_epic: { level: -20.5, loop: true, render: () => bgmWin(3) },
	bgm_winlevel_max: { level: -20, loop: true, render: () => bgmWin(4) },
	sfx_bigwin_coinloop: { level: -28, loop: true, render: crystalsLoop },
	sfx_anticipation: { level: -24, loop: true, render: anticipationLoop },
	sfx_anticipation_start: { level: -24, render: anticipationStart },
	jng_intro_fs: { level: -18, render: jingle },
	sfx_btn_general: { level: -31, peak: 0.45, render: btnGeneral },
	sfx_btn_spin: { level: -25, peak: 0.5, render: btnSpin },
	sfx_fs_respins: { level: -19, render: freeSpinsMore },
	sfx_multiplier_combine_a: { level: -22, render: combine('A4', 'D5') },
	sfx_multiplier_combine_b: { level: -22, render: combine('C5', 'F5') },
	sfx_multiplier_explosion_a: { level: -20, render: rockBurst({ size: 0.7 }) },
	sfx_multiplier_explosion_b: { level: -18, render: rockBurst({ size: 1.4 }) },
	sfx_multiplier_explosion_c: { level: -19, render: rockBurst({ size: 1 }) },
	sfx_multiplier_landing: { level: -21, render: ringLanding },
	sfx_multiplier_reset: { level: -25, render: multiplierReset },
	sfx_multiplier_up: { level: -22, render: multiplierUp },
	sfx_multiplier_update: { level: -25, render: multiplierUpdate },
	sfx_multiplier_win: { level: -20, render: multiplierWin },
	sfx_royals_landing: { level: -24, peak: 0.5, render: royalsLanding },
	sfx_scatter_reveal: { level: -22, render: reveal },
	sfx_scatter_win: { level: -19, render: bonusWon() },
	sfx_scatter_win_v2: { level: -18, render: bonusWon({ long: true }) },
	sfx_superfreespin: { level: -18, render: superFreeSpin },
	sfx_symbols_landing: { level: -25, peak: 0.45, render: symbolsLanding },
	sfx_wild_explode: { level: -19, render: rockBurst({ size: 1.2 }) },
	sfx_winlevel_end: { level: -19, render: winEnd },
	sfx_winlevel_small: { level: -23, render: winSmall },
	sfx_winlevel_standard: { level: -22, render: winRun({ steps: 3 }) },
	sfx_winlevel_nice: { level: -21, render: winRun({ steps: 5, chord: true }) },
	sfx_winlevel_substantial: { level: -20, render: winRun({ steps: 7, chord: true }) },
	sfx_youwon_panel: { level: -18, render: youWon },
	sfx_bat_attack: { level: -20, render: batAttack },
	sfx_bat_fly: { level: -26, render: batFly },
	sfx_wild_open: { level: -21, render: wildOpen },
	sfx_wild_close: { level: -22, render: wildClose },
	sfx_wild_hit: { level: -24, render: wildHit },
};
for (let k = 1; k <= 5; k++) {
	SOUNDS[`sfx_reel_stop_${k}`] = { level: -27, peak: 0.55, render: reelStop(k) };
	SOUNDS[`sfx_scatter_stop_${k}`] = { level: -21 + 0.5 * (k - 1), render: scatterStop(k) };
	SOUNDS[`tumble_win_${k}`] = { level: -23, render: tumbleWin(k) };
}
for (let k = 1; k <= 4; k++) SOUNDS[`sfx_win_line_${k}`] = { level: -24, render: winLine(k) };

function trimTail({ L, R }) {
	const peak = peakOf({ L, R });
	let end = L.length;
	while (end > 1 && Math.abs(L[end - 1]) < peak * 1e-3 && Math.abs(R[end - 1]) < peak * 1e-3) end--;
	return { L: fadeEnd(L.slice(0, end), 0.03), R: fadeEnd(R.slice(0, end), 0.03) };
}

// loudest 400 ms window, RMS over both channels
function loudness({ L, R }) {
	const win = Math.min(L.length, len(0.4));
	let sum = 0;
	for (let i = 0; i < win; i++) sum += L[i] * L[i] + R[i] * R[i];
	let max = sum;
	for (let i = win; i < L.length; i++) {
		sum += L[i] * L[i] + R[i] * R[i] - L[i - win] * L[i - win] - R[i - win] * R[i - win];
		max = Math.max(max, sum);
	}
	return 10 * Math.log10(Math.max(max, 1e-12) / (2 * len(0.4)));
}

// share of the energy above 3 kHz (the user hears that as shrill), and for loops how even they are:
// the quietest, middle and loudest of their one-second RMS levels
function stats({ L, R }, loop) {
	const mono = new Float32Array(L.length);
	for (let i = 0; i < L.length; i++) mono[i] = (L[i] + R[i]) * 0.5;
	let all = 0;
	for (let i = 0; i < mono.length; i++) all += mono[i] * mono[i];
	const high = filter(filter(mono.slice(), 'hp', 3000), 'hp', 3000);
	let hi = 0;
	for (let i = 0; i < high.length; i++) hi += high[i] * high[i];
	let text = `>3k ${((100 * hi) / Math.max(all, 1e-12)).toFixed(1).padStart(4)}%`;
	if (loop) {
		const secs = [];
		for (let s = 0; s + SR <= mono.length; s += SR) {
			let e = 0;
			for (let i = s; i < s + SR; i++) e += L[i] * L[i] + R[i] * R[i];
			secs.push(10 * Math.log10(Math.max(e / (2 * SR), 1e-12)));
		}
		secs.sort((a, b) => a - b);
		const at = (p) => secs[Math.min(secs.length - 1, Math.floor(p * secs.length))].toFixed(1);
		text += `  1s RMS ${at(0)} / ${at(0.5)} / ${at(1)} dB`;
	}
	return text;
}

function wav(L, R) {
	const count = L.length;
	const buf = Buffer.alloc(44 + count * 4);
	buf.write('RIFF', 0);
	buf.writeUInt32LE(36 + count * 4, 4);
	buf.write('WAVEfmt ', 8);
	buf.writeUInt32LE(16, 16);
	buf.writeUInt16LE(1, 20);
	buf.writeUInt16LE(2, 22);
	buf.writeUInt32LE(SR, 24);
	buf.writeUInt32LE(SR * 4, 28);
	buf.writeUInt16LE(4, 32);
	buf.writeUInt16LE(16, 34);
	buf.write('data', 36);
	buf.writeUInt32LE(count * 4, 40);
	for (let i = 0; i < count; i++) {
		buf.writeInt16LE(Math.round(clamp(L[i], -1, 1) * 32767), 44 + i * 4);
		buf.writeInt16LE(Math.round(clamp(R[i], -1, 1) * 32767), 46 + i * 4);
	}
	return buf;
}

const FORMATS = ['ogg', 'm4a'];
const BLENDER =
	process.env.BLENDER || 'C:/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe';
const blender = (here, ...args) =>
	execFileSync(BLENDER, ['-b', '--factory-startup', '--python', path.join(here, 'sound-io.py'), '--', ...args], {
		stdio: ['ignore', 'ignore', 'inherit'],
	});

function main() {
	const here = path.dirname(fileURLToPath(import.meta.url));
	const outDir = path.resolve(here, '../static/assets/audio');
	const previewIndex = process.argv.indexOf('--preview');
	const previewDir = previewIndex > -1 ? path.resolve(process.argv[previewIndex + 1]) : undefined;
	if (previewDir) fs.mkdirSync(previewDir, { recursive: true });
	// --only <text>: renders just the sounds whose names hold it (to try a recipe), writes no sprite
	const onlyIndex = process.argv.indexOf('--only');
	const only = onlyIndex > -1 ? process.argv[onlyIndex + 1] : undefined;

	const rendered = [];
	for (const name of Object.keys(SOUNDS).sort()) {
		if (only && !name.includes(only)) continue;
		const { render, loop = false, level, peak = 0.6 } = SOUNDS[name];
		seed(hash(name));
		let audio = render();
		if (!loop) audio = trimTail(audio);
		const g = Math.min(Math.pow(10, (level - loudness(audio)) / 20), peak / peakOf(audio));
		for (const ch of [audio.L, audio.R]) for (let i = 0; i < ch.length; i++) ch[i] *= g;
		rendered.push({ name, loop, audio });
		console.log(
			`${name.padEnd(28)} ${(audio.L.length / SR).toFixed(2).padStart(6)}s  level ${loudness(audio).toFixed(1).padStart(6)} dB  peak ${peakOf(audio).toFixed(2)}  ${stats(audio, loop)}`,
		);
		if (previewDir) fs.writeFileSync(path.join(previewDir, `${name}.wav`), wav(audio.L, audio.R));
	}
	if (process.argv.includes('--dry') || only) return;

	// lay sounds out like audiosprite: each starts on a whole second, at least a second after the last
	const sprite = {};
	let cursor = 0;
	for (const { name, loop, audio } of rendered) {
		const ms = (audio.L.length / SR) * 1000;
		sprite[name] = loop ? [cursor, ms, true] : [cursor, ms];
		cursor = (Math.ceil((cursor + ms) / 1000) + 1) * 1000;
	}
	const L = new Float32Array(len(cursor / 1000));
	const R = new Float32Array(L.length);
	for (const { name, audio } of rendered) {
		const o = Math.round((sprite[name][0] / 1000) * SR);
		L.set(audio.L, o);
		R.set(audio.R, o);
	}
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crystal-sounds-'));
	const spriteWav = path.join(tmp, 'sprite.wav');
	fs.writeFileSync(spriteWav, wav(L, R));
	blender(here, 'encode', spriteWav, outDir);
	fs.rmSync(tmp, { recursive: true, force: true });
	for (const ext of FORMATS) {
		if (!fs.existsSync(path.join(outDir, `sounds.${ext}`))) throw new Error(`sounds.${ext} wasn't written`);
	}
	// the sample game's mp3 and ac3 are gone (Ogg and M4A cover every browser)
	for (const ext of ['mp3', 'ac3']) fs.rmSync(path.join(outDir, `sounds.${ext}`), { force: true });

	const names = Object.keys(sprite);
	const json = [
		'{',
		'\t"sprite": {',
		names
			.map((name) => `\t\t"${name}": [${sprite[name].map((v) => (typeof v === 'number' ? +v.toFixed(3) : v)).join(', ')}]`)
			.join(',\n'),
		'\t},',
		'\t"src": [',
		FORMATS.map((ext) => `\t\t"./assets/audio/sounds.${ext}"`).join(',\n'),
		'\t],',
		'\t"config": {',
		names.map((name) => `\t\t"${name}": { "volume": 1 }`).join(',\n'),
		'\t}',
		'}',
		'',
	].join('\n');
	fs.writeFileSync(path.join(outDir, 'sounds.json'), json);
	console.log(`\n${names.length} sounds, ${(cursor / 1000).toFixed(0)} s sprite -> ${FORMATS.map((ext) => `sounds.${ext}`).join(', ')}`);
}

main();
