// Generates every sound and all the music of the chess game from code (no recordings or samples):
// the chess sounds, and new ones under the names the sample game had, which the game's code plays.
//
//   node scripts/generate-sounds.mjs                  (run from apps/my-chess-game; pnpm sounds)
//   node scripts/generate-sounds.mjs --preview <dir>  (also writes each sound as <dir>/<name>.wav)
//   node scripts/generate-sounds.mjs --dry ...        (only renders: no sprite written)
//   node scripts/generate-sounds.mjs --only <text>    (renders only the names holding <text>)
//
// Writes static/assets/audio/sounds.{ogg,m4a} + sounds.json (Ogg for most browsers, M4A for Safari).
// ffmpeg isn't installed, so the encoding is done by Blender's own FFmpeg (scripts/sound-io.py;
// BLENDER=<path to blender.exe> if it isn't the Steam one). Each sound is seeded by its name, so
// changing one recipe leaves the others as they were. (The sample's own audio is in git history.)
//
// The music is a late-night chess café: cozy lo-fi jazz on felt piano, upright bass, brushed drums,
// vibraphone and rhodes, through tape and vinyl, G major in the base game and E minor in the bonus.
//
// The chess sounds are wooden pieces on a wooden board in a quiet room, made to be satisfying: a felted
// piece set down is a deep, round "thock" with a crisp edge, the board ringing under it and the table
// under that; a capture is the hard clack of wood on wood and the taken piece knocked over. Each kind
// of piece has its own: the pawn light and quick, the knight's hop a clip-clop, the bishop clean with
// a glassy edge, the rook a heavy block that grinds into its square, the queen full and rich, the king
// the heaviest, set down deliberately and rocking once. Three takes of each move, played in turn, so
// a run of moves never sounds machine-made. Taking a piece pays, so yours end on a wooden marimba
// chime that grows with the piece (a pawn one note, a queen a whole run); the tunes keep to G major.

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
// tanh soft-clip: rounds the very top of a transient off, so a hit is denser and punchier
const saturate = (buf, drive = 2.4) => {
	norm(buf);
	const d = Math.tanh(drive);
	for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * drive) / d;
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

// ---------------------------------------------------------------------------------------------
// wood

// the board's modes: one hardwood board on a table for every piece, its "thock" in the low mids. A
// plate has many modes close together, so it knocks rather than rings a note: 18 of them, spread
// from 140 Hz to 3.6 kHz, loudest around 700 Hz, the high ones dying quickest (wood damps its highs)
const BOARD = (() => {
	let s = 0x5eed;
	const r = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
	const count = 18;
	return Array.from({ length: count }, (_, k) => {
		const f = 140 * Math.pow(3600 / 140, k / (count - 1)) * (0.94 + 0.12 * r());
		const octaves = Math.log2(f / 700);
		const g = (0.25 + Math.exp(-(octaves * octaves) / (2 * 1.1 * 1.1))) * (0.7 + 0.6 * r());
		const d = 0.2 * Math.pow(f / 150, -0.55);
		return [f, g, d];
	});
})();
// the piece's own modes: a small turned block of wood, a short bright ring
const PIECE = [
	[2050, 1, 0.016],
	[2910, 0.7, 0.011],
	[4020, 0.3, 0.007],
];

// one piece meeting the board. pitch: the size of it (lower is bigger); weight: the thump of the
// table under the board; contact: how long the hit lasts (longer is softer and deeper); felt: the
// cloth under the piece, rounding the hit off; bright: its crisp edge; ring: how long it rings;
// hollow: a woodblock's knock. damp (under 1): a solid board that stops ringing at once, the board's
// modes and the table under it dying that much sooner; body: the dense, unpitched thud of a solid
// mass meeting it; drive: how hard the hit is rounded off (more makes it louder but brings the ring
// up under it)
function tok({
	pitch = 1,
	weight = 1,
	contact = 0.0003,
	felt = 0.4,
	bright = 1,
	ring = 1,
	hollow = 0,
	click = 1,
	damp = 1,
	body = 0,
	drive = 2.4,
} = {}) {
	const dur = 0.34 * ring + 0.1;
	const force = new Float32Array(len(dur));
	const nC = Math.max(2, Math.round(contact * SR));
	for (let i = 0; i < nC; i++) force[i] = Math.pow(Math.sin((Math.PI * (i + 0.5)) / nC), 1 + felt);
	// a bigger piece loads the board, pulling its modes down a little; its own ring falls further
	const loaded = Math.pow(pitch, 0.6);
	const board = norm(
		resonate(
			force,
			BOARD.map(([f, g, d]) => [f * loaded * rr(0.985, 1.015), g * (f > 1400 ? bright : 1), d * ring * damp * rr(0.9, 1.1)]),
		),
	);
	const size = Math.sqrt(pitch);
	const piece = norm(resonate(force, PIECE.map(([f, g, d]) => [f * pitch * rr(0.97, 1.03), g, d * rr(0.85, 1.15)])));
	const out = new Float32Array(force.length);
	mixIn(out, board, 0, 1);
	mixIn(out, piece, 0, 0.45 * bright * (1 - felt * 0.3));
	if (hollow) {
		const block = norm(resonate(force, [[690 * pitch, 1, 0.11], [1610 * pitch, 0.35, 0.045]]));
		mixIn(out, block, 0, 0.55 * hollow);
	}
	// the table under the board, felt more than heard
	const tight = damp < 1 ? 0.5 + 0.5 * damp : 1;
	mixIn(out, sweep((0.04 + 0.05 * weight) * tight, 165 * pitch, 82 * pitch, 0.011), 0, 0.2 * weight);
	// the first instant of contact
	const tick = filter(
		env(noise(0.0035), (t) => Math.pow(1 - t / 0.0035, 2)),
		'bp',
		2900 * size,
		0.8,
	);
	mixIn(out, tick, 0, 0.2 * click * bright * (1 - felt * 0.5));
	if (body) {
		const decay = 0.035 + 0.025 * weight;
		const thud = norm(filter(filter(env(noise(decay * 1.2), (t) => smooth(0, 0.0008, t) * ex(t, decay)), 'lp', 1400 * size, 0.6), 'hp', 110)); // prettier-ignore
		mixIn(out, thud, 0, body);
	}
	filter(out, 'hp', 45);
	filter(out, 'lp', 6500);
	return fadeEnd(saturate(out, drive), 0.01);
}

// wood on wood, no cloth between: the hard, bright clack of a capture
const clack = ({ pitch = 1, weight = 0.9, ring = 0.8 } = {}) =>
	tok({ pitch, weight, contact: 0.00012, felt: 0, bright: 1.45, ring, click: 1.4 });

// a taken piece knocked over: it falls, bounces a few times, each lower, and rolls to a stop
function tumble(mx, t0, { pitch = 1, gain = 0.5, panFrom = 0.1, panTo = 0.55, bounces = 4, roll = 0.16 } = {}) {
	let t = t0;
	let gap = 0.085;
	let g = gain;
	for (let k = 0; k < bounces; k++) {
		const pan = panFrom + ((panTo - panFrom) * k) / Math.max(1, bounces - 1);
		mx.add(tok({ pitch: pitch * rr(1.08, 1.2), weight: 0.3, contact: 0.00018, felt: 0.1, bright: 1.1, ring: 0.55 }), t, { gain: g, pan, send: 0.16 }); // prettier-ignore
		t += gap;
		gap *= 0.68;
		g *= 0.58;
	}
	// rolling on its side: tiny knocks closing up and dying away
	if (roll) {
		const out = new Float32Array(len(roll + 0.05));
		let tt = 0;
		let step = 0.014;
		while (tt < roll) {
			const knock = tok({ pitch: pitch * rr(1.2, 1.45), weight: 0, contact: 0.00015, felt: 0.2, bright: 0.9, ring: 0.3, click: 0.6 }); // prettier-ignore
			mixIn(out, knock, tt, ex(tt, roll) * rr(0.6, 1));
			tt += step * rr(0.7, 1.3);
			step = Math.max(0.006, step * 0.97);
		}
		mx.add(out, t, { gain: gain * 0.16, pan: [panTo * 0.8, panTo], send: 0.16 });
	}
}

// a felt "shh" of a piece sliding on the board
const scrape = (dur, centre = 520) =>
	norm(
		env(
			filter(filter(noise(dur), 'bp', centre, 0.7), 'lp', 1800),
			(t) => smooth(0, 0.006, t) * ex(t, dur * 0.8),
		),
	);

// a soft-mallet marimba: wood, warm, a little hollow from its tube
function marimba(m, { dur, soft = 0.5, decay: muted } = {}) {
	const f = mtof(m);
	const decay = muted ?? clamp(1.5 - (m - 55) * 0.035, 0.35, 1.6);
	const out = partials(
		f,
		dur ?? decay + 0.1,
		[
			[1, 1, decay],
			[3.93, 0.16 * (1 - soft * 0.5), decay * 0.22],
			[9.2, 0.035 * (1 - soft), decay * 0.07],
		],
		{ attack: 0.0018 + soft * 0.0025 },
	);
	const mallet = filter(env(noise(0.004), (t) => 1 - t / 0.004), 'bp', Math.min(f * 2.2, 3000), 1.2);
	mixIn(out, mallet, 0, 0.06);
	return filter(out, 'lp', 4200);
}

// a low tuned log drum, the weight under a flourish
const logDrum = (m, decay = 0.35) =>
	filter(
		partials(mtof(m), decay + 0.05, [[1, 1, decay], [2.76, 0.12, decay * 0.3]], { attack: 0.003 }),
		'lp',
		2200,
	);

// a warm held chord under a big moment: soft sines swelling in and fading
const pad = (m, hold, { attack = 0.12, rel = 0.9 } = {}) => {
	const f = mtof(m);
	const out = partials(f, hold + rel, [[1, 1, 30], [2, 0.22, 4], [3, 0.06, 2]], { attack, hold, rel });
	// a slow, gentle shimmer of the amplitude
	return env(out, (t) => 1 + 0.06 * Math.sin(TAU * 4.2 * t));
};

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
	add(src, t = 0, { gain = 1, pan = 0, send = 0.12 } = {}) {
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
	// with `loop` (seconds), everything ringing past the loop point is folded back onto its start, so
	// the loop is seamless
	render({ reverb = {}, loop } = {}) {
		const tail = reverb ? (reverb.tail ?? (loop ? 3 : 1)) : 0;
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

// a sound in a small, warm wooden room (the reverb), its very top softened
const room = (build, { size = 0.42, damp = 0.6, tail = 0.7, top = 7000 } = {}) => {
	const mx = new Mix(2);
	build(mx);
	const out = mx.render({ reverb: { size, damp, tail } });
	for (const ch of [out.L, out.R]) {
		filter(ch, 'lp', top);
		filter(ch, 'hp', 35);
	}
	return out;
};

// ---------------------------------------------------------------------------------------------
// the pieces

// how each kind meets the board (see tok)
const KIND = {
	p: { pitch: 1.24, weight: 0.55, contact: 0.00026, felt: 0.3, bright: 1.1, ring: 0.8 },
	n: { pitch: 1.05, weight: 0.8, contact: 0.0003, felt: 0.35, bright: 0.95, ring: 0.9, hollow: 0.7 },
	b: { pitch: 1.1, weight: 0.75, contact: 0.00028, felt: 0.35, bright: 1.15, ring: 1 },
	r: { pitch: 0.84, weight: 1.2, contact: 0.0004, felt: 0.5, bright: 0.85, ring: 1.05 },
	q: { pitch: 0.95, weight: 1.05, contact: 0.00034, felt: 0.4, bright: 1.05, ring: 1.2 },
	k: { pitch: 0.76, weight: 1.4, contact: 0.00046, felt: 0.55, bright: 0.8, ring: 1.25 },
};
// the takes of each move: a touch higher or lower, harder or softer
const TAKES = [
	{ pitch: 1, force: 1 },
	{ pitch: 0.968, force: 0.93 },
	{ pitch: 1.035, force: 0.97 },
];
// a piece set down is solid, not hollow: the board stops ringing at once (damp), a dense thud of the
// piece's mass under the knock (body), the hit rounded off only lightly (drive), no woodblock in it
const SOLID = { hollow: 0, damp: 0.4, body: 0.5, drive: 1.5 };
const kindTok = (kind, take, extra = {}) =>
	tok({ ...KIND[kind], ...SOLID, pitch: KIND[kind].pitch * take.pitch * rr(0.99, 1.01), ...extra });
// the moves' room: small and dead, so the knock is close and dry
const movesRoom = (build) => room(build, { size: 0.3, damp: 0.75, tail: 0.5 });
const DRY = 0.05;

const MOVES = {
	// light and quick, with the tiniest settle
	p: (take) =>
		movesRoom((mx) => {
			mx.add(kindTok('p', take), 0, { gain: take.force, send: DRY });
			mx.add(kindTok('p', take, { weight: 0.1, ring: 0.5, pitch: KIND.p.pitch * 1.08 }), rr(0.016, 0.02), { gain: 0.11, send: DRY });
		}),
	// the hop: a clip-clop, the landing then a lighter, lower knock as it settles
	n: (take) =>
		movesRoom((mx) => {
			mx.add(kindTok('n', take), 0, { gain: take.force, send: DRY });
			mx.add(kindTok('n', take, { pitch: KIND.n.pitch * take.pitch * 0.9, weight: 0.45, ring: 0.8 }), rr(0.082, 0.094), { gain: 0.5 * take.force, pan: 0.06, send: DRY }); // prettier-ignore
		}),
	// clean and crisp, with a faint settle
	b: (take) =>
		movesRoom((mx) => {
			mx.add(kindTok('b', take), 0, { gain: take.force, send: DRY });
			mx.add(kindTok('b', take, { weight: 0.1, ring: 0.5 }), rr(0.021, 0.025), { gain: 0.13, send: DRY });
		}),
	// a heavy block: thunk, a grind into its square as the flat base settles, a rock back
	r: (take) =>
		movesRoom((mx) => {
			mx.add(kindTok('r', take), 0, { gain: take.force, send: DRY });
			mx.add(scrape(0.085, 480 * take.pitch), 0.004, { gain: 0.07, send: DRY });
			mx.add(kindTok('r', take, { weight: 0.35, ring: 0.7, pitch: KIND.r.pitch * take.pitch * 1.06 }), rr(0.03, 0.036), { gain: 0.3, send: DRY }); // prettier-ignore
		}),
	// full and firm: more weight and body than the rest but the light ones, and a faint settle
	q: (take) =>
		movesRoom((mx) => {
			mx.add(kindTok('q', take, { body: 0.6 }), 0, { gain: take.force, send: DRY });
			mx.add(kindTok('q', take, { weight: 0.1, ring: 0.5 }), rr(0.02, 0.024), { gain: 0.12, send: DRY });
		}),
	// the heaviest: set down deliberately, a deep thud, rocking once on its base
	k: (take) =>
		movesRoom((mx) => {
			mx.add(kindTok('k', take, { body: 0.65 }), 0, { gain: take.force, send: DRY });
			mx.add(sweep(0.14, 105, 58, 0.03), 0, { gain: 0.2, send: 0 });
			mx.add(kindTok('k', take, { weight: 0.3, ring: 0.7, pitch: KIND.k.pitch * take.pitch * 1.12 }), rr(0.056, 0.064), { gain: 0.36, send: DRY }); // prettier-ignore
		}),
};

// the pieces as they are taken: their size (lower is bigger) and the chime yours earn
const VICTIM = {
	p: { pitch: 1.2, chime: notes('D5') },
	n: { pitch: 1.04, chime: notes('G4 D5') },
	b: { pitch: 1.08, chime: notes('B4 D5') },
	r: { pitch: 0.9, chime: notes('G4 B4 D5') },
	q: { pitch: 0.92, chime: notes('G4 B4 D5 G5') },
};

// a capture: the clack, the taken piece knocked over; yours ring out a marimba chime
const take = (kind, yours) => () =>
	room(
		(bus) => {
			// played with the mover's own landing: the clack a moment after it, so the two hits don't
			// pile up into one too loud
			const mx = { add: (src, t, options) => bus.add(src, t + 0.012, options) };
			const victim = VICTIM[kind];
			const big = kind === 'q' || kind === 'r';
			mx.add(clack({ pitch: victim.pitch * 0.96 }), 0, { gain: 1 });
			tumble(mx, 0.075, { pitch: victim.pitch, gain: big ? 0.5 : 0.42, panTo: yours ? 0.55 : -0.55, panFrom: yours ? 0.1 : -0.1 }); // prettier-ignore
			if (yours) {
				victim.chime.forEach((m, k) =>
					mx.add(marimba(m), 0.018 + k * 0.058, {
						gain: 0.16 + 0.03 * k,
						pan: victim.chime.length > 1 ? -0.3 + (0.6 * k) / (victim.chime.length - 1) : 0,
						send: 0.3,
					}),
				);
				if (kind === 'q') {
					mx.add(marimba(n('G3'), { soft: 0.8 }), 0.018, { gain: 0.15, send: 0.2 });
					for (const m of notes('G4 B4 D5')) mx.add(pad(m, 0.35, { attack: 0.08, rel: 0.7 }), 0.2, { gain: 0.035, send: 0.4 });
				}
			} else {
				// yours lost: a low, muted fall
				mx.add(marimba(n('D4'), { soft: 0.9, decay: 0.4 }), 0.04, { gain: 0.14, send: 0.25 });
				mx.add(marimba(n('A3'), { soft: 0.9, decay: 0.5 }), 0.15, { gain: 0.13, send: 0.25 });
			}
		},
		{ tail: 0.9, size: 0.5 },
	);

// a check called: two sharp raps on the board and a two-note call: yours rising and bright, against
// you falling and low
const check = (yours) => () =>
	room(
		(mx) => {
			mx.add(clack({ pitch: 1.02, ring: 0.7 }), 0, { gain: 0.55 });
			mx.add(clack({ pitch: 0.94, ring: 0.8 }), 0.105, { gain: 0.85 });
			const [a, b] = yours ? [notes('A4 E5'), notes('D5 A5')] : [notes('Eb4 Bb4'), notes('D4 A4')];
			a.forEach((m) => mx.add(marimba(m), 0.005, { gain: 0.24, pan: -0.15, send: 0.3 }));
			b.forEach((m) => mx.add(marimba(m), 0.11, { gain: 0.3, pan: 0.15, send: 0.3 }));
			mx.add(logDrum(yours ? n('D3') : n('D2'), 0.45), 0.105, { gain: 0.35, send: 0.1 });
		},
		{ tail: 1, size: 0.5 },
	);

// checkmate: the last move's heavy thock, then the mated king topples, hits the board and rolls,
// over a deep boom and a marimba run: up into G major for yours, down into G minor against you
const mate = (yours) => () =>
	room(
		(mx) => {
			mx.add(clack({ pitch: 0.82, weight: 1.4, ring: 1.1 }), 0, { gain: 0.8 });
			mx.add(sweep(1.1, 72, 46, 0.05), 0, { gain: 0.5, send: 0.05 });
			// the king tips, falls and hits the board
			mx.add(tok({ ...KIND.k, pitch: 0.9, weight: 0.2, ring: 0.5 }), 0.15, { gain: 0.25, pan: 0.05 });
			mx.add(clack({ pitch: 0.78, weight: 1.3, ring: 1 }), 0.34, { gain: 0.75, pan: 0.12 });
			tumble(mx, 0.42, { pitch: 0.86, gain: 0.38, bounces: 3, roll: 0.45, panFrom: 0.15, panTo: 0.4 });
			mx.add(sweep(0.6, 90, 50, 0.04), 0.34, { gain: 0.3, send: 0.05 });
			const run = yours ? notes('G3 B3 D4 G4 B4 D5 G5') : notes('G4 D4 Bb3 G3 D3');
			const step = yours ? 0.052 : 0.095;
			run.forEach((m, k) =>
				mx.add(marimba(m), 0.36 + k * step, {
					gain: 0.28 + (yours ? 0.02 * k : -0.02 * k),
					pan: -0.4 + (0.8 * k) / (run.length - 1),
					send: 0.35,
				}),
			);
			const end = 0.36 + run.length * step + 0.04;
			const chord = yours ? notes('G4 B4 D5 G5') : notes('G3 Bb3 D4');
			chord.forEach((m, k) => mx.add(marimba(m, { soft: 0.6 }), end + k * 0.012, { gain: 0.3, pan: -0.2 + 0.13 * k, send: 0.4 })); // prettier-ignore
			(yours ? notes('G3 D4 G4 B4') : notes('G2 D3 G3 Bb3')).forEach((m) =>
				mx.add(pad(m, 0.9, { attack: 0.15, rel: 1.1 }), end - 0.05, { gain: 0.05, send: 0.5 }),
			);
			mx.add(logDrum(n('G2'), 0.9), end, { gain: 0.45, send: 0.15 });
		},
		{ tail: 1.6, size: 0.65, damp: 0.5 },
	);

// a pawn crowned: a quick run up the marimba, then the queen set down with a ringing chord
const promote = () =>
	room(
		(mx) => {
			notes('G4 A4 B4 D5 E5 G5').forEach((m, k) =>
				mx.add(marimba(m, { soft: 0.6 }), k * 0.036, { gain: 0.16 + 0.025 * k, pan: -0.45 + 0.18 * k, send: 0.35 }),
			);
			const at = 6 * 0.036 + 0.02;
			mx.add(kindTok('q', TAKES[0]), at, { gain: 0.8 });
			notes('G4 B4 D5 G5').forEach((m, k) => mx.add(marimba(m), at + k * 0.01, { gain: 0.26, pan: -0.15 + 0.1 * k, send: 0.4 })); // prettier-ignore
			notes('G4 B4 D5').forEach((m) => mx.add(pad(m, 0.4, { attack: 0.06, rel: 0.8 }), at, { gain: 0.04, send: 0.5 }));
		},
		{ tail: 1.2, size: 0.55 },
	);

// castling: the rook lands by its king with a heavy thunk, a "tk-tok" as the two square up, and a
// low "ba-dum" of a log drum: done, safe
const castle = () =>
	room(
		(mx) => {
			mx.add(kindTok('r', TAKES[0]), 0, { gain: 1 });
			mx.add(scrape(0.09, 470), 0.004, { gain: 0.07, send: 0.05 });
			mx.add(tok({ ...KIND.k, pitch: 0.9, weight: 0.25, ring: 0.6 }), 0.085, { gain: 0.32, pan: -0.1 });
			mx.add(kindTok('r', TAKES[0], { weight: 0.4, ring: 0.7 }), 0.15, { gain: 0.45, pan: 0.1 });
			mx.add(logDrum(n('D3'), 0.3), 0.085, { gain: 0.3 });
			mx.add(logDrum(n('G2'), 0.55), 0.15, { gain: 0.42 });
		},
		{ tail: 0.8 },
	);

// a piece picked up: the faintest tick of it lifting off, a breath of felt
const pick = () =>
	room(
		(mx) => {
			mx.add(tok({ pitch: 1.5, weight: 0, contact: 0.0002, felt: 0.5, bright: 0.9, ring: 0.45 }), 0, { gain: 1 });
			mx.add(scrape(0.06, 900), 0.002, { gain: 0.12, send: 0.05 });
		},
		{ tail: 0.4 },
	);

// a held piece put back on its own square: a soft felted set-down
const back = () =>
	room((mx) => mx.add(tok({ pitch: 1.12, weight: 0.4, contact: 0.0006, felt: 0.8, bright: 0.7, ring: 0.7 }), 0, { gain: 1 }), { tail: 0.5 }); // prettier-ignore

// a tuned wooden block (a temple block): a hollow knock with a note in it
const woodBlock = (m, decay = 0.16) => {
	const f = mtof(m);
	const out = partials(f, decay + 0.05, [[1, 1, decay], [2.32, 0.22, decay * 0.35], [4.1, 0.06, decay * 0.15]], { attack: 0.0008 }); // prettier-ignore
	const tap = filter(env(noise(0.0025), (t) => 1 - t / 0.0025), 'bp', Math.min(f * 3, 3200), 1.5);
	mixIn(out, tap, 0, 0.12);
	return filter(out, 'lp', 4000);
};

// the spin's tumble. A column of pieces landing on the board (a reel stopping, its bottom piece
// down): one solid thock, tuned, so the eight columns landing one after another play a run up the
// scale, left to right across the stereo as the board fills; dry and short, so a whole board landing
// stays clear. The last column closes it with a low "bom".
const DROP_NOTES = notes('D4 E4 G4 A4 B4 D5 E5 G5');
const columnPan = (k) => -0.45 + (0.9 * k) / 7;
const drop = (k) => () =>
	room(
		(mx) => {
			const pan = columnPan(k);
			mx.add(tok({ pitch: 0.92 + 0.025 * k, weight: 0.9, contact: 0.0003, felt: 0.3, bright: 0.95, ring: 0.75 }), 0, { gain: 1, pan, send: 0.05 }); // prettier-ignore
			mx.add(woodBlock(DROP_NOTES[k]), 0, { gain: 0.55, pan, send: 0.08 });
			mx.add(sweep(0.09, 125, 62, 0.01), 0, { gain: 0.3, send: 0 });
			if (k === 7) mx.add(logDrum(n('G2'), 0.35), 0.004, { gain: 0.3, send: 0.05 });
		},
		{ tail: 0.35, size: 0.3, damp: 0.65 },
	);

// the last spin's pieces falling off the board as the next spin starts, column after column from the
// left (playBoardDrop): each column tipping away a soft wooden step lower, the landing's run turned
// round, and a soft fall of air as they go
const offBoard = () =>
	room(
		(mx) => {
			[...DROP_NOTES].reverse().forEach((m, k) => {
				const pan = columnPan(k);
				mx.add(tok({ pitch: 1.3 - 0.04 * k, weight: 0, contact: 0.0002, felt: 0.4, ring: 0.4, click: 0.5 }), k * 0.045, { gain: 0.35, pan, send: 0.08 }); // prettier-ignore
				mx.add(woodBlock(m, 0.08), k * 0.045, { gain: 0.16, pan, send: 0.1 });
			});
			const dur = 0.6;
			const air = env(
				filter(filter(noise(dur), 'bp', (t) => 900 * Math.pow(0.4, t / dur), 0.5), 'lp', 1400),
				(t) => Math.pow(Math.sin(Math.PI * Math.min(1, t / dur)), 2),
			);
			mx.add(norm(air), 0.08, { gain: 0.12, pan: [-0.4, 0.4], send: 0.15 });
		},
		{ tail: 0.4, size: 0.35 },
	);

// ---------------------------------------------------------------------------------------------
// the band: a late-night chess café. Cozy lo-fi jazz: felt piano, upright bass, brushed drums,
// vibraphone and rhodes over a dark string pad, through tape and vinyl. The base game in G major (the
// chess chimes' key), the bonus in E minor; soft attacks, nothing shrill.

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

// a felted upright piano: soft hammers, a warm, dark top
function piano(m, hold, { velocity = 0.55 } = {}) {
	const f = mtof(m);
	const decay = clamp(4.5 * Math.sqrt(262 / f), 1.2, 8);
	const parts = [];
	for (let k = 1; k <= 7; k++) {
		const ratio = k * Math.sqrt(1 + 0.0004 * k * k);
		parts.push([ratio, Math.pow(k, -1.5) * (k === 1 ? 1 : velocity), decay / (1 + 0.7 * (k - 1))]);
	}
	const dur = hold + 0.4;
	const options = { attack: 0.006, hold, rel: 0.35 };
	const out = partials(f * Math.pow(2, 1.3 / 1200), dur, parts, options);
	mixIn(out, partials(f * Math.pow(2, -1.3 / 1200), dur, parts, options));
	// the felt on the hammer: a soft knock
	mixIn(out, filter(env(noise(0.03), (t) => ex(t, 0.02)), 'bp', 420, 0.8), 0, 0.03);
	return filter(out, 'lp', clamp(f * 4, 1200, 4200), 0.6);
}

// upright bass: a plucked gut string over a round body (so it carries on small speakers), the
// thumb's soft "thup" on the front of it
function upright(m, hold) {
	const f = mtof(m);
	const string = norm(filter(pluck(f, hold + 0.25, { decay: 1.6, bright: 0.2 }), 'lp', 1000, 0.7));
	const out = new Float32Array(string.length);
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const body = Math.tanh(1.4 * (Math.sin(TAU * ph) + 0.25 * Math.sin(2 * TAU * ph)));
		const e = smooth(0, 0.008, t) * (0.55 + 0.45 * Math.exp(-t / 0.35)) * release(t, hold, 0.1);
		out[i] = (0.55 * string[i] + 0.5 * body) * e;
		ph = (ph + f / SR) % 1;
	}
	mixIn(out, filter(env(noise(0.03), (t) => ex(t, 0.02)), 'lp', 600), 0, 0.12);
	return out;
}

// vibraphone: soft yarn mallets on metal bars, the fan's slow shimmer (motor)
function vibes(m, hold = 1.2, { motor = 0.2 } = {}) {
	const f = mtof(m);
	const out = partials(f, hold + 0.5, [[1, 1, 3.5], [4, 0.09, 0.7], [10, 0.012, 0.18]], {
		attack: 0.004,
		hold,
		rel: 0.4,
		tremolo: motor,
		tremRate: 5.2,
	});
	mixIn(out, filter(env(noise(0.005), (t) => 1 - t / 0.005), 'bp', Math.min(f * 2, 2500), 1.2), 0, 0.03);
	return filter(out, 'lp', 4000);
}

// warm FM electric piano; `tremPhase` lets two detuned copies tremolo against each other (auto-pan)
function rhodes(m, hold, { cents = 0, bright = 0.6, tremPhase = 0 } = {}) {
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

// warm, dark strings to hold the chords together
function strings(m, hold, { attack = 0.9, rel = 0.9, cutoff = 2, tremolo = 0 } = {}) {
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
		let a = smooth(0, attack, t) * release(t, hold, rel);
		if (tremolo) a *= 1 - tremolo * (0.5 + 0.5 * Math.sin(TAU * 11 * t));
		out[i] = hp.tick(lp.tick(s)) * a * 0.3;
	}
	return out;
}

// a rolled chord on the piano, low note first
const pianoChord = (mx, ms, t, hold, { gain = 0.14, roll = 0.018, velocity = 0.45, send = 0.3 } = {}) =>
	ms.forEach((m, k) => mx.add(piano(m, hold, { velocity }), t + k * roll, { gain, pan: -0.35 + (0.7 * k) / Math.max(1, ms.length - 1), send })); // prettier-ignore

// rolled rhodes chord, each note doubled and detuned across the stereo field
const keys = (mx, ms, t, hold, { gain = 0.07, bright = 0.55, roll = 0.015 } = {}) =>
	ms.forEach((m, k) => {
		for (const side of [-1, 1]) {
			mx.add(rhodes(m, hold, { cents: 6 * side, bright, tremPhase: side > 0 ? Math.PI : 0 }), t + k * roll, { gain, pan: 0.5 * side, send: 0.3 }); // prettier-ignore
		}
	});

const padChord = (mx, ms, t, hold, gain = 0.03) =>
	ms.forEach((m) => mx.add(strings(m, hold, { attack: 0.8, rel: 0.8 }), t, { gain, pan: rr(-0.6, 0.6), send: 0.5 }));

// drums ----------------------------------------------------------------------------------------

function kickDrum({ f0 = 115, f1 = 48, decay = 0.4 } = {}) {
	const out = sweep(decay, f0, f1, 0.03);
	return mixIn(out, filter(env(noise(0.005), (t) => 1 - t / 0.005), 'lp', 2500), 0, 0.12);
}

function snare() {
	const rattle = env(filter(filter(noise(0.3), 'bp', 1600, 0.6), 'lp', 3800), (t) => smooth(0, 0.004, t) * ex(t, 0.22));
	return norm(mixIn(norm(rattle, 0.8), env(sine(180, 0.25), (t) => ex(t, 0.12)), 0, 0.5));
}

const sine = (f, dur) => {
	const out = new Float32Array(len(dur));
	const w = (TAU * f) / SR;
	for (let i = 0; i < out.length; i++) out[i] = Math.sin(w * i);
	return out;
};

const click = (f, dur = 0.003) => filter(env(noise(dur), (t) => 1 - t / dur), 'bp', Math.min(f, 6000), 1.5);

// a stick across the rim
function rim() {
	const out = mixIn(partials(480, 0.08, [[1, 1, 0.05], [3.6, 0.5, 0.03]]), click(3000), 0, 0.6);
	return norm(filter(out, 'hp', 300));
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

const hat = (decay = 0.055) =>
	norm(env(filter(mixIn(filter(metal(decay, 0.8), 'hp', 4000), noise(decay), 0, 0.5), 'bp', 5000, 0.7), (t) => ex(t, decay)));

// a dark, soft ride cymbal: "ting, ting-a"
const ride = (decay = 0.55) =>
	norm(
		env(filter(mixIn(filter(metal(decay, 1.45), 'hp', 2500), noise(decay), 0, 0.25), 'bp', 4200, 0.6), (t) => ex(t, decay) * (0.6 + 0.4 * Math.exp(-t / 0.02))), // prettier-ignore
	);

// brushes: a slap on the snare, and the sweep round its head
const brushSlap = (decay = 0.14) =>
	norm(env(filter(filter(noise(decay + 0.03), 'bp', 2000, 0.55), 'lp', 4500), (t) => smooth(0, 0.004, t) * ex(t, decay)));
const brushSweep = (dur) =>
	norm(
		env(
			filter(filter(noise(dur), 'bp', (t) => 1500 + 500 * Math.sin((TAU * t) / dur), 0.5), 'lp', 3800),
			(t) => Math.pow(Math.sin(Math.PI * Math.min(1, t / dur)), 1.5),
		),
	);
const shaker = () => norm(env(filter(filter(noise(0.08), 'hp', 4000), 'lp', 7000), (t) => smooth(0, 0.012, t) * ex(t, 0.08)));

// band-passed noise gliding from f0 to f1, swelling up to `peakAt` (0..1 of dur) then fading
function whoosh(dur, f0, f1, { q = 1, peakAt = 0.5 } = {}) {
	const out = filter(noise(dur), 'bp', (t) => f0 * Math.pow(f1 / f0, t / dur), q);
	return norm(
		env(out, (t) => {
			const u = t / dur;
			return u < peakAt ? Math.pow(u / peakAt, 2) : Math.pow(Math.max(0, 1 - (u - peakAt) / (1 - peakAt)), 1.5);
		}),
	);
}

// timing ---------------------------------------------------------------------------------------

// a position in the bar (in beats; 8ths swung, so x.5 sits late, a triplet's last third) to seconds,
// a touch behind the beat as a lazy player would
const swing = (beat, amount = 0.64) => (bar, pos) => {
	const whole = Math.floor(pos);
	const frac = pos - whole;
	const s = frac < 0.5 ? frac * 2 * amount : amount + (frac - 0.5) * 2 * (1 - amount);
	return (bar * 4 + whole + s) * beat + rr(0, 0.01);
};
// the same on a 16th grid (step 0-15), off 16ths swung late
const groove = (beat, amount) => (bar, step) =>
	((bar * 16 + step) * beat) / 4 + (step % 2 ? ((amount - 0.5) * beat) / 2 : 0) + rr(0, 0.008);

// a bar of brushed jazz drums (positions in beats); kicks are kept for the side-chain
function jazzDrums(drums, kicks, T, beat, bar, { kick = [], slap = [], rims = [], ride: rideOn = false, sweeps = true } = {}) {
	if (sweeps) for (const b of [0, 2]) drums.add(brushSweep(beat * 1.9), T(bar, b), { gain: 0.06, pan: -0.15, send: 0.15 });
	for (const b of kick) {
		const t = T(bar, b);
		drums.add(kickDrum(), t, { gain: 0.36, send: 0.02 });
		kicks.push(t);
	}
	for (const b of slap) drums.add(brushSlap(), T(bar, b), { gain: b % 1 ? 0.09 : 0.22, pan: 0.05, send: 0.2 });
	for (const b of rims) drums.add(rim(), T(bar, b), { gain: 0.14, pan: 0.15, send: 0.15 });
	if (rideOn) {
		for (const [b, g] of [[0, 0.07], [1, 0.09], [1.5, 0.05], [2, 0.07], [3, 0.09], [3.5, 0.05]]) {
			drums.add(ride(), T(bar, b), { gain: g * rr(0.85, 1.1), pan: 0.35, send: 0.1 });
		}
	}
}

// a bar of lo-fi boom-bap (16th steps)
function boomBap(drums, kicks, T, bar, { kick = [], snares = [], ghost = [], hats = 2, openHat = [], shakers = false } = {}) {
	for (const s of kick) {
		const t = T(bar, s);
		drums.add(kickDrum(), t, { gain: 0.42, send: 0.02 });
		kicks.push(t);
	}
	for (const s of snares) {
		drums.add(snare(), T(bar, s), { gain: 0.22, pan: 0.05, send: 0.22 });
		drums.add(brushSlap(), T(bar, s), { gain: 0.12, pan: 0.05, send: 0.2 });
	}
	for (const s of ghost) drums.add(brushSlap(0.08), T(bar, s), { gain: 0.07, pan: 0.05, send: 0.15 });
	for (let s = 0; s < 16; s += hats) drums.add(hat(), T(bar, s), { gain: (s % 4 === 0 ? 0.16 : 0.1) * rr(0.85, 1.1), pan: 0.3, send: 0.05 }); // prettier-ignore
	for (const s of openHat) drums.add(hat(0.22), T(bar, s), { gain: 0.08, pan: 0.3, send: 0.1 });
	if (shakers) for (let s = 0; s < 16; s++) drums.add(shaker(), T(bar, s), { gain: s % 2 ? 0.02 : 0.032, pan: -0.4, send: 0.05 });
}

// the master: the band dips under each kick, a dark low-pass, tape wobble, glue, vinyl --------

function duck({ L, R }, kicks, loop, depth = 0.08, rel = 0.25) {
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

// tape wow and flutter, whole cycles per loop so the seam stays seamless
function tapeWow({ L, R }, loop, amount = 1) {
	const N = L.length;
	const wowRate = Math.max(1, Math.round(0.45 * loop)) / loop;
	const flutterRate = Math.max(1, Math.round(5.5 * loop)) / loop;
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

// gentle tanh saturation to glue a mix together
function glue({ L, R }, drive = 1.25) {
	const peak = peakOf({ L, R });
	const k = drive / peak;
	const d = Math.tanh(drive);
	for (let i = 0; i < L.length; i++) {
		L[i] = Math.tanh(L[i] * k) / d;
		R[i] = Math.tanh(R[i] * k) / d;
	}
	return { L, R };
}

// record hiss and crackle, kept low and dark
function addVinyl({ L, R }, amount = 1) {
	const N = L.length;
	let sum = 0;
	for (let i = 0; i < N; i++) sum += L[i] * L[i] + R[i] * R[i];
	const rms = Math.sqrt(sum / (2 * N));
	for (const ch of [L, R]) {
		let lp = 0;
		for (let i = 0; i < N; i++) {
			lp += (rand() * 2 - 1 - lp) * 0.2;
			ch[i] += lp * rms * 0.08 * amount;
		}
	}
	const count = Math.round((N / SR) * 12);
	for (let k = 0; k < count; k++) {
		const pop = rand() < 0.03;
		const start = Math.floor(rand() * N);
		const size = Math.round(SR * (pop ? rr(0.002, 0.004) : rr(0.0006, 0.0014)));
		const amp = rms * amount * (pop ? rr(0.2, 0.4) : rr(0.04, 0.15));
		const pan = rand();
		let lp = 0;
		for (let j = 0; j < size; j++) {
			lp += ((rand() * 2 - 1) * Math.exp((-4 * j) / size) - lp) * 0.35;
			L[(start + j) % N] += lp * amp * (1 - 0.5 * pan);
			R[(start + j) % N] += lp * amp * (0.5 + 0.5 * pan);
		}
	}
}

function lofiMaster(music, drums, { loop, kicks, cutoff = 4800, wow = 1, vinyl = 1 }) {
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

// ---------------------------------------------------------------------------------------------
// music

// the café, 78 BPM in G major: A A B A, 32 bars. The felt piano has the tune first, the vibes the
// second time, the piano the bridge (the rhodes comping), and both together the last time.
const CAFE_A = [
	['G2', 'B3 D4 F#4 A4'], // Gmaj9
	['E2', 'G3 B3 D4 F#4'], // Em9
	['A2', 'G3 B3 C4 E4'], // Am9
	['D2', 'F#3 B3 C4 E4'], // D13
	['G2', 'B3 D4 F#4 A4'], // Gmaj9
	['E2', 'G#3 B3 D4 F4'], // E7b9
	['A2', 'G3 B3 C4 E4'], // Am9
	['D2', 'G3 A3 C4 E4'], // D9sus4
];
const CAFE_B = [
	['C2', 'E3 G3 B3 D4'], // Cmaj9
	['B1', 'A3 D4 E4 F#4'], // Bm11
	['E2', 'G3 B3 D4 F#4'], // Em9
	['A1', 'G3 C#4 F#4 B4'], // A13
	['C2', 'E3 G3 B3 D4'], // Cmaj9
	['B1', 'A3 C4 D#4 F#4'], // B7b9
	['E2', 'G3 B3 D4 F#4'], // Em9
	['D2', 'F#3 B3 C4 E4'], // D13
];
// [bar, beat, note, beats]
const TUNE_A = [
	[0, 1, 'D5', 0.5], [0, 1.5, 'B4', 0.5], [0, 2, 'A4', 1.5],
	[1, 0, 'G4', 0.5], [1, 0.5, 'F#4', 0.5], [1, 1, 'G4', 1], [1, 2.5, 'B4', 1],
	[2, 0, 'C5', 1], [2, 1.5, 'B4', 0.5], [2, 2, 'A4', 0.5], [2, 2.5, 'G4', 1],
	[3, 0, 'F#4', 1.5], [3, 2, 'E4', 0.5], [3, 2.5, 'F#4', 0.5], [3, 3, 'A4', 1],
	[4, 1, 'D5', 0.5], [4, 1.5, 'E5', 0.5], [4, 2, 'F#5', 1], [4, 3, 'D5', 1],
	[5, 0, 'B4', 1], [5, 1, 'G#4', 0.5], [5, 1.5, 'B4', 0.5], [5, 2, 'D5', 1.5],
	[6, 0, 'C5', 0.5], [6, 0.5, 'B4', 0.5], [6, 1, 'A4', 0.5], [6, 1.5, 'E5', 1.5], [6, 3, 'C5', 1],
	[7, 0, 'A4', 2], [7, 2.5, 'G4', 0.5], [7, 3, 'A4', 1],
]; // prettier-ignore
const TUNE_B = [
	[0, 0.5, 'E5', 0.5], [0, 1, 'D5', 0.5], [0, 1.5, 'B4', 1.5], [0, 3, 'G4', 1],
	[1, 0, 'A4', 1], [1, 1, 'B4', 0.5], [1, 1.5, 'D5', 1], [1, 3, 'F#5', 1],
	[2, 0, 'E5', 1.5], [2, 2, 'D5', 0.5], [2, 2.5, 'B4', 0.5], [2, 3, 'G4', 1],
	[3, 0, 'F#4', 1], [3, 1, 'G4', 0.5], [3, 1.5, 'A4', 0.5], [3, 2, 'C#5', 2],
	[4, 0.5, 'G5', 0.5], [4, 1, 'E5', 0.5], [4, 1.5, 'D5', 1], [4, 3, 'B4', 1],
	[5, 0, 'C5', 1], [5, 1, 'B4', 0.5], [5, 1.5, 'A4', 0.5], [5, 2, 'D#5', 1.5],
	[6, 0, 'E5', 2], [6, 2.5, 'F#5', 0.5], [6, 3, 'G5', 1],
	[7, 0, 'F#5', 1], [7, 1, 'E5', 0.5], [7, 1.5, 'C5', 0.5], [7, 2, 'A4', 2],
]; // prettier-ignore

function bgmMain() {
	const beat = 60 / 78;
	const bars = 32;
	const loop = bars * 4 * beat;
	const T = swing(beat, 0.64);
	const music = new Mix(loop + 4);
	const drums = new Mix(loop + 2);
	const kicks = [];
	const part = (bar) => ['A', 'A2', 'B', 'A3'][Math.floor((bar % bars) / 8)];
	const chordAt = (bar) => (part(bar) === 'B' ? CAFE_B : CAFE_A)[bar % 8];

	for (let bar = 0; bar < bars; bar++) {
		const section = part(bar);
		const [bassName, voicing] = chordAt(bar);
		const root = n(bassName);
		const chord = notes(voicing);
		const nextRoot = n(chordAt((bar + 1) % bars)[0]);
		const intro = bar < 2;

		// comping: the piano's "one, and-of-two"; the rhodes in the bridge; the pad under it all
		if (section === 'B') keys(music, chord, T(bar, 0), 3.7 * beat);
		else {
			pianoChord(music, chord, T(bar, 0), 1.7 * beat, { gain: intro ? 0.12 : 0.14 });
			if (!intro) pianoChord(music, chord, T(bar, 1.5), 1.2 * beat, { gain: 0.08, roll: 0.01 });
		}
		padChord(music, chord, T(bar, 0), 4 * beat, section === 'B' ? 0.035 : 0.025);

		// the upright: a held root to start, then in two (the root, its fifth) with a step into the next
		if (intro) music.add(upright(root, 3.8 * beat), T(bar, 0), { gain: 0.5, send: 0.05 });
		else {
			const fifth = root + 7 > n('E3') ? root - 5 : root + 7;
			music.add(upright(root, 1.8 * beat), T(bar, 0), { gain: 0.5, send: 0.05 });
			music.add(upright(fifth, 1.3 * beat), T(bar, 2), { gain: 0.42, send: 0.05 });
			music.add(upright(nextRoot - 1, 0.45 * beat), T(bar, 3.5), { gain: 0.32, send: 0.05 });
		}

		// brushes: a breath at the top, then the slap on two and four, the ride from the second time round
		if (intro) jazzDrums(drums, kicks, T, beat, bar, { rims: [1, 3] });
		else {
			const fill = bar % 8 === 7;
			jazzDrums(drums, kicks, T, beat, bar, {
				kick: bar % 2 ? [0, 1.5, 2.5] : [0, 2.5],
				slap: section === 'B' ? [] : fill ? [1, 3, 3.5] : [1, 3],
				rims: section === 'B' ? [1, 3] : [],
				ride: bar >= 8,
			});
		}

		// the vibes comp softly under the piano's bridge tune
		if (section === 'B') {
			[0, 1, 2, 3, 2, 1, 0, 1].forEach((k, e) =>
				music.add(vibes(chord[k] + 12, 0.35 * beat, { motor: 0.15 }), T(bar, e * 0.5), { gain: 0.04, pan: e % 2 ? 0.4 : 0.2, send: 0.35 }),
			);
		}
	}

	const play = (tune, from, voice, gain, pan, shift = 0) => {
		for (const [bar, pos, name, b] of tune) music.add(voice(n(name) + shift, b * beat), T(from + bar, pos), { gain, pan, send: 0.32 }); // prettier-ignore
	};
	play(TUNE_A, 0, (m, h) => piano(m, h, { velocity: 0.6 }), 0.3, -0.1);
	play(TUNE_A, 8, (m, h) => vibes(m, h), 0.3, 0.1);
	play(TUNE_B, 16, (m, h) => piano(m, h, { velocity: 0.6 }), 0.29, -0.1);
	play(TUNE_A, 24, (m, h) => vibes(m, h), 0.24, 0.12);
	play(TUNE_A, 24, (m, h) => piano(m, h, { velocity: 0.5 }), 0.13, -0.15, -12);

	return lofiMaster(music.render({ reverb: { size: 0.8, damp: 0.5 }, loop }), drums.render({ reverb: { size: 0.4, damp: 0.6, tail: 1 }, loop }), { loop, kicks, cutoff: 4800, wow: 1, vinyl: 0.9 }); // prettier-ignore
}

// the CHECKMATE BONUS, 92 BPM in E minor: a lo-fi boom-bap under the same band, a walking bass; the
// vibes have the tune, then the piano with the vibes under it
const BONUS_PROG = [
	['E2', 'G3 B3 D4 F#4', [3, 7]], // Em9
	['C2', 'E3 G3 B3 D4', [4, 7]], // Cmaj9
	['A1', 'G3 B3 C4 E4', [3, 7]], // Am9
	['B1', 'A3 C4 D#4 F#4', [4, 7]], // B7b9
	['E2', 'G3 B3 D4 F#4', [3, 7]], // Em9
	['C2', 'E3 G3 B3 D4', [4, 7]], // Cmaj9
	['F#2', 'A3 C4 E4', [3, 6]], // F#m7b5
	['B1', 'A3 C4 D#4 F#4', [4, 7]], // B7b9
];
const BONUS_TUNE = [
	[0, 0, 'B4', 0.5], [0, 0.5, 'D5', 0.5], [0, 1, 'E5', 1], [0, 2.5, 'F#5', 0.5], [0, 3, 'G5', 1],
	[1, 0, 'E5', 1.5], [1, 2, 'D5', 0.5], [1, 2.5, 'B4', 0.5], [1, 3, 'G4', 1],
	[2, 0, 'A4', 0.5], [2, 0.5, 'C5', 0.5], [2, 1, 'E5', 1], [2, 2, 'G5', 1], [2, 3, 'E5', 1],
	[3, 0, 'D#5', 1.5], [3, 2, 'C5', 0.5], [3, 2.5, 'B4', 0.5], [3, 3, 'A4', 1],
	[4, 0, 'G4', 0.5], [4, 0.5, 'B4', 0.5], [4, 1, 'E5', 0.5], [4, 1.5, 'F#5', 1], [4, 3, 'E5', 1],
	[5, 0, 'G5', 1], [5, 1, 'E5', 0.5], [5, 1.5, 'B4', 1.5], [5, 3, 'C5', 1],
	[6, 0, 'A4', 0.5], [6, 0.5, 'C5', 0.5], [6, 1, 'E5', 1], [6, 2, 'D5', 0.5], [6, 2.5, 'C5', 0.5], [6, 3, 'A4', 1],
	[7, 0, 'B4', 2], [7, 2, 'D#5', 1], [7, 3, 'F#5', 1],
]; // prettier-ignore

function bgmFreespin() {
	const beat = 60 / 92;
	const bars = 16;
	const loop = bars * 4 * beat;
	const T = swing(beat, 0.6);
	const T16 = groove(beat, 0.58);
	const music = new Mix(loop + 4);
	const drums = new Mix(loop + 2);
	const kicks = [];

	for (let bar = 0; bar < bars; bar++) {
		const [bassName, voicing, [i2, i3]] = BONUS_PROG[bar % 8];
		const root = n(bassName);
		const chord = notes(voicing);
		const nextRoot = n(BONUS_PROG[(bar + 1) % 8][0]);
		const second = bar >= 8;
		keys(music, chord, T(bar, 0), 2.3 * beat, { bright: 0.6 });
		keys(music, chord, T(bar, 2.5), 1.3 * beat, { gain: 0.045, bright: 0.6 });
		padChord(music, chord, T(bar, 0), 4 * beat, 0.03);
		// walking: root, third, fifth, a step into the next
		[root, root + i2, root + i3, nextRoot - 1].forEach((m, k) =>
			music.add(upright(m, 0.85 * beat), T(bar, k), { gain: k ? 0.4 : 0.48, send: 0.05 }),
		);
		const fill = bar % 4 === 3;
		boomBap(drums, kicks, T16, bar, {
			kick: bar % 2 ? [0, 7, 10] : [0, 6, 10],
			snares: [4, 12],
			ghost: fill ? [13, 15] : [15],
			openHat: fill ? [14] : [],
			shakers: second,
		});
		if (second) {
			[0, 1, 2, 3, 2, 1, 2, 3].forEach((k, e) =>
				music.add(vibes((chord[k] ?? chord[0]) + 12, 0.3 * beat, { motor: 0.1 }), T(bar, e * 0.5), { gain: 0.035, pan: e % 2 ? 0.45 : 0.25, send: 0.35 }), // prettier-ignore
			);
		}
	}
	for (const [bar, pos, name, b] of BONUS_TUNE) {
		const m = n(name);
		music.add(vibes(m, b * beat), T(bar, pos), { gain: 0.3, pan: 0.1, send: 0.32 });
		music.add(piano(m, b * beat, { velocity: 0.6 }), T(bar + 8, pos), { gain: 0.27, pan: -0.1, send: 0.3 });
		music.add(vibes(m - 12, b * beat), T(bar + 8, pos), { gain: 0.13, pan: 0.2, send: 0.32 });
	}
	return lofiMaster(music.render({ reverb: { size: 0.75, damp: 0.5 }, loop }), drums.render({ reverb: { size: 0.4, damp: 0.6, tail: 1 }, loop }), { loop, kicks, cutoff: 5000, wow: 0.9, vinyl: 0.8 }); // prettier-ignore
}

// big win loops, 8 s at 120 BPM: a happy half-time; each level a step up in key and a layer fuller
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
	const loop = 16 * beat;
	const T = swing(beat, 0.6);
	const T16 = groove(beat, 0.56);
	const music = new Mix(loop + 4);
	const drums = new Mix(loop + 2);
	const kicks = [];

	WIN_PROGRESSION.forEach(({ bass, voicing }, bar) => {
		const chord = voicing.map((iv) => key + iv);
		const root = key + bass;
		pianoChord(music, chord, T(bar, 0), 2.2 * beat, { gain: 0.14, velocity: 0.55 });
		pianoChord(music, chord, T(bar, 2.5), 1.3 * beat, { gain: 0.09, velocity: 0.55, roll: 0.01 });
		padChord(music, chord, T(bar, 0), 4 * beat, level >= 3 ? 0.05 : 0.03);
		for (const [pos, hold, iv, g] of [[0, 2.2, 0, 0.5], [2.5, 1.2, 0, 0.42], [3.5, 0.4, 12, 0.28]]) {
			music.add(upright(root + iv, hold * beat), T(bar, pos), { gain: g, send: 0.05 });
		}
		if (level >= 1) {
			const up = [...chord, chord[0] + 12];
			for (let e = 0; e < 8; e++) music.add(vibes(up[e % 4] + 12, 0.3 * beat, { motor: 0.1 }), T(bar, e * 0.5), { gain: 0.045, pan: e % 2 ? 0.5 : -0.5, send: 0.35 }); // prettier-ignore
		}
		boomBap(drums, kicks, T16, bar, {
			kick: level >= 2 ? [0, 3, 10, 14] : [0, 3, 10],
			snares: [8],
			ghost: [15],
			hats: level >= 4 ? 1 : 2,
			openHat: level >= 3 ? [14] : [],
			shakers: level >= 2,
		});
		if (level >= 3) jazzDrums(drums, kicks, T, beat, bar, { ride: true, sweeps: false });
	});

	for (const [bar, pos, iv, b] of WIN_MELODY) {
		const m = key + iv;
		music.add(marimba(m, { soft: 0.5 }), T(bar, pos), { gain: 0.3, pan: -0.15, send: 0.35 });
		music.add(vibes(m, b * beat * 0.9, { motor: 0.15 }), T(bar, pos), { gain: 0.18, pan: 0.15, send: 0.35 });
		if (level >= 2) music.add(piano(m - 12, b * beat * 0.9, { velocity: 0.6 }), T(bar, pos), { gain: 0.16, pan: 0, send: 0.3 });
		if (level >= 4) music.add(vibes(m + 12, b * beat * 0.9, { motor: 0.15 }), T(bar, pos), { gain: 0.06, pan: 0.3, send: 0.4 });
	}
	return lofiMaster(music.render({ reverb: { size: 0.75, damp: 0.5 }, loop }), drums.render({ reverb: { size: 0.4, damp: 0.6, tail: 1 }, loop }), { loop, kicks, cutoff: 5000 + 200 * level, wow: 0.8, vinyl: 0.6 }); // prettier-ignore
}

// G major pentatonic, from G4: the effects' tunes keep to it
const PENTA = notes('G4 A4 B4 D5 E5 G5 A5 B5 D6');

// under a big win: pieces poured out of their box onto the table, a twinkle of vibes now and then
function piecesLoop() {
	const loop = 8;
	const mx = new Mix(loop + 2);
	for (let t = 0; t < loop; t += rr(0.05, 0.14)) {
		mx.add(tok({ pitch: rr(1, 1.4), weight: 0, contact: 0.0002, felt: 0.2, ring: 0.45, click: 0.7 }), t, { gain: rr(0.15, 0.4), pan: rr(-0.7, 0.7), send: 0.2 }); // prettier-ignore
	}
	for (let k = 0; k < 16; k++) {
		const m = PENTA[Math.floor(rand() * PENTA.length)];
		mx.add(vibes(m, 0.3, { motor: 0 }), ((k + rr(0, 0.5)) * loop) / 16, { gain: 0.22, pan: rr(-0.5, 0.5), send: 0.35 });
	}
	const out = mx.render({ reverb: { size: 0.6, damp: 0.5 }, loop });
	circularFilter(out, 'lp', 5000);
	return out;
}

// a chess clock's tick and tock
const clockTick = (tick) => {
	const f = tick ? 2100 : 1600;
	const out = filter(env(noise(0.012), (t) => ex(t, 0.008)), 'bp', f, 3);
	mixIn(out, partials(f * 1.4, 0.05, [[1, 1, 0.03]], { attack: 0.0005 }), 0, 0.15);
	mixIn(out, tok({ pitch: tick ? 1.5 : 1.35, weight: 0, contact: 0.00015, felt: 0, ring: 0.3, click: 0.4 }), 0, 0.4);
	return filter(out, 'lp', 5000);
};

// anticipation: the chess clock running, a slow heartbeat, a bass pulse and trembling strings
function clockLoop() {
	const beat = 60 / 120;
	const loop = 16 * beat;
	const mx = new Mix(loop + 3);
	for (let b = 0; b < 16; b++) mx.add(clockTick(b % 2 === 0), b * beat, { gain: 0.4, pan: b % 2 ? 0.2 : -0.2, send: 0.12 });
	for (let b = 0; b < 16; b += 2) {
		mx.add(kickDrum({ f0: 90, f1: 40, decay: 0.3 }), b * beat, { gain: 0.6, send: 0.08 });
		mx.add(kickDrum({ f0: 80, f1: 38, decay: 0.25 }), b * beat + 0.17, { gain: 0.45, send: 0.08 });
	}
	for (let e = 0; e < 16; e++) mx.add(upright(n('E2'), 0.4 * beat), e * beat, { gain: e % 2 ? 0.25 : 0.33, send: 0.05 });
	for (const [bar, voicing] of [[0, 'E3 B3 E4 F#4'], [2, 'E3 C4 E4 F4']]) {
		for (const m of notes(voicing)) mx.add(strings(m, 8 * beat - 0.05, { tremolo: 0.5, attack: 0.3 }), bar * 4 * beat, { gain: 0.2, pan: rr(-0.4, 0.4), send: 0.4 }); // prettier-ignore
	}
	const out = mx.render({ reverb: { size: 0.7, damp: 0.5 }, loop });
	circularFilter(out, 'lp', 4800);
	return out;
}

// ---------------------------------------------------------------------------------------------
// the game's other sounds, in the band's voices

// a run of notes, one voice, `step` apart
const run = (mx, ms, t0, step, voice, { gain = 0.25, send = 0.35, spread = 0.6, rise = 0 } = {}) =>
	ms.forEach((m, k) =>
		mx.add(voice(m), t0 + k * step, { gain: gain + rise * k, send, pan: ms.length > 1 ? spread * (k / (ms.length - 1) - 0.5) : 0 }),
	);
// a ringing chord of the band: piano, vibes over it, the upright under it
const bandChord = (mx, t, { piano: ps = [], vibes: vs = [], bass, hold = 1.2, gain = 1 } = {}) => {
	if (ps.length) pianoChord(mx, notes(ps.join(' ')), t, hold, { gain: 0.16 * gain, velocity: 0.55 });
	vs.forEach((name, k) => mx.add(vibes(n(name), hold), t + 0.008 * k, { gain: 0.2 * gain, pan: -0.2 + 0.15 * k, send: 0.4 }));
	if (bass) mx.add(upright(n(bass), hold), t, { gain: 0.5 * gain, send: 0.05 });
};
const vibe = (m, hold = 0.6) => vibes(m, hold, { motor: 0.12 });
const mar = (m) => marimba(m, { soft: 0.55 });

// UI: a soft wooden tick, like touching a piece
const btnGeneral = () =>
	room((mx) => mx.add(tok({ pitch: 1.6, weight: 0, contact: 0.00015, felt: 0.3, ring: 0.35, click: 0.8 }), 0, { gain: 1 }), { tail: 0.3 }); // prettier-ignore

// the spin: a hand on the chess clock: a soft, low thump with the faint click of its button
const btnSpin = () =>
	room(
		(mx) => {
			mx.add(sweep(0.22, 120, 55, 0.025), 0, { gain: 0.8, send: 0.03 });
			mx.add(tok({ pitch: 0.8, weight: 1, contact: 0.0008, felt: 0.7, bright: 0.7, ring: 0.6 }), 0, { gain: 0.45 });
			mx.add(click(2200, 0.002), 0.008, { gain: 0.08 });
		},
		{ tail: 0.5 },
	);

// a column of pieces landing (the sample's reel stops)
const reelStop = (k) => drop(k - 1);

// many pieces landing together
const symbolsLanding = () =>
	room(
		(mx) => {
			mx.add(sweep(0.12, 140, 70, 0.012), 0, { gain: 0.45, send: 0 });
			for (let i = 0; i < 12; i++) {
				mx.add(tok({ pitch: rr(0.95, 1.35), weight: 0.2, contact: rr(0.0002, 0.00035), felt: 0.35, ring: 0.5 }), rr(0, 0.22), { gain: rr(0.4, 0.9), pan: rr(-0.5, 0.5) }); // prettier-ignore
			}
		},
		{ tail: 0.6 },
	);

// a bonus symbol landing, a step higher each time
const scatterStop = (k) => () =>
	room(
		(mx) => {
			mx.add(tok({ ...KIND.k, pitch: 0.8 }), 0, { gain: 0.8 });
			mx.add(mar(notes('G4 B4 D5 G5')[k - 1]), 0.005, { gain: 0.45, send: 0.35 });
			mx.add(vibe(notes('D5 G5 B5 D6')[k - 1] - 12, 0.5), 0.01, { gain: 0.2, send: 0.4 });
			mx.add(logDrum(n('G2'), 0.4), 0, { gain: 0.35 });
		},
		{ tail: 1, size: 0.55 },
	);

// the fist on the table (the bonus): the deepest thud there is, every piece on the board jumping and
// clattering down again, a couple rolling off
const fistSlam = () =>
	room(
		(mx) => {
			mx.add(tok({ pitch: 0.55, weight: 2, contact: 0.004, felt: 0.9, bright: 0.6, ring: 1.6 }), 0, { gain: 1 });
			mx.add(sweep(0.9, 95, 38, 0.06), 0, { gain: 0.8, send: 0.04 });
			mx.add(norm(filter(env(noise(0.45), (t) => ex(t, 0.3)), 'lp', 450)), 0, { gain: 0.22, send: 0.2 });
			for (let k = 0; k < 34; k++) {
				const t = 0.1 + 0.3 * Math.pow(rand(), 0.8);
				mx.add(tok({ pitch: rr(0.9, 1.4), weight: 0.1, contact: rr(0.00015, 0.0003), felt: 0.3, ring: 0.5 }), t, { gain: rr(0.12, 0.3), pan: rr(-0.7, 0.7), send: 0.18 }); // prettier-ignore
			}
			tumble(mx, 0.36, { pitch: 1.1, gain: 0.2, panFrom: -0.3, panTo: -0.7, bounces: 3, roll: 0.3 });
			tumble(mx, 0.44, { pitch: 1, gain: 0.18, panFrom: 0.3, panTo: 0.7, bounces: 3, roll: 0.25 });
		},
		{ tail: 1.2, size: 0.6, damp: 0.5 },
	);

// the bonus won, before the fist comes down: the clock ticking faster and faster, the strings and a
// low roll rising, a whoosh up into a stab of the band
const superFreeSpin = () =>
	room(
		(mx) => {
			const rise = 1.3;
			let t = 0;
			let gap = 0.24;
			let k = 0;
			while (t < rise) {
				mx.add(clockTick(k++ % 2 === 0), t, { gain: 0.2 + 0.25 * (t / rise), pan: k % 2 ? 0.2 : -0.2, send: 0.15 });
				mx.add(kickDrum({ f0: 85, f1: 42, decay: 0.25 }), t, { gain: 0.15 + 0.35 * (t / rise), send: 0.05 });
				t += gap;
				gap = Math.max(0.045, gap * 0.86);
			}
			for (const m of notes('E3 B3 E4')) {
				const s = strings(m, rise, { attack: rise * 0.9, rel: 0.3, tremolo: 0.5 });
				mx.add(s, 0, { gain: 0.2, pan: rr(-0.4, 0.4), send: 0.4 });
			}
			mx.add(whoosh(rise + 0.1, 300, 1800, { peakAt: 0.92, q: 0.8 }), 0, { gain: 0.25, pan: [-0.4, 0.4], send: 0.3 });
			bandChord(mx, rise, { piano: ['E3 G3 B3 D4 F#4'], vibes: ['B4', 'D5', 'F#5'], bass: 'E2', hold: 0.9 });
			mx.add(kickDrum(), rise, { gain: 0.6 });
			mx.add(ride(1.4), rise, { gain: 0.15, pan: 0.2, send: 0.3 });
		},
		{ tail: 1.4, size: 0.65 },
	);

// the free spins' sign: a little jazz flourish, the piano rolling up, the vibes answering, a "ta-da"
const jingle = () =>
	room(
		(mx) => {
			run(mx, notes('G3 B3 D4 F#4 A4 D5'), 0, 0.045, (m) => piano(m, 0.6, { velocity: 0.6 }), { gain: 0.2, spread: 0.8 });
			run(mx, notes('D5 E5 G5'), 0.32, 0.12, (m) => vibe(m, 0.25), { gain: 0.26, spread: 0.4 });
			mx.add(upright(n('G2'), 0.25), 0, { gain: 0.45 });
			mx.add(upright(n('D2'), 0.25), 0.32, { gain: 0.4 });
			mx.add(brushSweep(0.5), 0.2, { gain: 0.1, send: 0.2 });
			const end = 0.7;
			bandChord(mx, end, { piano: ['G3 B3 D4 F#4 A4'], vibes: ['B4', 'D5', 'B5'], bass: 'G2', hold: 1.3 });
			mx.add(kickDrum(), end, { gain: 0.5 });
			mx.add(ride(1.2), end, { gain: 0.16, pan: 0.3, send: 0.3 });
			mx.add(brushSlap(), end, { gain: 0.25 });
		},
		{ tail: 1.4, size: 0.6 },
	);

// more free spins: a run up the vibes and marimba into a bright chord
const freeSpinsMore = () =>
	room(
		(mx) => {
			run(mx, PENTA.slice(0, 8), 0, 0.045, mar, { gain: 0.24, spread: 0.8, rise: 0.01 });
			run(mx, PENTA.slice(0, 8), 0.01, 0.045, (m) => vibe(m, 0.2), { gain: 0.08, spread: -0.8 });
			const end = 8 * 0.045 + 0.04;
			bandChord(mx, end, { piano: ['G3 D4 G4 B4'], vibes: ['B4', 'D5', 'G5'], bass: 'G2', hold: 1 });
			mx.add(kickDrum(), end, { gain: 0.45 });
			mx.add(ride(1), end, { gain: 0.14, pan: 0.3, send: 0.3 });
		},
		{ tail: 1.4, size: 0.6 },
	);

// the free spins' total: a jazz ending, IV - V - I, the vibes singing over it
const youWon = () =>
	room(
		(mx) => {
			const steps = [
				[0, 'C2', 'E3 G3 B3 D4', 'E5'],
				[0.42, 'D2', 'F#3 B3 C4 E4', 'F#5'],
				[0.84, 'G2', 'B3 D4 F#4 A4', 'G5'],
			];
			for (const [t, bass, chord, top] of steps) {
				const last = t > 0.8;
				pianoChord(mx, notes(chord), t, last ? 1.8 : 0.4, { gain: 0.16, velocity: 0.55 });
				mx.add(upright(n(bass), last ? 1.8 : 0.38), t, { gain: 0.5 });
				mx.add(vibe(n(top), last ? 1.8 : 0.38), t + 0.01, { gain: 0.28, send: 0.4 });
				mx.add(brushSlap(), t, { gain: last ? 0.22 : 0.12 });
			}
			run(mx, notes('B5 G5 D5'), 1.4, 0.09, (m) => vibe(m, 0.4), { gain: 0.08, spread: 0.6 });
			mx.add(kickDrum(), 0.84, { gain: 0.5 });
			mx.add(ride(1.6), 0.84, { gain: 0.15, pan: 0.3, send: 0.3 });
		},
		{ tail: 1.6, size: 0.65 },
	);

// a short win: a little run, its length (and a closing chord) growing with the win
const winRun = ({ steps, chord = false }) => () =>
	room(
		(mx) => {
			const ms = PENTA.slice(0, steps);
			run(mx, ms, 0, 0.06, mar, { gain: 0.3, spread: 0.7, rise: 0.01 });
			run(mx, ms, 0.005, 0.06, (m) => vibe(m, 0.3), { gain: 0.1, spread: -0.7 });
			if (chord) bandChord(mx, steps * 0.06 + 0.02, { piano: ['G3 B3 D4 G4'], vibes: ['D5', 'G5'], bass: 'G2', hold: 0.9, gain: 0.8 });
		},
		{ tail: 1, size: 0.55 },
	);

// the end of a win: the band's last chord
const winEnd = () =>
	room(
		(mx) => {
			bandChord(mx, 0, { piano: ['G2 D3 B3 D4 F#4 A4'], vibes: ['B4', 'D5', 'G5'], bass: 'G2', hold: 1.4 });
			mx.add(kickDrum(), 0, { gain: 0.45 });
			mx.add(ride(1.4), 0, { gain: 0.14, pan: 0.3, send: 0.3 });
			run(mx, notes('D6 B5 G5'), 0.35, 0.08, (m) => vibe(m, 0.3), { gain: 0.06, spread: 0.6 });
		},
		{ tail: 1.6, size: 0.65 },
	);

// a tumble's win, a note higher each time down the tumble
const tumbleWin = (k) => () =>
	room(
		(mx) => {
			const m = PENTA[k - 1];
			mx.add(mar(m), 0, { gain: 0.45, send: 0.35 });
			mx.add(vibe(m + 12, 0.4), 0.004, { gain: 0.12, send: 0.4 });
			mx.add(tok({ pitch: 1.2, weight: 0.2, ring: 0.5 }), 0, { gain: 0.25 });
		},
		{ tail: 0.9, size: 0.55 },
	);

// the multiplier spots landing on the board: soft plinks dropping down the vibes
const spotsLanding = () =>
	room(
		(mx) => {
			run(mx, notes('G5 D5 B4 G4'), 0, 0.055, (m) => vibes(m, 0.3, { motor: 0 }), { gain: 0.22, spread: 0.8 });
			for (let k = 0; k < 4; k++) mx.add(tok({ pitch: 1.35, weight: 0, contact: 0.0002, ring: 0.4, click: 0.6 }), k * 0.055, { gain: 0.25, pan: 0.4 * (k / 3 - 0.5) }); // prettier-ignore
			mx.add(sweep(0.15, 130, 70, 0.012), 0, { gain: 0.3 });
		},
		{ tail: 1, size: 0.6 },
	);

// the multiplier going up: a step up the vibes, quick enough to come again and again
const multiplierUp = () =>
	room(
		(mx) => {
			mx.add(vibe(n('D5'), 0.12), 0, { gain: 0.25, pan: -0.15, send: 0.35 });
			mx.add(vibe(n('G5'), 0.35), 0.06, { gain: 0.3, pan: 0.15, send: 0.35 });
			mx.add(tok({ pitch: 1.45, weight: 0, contact: 0.00018, ring: 0.4, click: 0.6 }), 0.06, { gain: 0.18 });
		},
		{ tail: 0.8, size: 0.5 },
	);

const multiplierUpdate = () => room((mx) => mx.add(vibe(n('B4'), 0.4), 0, { gain: 0.4, send: 0.35 }), { tail: 0.8 });

// the multiplier spent (a capture on a spot, the queen's collection): a bright wooden "ka-ching"
const multiplierWin = () =>
	room(
		(mx) => {
			mx.add(clack({ pitch: 1.1, ring: 0.7 }), 0, { gain: 0.4 });
			for (const m of notes('D5 G5')) mx.add(mar(m), 0.005, { gain: 0.28, send: 0.35 });
			for (const m of notes('G5 B5')) mx.add(vibe(m, 0.6), 0.09, { gain: 0.22, send: 0.4 });
			bandChord(mx, 0.09, { piano: ['G3 B3 D4 G4'], bass: 'G2', hold: 0.9, gain: 0.7 });
			run(mx, notes('D6 B5 D6'), 0.3, 0.07, (m) => vibes(m, 0.2, { motor: 0 }), { gain: 0.06, spread: 0.7 });
			mx.add(ride(0.9), 0.09, { gain: 0.1, pan: 0.3, send: 0.3 });
		},
		{ tail: 1.2, size: 0.6 },
	);

// the multiplier back to its start: a soft fall and a shuffle of wood
const multiplierReset = () =>
	room(
		(mx) => {
			run(mx, notes('D5 B4 G4'), 0, 0.08, (m) => marimba(m, { soft: 0.9, decay: 0.4 }), { gain: 0.25, spread: 0.5 });
			mx.add(scrape(0.18, 600), 0.02, { gain: 0.1, send: 0.1 });
		},
		{ tail: 0.8 },
	);

// two pieces knocking together, the vibes stepping up
const combine = ({ top = 'G5' } = {}) => () =>
	room(
		(mx) => {
			mx.add(clack({ pitch: 1.15, ring: 0.6 }), 0, { gain: 0.6, pan: -0.2 });
			mx.add(clack({ pitch: 1.05, ring: 0.6 }), 0.07, { gain: 0.7, pan: 0.2 });
			mx.add(vibe(n('D5'), 0.2), 0, { gain: 0.2, send: 0.35 });
			mx.add(vibe(n(top), 0.5), 0.07, { gain: 0.25, send: 0.35 });
		},
		{ tail: 0.9 },
	);

// a burst: a hard clack, a low boom, a scatter of marimba and vibes
const burstFx = ({ size = 1, sparkles = 4 } = {}) => () =>
	room(
		(mx) => {
			mx.add(clack({ pitch: 1.05 - 0.15 * size, weight: size, ring: 0.8 }), 0, { gain: 0.8 });
			mx.add(sweep(0.3 + 0.3 * size, 110, 45, 0.03), 0, { gain: 0.35 * size, send: 0.05 });
			for (let k = 0; k < sparkles; k++) {
				const m = PENTA[2 + Math.floor(rand() * 6)];
				mx.add(k % 2 ? vibes(m, 0.25, { motor: 0 }) : mar(m), 0.03 + k * rr(0.03, 0.06), { gain: rr(0.1, 0.2), pan: rr(-0.6, 0.6), send: 0.4 }); // prettier-ignore
			}
		},
		{ tail: 1, size: 0.6 },
	);

// a reveal: a soft rush up into a chord of the vibes
const reveal = () =>
	room(
		(mx) => {
			mx.add(whoosh(0.7, 350, 1500, { peakAt: 0.85, q: 0.8 }), 0, { gain: 0.3, pan: [-0.4, 0.4], send: 0.3 });
			for (const m of notes('G4 B4 D5 F#5')) mx.add(vibes(m, 0.8), 0.62, { gain: 0.16, pan: rr(-0.3, 0.3), send: 0.45 });
			mx.add(upright(n('G2'), 0.8), 0.62, { gain: 0.4 });
		},
		{ tail: 1.2, size: 0.6 },
	);

// bonus symbols won: a run up the marimba into the band's chord (v2 longer, the piano answering)
const bonusWon = ({ long = false } = {}) => () =>
	room(
		(mx) => {
			run(mx, notes('G3 B3 D4 G4 B4 D5 G5'), 0, 0.05, mar, { gain: 0.24, spread: 0.8, rise: 0.01 });
			const end = 7 * 0.05 + 0.03;
			bandChord(mx, end, { piano: ['G3 B3 D4 F#4 A4'], vibes: ['B4', 'D5', 'G5'], bass: 'G2', hold: long ? 1.8 : 1 });
			mx.add(kickDrum(), end, { gain: 0.5 });
			mx.add(ride(1.4), end, { gain: 0.15, pan: 0.3, send: 0.3 });
			if (long) {
				run(mx, notes('D5 E5 G5 B5'), end + 0.6, 0.13, (m) => vibe(m, 0.3), { gain: 0.18, spread: 0.6 });
				run(mx, notes('G4 B4 D5'), end + 1.2, 0.1, (m) => piano(m, 0.8, { velocity: 0.55 }), { gain: 0.14, spread: 0.4 });
			}
		},
		{ tail: 1.6, size: 0.65 },
	);

// a chess clock's button pressed hard: a clack and its bell
const clockPress = () =>
	room(
		(mx) => {
			mx.add(clack({ pitch: 1.25, weight: 0.4, ring: 0.5 }), 0, { gain: 0.7 });
			mx.add(sweep(0.15, 120, 60, 0.015), 0, { gain: 0.4 });
			mx.add(partials(1760, 0.6, [[1, 1, 0.45], [2.76, 0.2, 0.15]], { attack: 0.001 }), 0.01, { gain: 0.06, send: 0.35 });
		},
		{ tail: 0.7 },
	);

// ---------------------------------------------------------------------------------------------
// sprite

// level: loudest 400 ms RMS to aim for (dBFS); peak: ceiling (the sample's sounds peak about 0.3-0.4,
// its move chime at -21 dB)
const SOUNDS = {
	sfx_chess_take_p: { level: -22, render: take('p', true) },
	sfx_chess_take_n: { level: -21.5, render: take('n', true) },
	sfx_chess_take_b: { level: -21.5, render: take('b', true) },
	sfx_chess_take_r: { level: -21, render: take('r', true) },
	sfx_chess_take_q: { level: -20, render: take('q', true) },
	sfx_chess_check: { level: -22, render: check(true) },
	sfx_chess_checked: { level: -22, render: check(false) },
	sfx_chess_mate: { level: -19, render: mate(true) },
	sfx_chess_mated: { level: -20, render: mate(false) },
	sfx_chess_promote: { level: -21, render: promote },
	sfx_chess_castle: { level: -22, render: castle },
	sfx_chess_pick: { level: -32, peak: 0.25, render: pick },
	sfx_chess_back: { level: -29, peak: 0.3, render: back },
	sfx_chess_off: { level: -29, render: offBoard },
};
for (const kind of Object.keys(MOVES)) {
	TAKES.forEach((t, i) => {
		SOUNDS[`sfx_chess_move_${kind}_${i + 1}`] = {
			level: kind === 'k' || kind === 'r' ? -23 : kind === 'p' ? -24.5 : -23.5,
			peak: 0.72,
			render: () => MOVES[kind](t),
		};
	});
}
for (const kind of Object.keys(VICTIM)) {
	SOUNDS[`sfx_chess_taken_${kind}`] = { level: -23, render: take(kind, false) };
}
for (let k = 0; k < 8; k++) SOUNDS[`sfx_chess_drop_${k + 1}`] = { level: -25, peak: 0.56, render: drop(k) };

// the names the sample game had, which the game's code plays: each made new for the café
Object.assign(SOUNDS, {
	bgm_main: { level: -23, loop: true, render: bgmMain },
	bgm_freespin: { level: -22, loop: true, render: bgmFreespin },
	bgm_winlevel_big: { level: -21, loop: true, render: () => bgmWin(0) },
	bgm_winlevel_superwin: { level: -20.5, loop: true, render: () => bgmWin(1) },
	bgm_winlevel_mega: { level: -20, loop: true, render: () => bgmWin(2) },
	bgm_winlevel_epic: { level: -19.5, loop: true, render: () => bgmWin(3) },
	bgm_winlevel_max: { level: -19, loop: true, render: () => bgmWin(4) },
	sfx_bigwin_coinloop: { level: -27, loop: true, render: piecesLoop },
	sfx_anticipation: { level: -24, loop: true, render: clockLoop },
	sfx_anticipation_start: { level: -24, render: clockPress },
	jng_intro_fs: { level: -17, render: jingle },
	sfx_btn_general: { level: -30, peak: 0.4, render: btnGeneral },
	sfx_btn_spin: { level: -24, peak: 0.55, render: btnSpin },
	sfx_fs_respins: { level: -18, render: freeSpinsMore },
	sfx_multiplier_combine_a: { level: -21, render: combine() },
	sfx_multiplier_combine_b: { level: -21, render: combine({ top: 'B5' }) },
	sfx_multiplier_explosion_a: { level: -20, render: burstFx({ size: 0.7, sparkles: 3 }) },
	sfx_multiplier_explosion_b: { level: -18, render: burstFx({ size: 1.4, sparkles: 8 }) },
	sfx_multiplier_explosion_c: { level: -19, render: burstFx({ size: 1, sparkles: 5 }) },
	sfx_multiplier_landing: { level: -21, render: spotsLanding },
	sfx_multiplier_reset: { level: -25, render: multiplierReset },
	sfx_multiplier_up: { level: -23, render: multiplierUp },
	sfx_multiplier_update: { level: -24, render: multiplierUpdate },
	sfx_multiplier_win: { level: -19, render: multiplierWin },
	sfx_royals_landing: { level: -23.5, peak: 0.62, render: () => MOVES.q(TAKES[0]) },
	sfx_scatter_reveal: { level: -21, render: reveal },
	sfx_scatter_win: { level: -18, render: bonusWon() },
	sfx_scatter_win_v2: { level: -17, render: bonusWon({ long: true }) },
	sfx_superfreespin: { level: -18, render: superFreeSpin },
	sfx_symbols_landing: { level: -25, render: symbolsLanding },
	sfx_wild_explode: { level: -18, render: burstFx({ size: 1.2, sparkles: 6 }) },
	sfx_winlevel_end: { level: -18, render: winEnd },
	sfx_winlevel_small: { level: -22, render: winRun({ steps: 2 }) },
	sfx_winlevel_standard: { level: -21, render: winRun({ steps: 3 }) },
	sfx_winlevel_nice: { level: -20, render: winRun({ steps: 5, chord: true }) },
	sfx_winlevel_substantial: { level: -19, render: winRun({ steps: 7, chord: true }) },
	sfx_youwon_panel: { level: -17, render: youWon },
});
for (let k = 1; k <= 5; k++) {
	SOUNDS[`sfx_reel_stop_${k}`] = { level: -26, peak: 0.4, render: reelStop(k) };
	SOUNDS[`tumble_win_${k}`] = { level: -22, render: tumbleWin(k) };
	// the fifth is the fist slamming the table as the bonus comes in (FistSlam)
	SOUNDS[`sfx_scatter_stop_${k}`] = k < 5 ? { level: -21, render: scatterStop(k) } : { level: -16, peak: 0.8, render: fistSlam };
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
			`${name.padEnd(28)} ${(audio.L.length / SR).toFixed(2).padStart(6)}s  level ${loudness(audio).toFixed(1).padStart(6)} dB  peak ${peakOf(audio).toFixed(2)}`,
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
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chess-sounds-'));
	const spriteWav = path.join(tmp, 'sprite.wav');
	fs.writeFileSync(spriteWav, wav(L, R));
	blender(here, 'encode', spriteWav, outDir);
	fs.rmSync(tmp, { recursive: true, force: true });
	for (const ext of FORMATS) {
		if (!fs.existsSync(path.join(outDir, `sounds.${ext}`))) throw new Error(`sounds.${ext} wasn't written`);
	}
	// the sample game's mp3 is gone (Ogg and M4A cover every browser)
	fs.rmSync(path.join(outDir, 'sounds.mp3'), { force: true });

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
