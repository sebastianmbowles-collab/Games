# Builds the Dreamland 3D models in Blender and saves them as one GLB file.
# Run it with Blender's Python:  python3 tools/dreamland_models.py out.glb
# (pip install bpy gives you Blender as a Python module.)
#
# Positions below are written in game units the way three.js sees them:
# P(x, up, forward). Characters face forward (+forward).
import sys, math
import bpy

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'dreamland_models.glb'

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def P(x, y, z):  # game (x, up, forward) -> Blender (x, -forward, up)
    return (x, -z, y)

MATS = {}
def M(name, rgb):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*[((c / 255) ** 2.2) for c in rgb], 1)
    b.inputs['Roughness'].default_value = .5
    MATS[name] = m
    return m

def finish(o, mat, parent, smooth=True, bevel=0, seg=3):
    o.data.materials.append(mat)
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = seg
        mod.limit_method = 'ANGLE'
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    if parent: o.parent = parent
    return o

def active():
    return bpy.context.active_object

def box(size, pos, mat, parent=None, bevel=.04, rot=(0, 0, 0)):
    w, h, d = size
    bpy.ops.mesh.primitive_cube_add(size=1, location=P(*pos))
    o = active(); o.scale = (w, d, h); o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, mat, parent, bevel=bevel)

def ball(r, pos, mat, parent=None, scale=(1, 1, 1), seg=None):
    seg = seg or (10 if r < .1 else 16)  # small bumps don't need many sides
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=seg, ring_count=seg // 2, location=P(*pos))
    o = active(); sx, sy, sz = scale; o.scale = (sx, sz, sy)
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, mat, parent)

def cyl(r, depth, pos, mat, parent=None, rot=(0, 0, 0), verts=16, r2=None, bevel=0):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=verts, location=P(*pos), rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, vertices=verts, location=P(*pos), rotation=rot)
    o = active()
    finish(o, mat, parent, bevel=bevel, seg=2)
    if not bevel:  # keep the flat caps from looking melted
        o.data.polygons.foreach_set('use_smooth', [len(p.vertices) == 4 for p in o.data.polygons])
    return o

def torus(R, r, pos, mat, parent=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=20, minor_segments=8, location=P(*pos), rotation=rot)
    return finish(active(), mat, parent)

def empty(name, pos=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, None); o.location = P(*pos)
    scene.collection.objects.link(o)
    if parent: o.parent = parent
    return o

def join(objs, name, parent=None, origin=None):
    """Glue several pieces into one mesh (fewer pieces = faster game)."""
    for o in objs:
        bpy.context.view_layer.objects.active = o
        for mod in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    world = [o.matrix_world.copy() for o in objs]
    for o, mw in zip(objs, world): o.parent = None; o.matrix_world = mw
    if len(objs) > 1: bpy.ops.object.join()
    o = active(); o.name = name; o.data.name = name
    if origin is not None:
        scene.cursor.location = P(*origin)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    if parent:
        mw = o.matrix_world.copy(); o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted(); o.matrix_world = mw
    return o

def star5(r, depth, pos, mat, rotx=0):
    """A puffy 5-point star."""
    import bmesh
    me = bpy.data.meshes.new('star'); bm = bmesh.new()
    top = bm.verts.new((0, 0, depth / 2)); bot = bm.verts.new((0, 0, -depth / 2))
    ring = []
    for i in range(10):
        a = i * math.pi / 5 + math.pi / 2; rr = r if i % 2 == 0 else r * .45
        ring.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, 0)))
    for i in range(10):
        a, b = ring[i], ring[(i + 1) % 10]
        bm.faces.new((top, a, b)); bm.faces.new((bot, b, a))
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('star', me); scene.collection.objects.link(o)
    o.location = P(*pos); o.rotation_euler = (math.pi / 2 + rotx, 0, 0)
    o.data.materials.append(mat)
    return o

# ---------------- colours ----------------
PJ = M('pj', (143, 200, 255)); PJ2 = M('pj2', (111, 168, 239)); SKIN = M('skin', (255, 210, 176))
HAIR = M('hair', (90, 58, 34)); EYE = M('eye', (42, 20, 80)); STAR = M('star', (255, 242, 168))
CHEEK = M('cheek', (255, 150, 190)); WHITE = M('white', (241, 236, 255)); LAV = M('lav', (185, 166, 255))
VISOR = M('visor', (95, 246, 255)); HEART = M('heart', (255, 63, 176)); TIP = M('tip', (255, 111, 200))
DARK = M('dark', (70, 50, 120)); SHELL = M('shell', (201, 166, 255)); PINK = M('pink', (255, 154, 213))
CREAM = M('cream', (255, 240, 251)); BEYE = M('beye', (95, 246, 255)); STING = M('sting', (255, 63, 176))
GOLD = M('gold', (255, 211, 107)); GLOVE = M('glove', (176, 127, 255)); CUFF = M('cuff', (127, 240, 216))
GEM = M('gem', (255, 255, 255)); STEM = M('stem', (127, 224, 150)); PETAL = M('petal', (255, 255, 255))
BEAR = M('bear', (215, 164, 107)); BEAR2 = M('bear2', (192, 138, 82)); ROCKET = M('rocket', (255, 255, 255))
NOSE = M('nose', (255, 95, 168)); WIN = M('win', (159, 232, 255)); CRYSTAL = M('crystal', (255, 255, 255))

# ---------------- Sebastian in his starry pajamas ----------------
def sebastian():
    root = empty('Sebastian')
    parts = []
    for s in (-1, 1):
        parts.append(cyl(.11, .5, (s * .13, .33, 0), PJ2, bevel=.04))                 # pajama legs
        parts.append(ball(.13, (s * .13, .07, .05), PJ, scale=(1, .6, 1.5)))         # fluffy slippers
        parts.append(ball(.1, (s * .38, 1.1, 0), PJ, scale=(1, 1, 1)))               # shoulders
        a = cyl(.085, .48, (s * .41, .86, 0), PJ, rot=(0, s * -.12, 0), bevel=.03); parts.append(a)
        parts.append(ball(.085, (s * .44, .58, 0), SKIN))                             # hands
    parts.append(box((.6, .62, .34), (0, .9, 0), PJ, bevel=.12))                      # tummy
    parts.append(cyl(.1, .08, (0, 1.24, 0), SKIN))                                    # neck
    for i, (x, y) in enumerate([(-.15, .8), (.12, 1.0), (.04, .7), (-.08, 1.05)]):
        parts.append(star5(.06, .03, (x, y, .17), STAR))                              # pajama stars
    parts.append(ball(.25, (0, 1.48, 0), SKIN, scale=(1, .96, .95), seg=28))         # head
    for s in (-1, 1):
        parts.append(ball(.06, (s * .25, 1.47, 0), SKIN, scale=(.6, 1, 1)))          # ears
        parts.append(ball(.045, (s * .14, 1.4, .2), CHEEK, scale=(1, .6, .4)))      # rosy cheeks
    # messy hair made of bumps
    for (x, y, z, r) in [(0, 1.66, -.02, .22), (-.14, 1.63, .06, .12), (.14, 1.64, .07, .12), (0, 1.68, .12, .12),
                         (-.18, 1.55, -.1, .12), (.18, 1.55, -.1, .12), (0, 1.5, -.16, .2), (.06, 1.75, .02, .08)]:
        parts.append(ball(r, (x, y, z), HAIR, scale=(1, .8, 1)))
    join(parts, 'SebastianBody', root)
    eyes = [ball(.035, (s * .09, 1.5, .225), EYE, scale=(1, 1.4, .5)) for s in (-1, 1)]
    join(eyes, 'Eyes', root, origin=(0, 1.5, .225))
    return root

# ---------------- the glitch robot ----------------
def robot():
    root = empty('Robot')
    w, l = [], []
    w.append(box((.9, .82, .62), (0, 1.0, 0), WHITE, bevel=.16))                       # body
    l.append(torus(.47, .06, (0, .64, 0), LAV, rot=(0, 0, 0)))                         # belt
    l[-1].scale = (1, .72, 1)
    l.append(torus(.2, .035, (0, 1.06, .31), LAV, rot=(math.pi / 2, 0, 0)))            # heart window
    for s in (-1, 1):
        side = 'L' if s < 0 else 'R'
        # legs and arms are their own pieces, turning at the hip and shoulder, so they can swing
        join([cyl(.12, .45, (s * .22, .32, 0), LAV, bevel=.04),                      # leg
              box((.28, .14, .38), (s * .22, .07, .05), WHITE, bevel=.06)],           # foot
             'Leg' + side, root, origin=(s * .22, .55, 0))
        l.append(ball(.15, (s * .55, 1.25, 0), LAV))                                  # shoulders
        join([cyl(.1, .5, (s * .6, .95, 0), WHITE, bevel=.04),                       # arm
              ball(.12, (s * .6, .66, 0), LAV, scale=(1, 1, 1.2))],                   # hand
             'Arm' + side, root, origin=(s * .6, 1.22, 0))
        l.append(cyl(.09, .1, (s * .41, 1.75, 0), LAV, rot=(0, math.pi / 2, 0)))       # ear bolts
    w.append(box((.78, .56, .62), (0, 1.75, 0), WHITE, bevel=.18))                     # head
    l.append(cyl(.025, .35, (0, 2.18, 0), LAV))                                        # antenna
    join(w, 'RobotWhite', root); join(l, 'RobotLav', root)
    v = box((.6, .22, .08), (0, 1.77, .3), VISOR, bevel=.08); join([v], 'Visor', root)
    t = ball(.08, (0, 2.4, 0), TIP); join([t], 'Tip', root)
    # a puffy heart
    h = [ball(.1, (-.07, 1.11, .33), HEART), ball(.1, (.07, 1.11, .33), HEART),
         cyl(.14, .16, (0, 1.0, .33), HEART, rot=(math.pi, 0, 0), r2=0, verts=16)]
    h[2].scale = (1, .55, 1)
    join(h, 'Heart', root, origin=(0, 1.08, .33))
    return root

# ---------------- the Pastel Scorpion ----------------
def scorpion():
    root = empty('Scorpion')
    sh, pk, cr, ey = [], [], [], []
    # shell made of overlapping plates
    for i in range(4):
        z = 1.0 - i * .75
        sh.append(ball(1.3 - i * .08, (0, 1.1 + i * .02, z - .4), SHELL, scale=(1.35, .55, .62)))
        pk.append(torus(1.1 - i * .08, .07, (0, 1.12, z - .4), PINK))
        pk[-1].scale = (1.4, .62, 1)
    sh.append(ball(.8, (0, 1.15, 2.1), SHELL, scale=(1.2, .7, 1)))                     # head
    for s in (-1, 1):
        ey.append(ball(.13, (s * .32, 1.45, 2.72), BEYE))
        cr.append(cyl(.2, 1.4, (s * 1.35, 1.0, 2.3), CREAM, rot=(math.pi / 2, 0, -s * .4), bevel=.05))  # arms
        cr.append(ball(.26, (s * 1.1, 1.0, 1.75), CREAM))
        # pincers: a big round palm and two curved fingers
        pk.append(ball(.45, (s * 1.7, 1.0, 3.2), PINK, scale=(.8, .7, 1.2)))
        for f in (-1, 1):
            c = cyl(.17, .8, (s * 1.7 + f * .17, 1.0, 3.85), PINK, rot=(math.pi / 2, 0, f * .25), r2=.02, verts=12)
            pk.append(c)
        for i in range(3):  # legs: upper and lower
            z = -.6 + i * .8
            cr.append(cyl(.1, .9, (s * 1.55, .85, z), CREAM, rot=(0, s * 1.0, 0), bevel=.03))
            cr.append(ball(.13, (s * 1.95, 1.1, z), PINK))
            cr.append(cyl(.09, .9, (s * 2.15, .55, z), CREAM, rot=(0, -s * .45, 0), r2=.03, verts=12))
    join(sh, 'ScorpShell', root); join(pk, 'ScorpPink', root); join(cr, 'ScorpCream', root); join(ey, 'ScorpEyes', root)
    # one tail bump (the game chains five of them) and the stinger
    seg = [ball(.5, (0, 0, 0), SHELL, scale=(1, .9, 1)), torus(.42, .07, (0, 0, 0), PINK, rot=(math.pi / 2, 0, 0))]
    join(seg, 'TailSeg', origin=(0, 0, 0))
    st = [cyl(.25, .8, (0, 0, 0), STING, r2=0, verts=16), ball(.26, (0, -.35, 0), STING)]
    join(st, 'Sting', origin=(0, 0, 0))
    return root

# ---------------- pickups ----------------
def key():
    p = [torus(.24, .07, (0, .35, 0), GOLD, rot=(math.pi / 2, 0, 0)),
         ball(.07, (0, .35, 0), GOLD), cyl(.055, .62, (0, -.02, 0), GOLD, bevel=.02),
         box((.2, .09, .07), (.1, -.24, 0), GOLD, bevel=.025), box((.14, .09, .07), (.08, -.08, 0), GOLD, bevel=.025),
         ball(.07, (0, .1, 0), GOLD, scale=(1, .5, 1))]
    for i in range(6):
        a = i * math.pi / 3
        p.append(ball(.05, (math.cos(a) * .31, .35 + math.sin(a) * .31, 0), GOLD))
    join(p, 'Key', origin=(0, 0, 0))

def gem():
    # a cut gem: a flat top, a crown and a pointy bottom
    import bmesh
    me = bpy.data.meshes.new('Gem'); bm = bmesh.new(); n = 8
    top = [bm.verts.new((math.cos(i * 2 * math.pi / n) * .16, math.sin(i * 2 * math.pi / n) * .16, .16)) for i in range(n)]
    mid = [bm.verts.new((math.cos((i + .5) * 2 * math.pi / n) * .3, math.sin((i + .5) * 2 * math.pi / n) * .3, .04)) for i in range(n)]
    tip = bm.verts.new((0, 0, -.3))
    bm.faces.new(top)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((top[i], mid[i], top[j])); bm.faces.new((mid[i], mid[j], top[j]))
        bm.faces.new((mid[i], tip, mid[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('Gem', me); scene.collection.objects.link(o); o.data.materials.append(GEM)

def gloves():
    root = empty('Gloves')
    g, c = [], []
    for s in (-1, 1):
        g.append(ball(.17, (s * .24, .02, 0), GLOVE, scale=(1, 1.05, .85)))                 # puffy palm
        g.append(ball(.07, (s * .24 + s * .15, .06, .05), GLOVE, scale=(1, 1.4, 1)))        # thumb
        for i in range(4):
            g.append(ball(.05, (s * .24 - .1 + i * .066, .17, .06), GLOVE))                # knuckles
        c.append(torus(.13, .05, (s * .24, -.17, 0), CUFF))
    join(g, 'GlovePuff', root); join(c, 'GloveCuff', root)

def fist():
    # first-person fist: sleeve goes back toward the camera (+forward)
    root = empty('Fist')
    sk = [ball(.1, (0, 0, 0), SKIN, scale=(1, .9, 1.05))]
    for i in range(4): sk.append(ball(.038, (-.06 + i * .04, .045, -.08), SKIN, scale=(1, 1, 1.2)))
    sk.append(ball(.04, (-.09, -.02, -.03), SKIN, scale=(1, 1, 1.6)))
    join(sk, 'FistSkin', root)
    sl = [cyl(.09, .4, (0, 0, .28), PJ, rot=(math.pi / 2, 0, 0), bevel=.03), torus(.09, .03, (0, 0, .1), PJ2, rot=(math.pi / 2, 0, 0))]
    join(sl, 'FistSleeve', root)

def flower():
    s = [cyl(.025, .55, (0, .27, 0), STEM, verts=5), ball(.09, (.08, .2, 0), STEM, scale=(1.4, .3, .6), seg=6)]
    join(s, 'FlowerStem', origin=(0, 0, 0))
    # kept very simple: there are hundreds of these in the meadow
    h = [ball(.06, (0, .58, 0), PETAL, seg=6)]
    for i in range(5):
        a = i * 2 * math.pi / 5
        h.append(ball(.07, (math.cos(a) * .1, .58, math.sin(a) * .1), PETAL, scale=(1.3, .35, 1), seg=6))
    join(h, 'FlowerHead', origin=(0, 0, 0))

def crystal():
    p = [cyl(.5, 1, (0, .5, 0), CRYSTAL, verts=6, r2=.45), cyl(.45, .35, (0, 1.17, 0), CRYSTAL, verts=6, r2=0),
         cyl(.25, .55, (.45, .25, .1), CRYSTAL, verts=6, rot=(0, -.5, 0), r2=.22),
         cyl(.22, .2, (.58, .6, .1), CRYSTAL, verts=6, rot=(0, -.5, 0), r2=0)]
    for o in p: o.data.polygons.foreach_set('use_smooth', [False] * len(o.data.polygons))
    join(p, 'Crystal', origin=(0, 0, 0))

def teddy():
    root = empty('Teddy')
    b = [ball(.26, (0, 0, 0), BEAR, scale=(1, 1.1, .9)), ball(.21, (0, .38, 0), BEAR)]
    for s in (-1, 1):
        b += [ball(.08, (s * .15, .55, 0), BEAR), ball(.09, (s * .26, .06, .05), BEAR, scale=(1, 1.3, 1)),
              ball(.1, (s * .13, -.22, .08), BEAR, scale=(1, 1, 1.3))]
    join(b, 'TeddyFur', root)
    d = [ball(.09, (0, .34, .17), BEAR2, scale=(1.1, .8, .7)), ball(.035, (0, .37, .24), EYE)]
    for s in (-1, 1): d += [ball(.04, (s * .15, .55, .05), BEAR2), ball(.028, (s * .08, .44, .18), EYE)]
    join(d, 'TeddyFace', root)

def rocket():
    root = empty('Rocket')
    join([cyl(.15, .6, (0, 0, 0), ROCKET, bevel=.03)], 'RocketBody', root)
    n = [cyl(.15, .32, (0, .46, 0), NOSE, r2=0)]
    for i in range(3):
        a = i * 2 * math.pi / 3
        n.append(box((.03, .22, .16), (math.cos(a) * .17, -.22, math.sin(a) * .17), NOSE, bevel=.01, rot=(0, 0, a)))
    join(n, 'RocketNose', root)
    join([cyl(.06, .03, (0, .08, .15), WIN, rot=(math.pi / 2, 0, 0))], 'RocketWindow', root)

sebastian(); robot(); scorpion(); key(); gem(); gloves(); fist(); flower(); crystal(); teddy(); rocket()

# apply any modifiers left on single pieces
for o in scene.objects:
    if o.type == 'MESH' and o.modifiers:
        bpy.context.view_layer.objects.active = o
        for mod in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True,
                          export_normals=True, export_texcoords=False, export_materials='EXPORT')
print('saved', OUT)
