"""One module of the curved lobby sofa (Lobby.B), built procedurally in Blender.

Run through scripts/build-lobby-sofa.mjs, which passes the island dimensions from
src/3d/world/hub/lobbyFurnitureLayout.ts as JSON after "--". Blender is Z-up; the module is
centred on +X around the island centre (origin) and spans +-moduleAngle/2, so after the
glTF Y-up conversion it lies along +X, symmetric in z.

Parts: seat cushion, leaning back cushion, back frame and a throw pillow. Cushions are
rounded boxes (dense near the edges) with a slight pillow bulge, bent onto the arc.
Ambient occlusion is baked into vertex colours with the floor, the dark base and both
neighbouring modules present, so creases and contact shadows read without textures.
"""
import json
import math
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

cfg = json.loads(sys.argv[sys.argv.index("--") + 1])
INNER = cfg["innerRadius"]
SEAT = cfg["seatDepth"]
BACK = cfg["backDepth"]
ANGLE = cfg["moduleAngle"]
GAP = cfg["moduleGap"]
BASE_TOP = cfg["baseTop"]
SEAT_OUTER = INNER + SEAT
OUTER = SEAT_OUTER + BACK

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def linear(hex_color):
    def channel(value):
        value /= 255
        return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4
    return tuple(channel(int(hex_color[i:i + 2], 16)) for i in (1, 3, 5)) + (1.0,)


def fabric(name, color, sheen):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes["Principled BSDF"]
    shader.inputs["Base Color"].default_value = linear(color)
    shader.inputs["Roughness"].default_value = 0.88
    shader.inputs["Sheen Weight"].default_value = sheen
    shader.inputs["Sheen Roughness"].default_value = 0.45
    return material


def rounded_box(size, radius, segments, bulge=0.0):
    """Closed box of `size` (s, t, z), edges rounded to `radius`, vertices dense near the edges."""
    half = [value / 2 for value in size]
    steps = [[math.sin(math.pi / 2 * (2 * i / n - 1)) for i in range(n + 1)] for n in segments]
    bm = bmesh.new()
    cache = {}

    def vert(i, j, k):
        if (i, j, k) not in cache:
            cache[(i, j, k)] = bm.verts.new((steps[0][i] * half[0], steps[1][j] * half[1], steps[2][k] * half[2]))
        return cache[(i, j, k)]

    nx, ny, nz = segments
    for a in range(nx):
        for b in range(ny):
            for k in (0, nz):
                bm.faces.new([vert(a, b, k), vert(a + 1, b, k), vert(a + 1, b + 1, k), vert(a, b + 1, k)])
        for c in range(nz):
            for j in (0, ny):
                bm.faces.new([vert(a, j, c), vert(a + 1, j, c), vert(a + 1, j, c + 1), vert(a, j, c + 1)])
    for b in range(ny):
        for c in range(nz):
            for i in (0, nx):
                bm.faces.new([vert(i, b, c), vert(i, b + 1, c), vert(i, b + 1, c + 1), vert(i, b, c + 1)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    core = [h - radius for h in half]
    for v in bm.verts:
        p = Vector(v.co)
        clamped = Vector([max(-c, min(c, p[axis])) for axis, c in enumerate(core)])
        offset = p - clamped
        if offset.length > 1e-9:
            p = clamped + offset.normalized() * radius
        if bulge:
            # Pillow: each face swells most at its middle.
            for axis in range(3):
                others = [o for o in range(3) if o != axis]
                weight = 1.0
                for o in others:
                    weight *= max(0.0, 1 - (p[o] / half[o]) ** 2)
                # The underside stays flat: it rests on the base.
                if abs(p[axis]) > core[axis] and not (axis == 2 and p[axis] < 0):
                    p[axis] += math.copysign(bulge * weight, p[axis])
        v.co = p
    return bm


def bend(bm, radius_center, z_center, lean=0.0):
    """Wrap local (s, t, z) onto the arc: s becomes the angle at `radius_center`, t the radius."""
    top = max(v.co.z for v in bm.verts)
    for v in bm.verts:
        s, t, z = v.co
        t += lean * (z / top if top else 0)
        angle = s / radius_center
        r = radius_center + t
        v.co = Vector((r * math.cos(angle), r * math.sin(angle), z_center + z))


def part(name, r0, r1, z0, z1, angle, radius, segments, material, bulge=0.0, lean=0.0):
    rc = (r0 + r1) / 2
    bm = rounded_box((angle * rc, r1 - r0, z1 - z0), radius, segments, bulge)
    bend(bm, rc, (z0 + z1) / 2, lean)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    if material:
        obj.data.materials.append(material)
    return obj


teal = fabric("lobby_sofa_fabric", "#29403f", 0.5)
plum = fabric("lobby_sofa_pillow", "#4a2f33", 0.6)

module = [
    part("seat", INNER + 0.02, SEAT_OUTER + 0.02, BASE_TOP, 0.45, ANGLE - 0.012, 0.07, (28, 8, 6), teal, bulge=0.018),
    part("back_cushion", SEAT_OUTER - 0.2, SEAT_OUTER, 0.43, 0.81, ANGLE - 0.012, 0.08, (28, 6, 8), teal, bulge=0.022, lean=0.05),
    part("frame", SEAT_OUTER - 0.01, OUTER, BASE_TOP, 0.84, ANGLE - 0.004, 0.05, (28, 5, 8), teal),
]

# Throw pillow leaning on the back cushion, a little off-centre.
pillow_bm = rounded_box((0.44, 0.13, 0.4), 0.05, (8, 4, 8), bulge=0.03)
pillow_mesh = bpy.data.meshes.new("pillow")
pillow_bm.to_mesh(pillow_mesh)
pillow_bm.free()
for polygon in pillow_mesh.polygons:
    polygon.use_smooth = True
pillow = bpy.data.objects.new("pillow", pillow_mesh)
scene.collection.objects.link(pillow)
pillow.data.materials.append(plum)
pillow_angle = ANGLE * 0.18
pillow.matrix_world = (
    Matrix.Translation(Vector((math.cos(pillow_angle), math.sin(pillow_angle), 0)) * (SEAT_OUTER - 0.27) + Vector((0, 0, 0.66)))
    @ Matrix.Rotation(pillow_angle - math.pi / 2, 4, "Z")
    @ Matrix.Rotation(math.radians(-16), 4, "X")
)
module.append(pillow)

# Occluders for the bake only: floor, the dark base, and both neighbouring modules.
helpers = []
floor = bpy.data.objects.new("floor", bpy.data.meshes.new("floor"))
floor_bm = bmesh.new()
bmesh.ops.create_grid(floor_bm, x_segments=1, y_segments=1, size=6)
floor_bm.to_mesh(floor.data)
floor_bm.free()
scene.collection.objects.link(floor)
helpers.append(floor)
helpers.append(part("base", INNER + 0.08, OUTER - 0.04, 0, BASE_TOP, ANGLE + GAP, 0.005, (8, 2, 1), None))
for sign in (-1, 1):
    for source in module:
        twin = source.copy()
        twin.data = source.data.copy()
        twin.matrix_world = Matrix.Rotation(sign * (ANGLE + GAP), 4, "Z") @ source.matrix_world
        scene.collection.objects.link(twin)
        helpers.append(twin)

world = bpy.data.worlds.new("bake")
scene.world = world
world.light_settings.distance = 0.4
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 96

for obj in module:
    attribute = obj.data.color_attributes.new("AO", "BYTE_COLOR", "POINT")
    obj.data.color_attributes.active_color = attribute
    obj.data.color_attributes.render_color_index = obj.data.color_attributes.active_color_index

bpy.ops.object.select_all(action="DESELECT")
for obj in module:
    obj.select_set(True)
bpy.context.view_layer.objects.active = module[0]
bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")

# Keep the deepest creases from going black under the lobby's dim fill light.
for obj in module:
    for item in obj.data.color_attributes["AO"].data:
        ao = item.color[0]
        value = 0.32 + 0.68 * ao
        item.color = (value, value, value, 1.0)

bpy.ops.wm.save_as_mainfile(filepath=cfg["blend"])

for helper in helpers:
    bpy.data.objects.remove(helper, do_unlink=True)
bpy.ops.object.select_all(action="DESELECT")
for obj in module:
    obj.select_set(True)
bpy.context.view_layer.objects.active = module[0]
bpy.ops.object.join()
module[0].name = "lobby_sofa_module"

bpy.ops.export_scene.gltf(
    filepath=cfg["glb"],
    export_format="GLB",
    use_selection=True,
    export_yup=True,
    export_apply=True,
    export_vertex_color="ACTIVE",
    export_materials="EXPORT",
    export_draco_mesh_compression_enable=False,
)
print("LOBBY_SOFA_OK", cfg["glb"])
