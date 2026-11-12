"""Monólito reel (9:16): a black monolith standing in a twilight sea, green
squares igniting one by one.  usage: mono.py sky.npz outdir start end step [scale]"""
import sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

_args = sys.argv[:]
SC = float(_args[6]) if len(_args) > 6 else 1.0
sys.argv = ["render.py", _args[1], _args[2], "0", "0", "1", "1.0"]
import render as R  # noqa: E402

f32 = np.float32
OUTDIR = _args[2]
F0, F1, FSTEP = int(_args[3]), int(_args[4]), int(_args[5])
FPS = 24
DUR = 13.0
OW, OH = int(1080 * SC), int(1920 * SC)
SS = 1.5
W, H = int(OW * SS), int(OH * SS)
HFOV = np.radians(36.0)
CAM_Y = 1.7
FONT = "/tmp/claude-0/-home-user-so-processo/8bfab980-9ad2-521e-b29d-4e09b83ed1c9/scratchpad/fonts/RedHatDisplay[wght].ttf"

# calmer sea
R.WIND = 4.5
R.cascades = [R.Cascade(*c, seed=i) for i, c in enumerate(R.CASC)]
for c in R.cascades:
    c.fields(0.0)
cascades = R.cascades
sst, samp, sky_lookup = R.sst, R.samp, R.sky_lookup
AMB = R.z["amb"].astype(f32)


def blue_hour(c):
    """re-grade the red single-scatter twilight to a blue-hour sky that keeps a warm horizon"""
    M = np.array([[0.26, 0.00, 0.00], [0.24, 0.80, 0.05], [0.50, 0.30, 1.30]], f32)
    cool = c @ M.T
    lum = c @ np.array([0.3, 0.6, 0.1], f32)
    warm = 0.45 * c * np.array([1.0, 0.8, 0.6], f32) + 0.55 * lum[..., None] * np.array([1.9, 0.95, 0.55], f32)
    w = sst(0.45 * LREF, 1.6 * LREF, lum)[..., None]
    return cool * (1 - w) + warm * w


LREF = float(np.percentile(R.sky[:R.sky.shape[0] // 4, :, :3] @ np.array([0.3, 0.6, 0.1], f32), 90))
R.sky[..., :3] = blue_hour(R.sky[..., :3])
R.sky_lo[..., :3] = blue_hour(R.sky_lo[..., :3])
AMB = AMB @ np.array([[0.26, 0.00, 0.00], [0.24, 0.80, 0.05], [0.50, 0.30, 1.30]], f32).T
sky, sky_lo = R.sky, R.sky_lo

# exposure from the sky itself (twilight is dark)
_lum = sky[int(sky.shape[0] * 0.25):int(sky.shape[0] * 0.5), sky.shape[1] // 3: 2 * sky.shape[1] // 3, :3].mean()
EXP = 0.085 / float(_lum)
GREEN = np.array([0.04, 1.0, 0.30], f32)
EMIT = 3.2 / EXP

# ------------------------------------------------------------------ monolith
MB_C = np.array([0.0, 0.0, 71.0])
MB_HALF = np.array([4.5, 15.125, 1.125])   # 1 : 4 : 9 above water
MB_YC = 5.125                               # y from -10 to 20.25
MB_ROT = np.radians(13.0)
_cr, _sr = np.cos(MB_ROT), np.sin(MB_ROT)
COLS, ROWS, PITCH, HALF = 3, 6, 2.75, 0.95
SQ = [((c - 1) * PITCH, 2.5 + r * PITCH) for r in range(ROWS) for c in range(COLS)]
T_ON0, T_STEP, T_BOOM = 5.6, 0.17, 9.15
_rng = np.random.default_rng(3)
_FL = _rng.uniform(0, 6.28, (len(SQ), 3))


def sq_intensity(t):
    out = np.zeros(len(SQ), f32)
    for k in range(len(SQ)):
        tk = T_ON0 + k * T_STEP
        if t < tk:
            continue
        dt = t - tk
        v = 1.0
        if 0.05 < dt < 0.10 or 0.16 < dt < 0.19:   # neon strike flicker
            v = 0.12
        v *= 0.93 + 0.07 * np.sin(31 * t + _FL[k, 0]) * np.sin(7.3 * t + _FL[k, 1])
        out[k] = v
    if t >= T_BOOM:
        out *= 1.25 + 1.6 * np.exp(-(t - T_BOOM) / 0.45) + 0.08 * np.sin(2.2 * (t - T_BOOM))
    return out


def to_local(x, y, zc):
    x, zc = x - MB_C[0], zc - MB_C[2]
    return x * _cr - zc * _sr, y - MB_YC, x * _sr + zc * _cr


def dir_local(dx, dy, dz):
    return dx * _cr - dz * _sr, dy, dx * _sr + dz * _cr


def ray_box(ox, oy, oz, dx, dy, dz):
    """returns t (inf if miss), local hit point, face axis (0 x,1 y,2 z) and sign"""
    lo = to_local(ox, oy, oz)
    ld = dir_local(dx, dy, dz)
    tn = np.full(np.shape(dx), -np.inf, f32)
    tf = np.full(np.shape(dx), np.inf, f32)
    ax = np.zeros(np.shape(dx), np.int8)
    for i in range(3):
        d = np.where(np.abs(ld[i]) < 1e-9, 1e-9, ld[i])
        t1 = (-MB_HALF[i] - lo[i]) / d
        t2 = (MB_HALF[i] - lo[i]) / d
        ta, tb = np.minimum(t1, t2), np.maximum(t1, t2)
        ax = np.where(ta > tn, i, ax)
        tn = np.maximum(tn, ta)
        tf = np.minimum(tf, tb)
    hit = (tf > tn) & (tn > 0)
    t = np.where(hit, tn, np.inf).astype(f32)
    tt = np.where(hit, tn, 0)
    hp = [lo[i] + ld[i] * tt for i in range(3)]
    return t, hp, ax, ld


def emission(hp, ax, ld, inten):
    """green squares on the camera-facing (-z local) face"""
    u, v = hp[0], hp[1] + MB_YC
    front = (ax == 2) & (ld[2] > 0)
    e = np.zeros(np.shape(u), f32)
    for (cx, cy), I in zip(SQ, inten):
        if I <= 0:
            continue
        d = np.maximum(np.abs(u - cx), np.abs(v - cy)) - HALF
        frame = np.exp(-(d + 0.12) ** 2 / (2 * 0.075 ** 2))
        fill = (d < -0.12) * 0.10
        e += I * (frame + fill).astype(f32) * (d < 0.15)
    return e * front


# ------------------------------------------------------------------ camera
def ease(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def camera(t):
    cz = 14.0 * ease(t / DUR) * 0.6 + 14.0 * 0.4 * t / DUR
    cx = 0.25 * R.shake(t * 0.5, 0)
    yaw = np.radians(0.10 * R.shake(t * 0.6, 0))
    pitch = np.radians(7.0 + 0.08 * R.shake(t * 0.6, 1) - 0.5 * ease(t / DUR))
    roll = np.radians(0.10 * R.shake(t * 0.6, 2))
    f = (W / 2) / np.tan(HFOV / 2)
    xs = (np.arange(W, dtype=np.float64) + 0.5 - W / 2)
    ys = (H / 2 - (np.arange(H, dtype=np.float64) + 0.5))
    X, Y = np.meshgrid(xs, ys)
    cr, sr = np.cos(roll), np.sin(roll)
    X, Y = X * cr - Y * sr, X * sr + Y * cr
    Z = np.full_like(X, f)
    cp, sp = np.cos(pitch), np.sin(pitch)
    Y, Z = Y * cp + Z * sp, -Y * sp + Z * cp
    cy, sy = np.cos(yaw), np.sin(yaw)
    X, Z = X * cy + Z * sy, -X * sy + Z * cy
    n = np.sqrt(X * X + Y * Y + Z * Z)
    return (cx, CAM_Y + 0.03 * R.shake(t * 0.5, 1), cz), (X / n).astype(f32), (Y / n).astype(f32), (Z / n).astype(f32)


WATER_C = np.array([0.010, 0.045, 0.060], f32)


def mono_surface(dx, dy, dz, hp, ax, ld, inten):
    """dark polished stone: fresnel sky reflection + emissive squares"""
    # world normal of hit face
    sgn = -np.sign(np.choose(ax, ld))
    nl = [np.where(ax == i, sgn, 0) for i in range(3)]
    nx, ny, nz = nl[0] * _cr + nl[2] * _sr, nl[1], -nl[0] * _sr + nl[2] * _cr
    dn = dx * nx + dy * ny + dz * nz
    rx, ry, rz = dx - 2 * dn * nx, dy - 2 * dn * ny, dz - 2 * dn * nz
    fres = 0.045 + 0.955 * (1 - np.clip(-dn, 0, 1)) ** 5
    refl = sky_lookup(sky_lo, rx[:, None], np.abs(ry)[:, None] * np.where(ry < 0, 0.4, 1.0)[:, None] + 0.01, rz[:, None])[:, 0, :3]
    refl = refl * np.where(ry < 0, 0.35, 1.0)[:, None]
    col = refl * fres[:, None] * 0.8 + AMB * 0.012
    e = emission(hp, ax, ld, inten)
    return col + e[:, None] * GREEN * EMIT


def render(t, seed):
    (cx, cyy, cz), dx, dy, dz = camera(t)
    inten = sq_intensity(t)
    rng = np.random.default_rng(seed)
    img = np.zeros((H, W, 3), f32)
    s = sky_lookup(sky, dx, np.maximum(dy, 0), dz)
    img[:] = s[..., :3]

    # ---- water
    wm = dy < -1e-4
    rdx, rdy, rdz = dx[wm], dy[wm], dz[wm]
    t0 = -cyy / rdy
    apix = HFOV / W
    foot = t0 * apix / np.sqrt(np.maximum(-rdy, 1e-4)) * 1.3
    texs = [c.fields(t) for c in cascades]
    wts = [(1 - sst(0.12, 0.6, foot / c.lref)).astype(f32) for c in cascades]
    sig2 = 0.0006 + sum(0.5 * (1 - w * w) * c.var for w, c in zip(wts, cascades))
    x0, z0 = cx + t0 * rdx, cz + t0 * rdz
    for it in range(5):
        hsum = 0
        ddx = 0
        ddz = 0
        for c, (a, b), w, o in zip(cascades, texs, wts, R.OFFS):
            r = samp(a, (x0 + o[0])[:, None], (z0 + o[1])[:, None], c.L)
            hsum = hsum + w * r[:, 0, 0]
            ddx = ddx + w * r[:, 0, 1]
            ddz = ddz + w * r[:, 0, 2]
        tt = np.clip((hsum - cyy) / rdy, 0.05, t0 * 3)
        nx0, nz0 = cx + tt * rdx - ddx, cz + tt * rdz - ddz
        x0, z0 = x0 + 0.75 * (nx0 - x0), z0 + 0.75 * (nz0 - z0)
    hx = hz = dxx = dzz = dxz = 0
    for c, (a, b), w, o in zip(cascades, texs, wts, R.OFFS):
        ra = samp(a, (x0 + o[0])[:, None], (z0 + o[1])[:, None], c.L)
        rb = samp(b, (x0 + o[0])[:, None], (z0 + o[1])[:, None], c.L)
        hx = hx + w * rb[:, 0, 0]
        hz = hz + w * rb[:, 0, 1]
        dxx = dxx + w * rb[:, 0, 2]
        dzz = dzz + w * rb[:, 0, 3]
        dxz = dxz + w * ra[:, 0, 3]
    jx, jz = 1 + dxx, 1 + dzz
    sig = np.sqrt(sig2)

    def normal(ax_, az_):
        nx = hz * dxz - jz * (hx + ax_)
        ny = np.maximum(jz * jx - dxz * dxz, 0.05)
        nz = dxz * hx - (hz + az_) * jx
        nn = np.sqrt(nx * nx + ny * ny + nz * nz)
        return nx / nn, ny / nn, nz / nn

    nx, ny, nz = normal(0, 0)
    ndv = -(nx * rdx + ny * rdy + nz * rdz)
    cosv = np.clip(np.maximum(ndv, 0.0) + 0.9 * sig * (1 - np.clip(ndv, 0, 1)), 0, 1)
    fres = 0.02 + 0.98 * (1 - cosv) ** 5
    dn = rdx * nx + rdy * ny + rdz * nz
    rx, ry, rz = rdx - 2 * dn * nx, rdy - 2 * dn * ny, rdz - 2 * dn * nz
    ry = np.abs(ry) + 0.8 * sig
    rn = np.sqrt(rx * rx + ry * ry + rz * rz)
    refl = sky_lookup(sky_lo, (rx / rn)[:, None], (ry / rn)[:, None], (rz / rn)[:, None])[:, 0, :3]

    # reflection of the monolith in the rough water (stochastic slope samples)
    px_, py_, pz_ = cx + tt * rdx, hsum, cz + tt * rdz
    near = (np.abs(px_) < 60) & (pz_ < MB_C[2] + 6)
    idx = np.nonzero(near)[0]
    K = 3
    mcol = np.zeros((idx.size, 3), f32)
    mhit = np.zeros(idx.size, f32)
    sub = lambda a: a[idx]
    for k in range(K):
        jx_ = rng.standard_normal(idx.size).astype(f32) * sig[idx]
        jz_ = rng.standard_normal(idx.size).astype(f32) * sig[idx]
        n2 = normal(0, 0)
        ax2 = hz[idx] * dxz[idx] - jz[idx] * (hx[idx] + jx_)
        ay2 = np.maximum(jz[idx] * jx[idx] - dxz[idx] ** 2, 0.05)
        az2 = dxz[idx] * hx[idx] - (hz[idx] + jz_) * jx[idx]
        an = np.sqrt(ax2 * ax2 + ay2 * ay2 + az2 * az2)
        ax2, ay2, az2 = ax2 / an, ay2 / an, az2 / an
        d2 = sub(rdx) * ax2 + sub(rdy) * ay2 + sub(rdz) * az2
        qx, qy, qz = sub(rdx) - 2 * d2 * ax2, sub(rdy) - 2 * d2 * ay2, sub(rdz) - 2 * d2 * az2
        tb, hp, axf, ld = ray_box(px_[idx], py_[idx], pz_[idx], qx, qy, qz)
        h = np.isfinite(tb) & (qy > 0)
        e = emission(hp, axf, ld, inten) * h
        mcol += e[:, None] * GREEN * EMIT + (h[:, None] * AMB * 0.02)
        mhit += h
    mcol /= K
    mhit /= K
    refl[idx] = refl[idx] * (1 - mhit[:, None]) + mcol

    body = WATER_C * (AMB * 2.2)
    col = refl * fres[:, None] + body * (1 - fres[:, None])
    hor = sky_lookup(sky_lo, rdx[:, None], np.full_like(rdx, 0.004)[:, None], rdz[:, None])[:, 0, :3]
    fog = np.exp(-tt / 16000.0)[:, None]
    col = col * fog + hor * (1 - fog)
    img[wm] = col
    depth = np.full((H, W), np.inf, f32)
    depth[wm] = tt

    # ---- monolith (primary rays)
    tb, hp, axf, ld = ray_box(cx, cyy, cz, dx, dy, dz)
    m = tb < depth
    if m.any():
        hpm = [a[m] for a in hp]
        ldm = [a[m] for a in ld]
        img[m] = mono_surface(dx[m], dy[m], dz[m], hpm, axf[m], ldm, inten)
    return img


# ------------------------------------------------------------------ titles
def _font(size, wght):
    f = ImageFont.truetype(FONT, int(size * SC))
    f.set_variation_by_axes([wght])
    return f


def text_layer(text, size, wght, tracking=0.0, dot_green=False):
    f = _font(size, wght)
    tr = tracking * size * SC
    widths = [f.getlength(ch) for ch in text]
    tw = int(sum(widths) + tr * (len(text) - 1)) + 8
    asc, desc = f.getmetrics()
    im = Image.new("RGBA", (tw + 40, asc + desc + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = 20.0
    for ch, w_ in zip(text, widths):
        colr = (60, 255, 120, 255) if (dot_green and ch == ".") else (255, 255, 255, 255)
        d.text((x, 20), ch, font=f, fill=colr)
        x += w_ + tr
    return np.asarray(im).astype(f32) / 255.0


TITLES = [
    # text, size, weight, tracking, y-centre (fraction), t_in, t_out, fade, max alpha
    (text_layer("Seu negócio é bom.", 66, 500), 0.215, 0.7, 3.0, 0.45, 0.95),
    (text_layer("Só que ninguém vê.", 66, 500), 0.215, 3.35, 5.5, 0.45, 0.95),
    (text_layer("apareça.", 168, 700, -0.02, dot_green=True), 0.205, 9.2, 99, 0.35, 1.0),
    (text_layer("MONÓLITO", 46, 600, 0.42), 0.775, 10.2, 99, 0.6, 1.0),
    (text_layer("monolitoads.com", 30, 400, 0.04), 0.812, 10.6, 99, 0.6, 0.8),
]


def titles(out, t):
    for lay, yc, tin, tout, fade, amax in TITLES:
        a = min(np.clip((t - tin) / fade, 0, 1), np.clip((tout - t) / fade, 0, 1)) * amax
        if a <= 0:
            continue
        a = a * a * (3 - 2 * a)
        h, w = lay.shape[:2]
        rise = int((1 - np.clip((t - tin) / (fade * 1.6), 0, 1)) ** 2 * 14 * SC)
        y0 = int(OH * yc - h / 2) + rise
        x0 = (OW - w) // 2
        al = lay[..., 3:4] * a
        sh = np.clip(cv2.GaussianBlur(lay[..., 3], (0, 0), 10 * SC)[..., None] * 1.6, 0, 1) * a * 0.6
        reg = out[y0:y0 + h, x0:x0 + w]
        reg[:] = reg * (1 - sh)
        reg[:] = reg * (1 - al) + lay[..., :3] * al
    return out


# ------------------------------------------------------------------ lens / film
def post(img, frame, t):
    img = cv2.resize(img, (OW, OH), interpolation=cv2.INTER_AREA)
    img = np.minimum(img * EXP, 60.0)
    acc = img * 0.80
    small = img
    for i, (sg, wgt) in enumerate([(1.6, 0.07), (3.0, 0.05), (3.0, 0.035), (3.0, 0.025), (3.5, 0.02)]):
        if i > 0:
            small = cv2.resize(small, (small.shape[1] // 2, small.shape[0] // 2), interpolation=cv2.INTER_AREA)
        b = cv2.GaussianBlur(small, (0, 0), sg)
        acc += wgt * cv2.resize(b, (OW, OH), interpolation=cv2.INTER_LINEAR)
    img = acc
    cx, cy = OW / 2, OH / 2
    xs, ys = np.meshgrid(np.arange(OW, dtype=f32), np.arange(OH, dtype=f32))
    for ch, k in ((0, 1.0006), (2, 0.9994)):
        img[..., ch] = cv2.remap(np.ascontiguousarray(img[..., ch]), (xs - cx) / k + cx, (ys - cy) / k + cy,
                                 cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    r2 = ((xs - cx) ** 2 + (ys - cy) ** 2) / (cx * cx + cy * cy)
    img *= (1 / (1 + 0.45 * r2) ** 2)[..., None]
    # cool twilight grade
    img *= np.array([0.97, 1.0, 1.04], f32)
    out = R.aces(img)
    out = np.clip(out, 0, 1) ** (1 / 2.2)
    lum0 = (out @ np.array([0.2126, 0.7152, 0.0722], f32))[..., None]
    out = np.clip(lum0 + (out - lum0) * 1.12, 0, 1)
    out = 0.75 * out + 0.25 * cv2.GaussianBlur(out, (0, 0), 0.7)
    out = titles(out, t)
    # fade from / to black
    out *= float(np.clip(t / 0.5, 0, 1) * np.clip((DUR - t) / 0.35, 0, 1))
    rng = np.random.default_rng(1000 + frame)
    g = rng.standard_normal((OH, OW)).astype(f32)
    g = 0.6 * g + 0.8 * cv2.GaussianBlur(g, (0, 0), 0.8)
    lum = out.mean(-1, keepdims=True)
    amp = (0.008 + 0.010 * (1 - lum)) * min(1.0, SC + 0.2)
    out = out + amp * g[..., None]
    return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)


if __name__ == "__main__":
    print("EXP", EXP, flush=True)
    for fr in range(F0, F1, FSTEP):
        t = fr / FPS
        im = 0.5 * (render(t, fr * 2) + render(t + 0.25 / FPS, fr * 2 + 1))
        cv2.imwrite("%s/m%04d.png" % (OUTDIR, fr), post(im, fr, t)[..., ::-1])
        print("frame", fr, flush=True)
