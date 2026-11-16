"""A preview page of the tall wild, to watch it without running the game, as TallWild.svelte, StickyBats.svelte and
game/tallWilds.svelte.ts, stickyBats.svelte.ts do it:
- base game: the bat ring lands, glides to its reel's middle and morphs into the big WILD while the symbols under it
  fade, and the WILD stays;
- bonus: the same, then (the spin done) the WILD turns back into the ring, which stays as a sticky bat, hovering; as
  the next spin starts it takes off, flutters round the board, swoops onto a symbol of another reel and does the
  tall wild from there too.
It uses the game's own pictures (static/assets: the symbols' stills, the ring, the morph's and the way back's sprite
sheets, the WILD at rest) and its sizes and timing (game/constants.ts), all put into one HTML file:

  blender stuff/folders/bat_ring_to_wild/preview/tall_wild_in_game.html

On the page: Play, base game or bonus, which reel and row the ring lands in (and in the bonus which reel and row the
bat comes down on), the speed (slow motion), a timeline to scrub through it, and looping. The board doesn't spin, and the hovering bat
is the ring's still (in the game it is its idle). Rerun after wild-tall.py (or after changing TALL_WILD in constants.ts)
to bring it up to date.

Run from apps/crystal-hollows:
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/5.2/python/bin/python.exe" -I art-source/wild-tall-preview.py
"""
import os, re, json, base64

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(APP, "static", "assets")
OUT = os.path.join(os.path.expanduser("~"), "Downloads", "blender stuff", "folders", "bat_ring_to_wild", "preview",
                   "tall_wild_in_game.html")
constants = open(os.path.join(APP, "src", "game", "constants.ts"), encoding="utf-8").read()


def number(pattern):
    """A constant's value from constants.ts (a number or plain arithmetic of numbers)."""
    m = re.search(pattern, constants)
    assert m, "not found in constants.ts: " + pattern
    expr = m.group(1).strip()
    assert re.fullmatch(r"[\d\s.+\-*/()]+", expr), "not plain arithmetic: " + expr
    return eval(expr)


def fields(block):
    """{name: number} of a TS object literal's plain number fields."""
    return {k: eval(v) for k, v in re.findall(r"(\w+):\s*([\d.+\-*/() ]+)(?=,|\s*\})", block)}


tall = constants[constants.index("export const TALL_WILD"):]
tall = tall[:tall.index("\n};")]
config = {
    "cellH": number(r"export const SYMBOL_SIZE = ([^;]+);"),
    "cellW": number(r"export const REEL_WIDTH = ([^;]+);"),
    "wildSize": number(r"export const WILD_SIZE = ([^;]+);"),
    "letterSize": number(r"const LETTER_SIZE = ([^;]+);"),
    "premiumSize": number(r"const PREMIUM_SIZE = ([^;]+);"),
    "fps": number(r"fps:\s*([^,]+),"),
    "frames": number(r"frames:\s*([^,]+),"),
    "glideMs": number(r"glideMs:\s*([^,]+),"),
    "pace": eval(re.search(r"pace:\s*([^,]+),", tall).group(1)),
    "frameWidth": eval(re.search(r"frameWidth:\s*([^,]+),", tall).group(1)),
    "ringSize": eval(re.search(r"ringSize:\s*([^,]+),", tall).group(1)),
    "open": fields(re.search(r"open:\s*(\{[^}]*\})", tall).group(1)),
}
sticky_ = tall[tall.index("sticky:"):]
reach_ = re.search(r"reach:\s*(\{[^}]*\})", sticky_)
config["sticky"] = fields(sticky_.replace(reach_.group(0), ""))
config["sticky"]["reach"] = fields(reach_.group(1))
# the wild's `spin` (its land: the ring once round), from its skeleton
spin_ = json.load(open(os.path.join(ASSETS, "spines", "wild", "wild.json"), encoding="utf-8"))["animations"]["spin"]
config["spinMs"] = spin_["bones"]["ring"]["rotate"][-1]["time"] * 1000
back_ = re.search(r"back:\s*\{\s*from:\s*([\d.]+),\s*frames:\s*([\d.]+),\s*close:\s*\{\s*from:\s*([\d.]+),\s*to:\s*([\d.]+)", tall)
assert back_, "TALL_WILD.back not found in constants.ts"
config["back"] = {"from": float(back_.group(1)), "frames": int(back_.group(2)),
                  "close": {"from": float(back_.group(3)), "to": float(back_.group(4))}}
for k in ("top", "bottom", "from", "to"):
    assert k in config["open"], "TALL_WILD.open." + k
for k in ("growMs", "segmentMs", "tilt", "approachMs", "reach"):
    assert k in config["sticky"], "TALL_WILD.sticky." + k


def data_url(*parts):
    path = os.path.join(ASSETS, *parts)
    return "data:image/webp;base64," + base64.b64encode(open(path, "rb").read()).decode("ascii")


def frames_of(name, count):
    """A sprite sheet's frames: [x, y, w, h, x and y in the frame], and the frame's size."""
    sheet = json.load(open(os.path.join(ASSETS, "sprites", name, name + ".json"), encoding="utf-8"))
    frames = [sheet["frames"][f] for f in sheet["animations"][name]]
    assert len(frames) == count, "%s has %d frames, constants.ts says %d" % (name, len(frames), count)
    return {"frames": [[f["frame"]["x"], f["frame"]["y"], f["frame"]["w"], f["frame"]["h"],
                        f["spriteSourceSize"]["x"], f["spriteSourceSize"]["y"]] for f in frames],
            "source": [frames[0]["sourceSize"]["w"], frames[0]["sourceSize"]["h"]]}


morph = frames_of("wildMorph", config["frames"])
back = frames_of("wildUnmorph", config["back"]["frames"])
images = {
    "morph": data_url("sprites", "wildMorph", "wildMorph.webp"),
    "back": data_url("sprites", "wildUnmorph", "wildUnmorph.webp"),
    "wildTall": data_url("symbols", "wild-tall.webp"),
    "ring": data_url("symbols", "wild.webp"),
}
symbols = {"A": "a", "K": "k", "Q": "q", "J": "j", "crystal": "crystal", "berries": "berries",
           "stalactite": "stalactite", "mushroom": "mushroom"}
for name, file in symbols.items():
    images[name] = data_url("symbols", file + ".webp")

PAGE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tall Wild Preview</title>
<style>
  :root { --bg: #14161f; --panel: #1f2330; --text: #e8e9ef; --muted: #9aa0b4; --accent: #c84f8d; --board: #2b3248; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.4 system-ui, sans-serif; }
  main { max-width: 1100px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { margin: 0 0 12px; color: var(--muted); }
  .controls { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; background: var(--panel);
              padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; }
  label { display: flex; gap: 6px; align-items: center; color: var(--muted); }
  select, button { font: inherit; color: var(--text); background: #2c3142; border: 1px solid #3b4157; border-radius: 6px;
                   padding: 5px 10px; }
  button.play { background: var(--accent); border-color: var(--accent); font-weight: 600; min-width: 84px; }
  .timeline { display: flex; gap: 10px; align-items: center; flex: 1 1 260px; }
  .timeline input { flex: 1; }
  #phase { min-width: 190px; color: var(--text); font-variant-numeric: tabular-nums; }
  canvas { display: block; margin: 0 auto; max-width: 100%; height: auto; background: var(--board); border-radius: 10px; }
</style>
</head>
<body>
<main>
  <h1>Tall wild preview</h1>
  <p>The bat ring lands, glides to the middle of its reel and morphs into the WILD, with the game's own pictures, sizes and timing. In the bonus, once the spin is done, the WILD turns back into the ring, which stays as a sticky bat: as the next spin starts it flutters round the board, then swoops onto a symbol of another reel and does the tall WILD from there. (Here the board doesn't spin, and the bat is the ring's still; in the game it flaps.)</p>
  <div class="controls">
    <button class="play" id="play">Play</button>
    <label>Game <select id="mode"><option value="bonus">Bonus (sticky bat)</option><option value="base">Base game</option></select></label>
    <label>Reel <select id="reel"></select></label>
    <label>Ring lands in row <select id="row"></select></label>
    <label id="toLabel">Bat lands on <select id="to"></select> <select id="toRow"></select></label>
    <label>Speed <select id="speed">
      <option value="1">1x (game)</option><option value="0.5">0.5x</option><option value="0.25">0.25x</option><option value="0.1">0.1x</option>
    </select></label>
    <label><input type="checkbox" id="loop" checked> Loop</label>
    <div class="timeline"><input type="range" id="scrub" min="0" max="1000" value="0"><span id="phase"></span></div>
  </div>
  <canvas id="board"></canvas>
</main>
<script>
const C = __CONFIG__;
const MORPH = __MORPH__;
const BACK = __BACK__;
const SRC = __IMAGES__;
const COLS = 5, ROWS = 4;
const W = C.cellW * COLS, H = C.cellH * ROWS;
// (the tall wild plays at its pace: TALL_WILD.pace times as slow as its frames' own timing)
const MORPH_MS = C.frames / C.fps * 1000 * C.pace, BACK_MS = C.back.frames / C.fps * 1000 * C.pace;
const GLIDE_MS = C.glideMs * C.pace;
const FADE_FROM = 0.75;                                         // (TallWild: the first frame fades in under the bat from here)
const fadeIn = (g) => { const u = Math.min(1, Math.max(0, (g - FADE_FROM) / (1 - FADE_FROM))); return u * u * (3 - 2 * u); };
const STILL_W = H / 4, MORPH_W = STILL_W * C.frameWidth;
const $ = (id) => document.getElementById(id);
const bonus = () => $('mode').value === 'bonus';

// the sequence: [phase, ms at 1x, what it says]
function segments() {
  const first = [['landed', 300, 'ring landed'],
    ['hold', C.spinMs, 'the ring spins in its cell (in the game its thorn ring turns once; here its still)'],
    ['glide', GLIDE_MS, 'gliding to the middle'], ['morph', MORPH_MS, 'morph']];
  if (!bonus()) return [...first, ['still', 1600, 'WILD at rest']];
  return [...first, ['still', 900, "WILD (the spin's wins)"], ['unmorph', BACK_MS, 'way back'],
    ['hover', 700, 'sticky bat hovers (spin done)'], ['wander', WANDER_MS, 'next spin: it flutters round'],
    ['approach', C.sticky.approachMs, 'its reel stopped: swooping onto a symbol'], ['perch', C.spinMs, 'on the symbol: it spins once (in the game)'],
    ['glide2', GLIDE_MS, 'gliding to the middle'], ['morph2', MORPH_MS, 'morph'], ['still2', 900, "WILD (the spin's wins)"],
    ['unmorph2', BACK_MS, 'way back'], ['hover2', 1200, 'sticky bat hovers (next spin: off it goes again)']];
}
const WANDER_MS = 2700;                                         // (in the game: till its reel stops)

// the wander (stickyBats.svelte.ts): a Catmull-Rom curve through random waypoints, each up to `reach` cells from the
// last, one every segmentMs; the same path every time for the same start (seeded)
const catmullRom = (a, b, c, d, u) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
function wanderAt(start, ms) {
  let s = 987654321 + start.x * 7919;
  const r = () => (s = (s * 48271) % 2147483647) / 2147483647;
  for (let k = 0; k < 8; k++) r();                              // (past the first, small numbers)
  const path = [start, start];
  const i = Math.floor(ms / C.sticky.segmentMs), u = ms / C.sticky.segmentMs - i;
  while (path.length < i + 4) {
    const p = path.at(-1);
    path.push({ x: clamp(p.x + (r() * 2 - 1) * C.sticky.reach.x, -0.2, COLS - 0.8), y: clamp(p.y + (r() * 2 - 1) * C.sticky.reach.y, 0, ROWS - 1) });
  }
  const [a, b, c, d] = path.slice(i, i + 4);
  return { x: catmullRom(a.x, b.x, c.x, d.x, u), y: catmullRom(a.y, b.y, c.y, d.y, u) };
}
const total = () => segments().reduce((sum, s) => sum + s[1], 0);
function segmentAt(ms) {
  for (const [phase, length, label] of segments()) {
    if (ms < length) return { phase, p: ms / length, label };
    ms -= length;
  }
  const last = segments().at(-1);
  return { phase: last[0], p: 1, label: last[2] };
}

const img = {};
Promise.all(Object.entries(SRC).map(([k, src]) => new Promise((ok) => { const i = new Image(); i.onload = ok; i.src = src; img[k] = i; })))
  .then(start);

// a fixed board of the game's symbols around the ring
const LETTERS = ['A', 'K', 'Q', 'J'], PREMIUMS = ['crystal', 'berries', 'stalactite', 'mushroom'];
const board = [];
let seed = 7;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let r = 0; r < COLS; r++) board.push(Array.from({ length: ROWS }, () => rand() < 0.65 ? LETTERS[Math.floor(rand() * 4)] : PREMIUMS[Math.floor(rand() * 4)]));

for (let r = 0; r < COLS; r++) { $('reel').add(new Option('Reel ' + (r + 1), r)); $('to').add(new Option('Reel ' + (r + 1), r)); }
for (let r = 0; r < ROWS; r++) { $('row').add(new Option('Row ' + (r + 1), r)); $('toRow').add(new Option('Row ' + (r + 1), r)); }
$('reel').value = 1; $('row').value = 0; $('to').value = 3; $('toRow').value = 3;

const canvas = $('board'), ctx = canvas.getContext('2d');
const PAD = 40;                                                // room round the board (the ring and the bat reach past it)
function resize() {
  const dpr = window.devicePixelRatio || 1;
  // as wide as the page, but no taller than the window has room for
  const aspect = (W + PAD * 2) / (H + PAD * 2);
  const room = window.innerHeight - canvas.getBoundingClientRect().top - window.scrollY - 16;
  const cssW = Math.max(320, Math.min(canvas.parentElement.clientWidth, room * aspect));
  canvas.style.width = cssW + 'px';
  const scale = cssW / (W + PAD * 2);
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round((H + PAD * 2) * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, PAD * scale * dpr, PAD * scale * dpr);
  ctx.imageSmoothingQuality = 'high';
}

const cubicInOut = (t) => t < 0.5 ? 4 * t * t * t : 0.5 * Math.pow(2 * t - 2, 3) + 1;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// (tallWilds.svelte.ts) the 60 fps frame where the opening edge is `cells` from the middle, and the way back's where the
// closing edge is
function openFrame(cells, up) {
  const p = Math.min(1, cells / (up ? C.open.top : C.open.bottom));
  return C.open.from + (C.open.to - C.open.from) * (1 - Math.cbrt(1 - p));
}
function closeFrame(cells, up) {
  const p = Math.min(1, cells / (up ? C.open.top : C.open.bottom));
  return C.back.close.from + (C.back.close.to - C.back.close.from) * Math.cbrt(1 - p);
}
// how much a covered symbol (not the ring) shows under a tall wild in this state of it
function coverAlpha(row, tw) {
  if (!tw || tw.state === 'none' || tw.state === 'glide') return 1;
  if (tw.state === 'still') return 0;
  const offset = row + 0.5 - ROWS / 2, up = offset < 0;
  if (tw.state === 'morph') {
    const a = openFrame(Math.abs(offset), up), b = openFrame(Math.abs(offset) + 0.5, up);
    return 1 - clamp((1 + tw.frame * (60 / C.fps) - a) / Math.max(1, b - a), 0, 1);
  }
  if (tw.state === 'unmorph') {
    const a = closeFrame(Math.abs(offset) + 0.5, up), b = closeFrame(Math.abs(offset), up);
    return clamp((C.back.from + tw.frame * (60 / C.fps) - a) / Math.max(1, b - a), 0, 1);
  }
  return 1;
}

// what each reel's tall wild and the bat are doing
function world(ms) {
  const s = segmentAt(ms), p = s.p;
  const A = +$('reel').value, B = bonus() ? +$('to').value : A;
  const first = { glide: 'glide', morph: 'morph', still: 'still', unmorph: 'unmorph' }[s.phase];
  const second = { glide2: 'glide', morph2: 'morph', still2: 'still', unmorph2: 'unmorph' }[s.phase];
  const frameOf = (state) => state === 'morph' ? p * C.frames : state === 'unmorph' ? p * C.back.frames : 0;
  const twA = { state: first ?? 'none', frame: frameOf(first), glide: s.phase === 'glide' ? cubicInOut(p) : 0 };
  const twB = { state: second ?? 'none', frame: frameOf(second), glide: s.phase === 'glide2' ? cubicInOut(p) : 0, sticky: true };
  // the bat (bonus): hovering on A once the WILD there turned back; fluttering round, growing; swooping onto its cell
  // on B and sitting there; gliding to B's middle as a ring does, fading into the morph; hidden while it's the WILD
  const toRow = +$('toRow').value, mid = (ROWS - 1) / 2;
  const end = wanderAt({ x: A, y: mid }, WANDER_MS);
  const batAt = (phase, p) => {
    if (phase === 'hover') return { x: A, y: mid, size: C.ringSize, alpha: 1 };
    if (phase === 'wander') {
      const t = p * WANDER_MS;
      return { ...wanderAt({ x: A, y: mid }, t), size: C.ringSize + (C.wildSize - C.ringSize) * clamp(t / C.sticky.growMs, 0, 1), alpha: 1 };
    }
    if (phase === 'approach') {
      const e = 1 - Math.pow(1 - p, 3);
      return { x: end.x + (B - end.x) * e, y: end.y + (toRow - end.y) * e - Math.sin(Math.PI * p) * 0.25, size: C.wildSize, alpha: 1 };
    }
    if (phase === 'perch') return { x: B, y: toRow, size: C.wildSize, alpha: 1 };
    if (phase === 'glide2') {
      const g = cubicInOut(p);
      return { x: B, y: toRow + (mid - toRow) * g, size: C.wildSize + (C.ringSize - C.wildSize) * g, alpha: 1 };
    }
    if (phase === 'hover2') return { x: B, y: mid, size: C.ringSize, alpha: 1 };
  };
  let bat = batAt(s.phase, p);
  if (bat) {
    // leaning into its flight (its sideways speed)
    const before = s.phase === 'wander' ? batAt('wander', Math.max(0, p - 60 / WANDER_MS))
      : s.phase === 'approach' ? batAt('approach', Math.max(0, p - 60 / C.sticky.approachMs)) : bat;
    bat.tilt = ['wander', 'approach'].includes(s.phase) ? clamp((bat.x - before.x) * 3, -1, 1) * C.sticky.tilt : 0;
  }
  const landedOn = ['perch', 'glide2', 'morph2', 'still2', 'unmorph2', 'hover2'].includes(s.phase);
  return { s, A, B, toRow, landedOn, twA, twB, bat };
}

function drawSymbol(name, cx, cy, alpha) {
  if (alpha <= 0) return;
  const size = (LETTERS.includes(name) ? C.letterSize : C.premiumSize) * C.cellH;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img[name], cx - size / 2, cy - size / 2, size, size);
  ctx.globalAlpha = 1;
}
function drawFrame(sheet, image, i, alpha, cx) {
  const [x, y, w, h, ox, oy] = sheet.frames[Math.min(sheet.frames.length - 1, Math.max(0, Math.floor(i)))];
  const kx = MORPH_W / sheet.source[0], ky = H / sheet.source[1];
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, x, y, w, h, cx - MORPH_W / 2 + ox * kx, oy * ky, w * kx, h * ky);
  ctx.globalAlpha = 1;
}
function drawRing(cx, cy, size, alpha, rotation = 0) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(rotation);
  ctx.drawImage(img.ring, -size / 2, -size / 2, size, size);
  ctx.restore();
}
function drawTallWild(tw, reel, ringRow) {
  const cx = (reel + 0.5) * C.cellW;
  // (the morph's first frame fades in under the flying bat near the end of the glide, which stays opaque)
  const fade = fadeIn(tw.glide);
  if (tw.state === 'still') ctx.drawImage(img.wildTall, cx - STILL_W / 2, 0, STILL_W, H);
  else if (tw.state === 'glide') drawFrame(MORPH, img.morph, 0, fade, cx);
  else if (tw.state === 'morph') drawFrame(MORPH, img.morph, tw.frame, 1, cx);
  else if (tw.state === 'unmorph') drawFrame(BACK, img.back, tw.frame, 1, cx);
  if (tw.state === 'glide' && !tw.sticky) {
    const y = (ringRow + 0.5) * C.cellH * (1 - tw.glide) + (H / 2) * tw.glide;
    drawRing(cx, y, (C.wildSize * (1 - tw.glide) + C.ringSize * tw.glide) * C.cellH, 1);
  }
}

function draw(ms) {
  const ringRow = +$('row').value;
  const w = world(ms);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore();
  // the board's cells (faint lines between the reels)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let r = 1; r < COLS; r++) { ctx.beginPath(); ctx.moveTo(r * C.cellW, 0); ctx.lineTo(r * C.cellW, H); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.strokeRect(0, 0, W, H);
  for (let r = 0; r < COLS; r++) for (let row = 0; row < ROWS; row++) {
    // (the ring that landed: drawn by itself, then gone; the symbol the bat lands on: hidden once it's on it)
    let a = 1;
    if (r === w.A) a = row === ringRow ? 0 : coverAlpha(row, w.twA);
    if (r === w.B) a = Math.min(a, coverAlpha(row, w.twB));
    if (r === w.B && row === w.toRow && w.landedOn) a = 0;
    drawSymbol(board[r][row], (r + 0.5) * C.cellW, (row + 0.5) * C.cellH, a);
  }
  if (w.s.phase === 'landed' || w.s.phase === 'hold') drawRing((w.A + 0.5) * C.cellW, (ringRow + 0.5) * C.cellH, C.wildSize * C.cellH, 1);
  drawTallWild(w.twA, w.A, ringRow);
  drawTallWild(w.twB, w.B, w.toRow);
  if (w.bat) drawRing((w.bat.x + 0.5) * C.cellW, (w.bat.y + 0.5) * C.cellH, w.bat.size * C.cellH, w.bat.alpha, w.bat.tilt);
  let label = w.s.label;
  if (w.s.phase.startsWith('morph')) label += ' frame ' + (Math.min(C.frames - 1, Math.floor(w.s.p * C.frames)) + 1) + ' / ' + C.frames;
  if (w.s.phase.startsWith('unmorph')) label += ' frame ' + (Math.min(C.back.frames - 1, Math.floor(w.s.p * C.back.frames)) + 1) + ' / ' + C.back.frames;
  $('phase').textContent = (ms / 1000).toFixed(2) + ' s  ' + label;
  $('scrub').value = Math.round(ms / total() * 1000);
  $('toLabel').style.display = bonus() ? '' : 'none';
}

let t = 0, playing = false, last = 0;
function tick(now) {
  if (!playing) return;
  t += (now - last) * +$('speed').value; last = now;
  if (t >= total()) { if ($('loop').checked) t = 0; else { t = total(); playing = false; $('play').textContent = 'Play'; } }
  draw(t);
  if (playing) requestAnimationFrame(tick);
}
function play() {
  if (t >= total()) t = 0;
  playing = true; last = performance.now(); $('play').textContent = 'Pause';
  requestAnimationFrame(tick);
}
function pause() { playing = false; $('play').textContent = 'Play'; }
function start() {
  resize(); draw(0);
  $('play').onclick = () => playing ? pause() : play();
  $('reel').onchange = $('row').onchange = $('mode').onchange = $('to').onchange = $('toRow').onchange = () => { t = 0; draw(t); if (!playing) play(); };
  $('scrub').oninput = (e) => { pause(); t = e.target.value / 1000 * total(); draw(t); };
  window.addEventListener('resize', () => { resize(); draw(t); });
  play();
}
</script>
</body>
</html>
"""

page = (PAGE.replace("__CONFIG__", json.dumps(config)).replace("__MORPH__", json.dumps(morph))
        .replace("__BACK__", json.dumps(back)).replace("__IMAGES__", json.dumps(images)))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
    fh.write(page)
print("preview: %s (%d KB)" % (OUT, os.path.getsize(OUT) // 1024))
print("config:", json.dumps(config))
