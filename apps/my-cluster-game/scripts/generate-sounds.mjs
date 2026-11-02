// Generates RuneFall's sound sprite from code. Every sound below is synthesised here (no recordings
// or samples), under the same names the game already plays (plus the wind's), so the game's code
// only names them.
//
//   node scripts/generate-sounds.mjs                  (run from apps/my-cluster-game; pnpm sounds)
//   node scripts/generate-sounds.mjs --preview <dir>  (also writes each sound as <dir>/<name>.wav)
//   node scripts/generate-sounds.mjs --dry ...        (only renders: no sprite written)
//
// Writes static/assets/audio/sounds.{ogg,m4a,mp3,ac3} + sounds.json. ffmpeg isn't installed, so the
// encoding is done by Blender's own FFmpeg (scripts/encode-sounds.py; BLENDER=<path to blender.exe>
// if it isn't the Steam one). Output is deterministic: tweak a recipe and re-run to regenerate.
//
// The brief (the user's): a magical slot machine in an autumn forest at sunset; relaxing, cozy,
// enchanting, a little mysterious and rewarding. Chill fantasy ambient with lo-fi beats and soft
// Celtic melodies at 75-90 BPM: harp, soft piano, delicate bells, wooden percussion, mellow bass, a
// forest of wind and rustling leaves, magical chimes now and then. Soft attacks, no harsh highs,
// nothing aggressive or casino-like; the loops seamless, even in energy, fine for long sessions.

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
const at = (v, t) => (typeof v === 'function' ? v(t) : v);
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

// G major pentatonic (E minor's), counted upwards from a G: the sound effects keep to it, as it sits
// with both the base game's D dorian and the free spins' E minor
const PENTA = [0, 2, 4, 7, 9];
const penta = (i, root = n('G4')) => root + PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);

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

// filters in place; f and q may be functions of time
const filter = (buf, type, f, q = 0.707) => {
	const bq = new Biquad(type, at(f, 0), at(q, 0));
	const moving = typeof f === 'function' || typeof q === 'function';
	for (let i = 0; i < buf.length; i++) {
		if (moving && (i & 31) === 0) bq.set(type, at(f, i / SR), at(q, i / SR));
		buf[i] = bq.tick(buf[i]);
	}
	return buf;
};

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

const sine = (f, dur) => {
	const out = new Float32Array(len(dur));
	const w = (TAU * f) / SR;
	for (let i = 0; i < out.length; i++) out[i] = Math.sin(w * i);
	return out;
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

// a sine gliding from f0 to f1 over its length, shaped by `shape` (0..1 of its length)
const glide = (dur, f0, f1, shape = (u) => Math.sin(Math.PI * u)) => {
	const out = new Float32Array(len(dur));
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const u = i / out.length;
		out[i] = Math.sin(TAU * ph) * shape(u);
		ph += (f0 * Math.pow(f1 / f0, u)) / SR;
	}
	return out;
};

// ---------------------------------------------------------------------------------------------
// instruments

// additive voice: parts = [[ratio, gain, decaySeconds]]
function partials(freq, dur, parts, { attack = 0.001, hold = Infinity, rel = 0.05 } = {}) {
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
	}
	return fadeEnd(out, 0.005);
}

// Karplus-Strong plucked string
function pluck(freq, dur, { decay = 1, bright = 0.5 } = {}) {
	const out = new Float32Array(len(dur));
	const period = SR / freq;
	const delay = period - 0.5; // the two-tap average adds half a sample
	const di = Math.floor(delay);
	const df = delay - di;
	const exciteLen = Math.max(2, Math.round(period));
	const loss = Math.pow(0.001, 1 / (decay * freq));
	const smoothing = 0.1 + 0.9 * bright;
	let lp = 0;
	for (let i = 0; i < out.length; i++) {
		let x = 0;
		if (i < exciteLen) x = lp += (rand() * 2 - 1 - lp) * smoothing;
		const j = i - di;
		if (j >= 2) {
			const a = out[j] * (1 - df) + out[j - 1] * df;
			const b = out[j - 1] * (1 - df) + out[j - 2] * df;
			x += loss * 0.5 * (a + b);
		}
		out[i] = x;
	}
	return fadeEnd(filter(out, 'hp', 30), 0.01);
}

// concert harp: a plucked string over a round body, low strings ringing long and high ones short,
// its pluck softened so it never clicks
function harp(m, { dur, bright = 0.42, ring = 1 } = {}) {
	const f = mtof(m);
	const decay = clamp(3.4 * Math.sqrt(220 / f), 0.7, 4.5) * ring;
	const length = dur ?? decay;
	const string = norm(pluck(f, length, { decay, bright }), 0.6);
	const body = partials(f, length, [[1, 1, decay * 0.8], [2, 0.22, decay * 0.4], [3, 0.06, decay * 0.2]], { attack: 0.004 }); // prettier-ignore
	const out = mixIn(string, body, 0, 0.45);
	env(out, (t) => smooth(0, 0.003, t));
	return fadeEnd(filter(out, 'lp', clamp(f * 8, 2000, 7000), 0.6), 0.02);
}

// soft felt piano: two strings a hair apart with slightly stretched partials, a hushed hammer, the
// tone darker the lower it is; the damper comes down `hold` after the key
function piano(m, hold, { velocity = 0.6 } = {}) {
	const f = mtof(m);
	const decay = clamp(4.5 * Math.sqrt(262 / f), 1.2, 8);
	const stretch = 0.0004;
	const parts = [];
	for (let k = 1; k <= 7; k++) {
		const ratio = k * Math.sqrt(1 + stretch * k * k);
		parts.push([ratio, Math.pow(k, -1.4) * (k === 1 ? 1 : velocity), decay / (1 + 0.7 * (k - 1))]);
	}
	const dur = hold + 0.35;
	const options = { attack: 0.005, hold, rel: 0.3 };
	const out = partials(f * Math.pow(2, 1.3 / 1200), dur, parts, options);
	mixIn(out, partials(f * Math.pow(2, -1.3 / 1200), dur, parts, options));
	mixIn(
		out,
		filter(
			env(noise(0.03), (t) => ex(t, 0.02)),
			'bp',
			500,
			0.8,
		),
		0,
		0.04,
	);
	return filter(out, 'lp', clamp(f * 5, 1400, 5200), 0.6);
}

// celesta: a soft little bell
const celesta = (m, dur = 1.6) =>
	filter(
		partials(mtof(m), dur, [[1, 1, dur * 0.75], [2, 0.08, dur * 0.3], [4.02, 0.02, dur * 0.12], [5.4, 0.006, dur * 0.05]], { attack: 0.005 }), // prettier-ignore
		'lp',
		4500,
	);

// a glass bell: two close tones that shimmer against each other
const crystal = (m, dur = 1.4) => {
	const f = mtof(m);
	return filter(
		partials(f, dur, [[1, 0.7, dur], [1.0035, 0.5, dur * 0.9], [2.76, 0.035, dur * 0.25], [5.4, 0.006, dur * 0.08]], { attack: 0.008 }), // prettier-ignore
		'lp',
		4500,
	);
};

// a struck singing bowl: pairs of close partials beating slowly, for the runes
const bowl = (m, dur = 4) =>
	partials(mtof(m), dur, [[1, 1, dur], [1.003, 0.8, dur], [2.71, 0.35, dur * 0.6], [2.716, 0.28, dur * 0.6], [5.2, 0.1, dur * 0.3], [8.4, 0.03, dur * 0.15]], { attack: 0.012 }); // prettier-ignore

// wooden flute (a low whistle): a soft near-sine with a breathy edge, its vibrato coming in late
function flute(m, hold, { vibrato = 0.005, breathiness = 1 } = {}) {
	const f = mtof(m);
	const out = new Float32Array(len(hold + 0.14));
	const breath = new Biquad('bp', f * 2, 1.8);
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const vib = 1 + vibrato * Math.sin(TAU * 5.2 * t) * smooth(0.25, 0.6, t);
		const tone = Math.sin(TAU * ph) + 0.16 * Math.sin(2 * TAU * ph) + 0.05 * Math.sin(3 * TAU * ph);
		ph = (ph + (f * vib) / SR) % 1;
		const air = breath.tick(rand() * 2 - 1) * breathiness * (0.22 + 0.5 * Math.exp(-t / 0.05));
		out[i] = (tone + air) * smooth(0, 0.05, t) * release(t, hold, 0.14);
	}
	return filter(out, 'lp', 4800);
}

// round, mellow bass, lightly saturated so it still reads on small speakers
function bass(m, hold) {
	const f = mtof(m);
	const out = new Float32Array(len(hold + 0.15));
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const s = Math.tanh(1.5 * (Math.sin(TAU * ph) + 0.18 * Math.sin(2 * TAU * ph)));
		out[i] =
			0.55 * s * smooth(0, 0.015, t) * (0.7 + 0.3 * Math.exp(-t / 0.3)) * release(t, hold, 0.15);
		ph = (ph + f / SR) % 1;
	}
	return out;
}

// warm, dark strings to hold the chords together
function strings(m, hold, { attack = 0.9, rel = 0.9, cutoff = 2 } = {}) {
	const f = mtof(m);
	const out = new Float32Array(len(hold + rel));
	const lp = new Biquad('lp', Math.min(f * cutoff, 2400), 0.7);
	const hp = new Biquad('hp', 150, 0.7);
	const detune = [1, 1.004, 0.996];
	const ph = detune.map(() => rand());
	const vibPhase = rand() * TAU;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const vib = 1 + 0.003 * Math.sin(TAU * 4.8 * t + vibPhase);
		let s = 0;
		for (let k = 0; k < 3; k++) {
			const dt = (f * detune[k] * vib) / SR;
			s += saw(ph[k], dt);
			ph[k] = (ph[k] + dt) % 1;
		}
		out[i] = hp.tick(lp.tick(s)) * smooth(0, attack, t) * release(t, hold, rel) * 0.3;
	}
	return out;
}

// ---------------------------------------------------------------------------------------------
// percussion: wood and skin, soft

// bodhrán, the Celtic frame drum: a low skin tone with a soft slap of the beater
function bodhran({ tone = 80, decay = 0.4, slap = 0.35 } = {}) {
	const out = sweep(decay, tone * 1.6, tone, 0.018);
	mixIn(
		out,
		partials(tone * 1.59, decay * 0.5, [[1, 1, decay * 0.35]], { attack: 0.002 }),
		0,
		0.25,
	);
	mixIn(
		out,
		filter(
			env(noise(0.05), (t) => ex(t, 0.03)),
			'bp',
			850,
			0.7,
		),
		0,
		slap,
	);
	return norm(filter(out, 'lp', 2400));
}

// a soft, round kick under the bodhrán
const kick = () => sweep(0.4, 110, 48, 0.03);

// brushes on a snare
const brush = (decay = 0.16) =>
	norm(
		env(
			filter(filter(noise(decay + 0.03), 'bp', 2300, 0.5), 'lp', 6000),
			(t) => smooth(0, 0.007, t) * ex(t, decay),
		),
	);

const shaker = (decay = 0.07) =>
	norm(
		env(
			filter(filter(noise(decay + 0.01), 'hp', 4500), 'lp', 8500),
			(t) => smooth(0, 0.012, t) * ex(t, decay),
		),
	);

const malletClick = (f, dur = 0.004) =>
	filter(
		env(noise(dur), (t) => 1 - t / dur),
		'bp',
		Math.min(f * 2.5, 6000),
		1.5,
	);

// a tuned wooden log drum
const logDrum = (m, decay = 0.22) => {
	const f = mtof(m);
	return filter(
		mixIn(partials(f, decay + 0.02, [[1, 1, decay], [3.9, 0.12, decay * 0.25]], { attack: 0.002 }), malletClick(f, 0.003), 0, 0.15), // prettier-ignore
		'lp',
		3500,
	);
};

// a wooden tap, like knuckles on a box
const woodTap = (f = 900, decay = 0.05) =>
	filter(
		mixIn(partials(f, decay + 0.01, [[1, 1, decay], [2.3, 0.25, decay * 0.4]], { attack: 0.0015 }), malletClick(f, 0.002), 0, 0.12), // prettier-ignore
		'lp',
		4000,
	);

// soft "poof" of air
const poof = (decay = 0.5, top = 1800) =>
	norm(
		env(
			filter(noise(decay), 'lp', (t) => top * Math.exp(-t / (decay * 0.3)) + 180, 0.8),
			(t) => smooth(0, 0.008, t) * ex(t, decay),
		),
	);

// band-passed noise gliding from f0 to f1, swelling up to `peakAt` (0..1 of dur) then fading
function whoosh(dur, f0, f1, { q = 1, peakAt = 0.5 } = {}) {
	const out = filter(noise(dur), 'bp', (t) => f0 * Math.pow(f1 / f0, t / dur), q);
	return norm(
		env(out, (t) => {
			const u = t / dur;
			return u < peakAt
				? Math.pow(u / peakAt, 2)
				: Math.pow(Math.max(0, 1 - (u - peakAt) / (1 - peakAt)), 1.5);
		}),
	);
}

// leaves rustling for `dur`: a scatter of tiny dry crackles, thickest in the middle
function rustle(dur, { density = 900, centre = 2200 } = {}) {
	const out = new Float32Array(len(dur));
	let decayed = 0;
	for (let i = 0; i < out.length; i++) {
		const u = i / out.length;
		if (rand() < (density / SR) * Math.pow(Math.sin(Math.PI * u), 1.5)) decayed += rr(-1, 1);
		decayed *= 0.93;
		out[i] = decayed + (rand() * 2 - 1) * 0.04 * Math.sin(Math.PI * u);
	}
	return norm(filter(filter(out, 'bp', centre, 0.8), 'lp', 4500));
}

// a distant bird: a few quick chirps
function bird() {
	const out = new Float32Array(len(0.6));
	const f0 = rr(1900, 2600);
	const count = 2 + Math.floor(rand() * 2);
	for (let k = 0; k < count; k++) {
		const up = rand() < 0.6;
		const chirp = glide(rr(0.05, 0.08), up ? f0 : f0 * 1.3, up ? f0 * 1.3 : f0);
		mixIn(out, chirp, k * rr(0.1, 0.14), k === count - 1 ? 0.7 : 1);
	}
	return filter(out, 'lp', 3800);
}

// ---------------------------------------------------------------------------------------------
// mixing

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
	add(src, t = 0, { gain = 1, pan = 0, send = 0.25 } = {}) {
		const o = Math.max(0, Math.round(t * SR));
		this.ensure(o + src.length);
		this.end = Math.max(this.end, o + src.length);
		const [from, to] = Array.isArray(pan) ? pan : [pan, pan];
		const gains = (p) => {
			const angle = ((clamp(p, -1, 1) + 1) * Math.PI) / 4;
			return [Math.cos(angle) * Math.SQRT2 * gain, Math.sin(angle) * Math.SQRT2 * gain];
		};
		let [gl, gr] = gains(from);
		for (let i = 0; i < src.length; i++) {
			if (from !== to && (i & 63) === 0) [gl, gr] = gains(from + ((to - from) * i) / src.length);
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
	render({ reverb = {}, loop } = {}) {
		const tail = reverb ? (reverb.tail ?? 3) : 0;
		const size = Math.max(this.end, loop ? len(loop) : 0) + len(tail);
		this.ensure(size);
		let L = this.L.slice(0, size);
		let R = this.R.slice(0, size);
		if (reverb) {
			const [wL, wR] = freeverb(this.sL.subarray(0, size), this.sR.subarray(0, size), reverb);
			for (let i = 0; i < size; i++) {
				L[i] += wL[i];
				R[i] += wR[i];
			}
		}
		if (loop) {
			// fold everything that rings past the loop point back onto the start, so the loop is seamless
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

// gentle tanh saturation to glue a music mix together
function glue({ L, R }, drive = 1.2) {
	const peak = peakOf({ L, R });
	const k = drive / peak;
	const d = Math.tanh(drive);
	for (let i = 0; i < L.length; i++) {
		L[i] = Math.tanh(L[i] * k) / d;
		R[i] = Math.tanh(R[i] * k) / d;
	}
	return { L, R };
}

// filters a loop as if it repeated forever, so the seam stays seamless
function circularFilter({ L, R }, type, f, q = 0.707) {
	for (const ch of [L, R]) {
		const bq = new Biquad(type, f, q);
		for (let i = Math.max(0, ch.length - 8192); i < ch.length; i++) bq.tick(ch[i]);
		for (let i = 0; i < ch.length; i++) ch[i] = bq.tick(ch[i]);
	}
}

// the music and drums dip a little under each kick, like a side-chained compressor
function duck({ L, R }, kicks, loop, depth = 0.06, rel = 0.25) {
	const N = L.length;
	const times = kicks
		.map((t) => Math.round((((t % loop) + loop) % loop) * SR))
		.sort((a, b) => a - b);
	if (!times.length) return;
	let k = -1;
	for (let i = 0; i < N; i++) {
		while (k + 1 < times.length && times[k + 1] <= i) k++;
		const dt = (i - (k >= 0 ? times[k] : times[times.length - 1] - N)) / SR;
		const g = 1 - depth * (dt < 0.01 ? dt / 0.01 : Math.exp(-(dt - 0.01) / rel));
		L[i] *= g;
		R[i] *= g;
	}
}

// a slow tape wow, whole cycles a loop so the seam stays seamless
function tapeWow({ L, R }, loop, amount = 1) {
	const N = L.length;
	const rate = Math.max(1, Math.round(0.4 * loop)) / loop;
	const swing = (0.002 * amount) / (TAU * rate);
	for (const ch of [L, R]) {
		const src = ch.slice();
		for (let i = 0; i < N; i++) {
			const d = (swing + 0.001 + swing * Math.sin((TAU * rate * i) / SR)) * SR;
			const p = (((i - d) % N) + N) % N;
			const j = Math.floor(p);
			const fr = p - j;
			ch[i] = src[j] * (1 - fr) + src[(j + 1) % N] * fr;
		}
	}
}

const rmsOf = ({ L, R }) => {
	let sum = 0;
	for (let i = 0; i < L.length; i++) sum += L[i] * L[i] + R[i] * R[i];
	return Math.sqrt(sum / (2 * L.length));
};

function peakOf({ L, R }) {
	let peak = 0;
	for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
	return peak;
}

// ---------------------------------------------------------------------------------------------
// the forest: a seamless bed of soft wind that swells and settles (its gusts whole cycles of the
// loop), leaves rustling now and then and, far off, a bird

function forest(loop, { wind = 1, leaves = 1, birds = 1 } = {}) {
	const mx = new Mix(loop + 3);
	const swellOf = (cycles, phase) => {
		const [a, b] = cycles;
		return (t) =>
			0.3 + 0.7 * (0.5 + 0.5 * Math.sin((TAU * a * t) / loop + phase)) * (0.65 + 0.35 * Math.sin((TAU * b * t) / loop + 2 * phase)); // prettier-ignore
	};
	for (const [band, q, cycles, gain] of [
		[420, 0.6, [3, 7], 1],
		[1500, 1.4, [5, 11], 0.3],
	]) {
		const air = { L: noise(loop), R: noise(loop) };
		circularFilter(air, 'bp', band, q);
		circularFilter(air, 'lp', band * 2.5);
		const swell = swellOf(cycles, rand() * TAU);
		env(air.L, swell);
		env(air.R, swell);
		mx.add(air.L, 0, { gain: gain * wind, pan: -0.8, send: 0 });
		mx.add(air.R, 0, { gain: gain * wind, pan: 0.8, send: 0 });
	}
	const rustles = Math.round((loop / 3.5) * leaves);
	for (let k = 0; k < rustles; k++) {
		const dur = rr(0.4, 1.2);
		mx.add(rustle(dur, { centre: rr(1500, 2700) }), rr(0, loop), {
			gain: rr(0.04, 0.09) * leaves,
			pan: rr(-0.9, 0.9),
			send: 0.2,
		});
	}
	const calls = Math.round((loop / 24) * birds);
	for (let k = 0; k < calls; k++) {
		mx.add(bird(), rr(0, loop), { gain: rr(0.015, 0.03) * birds, pan: rr(-0.9, 0.9), send: 0.6 });
	}
	const out = mx.render({ reverb: { size: 0.85, damp: 0.6 }, loop });
	circularFilter(out, 'lp', 3500);
	return out;
}

// ---------------------------------------------------------------------------------------------
// music: chill fantasy lo-fi. Harp, soft piano, bells and a wooden flute over a laid-back beat of
// bodhrán, brushes and shaker, warm strings and a mellow bass, the forest round it all; then a
// master chain of gentle ducking, a soft low-pass (no harsh highs), a little tape wow and glue.

// time of a 16th step in a bar: off 16ths swing late and everything sits slightly behind the beat
const groove = (beat, swing) => (bar, step) =>
	((bar * 16 + step) * beat) / 4 + (step % 2 ? ((swing - 0.5) * beat) / 2 : 0) + rr(0, 0.008);

// one bar of the beat; steps are 16ths, kick times are collected for the ducking
function beatBar(
	drums,
	kicks,
	T,
	bar,
	{ kick: kicks1 = [], drum = [], brushes = [], shakers = 0, taps = [] },
) {
	for (const s of kicks1) {
		const t = T(bar, s);
		drums.add(kick(), t, { gain: 0.32, send: 0.02 });
		kicks.push(t);
	}
	for (const s of drum)
		drums.add(bodhran(), T(bar, s), { gain: 0.3 * rr(0.85, 1), pan: -0.1, send: 0.12 });
	for (const s of brushes) drums.add(brush(), T(bar, s), { gain: 0.16, pan: 0.15, send: 0.2 });
	if (shakers) {
		for (let s = 0; s < 16; s += shakers) {
			drums.add(shaker(), T(bar, s), { gain: (s % 4 === 0 ? 0.05 : 0.03) * rr(0.8, 1.1), pan: 0.4, send: 0.06 }); // prettier-ignore
		}
	}
	for (const [s, m] of taps)
		drums.add(logDrum(m), T(bar, s), { gain: 0.12, pan: -0.35, send: 0.2 });
}

// a rolled chord on the soft piano, each note held `hold`
const pianoChord = (mx, ms, t, hold, { gain = 0.11, roll = 0.02 } = {}) =>
	ms.forEach((m, k) => mx.add(piano(m, hold), t + k * roll, { gain, pan: -0.3 + (0.6 * k) / (ms.length - 1 || 1), send: 0.3 })); // prettier-ignore

const pad = (mx, ms, t, hold, gain = 0.04) =>
	ms.forEach((m) => mx.add(strings(m, hold), t, { gain, pan: rr(-0.6, 0.6), send: 0.5 }));

// a melody, [bar, beat, note, beats], on `voice` (m, seconds) => buffer
const playMelody = (
	mx,
	T,
	beat,
	melody,
	voice,
	{ from = 0, octave = 0, gain, pan = 0, send = 0.35 },
) => {
	for (const [bar, b, name, beats] of melody) {
		mx.add(voice(n(name) + octave, beats * beat), T(from + bar, b * 4), { gain, pan, send });
	}
};

// the flute's ornament: a quick cut from the note above into each long note now and then
const fluteLine = (mx, T, beat, melody, { from = 0, gain = 0.2, scale }) => {
	for (const [bar, b, name, beats] of melody) {
		const m = n(name);
		const t = T(from + bar, b * 4);
		mx.add(flute(m, beats * beat * 0.92), t, { gain, pan: -0.15, send: 0.4 });
		if (beats >= 1 && rand() < 0.5) {
			const above = scale.find((s) => s > m) ?? m + 2;
			mx.add(flute(above, 0.035, { vibrato: 0 }), t - 0.04, {
				gain: gain * 0.6,
				pan: -0.15,
				send: 0.4,
			});
		}
	}
};

// a scale's notes (MIDI, rising) from its pitch classes (0 = C)
const scaleNotes = (pitchClasses) => {
	const out = [];
	for (let o = 0; o < 10; o++)
		for (const s of [...pitchClasses].sort((a, b) => a - b)) out.push(12 * o + s);
	return out;
};

// harp broken chords in 8ths over each bar
const ARP = [0, 1, 2, 3, 4, 3, 2, 1];
const harpArp = (mx, T, bar, chordNotes, { gain = 0.1, octave = 0, pattern = ARP } = {}) => {
	const ladder = [...chordNotes, chordNotes[0] + 12].map((m) => m + octave);
	pattern.forEach((k, e) => mx.add(harp(ladder[k % ladder.length], { ring: 0.7 }), T(bar, e * 2), { gain: gain * (e % 2 ? 0.8 : 1), pan: e % 2 ? 0.35 : 0.2, send: 0.35 })); // prettier-ignore
};

// a sprinkle of celesta notes from `pool`, now and then: a little magic
const sparkle = (mx, t0, dur, count, pool, { gain = 0.06 } = {}) => {
	for (let k = 0; k < count; k++) {
		mx.add(celesta(pool[Math.floor(rand() * pool.length)], 1.2), t0 + rand() * dur, { gain: gain * rr(0.6, 1), pan: rr(-0.7, 0.7), send: 0.55 }); // prettier-ignore
	}
};

function master(
	music,
	drums,
	{ loop, kicks, cutoff = 4800, wow = 0.6, ambience = 0.16, forestOptions = {} },
) {
	for (let i = 0; i < music.L.length; i++) {
		music.L[i] += drums.L[i];
		music.R[i] += drums.R[i];
	}
	duck(music, kicks, loop);
	circularFilter(music, 'lp', cutoff, 0.6);
	circularFilter(music, 'hp', 35);
	tapeWow(music, loop, wow);
	glue(music, 1.15);
	// the forest under it, as loud as a share of the music
	const woods = forest(loop, forestOptions);
	const g = (ambience * rmsOf(music)) / rmsOf(woods);
	for (let i = 0; i < music.L.length; i++) {
		music.L[i] += woods.L[i] * g;
		music.R[i] += woods.R[i] * g;
	}
	return music;
}

// base game: 80 BPM in D dorian; 16 bars, twice: the harp has the tune the first time, the flute
// the second, with the harp breaking the chords under it and bells here and there
const MAIN_CHORDS = [
	['D2', 'F3 A3 C4 E4'], // Dm9
	['C2', 'E3 G3 B3 D4'], // Cmaj9
	['Bb1', 'D3 F3 A3 C4'], // Bbmaj9
	['F2', 'A3 C4 E4 G4'], // Fmaj9
	['G2', 'A3 B3 D4 F4'], // G9
	['D2', 'F3 A3 C4 E4'], // Dm9
	['Bb1', 'D3 F3 A3 C4'], // Bbmaj9
	['A1', 'G3 C#4 E4 A4'], // A7
	['Bb1', 'D3 F3 A3 C4'], // Bbmaj9
	['C2', 'E3 G3 C4 D4'], // Cadd9
	['D2', 'F3 A3 C4 E4'], // Dm9
	['A1', 'E3 G3 C4 E4'], // Am7
	['G1', 'F3 A3 Bb3 D4'], // Gm9
	['Bb1', 'D3 F3 A3 C4'], // Bbmaj9
	['F2', 'E3 A3 C4 F4'], // Fmaj7
	['A1', 'G3 C#4 E4 A4'], // A7
];
// [bar, beat, note, beats]
const MAIN_TUNE = [
	[0, 0, 'A4', 1.5], [0, 1.5, 'D5', 0.5], [0, 2, 'E5', 1], [0, 3, 'F5', 0.5], [0, 3.5, 'E5', 0.5],
	[1, 0, 'D5', 1.5], [1, 1.5, 'C5', 0.5], [1, 2, 'A4', 2],
	[2, 0, 'F4', 0.5], [2, 0.5, 'G4', 0.5], [2, 1, 'A4', 1], [2, 2, 'C5', 1], [2, 3, 'A4', 1],
	[3, 0, 'G4', 1.5], [3, 1.5, 'F4', 0.5], [3, 2, 'E4', 2],
	[4, 0, 'D4', 0.5], [4, 0.5, 'G4', 0.5], [4, 1, 'B4', 1], [4, 2, 'A4', 0.5], [4, 2.5, 'G4', 0.5], [4, 3, 'A4', 1],
	[5, 0, 'D5', 1.5], [5, 1.5, 'E5', 0.5], [5, 2, 'F5', 1], [5, 3, 'E5', 1],
	[6, 0, 'D5', 1], [6, 1, 'C5', 0.5], [6, 1.5, 'A4', 0.5], [6, 2, 'F4', 1], [6, 3, 'G4', 1],
	[7, 0, 'E4', 1.5], [7, 1.5, 'C#5', 0.5], [7, 2, 'A4', 2],
	[8, 0, 'F5', 1.5], [8, 1.5, 'E5', 0.5], [8, 2, 'D5', 1], [8, 3, 'C5', 1],
	[9, 0, 'E5', 1], [9, 1, 'G5', 1], [9, 2, 'E5', 0.5], [9, 2.5, 'D5', 0.5], [9, 3, 'C5', 1],
	[10, 0, 'D5', 1.5], [10, 1.5, 'A4', 0.5], [10, 2, 'C5', 0.5], [10, 2.5, 'D5', 0.5], [10, 3, 'E5', 1],
	[11, 0, 'C5', 1.5], [11, 1.5, 'B4', 0.5], [11, 2, 'A4', 2],
	[12, 0, 'Bb4', 1], [12, 1, 'A4', 0.5], [12, 1.5, 'G4', 0.5], [12, 2, 'D5', 1.5], [12, 3.5, 'C5', 0.5],
	[13, 0, 'D5', 1], [13, 1, 'F5', 1], [13, 2, 'E5', 0.5], [13, 2.5, 'D5', 0.5], [13, 3, 'C5', 1],
	[14, 0, 'A4', 1.5], [14, 1.5, 'G4', 0.5], [14, 2, 'F4', 0.5], [14, 2.5, 'E4', 0.5], [14, 3, 'F4', 1],
	[15, 0, 'E4', 1.5], [15, 1.5, 'G4', 0.5], [15, 2, 'A4', 2],
]; // prettier-ignore
// D dorian's pitch classes (C major's notes)
const D_DORIAN = [0, 2, 4, 5, 7, 9, 11];

function bgmMain() {
	const beat = 60 / 80;
	const bars = 32;
	const loop = bars * 4 * beat;
	const T = groove(beat, 0.6);
	const music = new Mix(loop + 5);
	const drums = new Mix(loop + 2);
	const kicks = [];

	for (let bar = 0; bar < bars; bar++) {
		const [bassName, voicing] = MAIN_CHORDS[bar % 16];
		const root = n(bassName);
		const chordNotes = notes(voicing);
		const second = bar >= 16;
		pianoChord(music, chordNotes, T(bar, 0), 3.8 * beat, { gain: second ? 0.075 : 0.1 });
		pad(music, chordNotes, T(bar, 0), 4 * beat);
		music.add(bass(root, 2.6 * beat), T(bar, 0), { gain: 0.36, send: 0.05 });
		music.add(bass(root + (bar % 2 ? 7 : 12), 0.8 * beat), T(bar, 11), { gain: 0.2, send: 0.05 });
		if (second) harpArp(music, T, bar, chordNotes, { gain: 0.075, octave: 12 });

		// each half opens lightly, a breath before the beat comes back in
		const quiet = bar % 16 < 2;
		const fill = bar % 4 === 3;
		beatBar(drums, kicks, T, bar, {
			kick: quiet ? [] : [0, 10],
			drum: quiet ? [] : fill ? [6, 14, 15] : [6],
			brushes: quiet ? [12] : [4, 12],
			shakers: quiet ? 4 : 2,
			taps: fill
				? [
						[13, n('D4')],
						[14, n('A3')],
					]
				: [],
		});
		// a sprinkle of bells at the end of every fourth bar
		if (bar % 4 === 3) sparkle(music, T(bar, 8), 2 * beat, 3, notes('A4 C5 D5 E5 G5 A5'));
	}

	playMelody(music, T, beat, MAIN_TUNE, (m) => harp(m, { bright: 0.4 }), { gain: 0.32, pan: -0.1 });
	fluteLine(music, T, beat, MAIN_TUNE, { from: 16, gain: 0.17, scale: scaleNotes(D_DORIAN) });
	// the bells answer the flute's phrase ends
	for (const [bar, b, name, beats] of MAIN_TUNE) {
		if (beats >= 2) music.add(celesta(n(name), 2), T(16 + bar, b * 4 + 2), { gain: 0.06, pan: 0.4, send: 0.5 }); // prettier-ignore
	}

	return master(
		music.render({ reverb: { size: 0.82, damp: 0.5 }, loop }),
		drums.render({ reverb: { size: 0.4, damp: 0.6, tail: 1 }, loop }),
		{ loop, kicks, cutoff: 7500, ambience: 0.18 },
	);
}

// free spins: 88 BPM in E minor, brighter and more sparkling: the harp breaks every chord, bells
// carry the tune first, then the flute, then the harp with bells over it; the beat a little fuller
const FS_CHORDS = [
	['E2', 'G3 B3 D4 F#4'], // Em9
	['C2', 'E3 G3 B3 D4'], // Cmaj9
	['G2', 'B3 D4 E4 A4'], // G6/9
	['D2', 'F#3 A3 D4 E4'], // Dadd9
	['E2', 'G3 B3 D4 F#4'], // Em9
	['C2', 'E3 G3 B3 D4'], // Cmaj9
	['A1', 'G3 C4 E4 B4'], // Am9
	['B1', 'A3 D#4 F#4 B4'], // B7
];
const FS_TUNE = [
	[0, 0, 'B4', 1], [0, 1, 'E5', 0.5], [0, 1.5, 'F#5', 0.5], [0, 2, 'G5', 1], [0, 3, 'F#5', 0.5], [0, 3.5, 'E5', 0.5],
	[1, 0, 'G5', 1.5], [1, 1.5, 'E5', 0.5], [1, 2, 'D5', 1], [1, 3, 'B4', 1],
	[2, 0, 'D5', 1], [2, 1, 'E5', 0.5], [2, 1.5, 'D5', 0.5], [2, 2, 'B4', 1], [2, 3, 'A4', 1],
	[3, 0, 'F#4', 1.5], [3, 1.5, 'A4', 0.5], [3, 2, 'D5', 2],
	[4, 0, 'B4', 0.5], [4, 0.5, 'D5', 0.5], [4, 1, 'E5', 1], [4, 2, 'G5', 1], [4, 3, 'A5', 1],
	[5, 0, 'B5', 1.5], [5, 1.5, 'A5', 0.5], [5, 2, 'G5', 1], [5, 3, 'E5', 1],
	[6, 0, 'C5', 1], [6, 1, 'E5', 0.5], [6, 1.5, 'G5', 0.5], [6, 2, 'B5', 1], [6, 3, 'A5', 1],
	[7, 0, 'F#5', 1.5], [7, 1.5, 'D#5', 0.5], [7, 2, 'B4', 2],
]; // prettier-ignore
// E minor's pitch classes (G major's notes)
const E_MINOR = [0, 2, 4, 6, 7, 9, 11];

function bgmFreespin() {
	const beat = 60 / 88;
	const bars = 24;
	const loop = bars * 4 * beat;
	const T = groove(beat, 0.58);
	const music = new Mix(loop + 5);
	const drums = new Mix(loop + 2);
	const kicks = [];

	for (let bar = 0; bar < bars; bar++) {
		const [bassName, voicing] = FS_CHORDS[bar % 8];
		const root = n(bassName);
		const chordNotes = notes(voicing);
		pianoChord(music, chordNotes, T(bar, 0), 2.6 * beat, { gain: 0.08 });
		pianoChord(music, chordNotes.slice(1), T(bar, 10), 1.4 * beat, { gain: 0.045 });
		pad(music, chordNotes, T(bar, 0), 4 * beat, 0.035);
		for (const [s, hold, iv, g] of [
			[0, 2.2, 0, 0.36],
			[10, 1.2, 0, 0.3],
			[14, 0.4, 12, 0.16],
		]) {
			music.add(bass(root + iv, hold * beat), T(bar, s), { gain: g, send: 0.05 });
		}
		harpArp(music, T, bar, chordNotes, { gain: 0.085, octave: 12 });

		const fill = bar % 8 === 7;
		beatBar(drums, kicks, T, bar, {
			kick: [0, 7, 10],
			drum: fill ? [6, 13, 14, 15] : [6, 14],
			brushes: [4, 12],
			shakers: 1,
			taps:
				bar % 4 === 1
					? [
							[11, n('E4')],
							[15, n('B3')],
						]
					: [],
		});
		if (bar % 2 === 1)
			sparkle(music, T(bar, 4), 3 * beat, 3, notes('B4 D5 E5 G5 A5 B5'), { gain: 0.05 });
	}

	const scale = scaleNotes(E_MINOR);
	playMelody(music, T, beat, FS_TUNE, (m) => celesta(m, 1.6), { gain: 0.2, pan: -0.1, send: 0.45 });
	playMelody(music, T, beat, FS_TUNE, (m) => harp(m, { ring: 0.8 }), {
		gain: 0.12,
		octave: -12,
		pan: 0.15,
	});
	fluteLine(music, T, beat, FS_TUNE, { from: 8, gain: 0.17, scale });
	playMelody(music, T, beat, FS_TUNE, (m) => harp(m, { bright: 0.45 }), {
		from: 16,
		gain: 0.3,
		pan: -0.1,
	});
	playMelody(music, T, beat, FS_TUNE, (m) => celesta(m, 1.4), { from: 16, gain: 0.07, octave: -12, pan: 0.35, send: 0.5 }); // prettier-ignore

	return master(
		music.render({ reverb: { size: 0.82, damp: 0.5 }, loop }),
		drums.render({ reverb: { size: 0.4, damp: 0.6, tail: 1 }, loop }),
		{ loop, kicks, cutoff: 8000, ambience: 0.12, forestOptions: { birds: 0.6 } },
	);
}

// big wins: a bright, warm 4 bar loop in D, each level a step higher and a layer fuller: harp and
// piano, then bells with the tune, the flute, a fuller beat with strings, a shower of sparkles
// [bass, voicing], in semitones from the key's D5 and D4
const WIN_CHORDS = [
	[-36, [-8, -5, 0, 2]], // Dadd9
	[-39, [-3, 0, 4, 7]], // Bm7
	[-43, [-7, -3, 0, 4]], // Gmaj7
	[-41, [-5, 0, 2, 7]], // Asus4
];
// [bar, beat, semitones above the key's D5, beats]
const WIN_TUNE = [
	[0, 0, 4, 1], [0, 1, 7, 1], [0, 2, 12, 2],
	[1, 0, 11, 1], [1, 1, 9, 1], [1, 2, 4, 2],
	[2, 0, 5, 1], [2, 1, 9, 1], [2, 2, 12, 1], [2, 3, 14, 1],
	[3, 0, 11, 2], [3, 2, 7, 2],
]; // prettier-ignore

function bgmWin(level) {
	const beat = 60 / 90;
	const bars = 4;
	const loop = bars * 4 * beat;
	const T = groove(beat, 0.55);
	const key = n('D5') + [0, 2, 3, 5, 7][level];
	const music = new Mix(loop + 5);
	const drums = new Mix(loop + 2);
	const kicks = [];

	for (let bar = 0; bar < bars; bar++) {
		const [bassOffset, voicing] = WIN_CHORDS[bar];
		const chordNotes = voicing.map((s) => key - 12 + s);
		pianoChord(music, chordNotes, T(bar, 0), 3.8 * beat, { gain: 0.09 });
		music.add(bass(key + bassOffset, 3 * beat), T(bar, 0), { gain: 0.34, send: 0.05 });
		harpArp(music, T, bar, chordNotes, { gain: 0.09 });
		if (level >= 3) pad(music, chordNotes, T(bar, 0), 4 * beat, 0.05);
		beatBar(drums, kicks, T, bar, {
			kick: [0, 8],
			drum: level >= 1 ? [6, 14] : [],
			brushes: [4, 12],
			shakers: level >= 3 ? 1 : 2,
		});
		if (level >= 4) sparkle(music, T(bar, 0), 4 * beat, 6, [0, 2, 4, 7, 9, 12, 14].map((s) => key + s), { gain: 0.05 }); // prettier-ignore
	}
	for (const [bar, b, s, beats] of WIN_TUNE) {
		const t = T(bar, b * 4);
		if (level >= 1) music.add(celesta(key + s, 1.6), t, { gain: 0.16, pan: -0.15, send: 0.45 });
		if (level >= 2) music.add(flute(key + s - 12, beats * beat * 0.92), t, { gain: 0.15, pan: 0.1, send: 0.4 }); // prettier-ignore
		if (level === 0) music.add(harp(key + s - 12, { bright: 0.45 }), t, { gain: 0.25, send: 0.35 });
	}
	return master(
		music.render({ reverb: { size: 0.8, damp: 0.5 }, loop }),
		drums.render({ reverb: { size: 0.4, damp: 0.6, tail: 1 }, loop }),
		{ loop, kicks, cutoff: 5000, ambience: 0.06, forestOptions: { birds: 0 } },
	);
}

// the big win's count-up: no coins, a soft, seamless shimmer of bells and wind chimes
function shimmerLoop() {
	const loop = 4;
	const mx = new Mix(loop + 3);
	const pool = [0, 2, 4, 7, 9, 12, 14, 16].map((s) => n('G4') + s);
	for (let k = 0; k < 22; k++) {
		const t = (k / 22) * loop + rr(-0.05, 0.05);
		mx.add(celesta(pool[Math.floor(rand() * pool.length)], 1.3), t, { gain: rr(0.08, 0.14), pan: rr(-0.7, 0.7), send: 0.55 }); // prettier-ignore
	}
	for (let k = 0; k < 6; k++) {
		mx.add(crystal(pool[Math.floor(rand() * pool.length)], 1.2), rr(0, loop), { gain: 0.05, pan: rr(-0.8, 0.8), send: 0.6 }); // prettier-ignore
	}
	const out = mx.render({ reverb: { size: 0.85, damp: 0.5 }, loop });
	circularFilter(out, 'lp', 4500);
	return out;
}

// ---------------------------------------------------------------------------------------------
// sound effects: soft and warm, in G major pentatonic (see PENTA, from G4: bells kept out of the
// shrill octaves above), in a little forest reverb, their top softened

const sfx = (build, { size = 0.7, damp = 0.5, tail = 2 } = {}) => {
	const mx = new Mix(3);
	build(mx);
	const out = mx.render({ reverb: { size, damp, tail } });
	circularFilter(out, 'lp', 5000);
	return out;
};

const strum = (mx, ms, t0, step, voice, { gain = 0.3, send = 0.35, spread = 0.6 } = {}) =>
	ms.forEach((m, k) =>
		mx.add(voice(m), t0 + k * step, {
			gain,
			send,
			pan: ms.length > 1 ? spread * (k / (ms.length - 1) - 0.5) : 0,
		}),
	);

// a harp glissando through the pentatonic from step `from` to `to`
const gliss = (mx, from, to, t0, dur, { gain = 0.22, root = n('G3') } = {}) => {
	const count = Math.abs(to - from) + 1;
	for (let k = 0; k < count; k++) {
		const i = from + (to > from ? k : -k);
		mx.add(harp(penta(i, root), { ring: 0.6 }), t0 + (k / count) * dur, { gain, pan: -0.5 + k / count, send: 0.4 }); // prettier-ignore
	}
};

// UI: a soft wooden tap
const btnGeneral = () =>
	sfx((mx) => mx.add(woodTap(1050, 0.04), 0, { gain: 0.6, send: 0.1 }), { tail: 0.4 });

// spin: a soft, low thump with a breath of air
const btnSpin = () =>
	sfx(
		(mx) => {
			mx.add(sweep(0.24, 120, 55, 0.025), 0, { gain: 0.8, send: 0.05 });
			mx.add(woodTap(420, 0.06), 0, { gain: 0.25, send: 0.1 });
			mx.add(whoosh(0.3, 1400, 600, { peakAt: 0.25 }), 0, {
				gain: 0.08,
				pan: [-0.4, 0.4],
				send: 0.2,
			});
		},
		{ tail: 0.6 },
	);

// a reel or a tumbled column settling: a soft wooden thud, a touch of dry leaf
const reelStop = (k) => () =>
	sfx(
		(mx) => {
			mx.add(sweep(0.13, 150 - 4 * k, 72, 0.015), 0, { gain: 0.8, send: 0.05 });
			mx.add(woodTap(260 + 12 * k, 0.07), 0, { gain: 0.3, send: 0.1 });
			mx.add(rustle(0.08, { density: 3000 }), 0.005, { gain: 0.06, pan: rr(-0.3, 0.3), send: 0.1 });
		},
		{ tail: 0.4 },
	);

// the wild, a rune stone, landing: a stone's soft thock and a glint of magic from its runes
const wildLanding = () =>
	sfx((mx) => {
		mx.add(sweep(0.28, 115, 50, 0.025), 0, { gain: 0.6, send: 0.05 });
		mx.add(partials(330, 0.12, [[1, 1, 0.09], [2.71, 0.35, 0.04], [5.1, 0.1, 0.02]], { attack: 0.0015 }), 0, { gain: 0.3, send: 0.15 }); // prettier-ignore
		mx.add(crystal(penta(4), 1.2), 0.05, { gain: 0.16, pan: -0.25, send: 0.5 });
		mx.add(crystal(penta(7), 1.2), 0.11, { gain: 0.12, pan: 0.25, send: 0.5 });
	});

// a cluster win: a warm harp pair and a little bell over it
const clusterWin = () =>
	sfx((mx) => {
		strum(mx, notes('D5 A5'), 0, 0.035, (m) => harp(m, { bright: 0.4 }), { gain: 0.35 });
		mx.add(celesta(n('E5'), 1.4), 0.07, { gain: 0.14, pan: 0.2, send: 0.5 });
		mx.add(piano(n('G4'), 0.8), 0, { gain: 0.1, send: 0.3 });
	});

// Fehu's multiplier joining a win: a rising sparkle into a bell
const combine =
	({ dur = 0.5, top = 'D6' } = {}) =>
	() =>
		sfx((mx) => {
			mx.add(whoosh(dur, 600, 1800, { peakAt: 0.85, q: 1.2 }), 0, {
				gain: 0.12,
				pan: [-0.4, 0.3],
				send: 0.3,
			});
			strum(mx, [penta(5), penta(7), penta(9)], dur * 0.35, 0.05, (m) => celesta(m, 1), { gain: 0.12, send: 0.5 }); // prettier-ignore
			mx.add(crystal(n(top), 1.4), dur, { gain: 0.16, send: 0.5 });
			mx.add(harp(n('G4')), dur, { gain: 0.15, send: 0.35 });
		});

// a soul landing in the bonus meter, a rune's spot lighting: a short glass ting
const ting = () =>
	sfx(
		(mx) => {
			mx.add(crystal(n('B5'), 0.8), 0, { gain: 0.3, send: 0.45 });
			mx.add(celesta(n('E6'), 0.5), 0.02, { gain: 0.08, pan: 0.3, send: 0.5 });
		},
		{ tail: 1.2 },
	);

// the bonus meter full: the bonus is won. A harp sweeps up into a warm chord, bells ring out
const bonusWon =
	({ short = false } = {}) =>
	() =>
		sfx(
			(mx) => {
				const up = short ? 0.4 : 0.65;
				gliss(mx, 0, short ? 8 : 12, 0, up);
				mx.add(whoosh(up + 0.2, 400, 1600, { peakAt: 0.8 }), 0, {
					gain: 0.1,
					pan: [-0.5, 0.5],
					send: 0.4,
				});
				pianoChord(mx, notes('G3 B3 D4 A4'), up, 1.8, { gain: 0.14, roll: 0.03 });
				mx.add(bass(n('G2'), 1.4), up, { gain: 0.3, send: 0.1 });
				pad(mx, notes('G3 D4 B4'), up - 0.1, 1.4, 0.06);
				strum(mx, notes('D5 G5 B5'), up + 0.05, 0.09, (m) => celesta(m, 2), {
					gain: 0.15,
					send: 0.55,
				});
				if (!short) mx.add(crystal(n('D6'), 2.2), up + 0.35, { gain: 0.12, pan: 0.3, send: 0.6 });
			},
			{ size: 0.82, tail: 3 },
		);

// a gust of wind and leaves, left to right as on the board (Wind.svelte); stronger for the sweep
const gust =
	({ dur = 2.2, strength = 1 } = {}) =>
	() =>
		sfx(
			(mx) => {
				const air = filter(noise(dur), 'bp', (t) => 380 + 520 * Math.sin((Math.PI * t) / dur), 0.7);
				env(air, (t) => Math.pow(Math.sin((Math.PI * Math.min(t, dur)) / dur), 1.6));
				mx.add(norm(filter(air, 'lp', 1600)), 0, {
					gain: 0.5 * strength,
					pan: [-0.8, 0.8],
					send: 0.2,
				});
				mx.add(whoosh(dur * 0.8, 600, 1400, { peakAt: 0.55, q: 1.4 }), dur * 0.1, { gain: 0.12 * strength, pan: [-0.7, 0.7], send: 0.3 }); // prettier-ignore
				const leaves = Math.round(4 * strength);
				for (let k = 0; k < leaves; k++) {
					const t = rr(0.15, 0.7) * dur;
					mx.add(rustle(rr(0.4, 0.8), { centre: rr(1600, 2600) }), t, { gain: 0.1 * strength, pan: [-0.6 + t / dur, -0.2 + (1.2 * t) / dur], send: 0.2 }); // prettier-ignore
				}
				if (strength > 1) mx.add(whoosh(1.2, 300, 900, { peakAt: 0.5, q: 0.8 }), dur * 0.25, { gain: 0.25, pan: [-0.5, 0.6], send: 0.2 }); // prettier-ignore
			},
			{ size: 0.6, tail: 1 },
		);

// the free spins' (and power spins') screen: wind gathering into a rising shimmer
const screenWhoosh = () =>
	sfx(
		(mx) => {
			mx.add(whoosh(1.4, 300, 1600, { peakAt: 0.7, q: 0.8 }), 0, {
				gain: 0.3,
				pan: [-0.6, 0.6],
				send: 0.3,
			});
			mx.add(rustle(1, { centre: 2000 }), 0.2, { gain: 0.08, pan: [-0.5, 0.5], send: 0.3 });
			for (let k = 0; k < 8; k++) mx.add(celesta(penta(3 + k), 1), 0.45 + k * 0.08, { gain: 0.07 + 0.01 * k, pan: -0.6 + 0.15 * k, send: 0.55 }); // prettier-ignore
			mx.add(sweep(1, 90, 45, 0.2), 0.9, { gain: 0.25, send: 0.2 });
		},
		{ size: 0.8, tail: 2.5 },
	);

// the free spins' jingle: a Celtic flourish on the flute over harp and bodhrán, ending on bells
const FANFARE = [
	[0, 'D5', 0.12], [0.12, 'E5', 0.12], [0.24, 'G5', 0.36], [0.6, 'E5', 0.12], [0.72, 'G5', 0.12],
	[0.84, 'A5', 0.36], [1.2, 'B5', 0.24], [1.44, 'A5', 0.12], [1.56, 'G5', 0.12], [1.68, 'D6', 1.1],
]; // prettier-ignore
const jingle = () =>
	sfx(
		(mx) => {
			for (const [t, name, hold] of FANFARE) {
				mx.add(flute(n(name), hold * 0.95, { vibrato: hold > 0.5 ? 0.006 : 0 }), t, { gain: 0.3, pan: -0.1, send: 0.4 }); // prettier-ignore
			}
			mx.add(flute(n('E6'), 0.035, { vibrato: 0 }), 1.64, { gain: 0.18, pan: -0.1, send: 0.4 });
			strum(mx, notes('G2 D3 G3 B3 D4'), 0, 0.06, (m) => harp(m), { gain: 0.2 });
			strum(mx, notes('C3 G3 C4 E4'), 0.84, 0.06, (m) => harp(m), { gain: 0.18 });
			strum(mx, notes('G2 D3 B3 D4 G4 B4'), 1.68, 0.05, (m) => harp(m), { gain: 0.22 });
			for (const t of [0, 0.6, 0.84, 1.2, 1.44, 1.56, 1.68])
				mx.add(bodhran(), t, { gain: 0.25, send: 0.15 });
			strum(mx, notes('G5 B5 D6'), 1.78, 0.1, (m) => celesta(m, 2), { gain: 0.12, send: 0.55 });
			pad(mx, notes('G3 D4 B4'), 1.6, 1.2, 0.05);
		},
		{ size: 0.8, tail: 3 },
	);

// the free spins' "you won" panel: a harp sweeping down and up into a warm, ringing chord
const youWon = () =>
	sfx(
		(mx) => {
			gliss(mx, 12, 5, 0, 0.3, { gain: 0.16 });
			gliss(mx, 5, 15, 0.32, 0.5, { gain: 0.2 });
			pianoChord(mx, notes('G3 D4 F#4 A4 B4'), 0.85, 2.2, { gain: 0.13, roll: 0.035 });
			mx.add(bass(n('G2'), 1.8), 0.85, { gain: 0.32, send: 0.1 });
			pad(mx, notes('G3 B3 D4 A4'), 0.75, 1.8, 0.06);
			strum(mx, notes('B5 D6 G6'), 0.95, 0.12, (m) => celesta(m, 2.2), { gain: 0.12, send: 0.55 });
			mx.add(crystal(n('A5'), 2), 1.3, { gain: 0.1, pan: -0.3, send: 0.6 });
		},
		{ size: 0.85, tail: 3 },
	);

// a rune collected: a singing bowl rings deep, glass shimmers over it, the air swells
const runeCollected = () =>
	sfx(
		(mx) => {
			mx.add(bowl(n('G3'), 3.5), 0, { gain: 0.28, send: 0.4 });
			mx.add(bowl(n('D4'), 3), 0.04, { gain: 0.12, pan: 0.3, send: 0.45 });
			strum(mx, notes('B4 D5 G5 A5'), 0.15, 0.11, (m) => crystal(m, 1.8), {
				gain: 0.12,
				send: 0.6,
			});
			pad(mx, notes('G2 D3 B3'), 0, 2.2, 0.05);
			mx.add(whoosh(1.4, 250, 900, { peakAt: 0.4, q: 0.8 }), 0, { gain: 0.08, send: 0.4 });
		},
		{ size: 0.88, tail: 3.5 },
	);

// the end of a big win (and the super spin mode's start): a final ringing chord
const winEnd = () =>
	sfx(
		(mx) => {
			strum(mx, notes('G2 D3 G3 B3 D4 G4 B4'), 0, 0.035, (m) => harp(m), { gain: 0.2 });
			pianoChord(mx, notes('G3 B3 D4 A4'), 0, 2, { gain: 0.12 });
			mx.add(bass(n('G2'), 1.6), 0, { gain: 0.3, send: 0.1 });
			mx.add(celesta(n('D6'), 2), 0.12, { gain: 0.12, send: 0.55 });
		},
		{ size: 0.82, tail: 3 },
	);

// the old sample's wild burst (its event is gone with its spine): a soft pop of magic
const magicPop =
	({ size = 1, sparkles = 5 } = {}) =>
	() =>
		sfx((mx) => {
			mx.add(poof(0.4 * size), 0, { gain: 0.35, send: 0.3 });
			mx.add(sweep(0.3 * size, 140, 60, 0.03), 0, { gain: 0.3 * size, send: 0.05 });
			for (let k = 0; k < sparkles; k++) mx.add(celesta(penta(5 + Math.floor(rand() * 6)), 1), 0.02 + rand() * 0.3, { gain: 0.08, pan: rr(-0.7, 0.7), send: 0.55 }); // prettier-ignore
		});

// a run up the harp for a smaller win; longer and brighter for bigger ones
const winRun =
	({ steps = 3, bells = 0 } = {}) =>
	() =>
		sfx((mx) => {
			for (let k = 0; k < steps; k++) mx.add(harp(penta(5 + k, n('G3'))), k * 0.09, { gain: 0.25, pan: -0.3 + (0.6 * k) / steps, send: 0.35 }); // prettier-ignore
			for (let k = 0; k < bells; k++) mx.add(celesta(penta(8 + k)), steps * 0.09 + k * 0.07, { gain: 0.1, pan: rr(-0.5, 0.5), send: 0.55 }); // prettier-ignore
		});

// one note higher each time (the sample's scatters and tumbles; RuneFall has neither)
const stepNote = (k, voice) => () =>
	sfx((mx) => mx.add(voice(penta(2 + k)), 0, { gain: 0.35, send: 0.4 }));

// a soft, sustained shimmer (the sample's anticipation)
function anticipationLoop() {
	const loop = 4;
	const mx = new Mix(loop + 3);
	pad(mx, notes('G3 D4 A4'), 0, loop, 0.08);
	for (let k = 0; k < 8; k++) mx.add(celesta(penta(5 + (k % 5)), 1), (k * loop) / 8, { gain: 0.06, pan: rr(-0.6, 0.6), send: 0.5 }); // prettier-ignore
	return mx.render({ reverb: { size: 0.8, damp: 0.5 }, loop });
}

// leaves rattling in the wind
const leafRattle = () => sfx((mx) => mx.add(rustle(0.6, { density: 1600 }), 0, { gain: 0.5, pan: [-0.4, 0.4], send: 0.2 }), { tail: 0.5 }); // prettier-ignore

// ---------------------------------------------------------------------------------------------
// sprite

// level: loudest 400 ms RMS to aim for (dBFS); peak: ceiling
const SOUNDS = {
	bgm_main: { level: -23, loop: true, render: bgmMain },
	bgm_freespin: { level: -22, loop: true, render: bgmFreespin },
	bgm_winlevel_big: { level: -21, loop: true, render: () => bgmWin(0) },
	bgm_winlevel_superwin: { level: -20.5, loop: true, render: () => bgmWin(1) },
	bgm_winlevel_mega: { level: -20, loop: true, render: () => bgmWin(2) },
	bgm_winlevel_epic: { level: -19.5, loop: true, render: () => bgmWin(3) },
	bgm_winlevel_max: { level: -19, loop: true, render: () => bgmWin(4) },
	sfx_bigwin_coinloop: { level: -27, loop: true, render: shimmerLoop },
	sfx_anticipation: { level: -24, loop: true, render: anticipationLoop },
	jng_intro_fs: { level: -16, render: jingle },
	sfx_anticipation_start: { level: -21, render: screenWhoosh },
	sfx_btn_general: { level: -28, peak: 0.5, render: btnGeneral },
	sfx_btn_spin: { level: -23, peak: 0.6, render: btnSpin },
	sfx_fs_respins: { level: -17, render: bonusWon({ short: true }) },
	sfx_multiplier_combine_a: { level: -21, render: combine() },
	sfx_multiplier_combine_b: { level: -21, render: combine({ dur: 0.35, top: 'B5' }) },
	sfx_multiplier_explosion_a: { level: -20, render: magicPop({ size: 0.7, sparkles: 3 }) },
	sfx_multiplier_explosion_b: { level: -18, render: magicPop({ size: 1.4, sparkles: 8 }) },
	sfx_multiplier_explosion_c: { level: -19, render: magicPop({ size: 1, sparkles: 5 }) },
	sfx_multiplier_landing: { level: -19, render: wildLanding },
	sfx_multiplier_reset: { level: -25, render: leafRattle },
	sfx_multiplier_up: { level: -23, render: ting },
	sfx_multiplier_update: { level: -23, render: stepNote(3, (m) => celesta(m, 1)) },
	sfx_multiplier_win: { level: -18, render: winEnd },
	sfx_royals_landing: { level: -25, render: reelStop(3) },
	sfx_scatter_reveal: { level: -19, render: screenWhoosh },
	sfx_scatter_win: { level: -17, render: runeCollected },
	sfx_scatter_win_v2: { level: -16, render: bonusWon() },
	sfx_superfreespin: { level: -18, render: screenWhoosh },
	sfx_symbols_landing: { level: -25, render: reelStop(2) },
	sfx_wild_explode: { level: -18, render: magicPop({ size: 1.1, sparkles: 6 }) },
	sfx_wind_gust: { level: -21, render: gust() },
	sfx_wind_sweep: { level: -19, render: gust({ dur: 2.6, strength: 1.6 }) },
	sfx_winlevel_end: { level: -17, render: winEnd },
	sfx_winlevel_small: { level: -22, render: clusterWin },
	sfx_winlevel_standard: { level: -20, render: winRun({ steps: 3 }) },
	sfx_winlevel_nice: { level: -19, render: winRun({ steps: 4, bells: 2 }) },
	sfx_winlevel_substantial: { level: -18, render: winRun({ steps: 6, bells: 4 }) },
	sfx_youwon_panel: { level: -16, render: youWon },
};
for (let k = 1; k <= 5; k++) {
	SOUNDS[`sfx_reel_stop_${k}`] = { level: -24, peak: 0.5, render: reelStop(k) };
	SOUNDS[`sfx_scatter_stop_${k}`] = { level: -20, render: stepNote(k, (m) => celesta(m, 1.4)) };
	SOUNDS[`tumble_win_${k}`] = { level: -21, render: stepNote(k, (m) => harp(m)) };
}

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

const FORMATS = ['ogg', 'm4a', 'mp3', 'ac3'];
const BLENDER =
	process.env.BLENDER || 'C:/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe';

function main() {
	const here = path.dirname(fileURLToPath(import.meta.url));
	const outDir = path.resolve(here, '../static/assets/audio');
	const previewIndex = process.argv.indexOf('--preview');
	const previewDir = previewIndex > -1 ? path.resolve(process.argv[previewIndex + 1]) : undefined;
	if (previewDir) fs.mkdirSync(previewDir, { recursive: true });

	const rendered = [];
	for (const name of Object.keys(SOUNDS).sort()) {
		const { render, loop = false, level, peak = 0.95 } = SOUNDS[name];
		seed(hash(name));
		let audio = render();
		if (!loop) audio = trimTail(audio);
		const g = Math.min(Math.pow(10, (level - loudness(audio)) / 20), peak / peakOf(audio));
		for (const ch of [audio.L, audio.R]) for (let i = 0; i < ch.length; i++) ch[i] *= g;
		rendered.push({ name, loop, audio });
		console.log(
			`${name.padEnd(28)} ${(audio.L.length / SR).toFixed(2).padStart(6)}s  level ${loudness(audio).toFixed(1).padStart(6)} dB  peak ${peakOf(audio).toFixed(2)}`,
		);
		if (previewDir) fs.writeFileSync(path.join(previewDir, `${name}.wav`), wav(audio.L, audio.R));
	}
	if (process.argv.includes('--dry')) return;

	// lay sounds out like audiosprite: each starts on a whole second, at least a second after the last
	const sprite = {};
	let cursor = 0;
	for (const { name, loop, audio } of rendered) {
		const ms = (audio.L.length / SR) * 1000;
		sprite[name] = loop ? [cursor, ms, true] : [cursor, ms];
		cursor = (Math.ceil((cursor + ms) / 1000) + 1) * 1000;
	}
	const total = new Float32Array(len(cursor / 1000));
	const totalR = new Float32Array(total.length);
	for (const { name, audio } of rendered) {
		const o = Math.round((sprite[name][0] / 1000) * SR);
		total.set(audio.L, o);
		totalR.set(audio.R, o);
	}

	const wavPath = path.join(os.tmpdir(), `runefall-sounds-${process.pid}.wav`);
	fs.writeFileSync(wavPath, wav(total, totalR));
	execFileSync(
		BLENDER,
		[
			'-b',
			'--factory-startup',
			'--python',
			path.join(here, 'encode-sounds.py'),
			'--',
			wavPath,
			outDir,
		],
		{ stdio: ['ignore', 'ignore', 'inherit'] },
	);
	fs.rmSync(wavPath);
	for (const ext of FORMATS) {
		if (!fs.existsSync(path.join(outDir, `sounds.${ext}`)))
			throw new Error(`sounds.${ext} wasn't written`);
	}

	const names = Object.keys(sprite);
	const json = [
		'{',
		'\t"sprite": {',
		names
			.map(
				(name) =>
					`\t\t"${name}": [${sprite[name].map((v) => (typeof v === 'number' ? +v.toFixed(3) : v)).join(', ')}]`,
			)
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
	console.log(
		`\n${names.length} sounds, ${(cursor / 1000).toFixed(0)} s sprite -> ${FORMATS.map((ext) => `sounds.${ext}`).join(', ')}`,
	);
}

main();
