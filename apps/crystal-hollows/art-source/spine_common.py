"""What the symbols' Spine exporters share (letters-spine.py, premiums-spine.py, wild-spine.py): reading one of the
user's cut-out rigs in an open .blend (an armature bending grid meshes of a picture, and maybe plain picture cards) and
writing it as a Spine 4.2 skeleton, its animations sampled from the .blend, plus one atlas page for a set of them.

- Bones: the armature's bones (same names and parents), under a Spine `root` at a given point (the middle of the
  symbol's still), 1 unit = 1 source px, y up; and a bone for each card. The armature may be moved and scaled (its
  top bones then carry its scale).
- Meshes are weighted: each point has the weights it has in Blender (up to 4 bones), so it bends the same way. Which
  of Blender's grid points are kept is up to the exporter (mesh_points: every few of them).
- Cards are plain pictures on their bones; a dust card's object-colour alpha becomes its slot's alpha. They have no
  attachment in the setup pose (the animation shows them), so the setup pose is the rig at rest.
- Keys: every frame (the .blends key every frame, linear), thinned where the motion is a straight line. A loop ends
  with its first frame again, one frame after its last, so it loops as it does in Blender.

The adaptive mesh (premiums-spine.py, wild-spine.py): a quadtree over Blender's grid of a mesh, cells up to ROOT points
across, split until every point in them that shows (a corner of a cell with any picture in it) stays within TOL source
px of where Blender puts it, at every frame of every animation given; cells with nothing in them are left out. Where a
cell meets smaller ones, the smaller ones' corners on its edges join its own triangles (a fan), so nothing cracks open.
The result is checked the same way after triangulating. Spine's `hull` (only its editor and debug drawing use it) is
left out: the mesh has holes.

Runs inside Blender (bpy, numpy, OpenImageIO).
"""
import bpy, os, json, math, itertools
import numpy as np
import OpenImageIO as oiio

SPINE_VERSION = "4.2.40"
PPU = 100.0          # source px per Blender unit
PAD = 4              # px between the atlas's pictures (room for the smaller mip levels)
PAGE_W = 1024
QUALITY = 92
ROOT = 16            # the quadtree's biggest cells, in Blender's grid steps (~160 px)
TOL = 1.0            # source px a showing point may be off Blender's, at any frame
REACH = 4            # atlas px round a cell in which any picture counts as showing (bilinear + the mip levels used)
EDGE = 2             # atlas px of empty edge round each picture (the shrink's filter reaches ~1.5)


def shrink(px, factor):
    """Straight-alpha float RGBA picture shrunk by factor (premultiplied while resizing)."""
    h, w = px.shape[:2]
    size = (max(1, round(w * factor)), max(1, round(h * factor)))
    pre = px.copy()
    pre[..., :3] *= pre[..., 3:4]
    buf = oiio.ImageBuf(oiio.ImageSpec(w, h, 4, oiio.FLOAT))
    buf.set_pixels(oiio.ROI(0, w, 0, h, 0, 1, 0, 4), np.ascontiguousarray(pre))
    small = np.clip(oiio.ImageBufAlgo.resize(buf, roi=oiio.ROI(0, size[0], 0, size[1], 0, 1, 0, 4)).get_pixels(oiio.FLOAT), 0, 1)
    a = small[..., 3:4]
    small[..., :3] = np.where(a > 0, small[..., :3] / np.maximum(a, 1e-6), 0)
    return small


def decompose(m):
    """Spine (rotation, scaleX, scaleY, shearY) of a 2x2 linear map (columns: the x and y axes); a mirrored one has a
    negative scaleX."""
    (a, b), (c, d) = m
    flip = -1.0 if a * d - b * c < 0 else 1.0
    rot = math.degrees(math.atan2(flip * c, flip * a))
    shy = math.degrees(math.atan2(d, b)) - rot - 90.0
    shy = (shy + 180.0) % 360.0 - 180.0
    return rot, flip * math.hypot(a, c), math.hypot(b, d), shy


def rdp(times, vals, tol):
    """Keep the fewest keys such that straight lines between them stay within tol of every sample."""
    keep = {0, len(times) - 1}
    stack = [(0, len(times) - 1)]
    while stack:
        i0, i1 = stack.pop()
        if i1 - i0 < 2:
            continue
        f = ((times[i0 + 1:i1] - times[i0]) / (times[i1] - times[i0]))[:, None]
        err = np.abs(vals[i0 + 1:i1] - (vals[i0] + (vals[i1] - vals[i0]) * f)).max(axis=1)
        k = int(np.argmax(err))
        if err[k] > tol:
            keep.add(i0 + 1 + k)
            stack += [(i0, i0 + 1 + k), (i0 + 1 + k, i1)]
    return sorted(keep)


def image_px(ob):
    img = next(n.image for n in ob.data.materials[0].node_tree.nodes if n.type == "TEX_IMAGE")
    iw, ih = img.size
    px = np.empty(iw * ih * 4, np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(ih, iw, 4)[::-1].copy(), iw, ih                       # row 0 = top


class Rig:
    """The open .blend's armature `rig_name`, the meshes it bends (pieces) and its cards (meshes named <prefix>_...),
    in Spine's terms: source px from `origin` (a point in Blender's x and z, in source px), y up."""

    def __init__(self, rig_name, origin, card_prefixes=()):
        self.sc = sc = bpy.context.scene
        self.fps = sc.render.fps / sc.render.fps_base
        self.f0, self.f1 = sc.frame_start, sc.frame_end
        self.OX, self.OZ = origin[0] / PPU, origin[1] / PPU
        self.rig = rig = bpy.data.objects[rig_name]
        # the armature's own place, if it is moved or scaled (the letters' and premiums' are not)
        self.placed = None if rig.matrix_world == rig.matrix_world.Identity(4) else rig.matrix_world.copy()
        self.bones = []
        def visit(b):
            self.bones.append(b)
            for ch in b.children:
                visit(ch)
        for b in rig.data.bones:
            if b.parent is None:
                visit(b)
        meshes = [o for o in bpy.data.objects if o.type == "MESH"]
        self.pieces = [o for o in meshes if any(m.type == "ARMATURE" for m in o.modifiers)]
        for o in self.pieces:                                                # plain linear blend skinning, as Spine's
            arm, = [m for m in o.modifiers if m.type == "ARMATURE"]
            assert arm.object == rig and arm.use_vertex_groups and not arm.use_bone_envelopes \
                and not arm.use_deform_preserve_volume and not arm.use_multi_modifier and not arm.vertex_group, o.name
        self.cards = [o for o in meshes if o.name.split("_")[0] in card_prefixes]
        assert len(self.pieces) + len(self.cards) == len(meshes), "unknown objects"
        self.names = ["root"] + [b.name for b in self.bones] + [o.name for o in self.cards]
        assert len(set(self.names)) == len(self.names)
        self.parent = {b.name: b.parent.name if b.parent else None for b in self.bones}
        self.parent.update({o.name: None for o in self.cards})
        # which other local axis of each bone lies in the picture plane (the bone's own Y is its length)
        self.axis = {}
        for b in self.bones:
            m = b.matrix_local
            want = np.array([-m.col[1].z, m.col[1].x])                       # 90 deg anticlockwise from the bone
            best = None
            for k in (0, 2):
                v = np.array([m.col[k].x, m.col[k].z])
                if np.linalg.norm(v) < 0.5:
                    continue
                for s in (1, -1):
                    err = np.linalg.norm(s * v / np.linalg.norm(v) - want / np.linalg.norm(want))
                    if best is None or err < best[0]:
                        best = (err, k, s)
            assert best[0] < 0.05, "bone %s is not flat in the picture plane" % b.name
            self.axis[b.name] = best[1:]

    def px(self, p):
        return np.array([(p.x - self.OX) * PPU, (p.z - self.OZ) * PPU])

    def frame2d(self, x_axis, y_axis, t):
        return np.array([[x_axis[0], y_axis[0], (t[0] - self.OX) * PPU],
                         [x_axis[1], y_axis[1], (t[1] - self.OZ) * PPU], [0, 0, 1.0]])

    def worlds(self, rest=False):
        out = {}
        for b in self.bones:
            m = b.matrix_local if rest else self.rig.pose.bones[b.name].matrix
            if self.placed is not None:
                m = self.placed @ m
            k, s = self.axis[b.name]
            out[b.name] = self.frame2d((m.col[1].x, m.col[1].z), (s * m.col[k].x, s * m.col[k].z), (m.col[3].x, m.col[3].z))
        for o in self.cards:                                                 # a card's local X is right, Z up
            m = o.matrix_world
            out[o.name] = self.frame2d((m.col[0].x, m.col[0].z), (m.col[2].x, m.col[2].z), (m.col[3].x, m.col[3].z))
        return out

    def locals_of(self, w):
        out = {}
        for n in self.names[1:]:
            p = self.parent[n]
            L = np.linalg.inv(w[p]) @ w[n] if p else w[n]
            out[n] = (L[0, 2], L[1, 2]) + decompose(L[:2, :2])
        return out


def mesh_points(o, grid_px):
    """A grid mesh's points kept for Spine (Blender's own, every k-th row and column and the last, about grid_px
    apart): their Blender vertex indices in Spine's order (hull first), uvs, triangles and hull length."""
    me = o.data
    _, iw, ih = image_px(o)
    uv = np.zeros((len(me.loops), 2)); vid = np.zeros(len(me.loops), int)
    me.uv_layers.active.data.foreach_get("uv", uv.ravel()); me.loops.foreach_get("vertex_index", vid)
    vuv = np.zeros((len(me.vertices), 2)); vuv[vid] = uv
    gu, gv = np.unique(np.round(vuv[:, 0], 5)), np.unique(np.round(vuv[:, 1], 5))
    assert len(gu) * len(gv) == len(me.vertices), "%s is not a regular grid" % o.name
    pick = lambda vals, size: sorted(set(range(0, len(vals), max(1, round(grid_px / (size / (len(vals) - 1))))))
                                     | {len(vals) - 1})
    cols, rows = pick(gu, iw), pick(gv, ih)
    nx, ny = len(cols), len(rows)
    border = [(i, 0) for i in range(nx)] + [(nx - 1, j) for j in range(1, ny)] + \
             [(i, ny - 1) for i in range(nx - 2, -1, -1)] + [(0, j) for j in range(ny - 2, 0, -1)]
    order = border + [(i, j) for j in range(1, ny - 1) for i in range(1, nx - 1)]
    idx = {ij: k for k, ij in enumerate(order)}
    at = {(round(float(u), 5), round(float(v), 5)): k for k, (u, v) in enumerate(vuv)}
    src = [at[(round(float(gu[cols[i]]), 5), round(float(gv[len(gv) - 1 - rows[j]]), 5))] for i, j in order]
    uvs = [(float(gu[cols[i]]), 1 - float(gv[len(gv) - 1 - rows[j]])) for i, j in order]     # v = 0 at the top
    tris = []
    for j in range(ny - 1):
        for i in range(nx - 1):
            a, b_, c, d = idx[(i, j)], idx[(i + 1, j)], idx[(i + 1, j + 1)], idx[(i, j + 1)]
            tris += [a, b_, c, a, c, d]
    return src, uvs, tris, len(border), (nx, ny)


def weights_of(o, s, max_bones=4):
    """Vertex s's bones and weights, the max_bones heaviest (None: all; Spine takes any number), adding up to 1."""
    groups = {g.index: g.name for g in o.vertex_groups}
    w = {groups[g.group]: g.weight for g in o.data.vertices[s].groups if g.weight > 1e-4}
    top = sorted(w.items(), key=lambda kv: -kv[1])[:max_bones]
    total = sum(x for _, x in top)
    return [(b, x / total) for b, x in top]


def setup_pose(r, first_frame=False):
    """The skeleton's setup pose (the rig at rest, or as at its first frame if first_frame; cards at their first frame's
    place, at full size), the bones' rest places in Spine's terms (what the meshes are bound to), and the `bones`
    list."""
    r.sc.frame_set(r.f0)
    rest_world = r.worlds(rest=True)
    first = r.locals_of(r.worlds())
    setup = dict(first) if first_frame else r.locals_of(rest_world)
    for o in r.cards:                                                        # cards: their first frame's place, at
        x, y, rot, sx, sy, shy = first[o.name]                               # full size (the animation sizes them)
        setup[o.name] = (x, y, rot, math.copysign(1.0, sx), 1.0, shy)
    bones_json = [{"name": "root"}]
    for n in r.names[1:]:
        x, y, rot, sx, sy, shy = setup[n]
        d = {"name": n, "parent": r.parent[n] or "root", "rotation": round(rot, 3), "x": round(x, 3), "y": round(y, 3)}
        if n in r.rig.data.bones:
            d["length"] = round(r.rig.data.bones[n].length * PPU, 2)
        if abs(sx - 1) > 1e-4: d["scaleX"] = round(sx, 4)
        if abs(sy - 1) > 1e-4: d["scaleY"] = round(sy, 4)
        if abs(shy) > 1e-3: d["shearY"] = round(shy, 3)
        bones_json.append(d)
    return setup, rest_world, bones_json


def mesh_attachment(r, o, rest_world, region, src, uvs, tris, hull, iw, ih, max_bones=4):
    """A weighted mesh attachment for piece o: its points are Blender vertices src (uvs on the region's picture), each on
    up to max_bones bones (weights_of)."""
    index_of = {n: i for i, n in enumerate(r.names)}
    verts = []
    for s in src:
        p = np.append(r.px(o.matrix_world @ o.data.vertices[s].co), 1.0)
        top = weights_of(o, s, max_bones)
        verts.append(len(top))
        for bname, wv in top:
            bx, by, _ = np.linalg.inv(rest_world[bname]) @ p
            verts += [index_of[bname], round(float(bx), 2), round(float(by), 2), round(wv, 4)]
    att = {"type": "mesh", "path": region, "uvs": [round(c, 5) for uv in uvs for c in uv], "triangles": tris,
           "vertices": verts}
    if hull is not None:
        att["hull"] = hull
    att.update({"width": iw, "height": ih})
    return att


def sample(r, loop, check_points, check_every=None):
    """Every frame's local bone transforms and card alphas (and Blender's own positions every check_every-th frame and
    the last, if asked). A loop gets its first frame again one frame after its last."""
    sc = r.sc
    frames = list(range(r.f0, r.f1 + 1))
    samples, alphas, check = [], {o.name: [] for o in r.cards}, {}
    for f in frames:
        sc.frame_set(f)
        samples.append(r.locals_of(r.worlds()))
        for o in r.cards:
            alphas[o.name].append(o.color[3] if o.name.startswith("dust") else 1.0)
        if check_every and ((f - r.f0) % check_every == 0 or f == r.f1):
            dg = bpy.context.evaluated_depsgraph_get()
            frame = {}
            for name, (kind, data) in check_points.items():
                o = bpy.data.objects[name]
                if kind == "mesh":
                    ev = o.evaluated_get(dg).to_mesh()
                    pts = [r.px(o.matrix_world @ ev.vertices[s].co) for s in data]
                    o.evaluated_get(dg).to_mesh_clear()
                else:
                    pts = [r.px(o.matrix_world @ co) for co in data]
                frame[name] = [[round(float(x), 3), round(float(y), 3)] for x, y in pts]
            frame["_alpha"] = {o.name: round(o.color[3], 4) for o in r.cards if o.name.startswith("dust")}
            check[round((f - r.f0) / r.fps, 4)] = frame
    times = [(f - r.f0) / r.fps for f in frames]
    if loop:
        times.append((r.f1 + 1 - r.f0) / r.fps)
        samples.append(samples[0])
        for a in alphas.values():
            a.append(a[0])
    return np.array(times), samples, alphas, check


def timelines(r, setup, times, samples, alphas):
    bones = {}
    neutral = {"rotate": 0.0, "translate": 0.0, "scale": 1.0, "shear": 0.0}
    key = lambda i: {"time": round(float(times[i]), 4)} if times[i] > 0 else {}
    for n in r.names[1:]:
        s0 = setup[n]
        arr = np.array([s[n] for s in samples])
        rot = np.degrees(np.unwrap(np.radians(arr[:, 2] - s0[2])))
        chans = {
            "rotate": (rot[:, None], 0.05, lambda v: {"value": round(float(v[0]), 3)}),
            "translate": (arr[:, 0:2] - np.array(s0[:2]), 0.05, lambda v: {"x": round(float(v[0]), 3), "y": round(float(v[1]), 3)}),
            "scale": (np.column_stack([arr[:, 3] / s0[3], arr[:, 4] / s0[4]]), 0.0005,
                      lambda v: {"x": round(float(v[0]), 5), "y": round(float(v[1]), 5)}),
            "shear": (np.column_stack([np.zeros(len(arr)), arr[:, 5] - s0[5]]), 0.05, lambda v: {"x": 0, "y": round(float(v[1]), 3)}),
        }
        bt = {}
        for ch, (vals, tol, fmt) in chans.items():
            if np.abs(vals - neutral[ch]).max() > tol:
                bt[ch] = [key(i) | fmt(vals[i]) for i in rdp(times, vals, tol)]
        if bt:
            bones[n] = bt
    slots = {}
    for o in r.cards:                                                        # shown by the animation, the dust faded
        st = {"attachment": [{"name": o.name}]}
        a = np.array(alphas[o.name])[:, None]
        if np.abs(a - 1).max() > 0.002:
            st["rgba"] = [key(i) | {"color": "ffffff%02x" % int(round(float(a[i, 0]) * 255))} for i in rdp(times, a, 0.5 / 255)]
        slots[o.name] = st
    return bones, slots


def impact(times, samples, setup, bone):
    """When `bone` first comes back down to its rest height after starting in the air (0 if it starts down)."""
    lift = np.array([s[bone][1] for s in samples]) - setup[bone][1]
    if lift[0] > 0.5:
        down = np.nonzero(lift <= 0.5)[0]
        return float(times[down[0]]) if len(down) else 0.0
    return 0.0


def write_skeleton(path, span, bones_json, slots_json, skin, animations, events=()):
    """The skeleton's json; its bounds are the still's square (span source px round the root), so the game sizes it
    exactly like the still."""
    data = {
        "skeleton": {"spine": SPINE_VERSION, "x": -span / 2, "y": -span / 2, "width": span, "height": span,
                     "fps": 60, "images": "./images/", "audio": ""},
        "bones": bones_json,
        "slots": slots_json,
        "skins": [{"name": "default", "attachments": skin}],
        "events": {e: {} for e in events},
        "animations": animations,
    }
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="\n") as fh:
        json.dump(data, fh, separators=(",", ":"))


def skyline_pack(items, page_w):
    """Places [(name, picture)] in that order on a page page_w wide (skyline packing): {name: (x, y, w, h)}, page
    height (a power of two)."""
    skyline, placed = [[0, 0, page_w]], {}
    for rname, im in items:
        h, w = im.shape[:2]
        W_, H_ = w + PAD, h + PAD
        best = None
        for sx, _, _ in skyline:
            if sx + W_ > page_w:
                continue
            top = max(sy for (x0, sy, sw) in skyline if x0 < sx + W_ and x0 + sw > sx)
            if best is None or (top, sx) < best:
                best = (top, sx)
        top, sx = best
        placed[rname] = (sx + PAD, top + PAD, w, h)
        new = []
        for x0, sy, sw in skyline:
            if x0 + sw <= sx or x0 >= sx + W_:
                new.append([x0, sy, sw])
                continue
            if x0 < sx:
                new.append([x0, sy, sx - x0])
            if x0 + sw > sx + W_:
                new.append([sx + W_, sy, x0 + sw - (sx + W_)])
        new.append([sx, top + H_, W_])
        skyline = sorted(new)
    return placed, 1 << math.ceil(math.log2(max(y + h + PAD for (x, y, w, h) in placed.values())))


def write_atlas(regions, out_dir, name, page_w=PAGE_W):
    """One mipmapped atlas page, page_w wide, out_dir/name.webp + .atlas, of the pictures {atlas name: float RGBA}: skyline
    packing, tallest first; a few pictures (up to 6) are also tried in every other order, for a lower page."""
    items = sorted(regions.items(), key=lambda r_: (-r_[1].shape[0], r_[0]))
    placed, page_h = skyline_pack(items, page_w)
    if len(items) <= 6:
        for order in itertools.permutations(items):
            p, ph = skyline_pack(list(order), page_w)
            if ph < page_h:
                placed, page_h = p, ph
    page = np.zeros((page_h, page_w, 4), np.float32)
    for rname, (x, y, w, h) in placed.items():
        page[y:y + h, x:x + w] = regions[rname]
    page = np.clip(np.round(page * 255), 0, 255).astype(np.uint8)
    os.makedirs(out_dir, exist_ok=True)
    webp = os.path.join(out_dir, name + ".webp")
    spec = oiio.ImageSpec(page_w, page_h, 4, oiio.UINT8)
    spec.attribute("oiio:UnassociatedAlpha", 1)
    spec.attribute("compression", "webp:%d" % QUALITY)
    out = oiio.ImageOutput.create(webp)
    out.open(webp, spec)
    out.write_image(np.ascontiguousarray(page))
    out.close()
    with open(os.path.join(out_dir, name + ".atlas"), "w", newline="\n") as fh:
        fh.write("%s.webp\n\tsize: %d, %d\n\tfilter: MipMapLinearLinear, Linear\n" % (name, page_w, page_h))
        for rname in sorted(placed):
            fh.write("%s\n\tbounds: %d, %d, %d, %d\n" % ((rname,) + placed[rname]))
    print("atlas %dx%d, %d pictures, %s %d KB (%.1f MB on the graphics card with its mipmaps)" % (
        page_w, page_h, len(placed), os.path.basename(webp), os.path.getsize(webp) // 1024, page_w * page_h * 16 / 3 / 1e6))


# ---------------------------------------------------------------- the adaptive mesh (see the top)
def grid_of(o, iw, ih):
    """Blender's grid: its vertex indices by (row from the top, column), and where its rows and columns are in the
    picture (px). The mesh must lie on the picture at 1 px = 1 / PPU in its own space, its corner at the origin (the
    object may be moved and scaled: positions() places it)."""
    me = o.data
    uv = np.zeros((len(me.loops), 2)); vid = np.zeros(len(me.loops), int)
    me.uv_layers.active.data.foreach_get("uv", uv.ravel()); me.loops.foreach_get("vertex_index", vid)
    vuv = np.zeros((len(me.vertices), 2)); vuv[vid] = uv
    gu, gv = np.unique(np.round(vuv[:, 0], 5)), np.unique(np.round(vuv[:, 1], 5))
    assert len(gu) * len(gv) == len(me.vertices), "%s is not a regular grid" % o.name
    iu, iv = np.searchsorted(gu, np.round(vuv[:, 0], 5)), np.searchsorted(gv, np.round(vuv[:, 1], 5))
    grid = np.full((len(gv), len(gu)), -1)
    grid[len(gv) - 1 - iv, iu] = np.arange(len(vuv))
    assert (grid >= 0).all()
    X, Y = gu * iw, (1 - gv[::-1]) * ih
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    assert np.allclose(co[grid, 0] * PPU, X[None, :], atol=0.01) and np.allclose(ih - co[grid, 2] * PPU, Y[:, None], atol=0.01), \
        "%s is not on its picture at 1 px = 1 / PPU" % o.name
    return grid, X, Y


def positions(r, o):
    """Blender's place for every point of the mesh at every frame, in Spine's px: (frames, points, 2)."""
    out = []
    for f in range(r.f0, r.f1 + 1):
        r.sc.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        ev = o.evaluated_get(dg).to_mesh()
        co = np.empty(len(ev.vertices) * 3); ev.vertices.foreach_get("co", co)
        o.evaluated_get(dg).to_mesh_clear()
        co = co.reshape(-1, 3)
        M = np.array(o.matrix_world)
        if not np.array_equal(M, np.eye(4)):                                 # (a moved object, e.g. on a scaled rig)
            co = co @ M[:3, :3].T + M[:3, 3]
        out.append(np.column_stack([(co[:, 0] - r.OX) * PPU, (co[:, 2] - r.OZ) * PPU]))
    return np.array(out)


def crop_of(img, X, Y, margin):
    """The grid lines round the picture (alpha > 0) plus margin px: (first row, last row, first column, last column)."""
    ys, xs = np.where(img[..., 3] > 0)
    j0 = max(0, int(np.searchsorted(Y, ys.min() - margin, side="right")) - 1)
    j1 = min(len(Y) - 1, int(np.searchsorted(Y, ys.max() + 1 + margin, side="left")))
    i0 = max(0, int(np.searchsorted(X, xs.min() - margin, side="right")) - 1)
    i1 = min(len(X) - 1, int(np.searchsorted(X, xs.max() + 1 + margin, side="left")))
    return j0, j1, i0, i1


def showing_cells(region, X, Y, box, px0, py0):
    """Which grid cells (rows x columns of the crop) have any picture in the shrunk region within REACH atlas px."""
    j0, j1, i0, i1 = box
    rh, rw = region.shape[:2]
    sx = rw / (math.ceil(X[i1]) - math.floor(X[i0]))                        # region px per source px
    sy = rh / (math.ceil(Y[j1]) - math.floor(Y[j0]))
    seen = np.zeros((rh + 1, rw + 1), np.int64)
    seen[1:, 1:] = np.cumsum(np.cumsum(region[..., 3] > 0.5 / 255, axis=0), axis=1)
    out = np.zeros((j1 - j0, i1 - i0), bool)
    for j in range(j0, j1):
        ya = max(0, int(math.floor((Y[j] - py0) * sy - REACH))); yb = min(rh, int(math.ceil((Y[j + 1] - py0) * sy + REACH)))
        for i in range(i0, i1):
            xa = max(0, int(math.floor((X[i] - px0) * sx - REACH))); xb = min(rw, int(math.ceil((X[i + 1] - px0) * sx + REACH)))
            out[j - j0, i - i0] = seen[yb, xb] - seen[ya, xb] - seen[yb, xa] + seen[ya, xa] > 0
    return out


def quadtree_mesh(P, box, show):
    """The adaptive mesh over the crop's grid (see the top): its points as (row, column) grid places, its triangles
    as indices into them, and the worst error (source px) of a showing point at any frame, and its cell count."""
    j0, j1, i0, i1 = box
    ny, nx = j1 - j0 + 1, i1 - i0 + 1
    Pc = P[:, j0:j1 + 1, i0:i1 + 1]                                         # (frames, rows, columns, 2)
    rel = np.zeros((ny, nx), bool)                                           # showing points: corners of showing cells
    for dj in (0, 1):
        for di in (0, 1):
            rel[dj:ny - 1 + dj, di:nx - 1 + di] |= show
    sat = np.zeros((ny, nx), np.int64)
    sat[1:, 1:] = np.cumsum(np.cumsum(show, axis=0), axis=1)
    shows = lambda c: sat[c[1], c[3]] - sat[c[0], c[3]] - sat[c[1], c[2]] + sat[c[0], c[2]] > 0

    def two_triangle_error(c):
        a0, a1, b0, b1 = c
        js, is_ = np.mgrid[a0:a1 + 1, b0:b1 + 1]
        m = rel[a0:a1 + 1, b0:b1 + 1]
        if not m.any():
            return 0.0
        fu = ((is_ - b0) / (b1 - b0))[m]
        fv = ((js - a0) / (a1 - a0))[m]
        A, B, C, D = Pc[:, a0, b0], Pc[:, a0, b1], Pc[:, a1, b1], Pc[:, a1, b0]
        up = (fu >= fv)[None, :, None]
        fu, fv = fu[None, :, None], fv[None, :, None]
        q = np.where(up, A[:, None] + (B - A)[:, None] * fu + (C - B)[:, None] * fv,
                     A[:, None] + (C - D)[:, None] * fu + (D - A)[:, None] * fv)
        return float(np.hypot(*(q - Pc[:, a0:a1 + 1, b0:b1 + 1][:, m]).transpose(2, 0, 1)).max())

    def children(c):
        a0, a1, b0, b1 = c
        rows = [(a0, (a0 + a1) // 2), ((a0 + a1) // 2, a1)] if a1 - a0 >= 2 else [(a0, a1)]
        cols = [(b0, (b0 + b1) // 2), ((b0 + b1) // 2, b1)] if b1 - b0 >= 2 else [(b0, b1)]
        return [(r0, r1, c0, c1) for r0, r1 in rows for c0, c1 in cols]

    unit = lambda c: c[1] - c[0] <= 1 and c[3] - c[2] <= 1
    todo = [(a, min(a + ROOT, ny - 1), b, min(b + ROOT, nx - 1)) for a in range(0, ny - 1, ROOT) for b in range(0, nx - 1, ROOT)]
    leaves = []
    while True:
        while todo:
            c = todo.pop()
            if not shows(c):
                continue
            if unit(c) or two_triangle_error(c) <= TOL:
                leaves.append(c)
            else:
                todo += children(c)
        # triangulate: each leaf is a fan over its corners and the smaller neighbours' corners on its edges
        corners = {(a, b) for c in leaves for a in c[:2] for b in c[2:]}
        points, tris, too_far, worst = set(), [], [], 0.0
        fans = []
        for c in leaves:
            a0, a1, b0, b1 = c
            edges = [[(a0, b) for b in range(b0, b1)], [(a, b1) for a in range(a0, a1)],
                     [(a1, b) for b in range(b1, b0, -1)], [(a, b0) for a in range(a1, a0, -1)]]
            edges = [[p for p in e if p in corners] for e in edges]           # each starts at a corner: a, b, c, d
            hanging = [len(e) > 1 for e in edges]
            ring = [p for e in edges for p in e]
            # the apex: a corner neither of whose edges has extra points (no sliver triangles), else the middle
            # point if it is one of Blender's, else the first corner
            k = next((k for k in range(4) if not hanging[k] and not hanging[k - 1]), None)
            if k is not None:
                start = ring.index(edges[k][0])
                ring = ring[start:] + ring[:start]
                fan = [(ring[0], ring[n], ring[n + 1]) for n in range(1, len(ring) - 1)]
            elif (a1 - a0) % 2 == 0 and (b1 - b0) % 2 == 0:
                mid = ((a0 + a1) // 2, (b0 + b1) // 2)
                fan = [(mid, ring[n], ring[(n + 1) % len(ring)]) for n in range(len(ring))]
            else:
                fan = [(ring[0], ring[n], ring[n + 1]) for n in range(1, len(ring) - 1)]
            # check it: every showing point in the leaf, from the fan triangle it lies in
            js, is_ = np.mgrid[a0:a1 + 1, b0:b1 + 1]
            m = rel[a0:a1 + 1, b0:b1 + 1]
            err = 0.0
            if m.any():
                pts = np.column_stack([js[m], is_[m]]).astype(float)
                got = np.zeros((P.shape[0], len(pts), 2)); done = np.zeros(len(pts), bool)
                for t in fan:
                    T = np.array(t, float)
                    M = np.array([T[1] - T[0], T[2] - T[0]]).T
                    if abs(np.linalg.det(M)) < 1e-9:
                        continue
                    l1, l2 = np.linalg.solve(M, (pts - T[0]).T)
                    inside = (l1 >= -1e-9) & (l2 >= -1e-9) & (l1 + l2 <= 1 + 1e-9) & ~done
                    if inside.any():
                        V = [Pc[:, p[0], p[1]] for p in t]
                        got[:, inside] = V[0][:, None] + (V[1] - V[0])[:, None] * l1[inside][None, :, None] \
                            + (V[2] - V[0])[:, None] * l2[inside][None, :, None]
                        done |= inside
                assert done.all(), "a point outside its cell's fan"
                err = float(np.hypot(*(got - Pc[:, js[m], is_[m]]).transpose(2, 0, 1)).max())
            worst = max(worst, err)
            if err > TOL and not unit(c):
                too_far.append(c)
            fans.append(fan)
        if not too_far:
            break
        bad = set(too_far)                                                  # split those and triangulate again
        leaves = [c for c in leaves if c not in bad]
        todo = [ch for c in too_far for ch in children(c)]
    for fan in fans:
        for t in fan:
            points.update(t)
    order = sorted(points)
    idx = {p: n for n, p in enumerate(order)}
    tris = [idx[p] for fan in fans for t in fan for p in t]
    return [(a + j0, b + i0) for a, b in order], tris, worst, len(leaves)
