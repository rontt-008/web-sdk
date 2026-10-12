// Generates Cat Hunt's sound sprite from code. Every sound below is synthesised here (no recordings
// or samples), and it keeps the sound names the game already uses, so no game code has to change.
//
//   node scripts/generate-sounds.mjs                  (run from apps/my-game)
//   node scripts/generate-sounds.mjs --preview <dir>  (also writes each sound as <dir>/<name>.wav)
//
// Writes static/assets/audio/sounds.{ogg,m4a,mp3,ac3} + sounds.json. Encoding needs ffmpeg on PATH
// or FFMPEG=<path to ffmpeg>; without it only sounds.wav is written. Output is deterministic, so
// tweak a recipe and re-run to regenerate.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
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
	return PITCH_CLASS[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + (Number(octave) + 1) * 12;
};
const notes = (names) => names.split(' ').map(n);

// D major pentatonic, counted upwards from a D
const PENTA = [0, 2, 4, 7, 9];
const penta = (i, root = n('D5')) => root + PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);

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
const hash = (text) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

// keys: [[u, ...values]] sorted by u; returns the values interpolated at u
const lerpKeys = (keys, u) => {
	if (u <= keys[0][0]) return keys[0].slice(1);
	for (let k = 1; k < keys.length; k++) {
		if (u <= keys[k][0]) {
			const a = keys[k - 1];
			const b = keys[k];
			const w = (u - a[0]) / (b[0] - a[0]);
			return a.slice(1).map((v, j) => v + (b[j + 1] - v) * w);
		}
	}
	return keys[keys.length - 1].slice(1);
};

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
		const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
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
const square = (ph, dt) => (ph < 0.5 ? 1 : -1) + polyblep(ph, dt) - polyblep((ph + 0.5) % 1, dt);

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
		out[i] = Math.sin(TAU * ph) * ex(t, decay) * Math.min(1, t / 0.001);
		ph += (f1 + (f0 - f1) * Math.exp(-t / tau)) / SR;
	}
	return out;
};

// sine gliding exponentially from f0 to f1 over its whole duration
const glide = (dur, f0, f1) => {
	const out = new Float32Array(len(dur));
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = Math.sin(TAU * ph) * smooth(0, 0.004, t) * (1 - smooth(dur * 0.4, dur, t));
		ph += (f0 * Math.pow(f1 / f0, t / dur)) / SR;
	}
	return out;
};

// ---------------------------------------------------------------------------------------------
// instruments

// additive voice: parts = [[ratio, gain, decaySeconds]]
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
		let e = Math.min(1, t / attack) * release(t, hold, rel);
		if (tremolo) e *= 1 - tremolo * (0.5 + 0.5 * Math.sin(TAU * tremRate * t));
		out[i] *= e;
	}
	return fadeEnd(out, 0.005);
}

const malletClick = (f, dur = 0.006) => filter(env(noise(dur), (t) => 1 - t / dur), 'bp', Math.min(f * 3, 9000), 1.5);

function marimba(m, dur = 1.2) {
	const f = mtof(m);
	const d = 0.7 * clamp(Math.sqrt(262 / f), 0.35, 2);
	return mixIn(partials(f, dur, [[1, 1, d], [3.93, 0.25, d * 0.22], [9.2, 0.06, d * 0.07]]), malletClick(f), 0, 0.25);
}
const glock = (m, dur = 1.4) =>
	partials(mtof(m), dur, [[1, 1, 1.1], [2.76, 0.3, 0.45], [5.4, 0.12, 0.18], [8.93, 0.05, 0.07]], { attack: 0.0005 });
const chime = (m, dur = 2.5) =>
	partials(mtof(m), dur, [[1, 1, 2.3], [2, 0.22, 1.3], [3, 0.1, 0.7], [4.16, 0.07, 0.35], [5.43, 0.04, 0.2]], { attack: 0.0008 });

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

const pizz = (m, dur = 0.4) => norm(filter(pluck(mtof(m), dur, { decay: 0.35, bright: 0.6 }), 'lp', 3500));

function synthBass(m, hold = 0.2) {
	const f = mtof(m);
	const out = new Float32Array(len(hold + 0.05));
	const lp = new Biquad('lp', 2000, 1.4);
	let p1 = 0;
	let p2 = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const d1 = f / SR;
		const d2 = (f * 0.5) / SR;
		const s = saw(p1, d1) + 0.6 * square(p2, d2);
		p1 = (p1 + d1) % 1;
		p2 = (p2 + d2) % 1;
		if ((i & 15) === 0) lp.set('lp', 120 + 1800 * Math.exp(-t / 0.05), 1.4);
		out[i] = lp.tick(s) * Math.min(1, t / 0.003) * (0.55 + 0.45 * Math.exp(-t / 0.15)) * release(t, hold, 0.05);
	}
	return out;
}

function brass(m, hold = 0.4, { bright = 1 } = {}) {
	const f = mtof(m);
	const rel = 0.18;
	const out = new Float32Array(len(hold + rel));
	const lp = new Biquad('lp', f, 0.8);
	const ph = [0, rand(), rand()];
	const detune = [1, 1.0035, 0.9965];
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const fv = f * (1 - 0.015 * Math.exp(-t / 0.04)) * (1 + 0.004 * Math.sin(TAU * 5.5 * t) * smooth(0.2, 0.5, t));
		let s = 0;
		for (let k = 0; k < 3; k++) {
			const dt = (fv * detune[k]) / SR;
			s += saw(ph[k], dt);
			ph[k] = (ph[k] + dt) % 1;
		}
		if ((i & 15) === 0) {
			const swell = smooth(0, 0.06, t) * (1 - 0.4 * smooth(0.06, 0.35, t));
			lp.set('lp', Math.min(f * (1 + 7 * bright * swell), 14000), 0.8);
		}
		out[i] = lp.tick(s) * smooth(0, 0.03, t) * (1 - 0.2 * smooth(0.04, 0.3, t)) * release(t, hold, rel) * 0.35;
	}
	return out;
}

function strings(m, hold, { tremolo = 0, attack = 0.25, rel = 0.35, cutoff = 6 } = {}) {
	const f = mtof(m);
	const out = new Float32Array(len(hold + rel));
	const lp = new Biquad('lp', Math.min(f * cutoff, 5000), 0.7);
	const hp = new Biquad('hp', 180, 0.7);
	const detune = [1, 1.004, 0.996];
	const ph = detune.map(() => rand());
	const vibPhase = rand() * TAU;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const vib = 1 + 0.003 * Math.sin(TAU * 5.2 * t + vibPhase);
		let s = 0;
		for (let k = 0; k < 3; k++) {
			const dt = (f * detune[k] * vib) / SR;
			s += saw(ph[k], dt);
			ph[k] = (ph[k] + dt) % 1;
		}
		let a = smooth(0, attack, t) * release(t, hold, rel);
		if (tremolo) a *= 1 - tremolo * (0.5 + 0.5 * Math.sin(TAU * 12 * t));
		out[i] = hp.tick(lp.tick(s)) * a * 0.3;
	}
	return out;
}

// "aah" voices: detuned saws through vowel formants
function choir(m, hold, { attack = 0.35, rel = 0.6 } = {}) {
	const f = mtof(m);
	const out = new Float32Array(len(hold + rel));
	const voices = [1, 1.005, 0.995].map((d) => ({ d, ph: rand(), vib: rand() * TAU }));
	const formants = [[800, 5, 1], [1150, 7, 0.5], [2900, 10, 0.25]].map(([fc, q, g]) => ({ bq: new Biquad('bp', fc, q), g }));
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		let s = (rand() * 2 - 1) * 0.2;
		for (const v of voices) {
			const dt = (f * v.d * (1 + 0.006 * Math.sin(TAU * 5 * t + v.vib))) / SR;
			s += saw(v.ph, dt);
			v.ph = (v.ph + dt) % 1;
		}
		let y = 0;
		for (const fo of formants) y += fo.bq.tick(s) * fo.g;
		out[i] = y * smooth(0, attack, t) * release(t, hold, rel);
	}
	return norm(out, 0.5);
}

// cat voices: a glottal saw through moving vowel formants
const MEOWS = {
	// classic "mi-aaa-ow"
	meow: {
		dur: 0.72,
		pitch: 640,
		contour: [[0, 0.82], [0.22, 1.12], [0.5, 1.08], [1, 0.72]],
		vowels: [[0, 300, 1200, 2700], [0.12, 450, 2300, 3500], [0.4, 1150, 1900, 3300], [0.72, 900, 1300, 3000], [1, 500, 850, 2800]],
	},
	// short kitten "mew"
	mew: {
		dur: 0.3,
		pitch: 880,
		contour: [[0, 0.9], [0.35, 1.12], [1, 0.84]],
		vowels: [[0, 420, 2300, 3500], [0.35, 1050, 2000, 3400], [1, 700, 1400, 3000]],
	},
	// happy trilled chirp "mrrrp"
	mrrp: {
		dur: 0.3,
		pitch: 520,
		trill: 0.8,
		contour: [[0, 0.8], [0.55, 1.25], [1, 1.35]],
		vowels: [[0, 280, 1000, 2600], [0.5, 480, 1500, 3000], [1, 1000, 1900, 3300]],
	},
	// big cat growl-meow "ROWR"
	rowr: {
		dur: 0.62,
		pitch: 360,
		growl: 0.65,
		contour: [[0, 0.75], [0.22, 1.2], [0.6, 1.08], [1, 0.68]],
		vowels: [[0, 350, 1000, 2500], [0.22, 950, 1500, 2700], [0.7, 800, 1100, 2500], [1, 420, 800, 2400]],
	},
};

function meow({ dur, pitch, contour, vowels, growl = 0, trill = 0, vibrato = 0.015 }) {
	const out = new Float32Array(len(dur));
	const bands = [new Biquad('bp', 500, 4), new Biquad('bp', 1500, 6), new Biquad('bp', 3000, 8)];
	const tilt = new Biquad('lp', 2500, 0.7);
	let ph = 0;
	let sub = 0;
	let jitter = 0;
	let f0 = pitch;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const u = t / dur;
		if ((i & 15) === 0) {
			const [f1, f2, f3] = lerpKeys(vowels, u);
			bands[0].set('bp', f1, 4);
			bands[1].set('bp', f2, 6);
			bands[2].set('bp', f3, 8);
			jitter += (rand() - 0.5) * 0.004 - jitter * 0.05;
			f0 = pitch * lerpKeys(contour, u)[0];
		}
		const dt = (f0 * (1 + vibrato * Math.sin(TAU * 6 * t) + jitter)) / SR;
		let s = saw(ph, dt);
		ph = (ph + dt) % 1;
		if (growl) {
			sub = (sub + dt / 2) % 1;
			s = s * (1 - growl * 0.6 * (0.5 + 0.5 * Math.sin(TAU * 31 * t))) + growl * 0.5 * Math.sin(TAU * sub);
		}
		if (trill) s *= 1 - trill * (0.5 + 0.5 * Math.sin(TAU * 26 * t)) * (1 - smooth(0.45, 0.65, u));
		s = tilt.tick(s + (rand() * 2 - 1) * 0.08);
		const y = bands[0].tick(s) + 0.7 * bands[1].tick(s) + 0.3 * bands[2].tick(s);
		out[i] = y * Math.min(1, t / 0.01) * (0.2 + 0.8 * smooth(0.04, 0.18, u)) * (1 - smooth(0.62, 1, u));
	}
	return norm(filter(out, 'hp', 150));
}

// ---------------------------------------------------------------------------------------------
// drums and effects

function kick({ f0 = 150, f1 = 48, decay = 0.4, click = 0.3 } = {}) {
	const out = sweep(decay, f0, f1, 0.035);
	if (click) mixIn(out, filter(env(noise(0.004), (t) => 1 - t / 0.004), 'hp', 2000), 0, click);
	return out;
}

function snare({ decay = 0.2, tone = 185 } = {}) {
	const body = env(sine(tone, decay), (t) => ex(t, decay * 0.5));
	const rattle = env(filter(filter(noise(decay), 'hp', 1200), 'lp', 9000), (t) => ex(t, decay));
	return mixIn(norm(rattle, 0.7), body, 0, 0.6);
}

// TR-808 style cymbal source: six detuned square waves
const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
function metal(dur, scale = 1) {
	const out = new Float32Array(len(dur));
	const ph = METAL.map(() => rand());
	for (let i = 0; i < out.length; i++) {
		let s = 0;
		for (let k = 0; k < METAL.length; k++) {
			ph[k] = (ph[k] + (METAL[k] * scale) / SR) % 1;
			s += ph[k] < 0.5 ? 1 : -1;
		}
		out[i] = s / METAL.length;
	}
	return out;
}

function hat({ decay = 0.05 } = {}) {
	const out = filter(filter(metal(decay), 'hp', 7000), 'bp', 10000, 0.6);
	mixIn(out, filter(noise(decay), 'hp', 8000), 0, 0.3);
	return norm(env(out, (t) => ex(t, decay)));
}

function crash(decay = 1.8) {
	const out = filter(metal(decay, 1.9), 'hp', 3500);
	mixIn(out, filter(noise(decay), 'hp', 4000), 0, 0.8);
	return norm(env(out, (t) => ex(t, decay) * Math.min(1, t / 0.002) * (0.6 + 0.4 * Math.exp(-t / 0.05))));
}

const shaker = () => norm(env(filter(noise(0.08), 'hp', 6000), (t) => smooth(0, 0.012, t) * ex(t, 0.08)));
const woodblock = (f, decay = 0.06) =>
	mixIn(partials(f, decay + 0.01, [[1, 1, decay], [2.6, 0.25, decay * 0.4]]), malletClick(f * 2, 0.003), 0, 0.3);
const thump = (f0 = 160, f1 = 55, decay = 0.15) => sweep(decay, f0, f1, 0.02);

function timpani(m, decay = 1.6) {
	const out = partials(mtof(m), decay, [[1, 1, decay], [1.5, 0.45, decay * 0.6], [1.98, 0.25, decay * 0.4], [2.44, 0.12, decay * 0.3]], { attack: 0.003 }); // prettier-ignore
	return mixIn(out, filter(env(noise(0.08), (t) => ex(t, 0.08)), 'lp', 400), 0, 0.5);
}

function boom(decay = 1.2) {
	const out = sweep(decay, 110, 32, 0.12);
	return mixIn(out, norm(filter(env(noise(decay * 0.5), (t) => ex(t, decay * 0.5)), 'lp', 180)), 0, 0.6);
}

// soft "poof" of air, for explosions
const poof = (decay = 0.5) =>
	norm(env(filter(noise(decay), 'lp', (t) => 3000 * Math.exp(-t / (decay * 0.3)) + 200, 0.8), (t) => smooth(0, 0.005, t) * ex(t, decay)));

// band-passed noise gliding from f0 to f1, swelling up to `peakAt` (0..1 of dur) then fading
function whoosh(dur, f0, f1, { q = 1.2, peakAt = 0.5 } = {}) {
	const out = filter(noise(dur), 'bp', (t) => f0 * Math.pow(f1 / f0, t / dur), q);
	return norm(
		env(out, (t) => {
			const u = t / dur;
			return u < peakAt ? Math.pow(u / peakAt, 2) : Math.pow(Math.max(0, 1 - (u - peakAt) / (1 - peakAt)), 1.5);
		}),
	);
}

// stereo Freeverb (Schroeder/Moorer: 8 combs + 4 all-passes per side)
function freeverb(inL, inR, { size = 0.8, damp = 0.3, wet = 3 } = {}) {
	const feedback = size * 0.28 + 0.7;
	const d1 = damp * 0.4;
	const d2 = 1 - d1;
	const side = (spread) => ({
		combs: [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((s) => ({ buf: new Float32Array(s + spread), i: 0, store: 0 })),
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
	add(src, t = 0, { gain = 1, pan = 0, send = 0.25 } = {}) {
		const o = Math.max(0, Math.round(t * SR));
		this.ensure(o + src.length);
		this.end = Math.max(this.end, o + src.length);
		const angle = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4;
		const gl = Math.cos(angle) * Math.SQRT2 * gain;
		const gr = Math.sin(angle) * Math.SQRT2 * gain;
		for (let i = 0; i < src.length; i++) {
			const v = src[i];
			const j = o + i;
			this.L[j] += v * gl;
			this.R[j] += v * gr;
			if (send) {
				this.sL[j] += v * gl * send;
				this.sR[j] += v * gr * send;
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
function glue({ L, R }, drive = 1.4) {
	let peak = 0;
	for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
	const k = drive / peak;
	const d = Math.tanh(drive);
	for (let i = 0; i < L.length; i++) {
		L[i] = Math.tanh(L[i] * k) / d;
		R[i] = Math.tanh(R[i] * k) / d;
	}
	return { L, R };
}

// ---------------------------------------------------------------------------------------------
// sfx helpers

function sparkle(mx, t0, dur, count, { root = n('D6'), gain = 0.25, span = 8 } = {}) {
	for (let k = 0; k < count; k++) {
		const u = rand();
		mx.add(glock(penta(Math.floor(rand() * span), root), 0.9), t0 + u * dur, { gain: gain * (1 - 0.5 * u), pan: rr(-0.7, 0.7), send: 0.5 }); // prettier-ignore
	}
}

function arp(mx, ms, t0, step, voice, { gain = 0.5, send = 0.3, pan = 0, spread = 0 } = {}) {
	ms.forEach((m, k) => {
		const offset = ms.length > 1 ? k / (ms.length - 1) - 0.5 : 0;
		mx.add(voice(m), t0 + k * step, { gain, send, pan: pan + spread * offset });
	});
}

const chord = (mx, ms, t, voice, { gain = 0.4, send = 0.3, spread = 0.6 } = {}) => arp(mx, ms, t, 0, voice, { gain, send, spread });

// ---------------------------------------------------------------------------------------------
// music: chill lo-fi. Lazy swung drums and warm keys on separate buses, then a master chain of
// side-chain ducking, a dark low-pass, tape wobble and vinyl crackle.

function lofiKick() {
	const out = sweep(0.45, 120, 50, 0.03);
	return mixIn(out, filter(env(noise(0.006), (t) => 1 - t / 0.006), 'lp', 3000), 0, 0.15);
}

function lofiSnare() {
	const rattle = env(filter(filter(noise(0.3), 'bp', 1600, 0.6), 'lp', 3800), (t) => smooth(0, 0.004, t) * ex(t, 0.22));
	return norm(mixIn(norm(rattle, 0.8), env(sine(180, 0.25), (t) => ex(t, 0.12)), 0, 0.5));
}

function rim() {
	const out = mixIn(partials(480, 0.08, [[1, 1, 0.05], [3.6, 0.5, 0.03]]), malletClick(3000, 0.003), 0, 0.6);
	return norm(filter(out, 'hp', 300));
}

const lofiHat = (decay = 0.055) =>
	norm(env(filter(mixIn(filter(metal(decay, 0.8), 'hp', 4000), noise(decay), 0, 0.5), 'bp', 5000, 0.7), (t) => ex(t, decay)));

// warm FM electric piano; `tremPhase` lets two detuned copies tremolo against each other (auto-pan)
function rhodes(m, hold, { cents = 0, bright = 0.8, tremPhase = 0 } = {}) {
	const f = mtof(m) * Math.pow(2, cents / 1200);
	const out = new Float32Array(len(hold + 0.4));
	let pc = 0;
	let pt = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const index = 0.5 + 2 * bright * Math.exp(-t / 0.25);
		const tine = 0.3 * bright * Math.exp(-t / 0.03);
		const tremolo = 1 - 0.2 * (0.5 + 0.5 * Math.sin(TAU * 4.5 * t + tremPhase));
		const amp = smooth(0, 0.01, t) * (0.35 + 0.65 * Math.exp(-t / 1.2)) * release(t, hold, 0.4) * tremolo;
		out[i] = (Math.sin(TAU * pc + index * Math.sin(TAU * pc)) + tine * Math.sin(TAU * pt)) * amp;
		pc = (pc + f / SR) % 1;
		pt = (pt + (f * 14) / SR) % 1;
	}
	return out;
}

// round sine bass, lightly saturated so it still reads on phone speakers
function softBass(m, hold) {
	const f = mtof(m);
	const out = new Float32Array(len(hold + 0.12));
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const s = Math.tanh(1.6 * (Math.sin(TAU * ph) + 0.2 * Math.sin(2 * TAU * ph)));
		out[i] = 0.55 * s * smooth(0, 0.012, t) * (0.7 + 0.3 * Math.exp(-t / 0.25)) * release(t, hold, 0.12);
		ph = (ph + f / SR) % 1;
	}
	return out;
}

const mutedGuitar = (m, hold = 0.3) =>
	norm(env(filter(pluck(mtof(m), hold + 0.1, { decay: 0.7, bright: 0.3 }), 'lp', 1800, 0.7), (t) => release(t, hold, 0.08)));

function kalimba(m, dur = 1.2) {
	const f = mtof(m);
	const out = partials(f, dur, [[1, 1, 1], [5.93, 0.1, 0.12], [8.9, 0.03, 0.05]], { attack: 0.004 });
	return mixIn(out, malletClick(f * 2, 0.004), 0, 0.05);
}

// breathy triangle lead with a slow vibrato
function softLead(m, hold) {
	const f = mtof(m);
	const out = new Float32Array(len(hold + 0.15));
	const lp = new Biquad('lp', 2400, 0.7);
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const dt = (f * (1 + 0.006 * Math.sin(TAU * 5 * t) * smooth(0.15, 0.4, t))) / SR;
		const s = 0.6 * (1 - 4 * Math.abs(ph - 0.5)) + 0.4 * Math.sin(TAU * ph);
		ph = (ph + dt) % 1;
		out[i] = lp.tick(s) * smooth(0, 0.04, t) * release(t, hold, 0.15);
	}
	return out;
}

// rolled rhodes chord, each note doubled and detuned across the stereo field
function keys(mx, ms, t, hold, { gain = 0.085, bright = 0.6, roll = 0.015 } = {}) {
	ms.forEach((m, k) => {
		for (const side of [-1, 1]) {
			mx.add(rhodes(m, hold, { cents: 6 * side, bright, tremPhase: side > 0 ? Math.PI : 0 }), t + k * roll, { gain, pan: 0.5 * side, send: 0.3 }); // prettier-ignore
		}
	});
}

// warm, dark string pad to glue the keys together
const pad = (mx, ms, t, hold, gain = 0.05) =>
	ms.forEach((m) => mx.add(strings(m, hold, { attack: 0.8, rel: 0.8, cutoff: 2 }), t, { gain, pan: rr(-0.6, 0.6), send: 0.5 }));

// time of a 16th step in a bar: off 16ths swing late and everything sits slightly behind the beat
const groove = (beat, swingAmount) => (bar, step) =>
	((bar * 16 + step) * beat) / 4 + (step % 2 ? ((swingAmount - 0.5) * beat) / 2 : 0) + rr(0, 0.008);

// one bar of drums; steps are 16ths, kick times are collected for the side-chain
function lofiDrums(drums, kicks, T, bar, { kick = [], snare = [], ghost = [], hats = 2, ghostHats = [], openHat = [], shakers = false }) {
	for (const s of kick) {
		const t = T(bar, s);
		drums.add(lofiKick(), t, { gain: 0.45, send: 0.02 });
		kicks.push(t);
	}
	for (const s of snare) drums.add(lofiSnare(), T(bar, s), { gain: 0.3, pan: 0.05, send: 0.22 });
	for (const s of ghost) drums.add(lofiSnare(), T(bar, s), { gain: 0.07, pan: 0.05, send: 0.15 });
	for (let s = 0; s < 16; s += hats) drums.add(lofiHat(), T(bar, s), { gain: (s % 4 === 0 ? 0.2 : 0.12) * rr(0.85, 1.1), pan: 0.3, send: 0.05 }); // prettier-ignore
	for (const s of ghostHats) drums.add(lofiHat(0.03), T(bar, s), { gain: 0.06, pan: 0.3, send: 0.05 });
	for (const s of openHat) drums.add(lofiHat(0.22), T(bar, s), { gain: 0.1, pan: 0.3, send: 0.1 });
	if (shakers) for (let s = 0; s < 16; s++) drums.add(shaker(), T(bar, s), { gain: s % 2 ? 0.025 : 0.04, pan: -0.4, send: 0.05 });
}

// keys and bass dip under each kick, like a side-chained compressor
function duck({ L, R }, kicks, loop, depth = 0.1, rel = 0.25) {
	const N = L.length;
	const times = kicks.map((t) => Math.round((((t % loop) + loop) % loop) * SR)).sort((a, b) => a - b);
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

// filters a loop as if it repeated forever, so the seam stays seamless
function circularFilter({ L, R }, type, f, q = 0.707) {
	for (const ch of [L, R]) {
		const bq = new Biquad(type, f, q);
		for (let i = Math.max(0, ch.length - 8192); i < ch.length; i++) bq.tick(ch[i]);
		for (let i = 0; i < ch.length; i++) ch[i] = bq.tick(ch[i]);
	}
}

// tape wow (slow pitch drift) and flutter, with whole cycles per loop so the seam stays seamless
function tapeWow({ L, R }, loop, amount = 1) {
	const N = L.length;
	const wowRate = Math.max(1, Math.round(0.45 * loop)) / loop;
	const flutterRate = Math.max(1, Math.round(5.5 * loop)) / loop;
	// delay swing (seconds) giving about ±0.3 % wow and ±0.06 % flutter per unit of `amount`
	const wow = (0.003 * amount) / (TAU * wowRate);
	const flutter = (0.0006 * amount) / (TAU * flutterRate);
	for (const ch of [L, R]) {
		const src = ch.slice();
		for (let i = 0; i < N; i++) {
			const t = i / SR;
			const d = (wow + flutter + 0.001 + wow * Math.sin(TAU * wowRate * t) + flutter * Math.sin(TAU * flutterRate * t)) * SR;
			const p = (((i - d) % N) + N) % N;
			const j = Math.floor(p);
			const fr = p - j;
			ch[i] = src[j] * (1 - fr) + src[(j + 1) % N] * fr;
		}
	}
}

// record hiss plus crackle: lots of tiny ticks and the odd louder pop
function addVinyl({ L, R }, amount = 1) {
	const N = L.length;
	let sum = 0;
	for (let i = 0; i < N; i++) sum += L[i] * L[i] + R[i] * R[i];
	const rms = Math.sqrt(sum / (2 * N));
	for (const ch of [L, R]) {
		let lp = 0;
		for (let i = 0; i < N; i++) {
			lp += (rand() * 2 - 1 - lp) * 0.3;
			ch[i] += lp * rms * 0.1 * amount;
		}
	}
	const count = Math.round((N / SR) * 15);
	for (let k = 0; k < count; k++) {
		const pop = rand() < 0.03;
		const start = Math.floor(rand() * N);
		const size = Math.round(SR * (pop ? rr(0.002, 0.004) : rr(0.0004, 0.0012)));
		const amp = rms * amount * (pop ? rr(0.25, 0.5) : rr(0.05, 0.2));
		const pan = rand();
		for (let j = 0; j < size; j++) {
			const v = (rand() * 2 - 1) * amp * Math.exp((-4 * j) / size);
			L[(start + j) % N] += v * (1 - 0.5 * pan);
			R[(start + j) % N] += v * (0.5 + 0.5 * pan);
		}
	}
}

function lofiMaster(music, drums, { loop, kicks, cutoff = 5000, wow = 1, vinyl = 1 }) {
	duck(music, kicks, loop);
	for (let i = 0; i < music.L.length; i++) {
		music.L[i] += drums.L[i];
		music.R[i] += drums.R[i];
	}
	circularFilter(music, 'lp', cutoff, 0.6);
	circularFilter(music, 'hp', 35);
	tapeWow(music, loop, wow);
	glue(music, 1.25);
	addVinyl(music, vinyl);
	return music;
}

// main: 80 BPM in D major, IV - iii - ii - V then I - vi - ii - V
const MAIN_PROGRESSION = [
	['G2', 'B3 D4 F#4 A4'], // Gmaj9
	['F#2', 'A3 C#4 E4 G#4'], // F#m9
	['E2', 'G3 B3 D4 F#4'], // Em9
	['A2', 'G3 C#4 F#4 B4'], // A13
	['D2', 'F#3 A3 C#4 E4'], // Dmaj9
	['B1', 'A3 C#4 D4 F#4'], // Bm9
	['E2', 'G3 B3 D4 F#4'], // Em9
	['A2', 'G3 Bb3 C#4 F4'], // A7b9
];
// [bar, beat, note, beats]
const MAIN_MELODY = [
	[0, 1.5, 'B4', 0.5], [0, 2, 'A4', 0.5], [0, 2.5, 'F#4', 1],
	[1, 0.5, 'E4', 0.5], [1, 1, 'F#4', 0.5], [1, 1.5, 'A4', 1.5],
	[2, 1.5, 'B4', 0.5], [2, 2, 'D5', 0.5], [2, 2.5, 'B4', 0.5], [2, 3, 'A4', 1],
	[3, 0, 'F#4', 1.5], [3, 2, 'E4', 0.5], [3, 2.5, 'F#4', 0.5], [3, 3, 'A4', 1],
	[4, 0.5, 'A4', 0.5], [4, 1, 'C#5', 0.5], [4, 1.5, 'E5', 1], [4, 3, 'D5', 0.5], [4, 3.5, 'C#5', 0.5],
	[5, 0, 'D5', 1.5], [5, 2, 'B4', 0.5], [5, 2.5, 'A4', 0.5], [5, 3, 'F#4', 1],
	[6, 0.5, 'G4', 0.5], [6, 1, 'B4', 0.5], [6, 1.5, 'D5', 0.5], [6, 2, 'F#5', 1], [6, 3.5, 'E5', 0.5],
	[7, 0, 'C#5', 1], [7, 1.5, 'Bb4', 0.5], [7, 2, 'A4', 1.5],
]; // prettier-ignore

function bgmMain() {
	const beat = 60 / 80;
	const bars = 16;
	const loop = bars * 4 * beat;
	const T = groove(beat, 0.6);
	const music = new Mix(loop + 4);
	const drums = new Mix(loop + 2);
	const kicks = [];

	for (let bar = 0; bar < bars; bar++) {
		const [bassName, voicing] = MAIN_PROGRESSION[bar % 8];
		const root = n(bassName);
		const chordNotes = notes(voicing);
		// keys and pad hold the chord through the bar; bass holds the root with one soft step out
		keys(music, chordNotes, T(bar, 0), 3.9 * beat);
		pad(music, chordNotes, T(bar, 0), 4 * beat);
		music.add(softBass(root, 3.3 * beat), T(bar, 0), { gain: 0.5, send: 0.05 });
		music.add(softBass(root + (bar % 2 ? 7 : 12), 0.5 * beat), T(bar, 14), { gain: 0.25, send: 0.05 });

		// the top of the loop is just rim and hats, a little breather each time round
		if (bar < 2) {
			lofiDrums(drums, kicks, T, bar, {});
			for (const s of [4, 12]) drums.add(rim(), T(bar, s), { gain: 0.22, pan: 0.15, send: 0.15 });
		} else if (bar % 2 === 0) {
			lofiDrums(drums, kicks, T, bar, { kick: [0, 10], snare: [4, 12], ghostHats: [7, 15] });
		} else {
			lofiDrums(drums, kicks, T, bar, { kick: [0, 3, 10], snare: [4, 12], ghost: [15], ghostHats: [7] });
		}
	}

	// muted guitar answers in bars 5-8; kalimba carries the whole tune the second time round
	for (const [bar, p, name, b] of MAIN_MELODY) {
		const m = n(name);
		if (bar >= 4) music.add(mutedGuitar(m, b * beat), T(bar, p * 4), { gain: 0.4, pan: -0.2, send: 0.25 });
		music.add(kalimba(m), T(bar + 8, p * 4), { gain: 0.35, pan: -0.15, send: 0.35 });
		music.add(mutedGuitar(m - 12, b * beat), T(bar + 8, p * 4), { gain: 0.18, pan: 0.2, send: 0.2 });
	}
	return lofiMaster(music.render({ reverb: { size: 0.8, damp: 0.5 }, loop }), drums.render({ reverb: { size: 0.4, damp: 0.6, tail: 1 }, loop }), { loop, kicks, cutoff: 5000, wow: 1.2 }); // prettier-ignore
}

// free spins: 92 BPM chillhop in B minor
const FS_PROGRESSION = [
	['B1', 'A3 C#4 D4 F#4'], // Bm9
	['G2', 'B3 D4 F#4 A4'], // Gmaj9
	['E2', 'G3 B3 D4 F#4'], // Em9
	['F#2', 'G3 A#3 C#4 E4'], // F#7b9
	['B1', 'A3 C#4 D4 F#4'], // Bm9
	['G2', 'B3 D4 F#4 A4'], // Gmaj9
	['E2', 'G3 B3 D4 F#4'], // Em9
	['A2', 'G3 C#4 F#4 B4'], // A13
];
const FS_MELODY = [
	[0, 0.5, 'D5', 0.5], [0, 1, 'C#5', 0.5], [0, 1.5, 'B4', 0.5], [0, 2, 'F#4', 1], [0, 3.5, 'A4', 0.5],
	[1, 0, 'B4', 1], [1, 1.5, 'A4', 0.5], [1, 2, 'F#4', 0.5], [1, 2.5, 'E4', 0.5], [1, 3, 'F#4', 1],
	[2, 0.5, 'G4', 0.5], [2, 1, 'B4', 0.5], [2, 1.5, 'D5', 1], [2, 3, 'E5', 0.5], [2, 3.5, 'D5', 0.5],
	[3, 0, 'C#5', 1.5], [3, 2, 'A#4', 0.5], [3, 2.5, 'C#5', 0.5], [3, 3, 'E5', 1],
	[4, 0, 'D5', 0.5], [4, 0.5, 'F#5', 0.5], [4, 1, 'E5', 0.5], [4, 1.5, 'D5', 0.5], [4, 2, 'B4', 1.5], [4, 3.5, 'C#5', 0.5],
	[5, 0, 'D5', 1], [5, 1, 'B4', 0.5], [5, 1.5, 'A4', 0.5], [5, 2, 'B4', 2],
	[6, 0.5, 'E4', 0.5], [6, 1, 'G4', 0.5], [6, 1.5, 'B4', 0.5], [6, 2, 'D5', 0.5], [6, 2.5, 'E5', 0.5], [6, 3, 'F#5', 1],
	[7, 0, 'E5', 1], [7, 1, 'C#5', 0.5], [7, 1.5, 'A4', 0.5], [7, 2, 'B4', 1], [7, 3, 'C#5', 1],
]; // prettier-ignore
const FS_ARP = [0, 1, 2, 3, 2, 1, 2, 3];

function bgmFreespin() {
	const beat = 60 / 92;
	const bars = 16;
	const loop = bars * 4 * beat;
	const T = groove(beat, 0.57);
	const music = new Mix(loop + 4);
	const drums = new Mix(loop + 2);
	const kicks = [];

	for (let bar = 0; bar < bars; bar++) {
		const [bassName, voicing] = FS_PROGRESSION[bar % 8];
		const root = n(bassName);
		const chordNotes = notes(voicing);
		const secondHalf = bar >= 8;
		// keys: a held chord on the one and a gentle re-hit on the "and" of 3, over the pad
		keys(music, chordNotes, T(bar, 0), 2.4 * beat, { bright: 0.7 });
		keys(music, chordNotes, T(bar, 10), 1.5 * beat, { gain: 0.05, bright: 0.7 });
		pad(music, chordNotes, T(bar, 0), 4 * beat);
		for (const [s, hold, iv, g] of [[0, 2.2, 0, 0.5], [10, 1.2, 0, 0.42], [14, 0.4, 12, 0.25]]) {
			music.add(softBass(root + iv, hold * beat), T(bar, s), { gain: g, send: 0.05 });
		}
		if (secondHalf) {
			FS_ARP.forEach((k, e) => music.add(kalimba(chordNotes[k] + 12, 0.8), T(bar, e * 2), { gain: 0.09, pan: e % 2 ? 0.45 : 0.25, send: 0.35 })); // prettier-ignore
		}

		const fill = bar % 4 === 3;
		if (bar % 2 === 0) {
			lofiDrums(drums, kicks, T, bar, { kick: [0, 6, 10], snare: [4, 12], ghostHats: [3, 11], shakers: secondHalf });
		} else {
			lofiDrums(drums, kicks, T, bar, { kick: [0, 7, 10], snare: [4, 12], ghost: fill ? [13, 15] : [15], ghostHats: [11], openHat: fill ? [14] : [], shakers: secondHalf }); // prettier-ignore
		}
	}

	// kalimba carries the tune first, then a soft lead takes it with the kalimba underneath
	for (const [bar, p, name, b] of FS_MELODY) {
		const m = n(name);
		music.add(kalimba(m), T(bar, p * 4), { gain: 0.38, pan: -0.15, send: 0.35 });
		music.add(softLead(m, b * beat * 0.9), T(bar + 8, p * 4), { gain: 0.3, pan: -0.1, send: 0.35 });
		music.add(kalimba(m), T(bar + 8, p * 4), { gain: 0.16, pan: 0.2, send: 0.35 });
	}
	return lofiMaster(music.render({ reverb: { size: 0.75, damp: 0.5 }, loop }), drums.render({ reverb: { size: 0.4, damp: 0.6, tail: 1 }, loop }), { loop, kicks, cutoff: 5800, wow: 1 }); // prettier-ignore
}

// big win loops: happy half-time lo-fi; each level adds a layer and steps up in key
const WIN_PROGRESSION = [
	{ bass: -24, voicing: [-8, -5, -1, 2] }, // Imaj9
	{ bass: -27, voicing: [-5, -1, 0, 4] }, // vi9
	{ bass: -19, voicing: [-3, 0, 4, 7] }, // IVmaj9
	{ bass: -17, voicing: [-7, -1, 4, 9] }, // V13
];
// [bar, beat, semitones above the key, beats]
const WIN_MELODY = [
	[0, 0, 4, 0.5], [0, 0.5, 7, 0.5], [0, 1, 11, 0.5], [0, 1.5, 14, 1], [0, 3, 12, 0.5], [0, 3.5, 11, 0.5],
	[1, 0, 12, 1], [1, 1, 16, 0.5], [1, 1.5, 14, 0.5], [1, 2, 12, 1], [1, 3, 9, 1],
	[2, 0, 9, 0.5], [2, 0.5, 12, 0.5], [2, 1, 16, 0.5], [2, 1.5, 19, 1], [2, 3, 16, 0.5], [2, 3.5, 14, 0.5],
	[3, 0, 14, 1], [3, 1, 11, 0.5], [3, 1.5, 14, 0.5], [3, 2, 16, 1], [3, 3, 17, 0.5], [3, 3.5, 16, 0.5],
]; // prettier-ignore

function bgmWin(level) {
	const key = [62, 64, 65, 67, 69][level];
	const beat = 60 / 120;
	const loop = 4 * 4 * beat;
	const T = groove(beat, 0.56);
	const music = new Mix(loop + 4);
	const drums = new Mix(loop + 2);
	const kicks = [];

	WIN_PROGRESSION.forEach(({ bass, voicing }, bar) => {
		const chordNotes = voicing.map((iv) => key + iv);
		const root = key + bass;
		keys(music, chordNotes, T(bar, 0), 2.4 * beat, { bright: 0.8 });
		keys(music, chordNotes, T(bar, 10), 1.5 * beat, { gain: 0.055, bright: 0.8 });
		pad(music, chordNotes, T(bar, 0), 4 * beat);
		for (const [s, hold, iv, g] of [[0, 2.2, 0, 0.5], [10, 1.2, 0, 0.42], [14, 0.4, 12, 0.25]]) {
			music.add(softBass(root + iv, hold * beat), T(bar, s), { gain: g, send: 0.05 });
		}
		if (level >= 1) {
			const up = [...chordNotes, chordNotes[0] + 12];
			for (let s = 0; s < 16; s++) music.add(kalimba(up[s % 4] + 12, 0.6), T(bar, s), { gain: 0.06, pan: s % 2 ? 0.5 : -0.5, send: 0.35 }); // prettier-ignore
		}
		if (level >= 3) {
			for (const m of chordNotes) music.add(choir(m, 4 * beat - 0.1), T(bar, 0), { gain: 0.12, pan: rr(-0.5, 0.5), send: 0.5 });
		}
		// half-time groove: the snare lands on 3
		lofiDrums(drums, kicks, T, bar, {
			kick: level >= 2 ? [0, 3, 10, 14] : [0, 3, 10],
			snare: [8],
			ghost: [15],
			hats: level >= 4 ? 1 : 2,
			ghostHats: level >= 4 ? [] : [7],
			openHat: level >= 3 ? [14] : [],
			shakers: level >= 2,
		});
	});

	for (const [bar, p, iv, b] of WIN_MELODY) {
		const m = key + iv;
		music.add(kalimba(m), T(bar, p * 4), { gain: 0.38, pan: -0.15, send: 0.35 });
		music.add(glock(m + 12, 0.7), T(bar, p * 4), { gain: 0.05, pan: 0.2, send: 0.4 });
		if (level >= 2) music.add(softLead(m, b * beat * 0.9), T(bar, p * 4), { gain: 0.22, pan: 0.05, send: 0.35 });
		if (level >= 4) music.add(softLead(m + 12, b * beat * 0.9), T(bar, p * 4), { gain: 0.12, pan: -0.05, send: 0.35 });
	}
	return lofiMaster(music.render({ reverb: { size: 0.75, damp: 0.5 }, loop }), drums.render({ reverb: { size: 0.4, damp: 0.6, tail: 1 }, loop }), { loop, kicks, cutoff: 6000 + 300 * level, wow: 0.8, vinyl: 0.7 }); // prettier-ignore
}

function coinLoop() {
	const loop = 8;
	const mx = new Mix(loop + 2);
	const clink = () =>
		partials(rr(2500, 5200), 0.4, [[1, 1, rr(0.08, 0.3)], [2.32, 0.5, rr(0.05, 0.15)], [3.7, 0.3, 0.05], [5.1, 0.15, 0.03]], { attack: 0.0005 }); // prettier-ignore
	// coins landing on the pile, each a little cluster of clinks
	for (let t = 0; t < loop; t += rr(0.04, 0.12)) {
		const pan = rr(-0.8, 0.8);
		const count = 1 + Math.floor(rand() * 4);
		for (let k = 0; k < count; k++) mx.add(clink(), t + k * rr(0.015, 0.045), { gain: rr(0.25, 0.6) * Math.pow(0.7, k), pan, send: 0.25 }); // prettier-ignore
	}
	// the odd "ka-ching"
	for (let k = 0; k < 6; k++) {
		const t = ((k + rr(0, 0.6)) * loop) / 6;
		const pan = rr(-0.5, 0.5);
		mx.add(glock(n('A6'), 0.5), t, { gain: 0.3, pan, send: 0.3 });
		mx.add(glock(n('D7'), 0.8), t + 0.07, { gain: 0.35, pan, send: 0.3 });
	}
	return mx.render({ reverb: { size: 0.6 }, loop });
}

function anticipationLoop() {
	const beat = 60 / 125;
	const loop = 4 * 4 * beat;
	const mx = new Mix(loop + 3);
	// heartbeat every two beats
	for (let b = 0; b < 16; b += 2) {
		mx.add(kick({ f0: 90, f1: 40, decay: 0.3, click: 0.1 }), b * beat, { gain: 0.65, send: 0.1 });
		mx.add(kick({ f0: 80, f1: 38, decay: 0.25, click: 0.1 }), b * beat + 0.16, { gain: 0.55, send: 0.1 });
	}
	for (let e = 0; e < 32; e++) {
		mx.add(synthBass(n('D2'), beat * 0.35), (e * beat) / 2, { gain: e % 2 ? 0.25 : 0.35, send: 0.05 });
		mx.add(woodblock(e % 2 ? 1300 : 1700, 0.03), (e * beat) / 2, { gain: 0.12, pan: e % 2 ? 0.4 : -0.4, send: 0.1 });
	}
	// tremolo strings: suspended, then darker
	for (const [bar, voicing] of [[0, 'D3 A3 D4 E4'], [2, 'D3 Bb3 D4 Eb4']]) {
		for (const m of notes(voicing)) mx.add(strings(m, 8 * beat - 0.05, { tremolo: 0.6, attack: 0.3 }), bar * 4 * beat, { gain: 0.22, pan: rr(-0.4, 0.4), send: 0.4 }); // prettier-ignore
	}
	return mx.render({ reverb: { size: 0.75 }, loop });
}

// ---------------------------------------------------------------------------------------------
// sound effects (D major, to sit with the music)

function btnGeneral() {
	const mx = new Mix(0.1);
	mx.add(woodblock(1750, 0.03), 0, { gain: 0.8, send: 0 });
	mx.add(thump(900, 500, 0.04), 0, { gain: 0.3, send: 0 });
	return mx.render({ reverb: false });
}

function btnSpin() {
	const mx = new Mix(0.8);
	mx.add(woodblock(1300, 0.04), 0, { gain: 0.6, send: 0.05 });
	mx.add(thump(220, 80, 0.12), 0, { gain: 0.5, send: 0 });
	mx.add(whoosh(0.5, 350, 3200, { q: 1.4, peakAt: 0.55 }), 0.02, { gain: 0.35, send: 0.2 });
	mx.add(glide(0.09, 600, 1100), 0.03, { gain: 0.25 });
	return mx.render({ reverb: { size: 0.5, tail: 0.6 } });
}

const reelStop = (k) => () => {
	const mx = new Mix(0.3);
	mx.add(thump(150, 55, 0.18), 0, { gain: 0.8, send: 0 });
	mx.add(woodblock(380 + 25 * k, 0.07), 0, { gain: 0.45, send: 0.05 });
	mx.add(filter(env(noise(0.012), (t) => ex(t, 0.012)), 'bp', 2400, 1), 0, { gain: 0.25, send: 0 });
	return mx.render({ reverb: { size: 0.3, tail: 0.25 } });
};

function symbolsLanding() {
	const mx = new Mix(1.2);
	mx.add(thump(130, 60, 0.2), 0, { gain: 0.6, send: 0 });
	mx.add(glock(n('D6'), 0.9), 0, { gain: 0.15, pan: -0.2, send: 0.4 });
	mx.add(glock(n('A6'), 0.9), 0.03, { gain: 0.1, pan: 0.2, send: 0.4 });
	return mx.render({ reverb: { size: 0.5, tail: 0.8 } });
}

function royalsLanding() {
	const mx = new Mix(1.2);
	mx.add(thump(120, 60, 0.15), 0, { gain: 0.4, send: 0 });
	mx.add(pizz(n('D4'), 0.6), 0, { gain: 0.4, pan: -0.2, send: 0.25 });
	mx.add(pizz(n('A4'), 0.6), 0.02, { gain: 0.3, pan: 0.2, send: 0.25 });
	return mx.render({ reverb: { size: 0.5, tail: 0.8 } });
}

// each scatter that lands rings one step higher
const SCATTER_NOTES = ['D5', 'F#5', 'A5', 'D6', 'F#6'];
const scatterStop = (k) => () => {
	const mx = new Mix(1.2);
	const m = n(SCATTER_NOTES[k - 1]);
	mx.add(thump(170, 55, 0.25), 0, { gain: 0.7, send: 0 });
	mx.add(chime(m, 1.6), 0, { gain: 0.55, send: 0.4 });
	mx.add(glock(m + 12, 1), 0, { gain: 0.3, send: 0.4 });
	mx.add(marimba(m - 12), 0, { gain: 0.35, send: 0.2 });
	sparkle(mx, 0.06, 0.5, 2 + k * 2, { gain: 0.12, span: 5 + k });
	if (k >= 3) mx.add(meow({ ...MEOWS.mew, pitch: 760 + 70 * k }), 0.04, { gain: 0.45, send: 0.3 });
	return mx.render({ reverb: { size: 0.7, tail: 1 } });
};

function scatterReveal() {
	const mx = new Mix(1.6);
	for (let k = 0; k < 9; k++) mx.add(glock(penta(k), 0.6), k * 0.06, { gain: 0.15 + 0.03 * k, pan: -0.6 + 0.15 * k, send: 0.4 });
	mx.add(whoosh(0.6, 800, 7000, { q: 0.8, peakAt: 0.95 }), 0, { gain: 0.25, send: 0.3 });
	chord(mx, notes('D5 F#5 A5 D6'), 0.58, (m) => chime(m, 1.8), { gain: 0.3, send: 0.5 });
	mx.add(meow({ ...MEOWS.mew, pitch: 820 }), 0.6, { gain: 0.5, send: 0.3 });
	sparkle(mx, 0.6, 0.8, 8, { gain: 0.12 });
	return mx.render({ reverb: { size: 0.8, tail: 1.2 } });
}

function scatterWin() {
	const mx = new Mix(2);
	mx.add(meow({ ...MEOWS.meow, pitch: 700 }), 0, { gain: 0.7, send: 0.3 });
	chord(mx, notes('D4 F#4 A4 D5'), 0.08, (m) => brass(m, 0.5), { gain: 0.18 });
	arp(mx, [...Array(10).keys()].map((k) => penta(k)), 0.08, 0.04, (m) => glock(m, 0.8), { gain: 0.18, spread: 1.2, send: 0.4 });
	mx.add(crash(1.5), 0.08, { gain: 0.25, send: 0.3 });
	chord(mx, notes('A5 D6'), 0.5, (m) => chime(m, 1.5), { gain: 0.3, send: 0.5 });
	sparkle(mx, 0.5, 1, 8, { gain: 0.12 });
	return mx.render({ reverb: { size: 0.75, tail: 1.2 } });
}

// free spins triggered: "MEOW!" into a D major fanfare
function scatterWinV2() {
	const mx = new Mix(3.8);
	mx.add(whoosh(0.4, 300, 4000, { peakAt: 0.9 }), 0, { gain: 0.3, send: 0.3 });
	for (const [t, voicing, hold] of [[0.4, 'D4 F#4 A4 D5', 0.45], [0.95, 'D4 G4 B4 D5', 0.2], [1.2, 'E4 A4 C#5 E5', 0.2], [1.45, 'D4 F#4 A4 D5 F#5', 1.4]]) {
		chord(mx, notes(voicing), t, (m) => brass(m, hold), { gain: 0.2, send: 0.35 });
	}
	for (const t of [0.95, 1.2]) mx.add(snare(), t, { gain: 0.3, send: 0.3 });
	mx.add(boom(1.4), 0.4, { gain: 0.8, send: 0.1 });
	mx.add(crash(2), 0.4, { gain: 0.35, send: 0.3 });
	mx.add(meow(MEOWS.meow), 0.42, { gain: 0.75, send: 0.3 });
	arp(mx, [...Array(10).keys()].map((k) => penta(k)), 0.4, 0.05, (m) => glock(m, 0.8), { gain: 0.16, spread: 1.2, send: 0.4 });
	mx.add(timpani(n('D3')), 1.45, { gain: 0.7, send: 0.2 });
	mx.add(crash(2.2), 1.45, { gain: 0.3, send: 0.3 });
	chord(mx, notes('D6 F#6 A6'), 1.45, (m) => chime(m, 2), { gain: 0.2, send: 0.5 });
	sparkle(mx, 1.5, 1.6, 14, { gain: 0.12 });
	return mx.render({ reverb: { size: 0.85, tail: 1.5 } });
}

function introFreeSpins() {
	const mx = new Mix(2);
	const run = notes('D4 F#4 A4 D5 F#5 A5 D6');
	arp(mx, run, 0, 0.06, (m) => marimba(m), { gain: 0.35, spread: 1, send: 0.3 });
	arp(mx, run, 0, 0.06, (m) => glock(m + 12, 0.6), { gain: 0.12, spread: 1, send: 0.4 });
	const H = 0.45;
	chord(mx, notes('D4 A4 D5 F#5'), H, (m) => brass(m, 0.9), { gain: 0.2, send: 0.35 });
	mx.add(crash(1.8), H, { gain: 0.3, send: 0.3 });
	mx.add(boom(1), H, { gain: 0.5, send: 0.1 });
	mx.add(chime(n('D6'), 1.5), H, { gain: 0.25, send: 0.5 });
	mx.add(meow(MEOWS.mrrp), H + 0.05, { gain: 0.6, send: 0.3 });
	sparkle(mx, H + 0.05, 0.9, 8, { gain: 0.12 });
	return mx.render({ reverb: { size: 0.8, tail: 1.2 } });
}

function superFreeSpin() {
	const mx = new Mix(6.5);
	// timpani roll, riser and tremolo strings building to the hit
	for (let t = 0; t < 1.75; t += 1 / 16) mx.add(timpani(n('D2'), 0.6), t, { gain: 0.1 + 0.5 * (t / 1.75) ** 2, pan: rr(-0.2, 0.2), send: 0.2 }); // prettier-ignore
	mx.add(whoosh(1.8, 200, 6000, { q: 0.9, peakAt: 0.97 }), 0, { gain: 0.35, send: 0.3 });
	for (const m of notes('D3 A3 D4')) mx.add(strings(m, 1.75, { tremolo: 0.5, attack: 1.5, rel: 0.1 }), 0, { gain: 0.2, send: 0.3 });

	const H = 1.8;
	mx.add(boom(1.8), H, { gain: 0.9, send: 0.1 });
	mx.add(crash(2.5), H, { gain: 0.4, send: 0.3 });
	chord(mx, notes('D3 A3 D4 F#4 A4 D5'), H, (m) => brass(m, 0.5), { gain: 0.17 });
	chord(mx, notes('D4 F#4 A4 D5'), H, (m) => choir(m, 2.2), { gain: 0.3, send: 0.5 });
	mx.add(meow(MEOWS.rowr), H + 0.05, { gain: 0.75, send: 0.3 });

	// fanfare: triplet pickup into D, then Bb - C - D
	const F = H + 0.65;
	for (const [dt, name, hold] of [[0, 'A4', 0.1], [0.12, 'A4', 0.1], [0.24, 'A4', 0.1], [0.36, 'D5', 0.5]]) {
		mx.add(brass(n(name), hold), F + dt, { gain: 0.4, send: 0.3 });
		mx.add(snare({ decay: 0.12 }), F + dt, { gain: 0.2, send: 0.3 });
	}
	chord(mx, notes('D4 F#4 A4'), F + 0.36, (m) => brass(m, 0.5), { gain: 0.15 });
	for (const [dt, voicing, hold] of [[1, 'Bb3 D4 F4 Bb4 D5', 0.3], [1.4, 'C4 E4 G4 C5 E5', 0.3], [1.8, 'D4 F#4 A4 D5 F#5', 1.6]]) {
		chord(mx, notes(voicing), F + dt, (m) => brass(m, hold), { gain: 0.18, send: 0.35 });
		mx.add(snare(), F + dt, { gain: 0.3, send: 0.3 });
	}
	const E = F + 1.8;
	mx.add(timpani(n('D2')), E, { gain: 0.8, send: 0.2 });
	mx.add(crash(2.2), E, { gain: 0.35, send: 0.3 });
	chord(mx, notes('D6 F#6 A6'), E, (m) => chime(m, 2), { gain: 0.2, send: 0.5 });
	sparkle(mx, E, 1.4, 12, { gain: 0.12 });
	return mx.render({ reverb: { size: 0.85, tail: 1.5 } });
}

function freeSpinRetrigger() {
	const mx = new Mix(4);
	mx.add(meow(MEOWS.mrrp), 0, { gain: 0.6, send: 0.25 });
	const run = notes('D5 E5 F#5 A5 B5 D6');
	arp(mx, run, 0.15, 0.12, (m) => chime(m, 1.4), { gain: 0.28, spread: 1, send: 0.4 });
	arp(mx, run, 0.15, 0.12, (m) => glock(m + 12, 0.8), { gain: 0.12, spread: 1, send: 0.4 });
	const H = 0.9;
	chord(mx, notes('D4 F#4 A4 D5'), H, (m) => brass(m, 0.8), { gain: 0.18, send: 0.35 });
	mx.add(crash(1.8), H, { gain: 0.25, send: 0.3 });
	chord(mx, notes('D6 A6 D7'), H, (m) => glock(m, 1.2), { gain: 0.15, send: 0.4 });
	sparkle(mx, H, 1.5, 10, { gain: 0.12 });
	return mx.render({ reverb: { size: 0.8, tail: 1.5 } });
}

function anticipationStart() {
	const mx = new Mix(1);
	mx.add(whoosh(0.4, 300, 5000, { peakAt: 0.92 }), 0, { gain: 0.4, send: 0.3 });
	const H = 0.36;
	mx.add(boom(1), H, { gain: 0.8, send: 0.1 });
	mx.add(crash(1.2), H, { gain: 0.2, send: 0.3 });
	for (const m of notes('D3 A3 D4 Eb4')) mx.add(strings(m, 0.25, { attack: 0.01, rel: 0.4 }), H, { gain: 0.22, pan: rr(-0.5, 0.5), send: 0.4 }); // prettier-ignore
	return mx.render({ reverb: { size: 0.8, tail: 1 } });
}

const multiplierCombine = ({ whooshDur, notes: [low, high] }) => () => {
	const mx = new Mix(1.2);
	mx.add(whoosh(whooshDur, 600, 3500, { peakAt: 0.9 }), 0, { gain: 0.35, pan: -0.6, send: 0.3 });
	mx.add(whoosh(whooshDur, 700, 4000, { peakAt: 0.9 }), 0.03, { gain: 0.35, pan: 0.6, send: 0.3 });
	mx.add(thump(300, 120, 0.1), whooshDur, { gain: 0.3, send: 0 });
	mx.add(chime(n(low), 1.2), whooshDur, { gain: 0.4, send: 0.45 });
	mx.add(glock(n(high)), whooshDur + 0.02, { gain: 0.25, send: 0.45 });
	sparkle(mx, whooshDur, 0.5, 6, { gain: 0.12 });
	return mx.render({ reverb: { size: 0.7, tail: 0.8 } });
};

const multiplierExplosion = ({ size, sparkles }) => () => {
	const mx = new Mix(size * 2);
	mx.add(poof(size * 0.6), 0, { gain: 0.6, send: 0.3 });
	mx.add(boom(size * 0.8), 0, { gain: 0.6 + 0.15 * size, send: 0.1 });
	if (size > 1) mx.add(crash(size), 0, { gain: 0.25, send: 0.3 });
	sparkle(mx, 0.03, size * 0.6, sparkles, { gain: 0.12 });
	return mx.render({ reverb: { size: 0.6 + 0.1 * size, tail: size * 0.6 } });
};

// big wild landing, and each wild it throws
function multiplierLanding() {
	const mx = new Mix(1);
	mx.add(kick({ f0: 180, f1: 45, decay: 0.5, click: 0.4 }), 0, { gain: 0.8, send: 0.05 });
	mx.add(norm(env(filter(metal(0.4, 2.2), 'hp', 5000), (t) => ex(t, 0.35))), 0, { gain: 0.2, send: 0.3 });
	mx.add(chime(n('D5'), 1), 0, { gain: 0.3, send: 0.35 });
	mx.add(chime(n('A5'), 1), 0.01, { gain: 0.22, send: 0.35 });
	return mx.render({ reverb: { size: 0.6, tail: 0.8 } });
}

function multiplierReset() {
	const mx = new Mix(0.6);
	mx.add(glide(0.35, 1000, 260), 0, { gain: 0.5, send: 0.2 });
	mx.add(woodblock(900, 0.04), 0.3, { gain: 0.2, send: 0.1 });
	return mx.render({ reverb: { size: 0.4, tail: 0.3 } });
}

function multiplierUp() {
	const mx = new Mix(1.5);
	arp(mx, [...Array(8).keys()].map((k) => penta(k)), 0, 0.05, (m) => glock(m, 0.7), { gain: 0.25, spread: 1, send: 0.4 });
	mx.add(chime(n('D7'), 1), 0.4, { gain: 0.25, send: 0.5 });
	sparkle(mx, 0.4, 0.6, 5, { gain: 0.1 });
	return mx.render({ reverb: { size: 0.7, tail: 0.8 } });
}

function multiplierUpdate() {
	const mx = new Mix(1.6);
	mx.add(chime(n('D6'), 1.4), 0, { gain: 0.45, send: 0.4 });
	mx.add(glock(n('A6'), 1), 0.02, { gain: 0.2, send: 0.4 });
	sparkle(mx, 0.05, 0.5, 3, { gain: 0.1 });
	return mx.render({ reverb: { size: 0.7, tail: 0.8 } });
}

function multiplierWin() {
	const mx = new Mix(3.8);
	arp(mx, notes('D5 F#5 A5 D6 F#6 A6'), 0, 0.08, (m) => chime(m, 2), { gain: 0.25, spread: 1, send: 0.45 });
	chord(mx, notes('D4 F#4 A4 D5'), 0.45, (m) => brass(m, 1.2, { bright: 0.6 }), { gain: 0.14, send: 0.4 });
	mx.add(crash(2), 0.45, { gain: 0.18, send: 0.3 });
	sparkle(mx, 0.45, 2.2, 14, { gain: 0.1 });
	return mx.render({ reverb: { size: 0.85, tail: 1.2 } });
}

// big wild pounces: whoosh, impact and a growly "ROWR"
function wildExplode() {
	const mx = new Mix(1.4);
	mx.add(whoosh(0.22, 4000, 500, { q: 1, peakAt: 0.6 }), 0, { gain: 0.35, send: 0.2 });
	const H = 0.14;
	mx.add(kick({ f0: 200, f1: 40, decay: 0.6, click: 0.5 }), H, { gain: 0.8, send: 0.05 });
	mx.add(crash(1), H, { gain: 0.22, send: 0.3 });
	mx.add(meow(MEOWS.rowr), H, { gain: 0.8, send: 0.25 });
	chord(mx, notes('D3 A3 D4'), H, (m) => brass(m, 0.3), { gain: 0.18 });
	sparkle(mx, H + 0.1, 0.8, 6, { gain: 0.1 });
	return mx.render({ reverb: { size: 0.7, tail: 0.8 } });
}

// small to substantial wins: a longer run up the D major chord each level
function winLevel({ run, step = 0.07, chordAt, brassChord, sparkles = 0, crashGain = 0 }) {
	return () => {
		const mx = new Mix(2.5);
		const ms = notes(run);
		arp(mx, ms, 0, step, (m) => marimba(m), { gain: 0.3, spread: 0.8, send: 0.3 });
		arp(mx, ms, 0, step, (m) => glock(m + 12, 0.8), { gain: 0.14, spread: 0.8, send: 0.4 });
		const H = chordAt ?? ms.length * step;
		mx.add(glock(n('A6'), 0.5), H, { gain: 0.25, send: 0.3 });
		mx.add(glock(n('D7'), 0.9), H + 0.07, { gain: 0.3, send: 0.35 });
		mx.add(chime(ms[ms.length - 1], 1.2), H, { gain: 0.2, send: 0.45 });
		if (brassChord) chord(mx, notes(brassChord), H, (m) => brass(m, 0.7), { gain: 0.16, send: 0.35 });
		if (crashGain) mx.add(crash(1.6), H, { gain: crashGain, send: 0.3 });
		sparkle(mx, H, 0.8, sparkles, { gain: 0.1 });
		return mx.render({ reverb: { size: 0.7, tail: 1 } });
	};
}

// line win: a soft kalimba pair over a hushed rhodes chord, kept warm and round
function winLevelSmall() {
	const mx = new Mix(1.4);
	keys(mx, notes('F#4 A4 D5'), 0, 0.5, { gain: 0.12, bright: 0.25, roll: 0.02 });
	mx.add(kalimba(n('D5'), 1.1), 0.02, { gain: 0.35, pan: -0.15, send: 0.35 });
	mx.add(kalimba(n('A5'), 1.2), 0.14, { gain: 0.3, pan: 0.15, send: 0.4 });
	const out = mx.render({ reverb: { size: 0.7, damp: 0.6, tail: 0.8 } });
	filter(out.L, 'lp', 3200);
	filter(out.R, 'lp', 3200);
	return out;
}

// end of a big win: final chord
function winLevelEnd() {
	const mx = new Mix(2);
	chord(mx, notes('D3 A3 D4 F#4 A4 D5'), 0, (m) => brass(m, 0.9), { gain: 0.17, send: 0.35 });
	mx.add(timpani(n('D2')), 0, { gain: 0.7, send: 0.2 });
	mx.add(boom(1.2), 0, { gain: 0.5, send: 0.1 });
	mx.add(crash(2), 0, { gain: 0.35, send: 0.3 });
	chord(mx, notes('D6 A6'), 0, (m) => chime(m, 1.6), { gain: 0.22, send: 0.5 });
	sparkle(mx, 0.05, 1, 10, { gain: 0.1 });
	return mx.render({ reverb: { size: 0.85, tail: 1.2 } });
}

function youWonPanel() {
	const mx = new Mix(3);
	const lead = [[0, 'A4', 0.09], [0.12, 'A4', 0.09], [0.24, 'A4', 0.09], [0.36, 'D5', 0.45], [0.9, 'B4', 0.15], [1.08, 'C#5', 0.15], [1.26, 'D5', 1.3]]; // prettier-ignore
	for (const [t, name, hold] of lead) mx.add(brass(n(name), hold), t, { gain: 0.4, send: 0.3 });
	for (const t of [0, 0.12, 0.24]) mx.add(snare({ decay: 0.12 }), t, { gain: 0.2, send: 0.3 });
	for (const [t, voicing, hold] of [[0.36, 'D4 F#4 A4', 0.45], [0.9, 'D4 G4 B4', 0.15], [1.08, 'E4 A4 C#5', 0.15], [1.26, 'D4 F#4 A4', 1.3]]) {
		chord(mx, notes(voicing), t, (m) => brass(m, hold), { gain: 0.15, send: 0.35 });
	}
	mx.add(kick(), 0.36, { gain: 0.6, send: 0 });
	mx.add(crash(1.5), 0.36, { gain: 0.25, send: 0.3 });
	mx.add(timpani(n('D3')), 1.26, { gain: 0.6, send: 0.2 });
	mx.add(crash(2), 1.26, { gain: 0.3, send: 0.3 });
	mx.add(meow({ ...MEOWS.meow, pitch: 720 }), 1.32, { gain: 0.6, send: 0.3 });
	chord(mx, notes('D6 F#6 A6'), 1.26, (m) => chime(m, 1.8), { gain: 0.18, send: 0.5 });
	sparkle(mx, 1.3, 1.3, 12, { gain: 0.1 });
	return mx.render({ reverb: { size: 0.85, tail: 1.2 } });
}

// cascading wins climb the pentatonic scale
const TUMBLE_NOTES = ['D5', 'E5', 'F#5', 'A5', 'B5'];
const tumbleWin = (k) => () => {
	const mx = new Mix(1);
	const m = n(TUMBLE_NOTES[k - 1]);
	mx.add(whoosh(0.18, 1500, 5000, { peakAt: 0.8 }), 0, { gain: 0.2, send: 0.2 });
	mx.add(chime(m, 1), 0.12, { gain: 0.4, send: 0.4 });
	mx.add(glock(m + 12, 0.8), 0.12, { gain: 0.25, send: 0.4 });
	mx.add(marimba(m - 12), 0.12, { gain: 0.3, send: 0.2 });
	sparkle(mx, 0.14, 0.4, k + 1, { gain: 0.1 });
	return mx.render({ reverb: { size: 0.7, tail: 0.8 } });
};

// ---------------------------------------------------------------------------------------------
// sprite

// level: loudest 400 ms RMS to aim for (dBFS); peak: ceiling
const SOUNDS = {
	bgm_main: { level: -23, loop: true, render: bgmMain },
	bgm_freespin: { level: -21.5, loop: true, render: bgmFreespin },
	bgm_winlevel_big: { level: -20, loop: true, render: () => bgmWin(0) },
	bgm_winlevel_superwin: { level: -19.5, loop: true, render: () => bgmWin(1) },
	bgm_winlevel_mega: { level: -19, loop: true, render: () => bgmWin(2) },
	bgm_winlevel_epic: { level: -18.5, loop: true, render: () => bgmWin(3) },
	bgm_winlevel_max: { level: -18, loop: true, render: () => bgmWin(4) },
	sfx_anticipation: { level: -21, loop: true, render: anticipationLoop },
	sfx_bigwin_coinloop: { level: -26, loop: true, render: coinLoop },
	jng_intro_fs: { level: -15, render: introFreeSpins },
	sfx_anticipation_start: { level: -16, render: anticipationStart },
	sfx_btn_general: { level: -26, peak: 0.6, render: btnGeneral },
	sfx_btn_spin: { level: -22, peak: 0.7, render: btnSpin },
	sfx_fs_respins: { level: -16, render: freeSpinRetrigger },
	sfx_multiplier_combine_a: { level: -19, render: multiplierCombine({ whooshDur: 0.5, notes: ['D6', 'A6'] }) },
	sfx_multiplier_combine_b: { level: -19, render: multiplierCombine({ whooshDur: 0.35, notes: ['A5', 'E6'] }) },
	sfx_multiplier_explosion_a: { level: -18, render: multiplierExplosion({ size: 0.7, sparkles: 4 }) },
	sfx_multiplier_explosion_b: { level: -16, render: multiplierExplosion({ size: 1.6, sparkles: 12 }) },
	sfx_multiplier_explosion_c: { level: -17, render: multiplierExplosion({ size: 1.1, sparkles: 7 }) },
	sfx_multiplier_landing: { level: -17, render: multiplierLanding },
	sfx_multiplier_reset: { level: -22, render: multiplierReset },
	sfx_multiplier_up: { level: -19, render: multiplierUp },
	sfx_multiplier_update: { level: -20, render: multiplierUpdate },
	sfx_multiplier_win: { level: -17, render: multiplierWin },
	sfx_royals_landing: { level: -23, render: royalsLanding },
	sfx_scatter_reveal: { level: -17, render: scatterReveal },
	sfx_scatter_win: { level: -16, render: scatterWin },
	sfx_scatter_win_v2: { level: -15, render: scatterWinV2 },
	sfx_superfreespin: { level: -15, render: superFreeSpin },
	sfx_symbols_landing: { level: -22, render: symbolsLanding },
	sfx_wild_explode: { level: -16, render: wildExplode },
	sfx_winlevel_end: { level: -16, render: winLevelEnd },
	sfx_winlevel_small: { level: -23, render: winLevelSmall },
	sfx_winlevel_standard: { level: -19, render: winLevel({ run: 'D5 F#5 A5' }) },
	sfx_winlevel_nice: { level: -18, render: winLevel({ run: 'D5 F#5 A5 D6', sparkles: 4 }) },
	sfx_winlevel_substantial: { level: -17, render: winLevel({ run: 'D5 F#5 A5 D6 F#6', brassChord: 'D4 F#4 A4 D5', sparkles: 8, crashGain: 0.2 }) }, // prettier-ignore
	sfx_youwon_panel: { level: -15, render: youWonPanel },
};
for (let k = 1; k <= 5; k++) {
	SOUNDS[`sfx_reel_stop_${k}`] = { level: -22, peak: 0.6, render: reelStop(k) };
	SOUNDS[`sfx_scatter_stop_${k}`] = { level: -18 + 0.5 * k, render: scatterStop(k) };
	SOUNDS[`tumble_win_${k}`] = { level: -19 + 0.5 * k, render: tumbleWin(k) };
}

function trimTail({ L, R }) {
	let peak = 0;
	for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
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

function peakOf({ L, R }) {
	let peak = 0;
	for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
	return peak;
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

const ENCODERS = {
	ogg: ['-c:a', 'libvorbis', '-q:a', '4'],
	m4a: ['-c:a', 'aac', '-b:a', '128k'],
	mp3: ['-c:a', 'libmp3lame', '-b:a', '128k'],
	ac3: ['-c:a', 'ac3', '-b:a', '128k'],
};

function main() {
	const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../static/assets/audio');
	const previewIndex = process.argv.indexOf('--preview');
	const previewDir = previewIndex > -1 ? path.resolve(process.argv[previewIndex + 1]) : undefined;
	if (previewDir) fs.mkdirSync(previewDir, { recursive: true });

	const rendered = [];
	for (const name of Object.keys(SOUNDS).sort()) {
		const { render, loop = false, level, peak = 0.95 } = SOUNDS[name];
		seed(hash(name));
		let audio = render();
		if (!loop) audio = trimTail(audio);
		const before = loudness(audio);
		const g = Math.min(Math.pow(10, (level - before) / 20), peak / peakOf(audio));
		for (const ch of [audio.L, audio.R]) for (let i = 0; i < ch.length; i++) ch[i] *= g;
		rendered.push({ name, loop, audio });
		console.log(
			`${name.padEnd(28)} ${(audio.L.length / SR).toFixed(2).padStart(6)}s  level ${loudness(audio).toFixed(1).padStart(6)} dB  peak ${peakOf(audio).toFixed(2)}`,
		);
		if (previewDir) fs.writeFileSync(path.join(previewDir, `${name}.wav`), wav(audio.L, audio.R));
	}

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
		const o = (sprite[name][0] / 1000) * SR;
		total.set(audio.L, o);
		totalR.set(audio.R, o);
	}

	const ffmpeg = process.env.FFMPEG || 'ffmpeg';
	const canEncode = spawnSync(ffmpeg, ['-version']).status === 0;
	const wavPath = canEncode ? path.join(os.tmpdir(), `cat-hunt-sounds-${process.pid}.wav`) : path.join(outDir, 'sounds.wav');
	fs.writeFileSync(wavPath, wav(total, totalR));
	const formats = canEncode ? Object.keys(ENCODERS) : ['wav'];
	if (canEncode) {
		for (const ext of formats) {
			execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wavPath, ...ENCODERS[ext], path.join(outDir, `sounds.${ext}`)]);
		}
		fs.rmSync(wavPath);
	} else {
		console.warn('ffmpeg not found: wrote sounds.wav only. Install ffmpeg (or set FFMPEG) to get ogg/m4a/mp3/ac3.');
	}

	const names = Object.keys(sprite);
	const json = [
		'{',
		'\t"sprite": {',
		names.map((name) => `\t\t"${name}": [${sprite[name].map((v) => (typeof v === 'number' ? +v.toFixed(3) : v)).join(', ')}]`).join(',\n'),
		'\t},',
		'\t"src": [',
		formats.map((ext) => `\t\t"./assets/audio/sounds.${ext}"`).join(',\n'),
		'\t],',
		'\t"config": {',
		names.map((name) => `\t\t"${name}": { "volume": 1 }`).join(',\n'),
		'\t}',
		'}',
		'',
	].join('\n');
	fs.writeFileSync(path.join(outDir, 'sounds.json'), json);
	console.log(`\n${names.length} sounds, ${(cursor / 1000).toFixed(0)} s sprite -> ${formats.map((ext) => `sounds.${ext}`).join(', ')}`);
}

main();
