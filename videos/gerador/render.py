"""Ocean at sunset: Tessendorf FFT ocean (4 cascades, choppy), physically based
shading, baked atmospheric sky, camera/lens/film simulation.
usage: render.py sky.npz outdir start end step [scale]"""
import sys
import numpy as np
import cv2
import scipy.fft as sfft
from scipy.special import gammaln

cv2.setNumThreads(1)
f32 = np.float32
SKY, OUTDIR = sys.argv[1], sys.argv[2]
F0, F1, FSTEP = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
SC = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
FPS = 24
OW, OH = int(1920 * SC), int(1080 * SC)
SS = 1.5
W, H = int(OW * SS), int(OH * SS)
HFOV = np.radians(58.0)
CAM_Y = 2.3
GRAV = 9.81

# ------------------------------------------------------------------ sky
z = np.load(SKY)
sky = z["sky"]
SUN = z["sun"].astype(np.float64)
AZH = float(z["az_half"])
ESUN = float(z["esun"])
SUNT = z["sunT"].astype(np.float64)
SH, SW = sky.shape[:2]
sky_lo = cv2.resize(sky, (SW // 4, SH // 4), interpolation=cv2.INTER_AREA)
sky_lo = cv2.GaussianBlur(sky_lo, (0, 0), 2.0)
SUN_ANG = 0.00465
LSUN = ESUN * SUNT / (np.pi * SUN_ANG ** 2)


def _remap(tex, u, v, border):
    """cv2.remap that accepts long (n,1) coordinate columns"""
    if u.ndim == 2 and u.shape[1] == 1 and u.shape[0] > 4096:
        n = u.shape[0]
        rows = -(-n // 4096)
        uu = np.zeros(rows * 4096, f32)
        vv = np.zeros(rows * 4096, f32)
        uu[:n] = u[:, 0]
        vv[:n] = v[:, 0]
        r = cv2.remap(tex, uu.reshape(rows, 4096), vv.reshape(rows, 4096), cv2.INTER_LINEAR, borderMode=border)
        return r.reshape(rows * 4096, 1, -1)[:n]
    return cv2.remap(tex, u, v, cv2.INTER_LINEAR, borderMode=border)


def sky_lookup(tex, dx, dy, dz):
    h, w = tex.shape[:2]
    az = np.arctan2(dx, dz)
    el = np.arcsin(np.clip(dy, 0, 1))
    u = (az / AZH * 0.5 + 0.5) * (w - 1)
    v = np.sqrt(el / (np.pi / 2)) * (h - 1)
    return _remap(tex, u.astype(f32), v.astype(f32), cv2.BORDER_REPLICATE)


# sun visibility through clouds (average over disc)
_t = sky_lookup(sky, np.array([[SUN[0]]]), np.array([[SUN[1]]]), np.array([[SUN[2]]]))
SUN_VIS = float(_t[0, 0, 3])
HORIZON_COL = None

# ------------------------------------------------------------------ ocean
N = 512
WIND = 7.0
WDIR = np.radians(200.0)  # direction waves travel toward (from camera axes: x right, z fwd)
CASC = [  # (L, lam_max, lam_min, choppy)
    (1500.0, 1500.0, 40.0, 0.95),
    (181.0, 40.0, 5.0, 0.95),
    (23.0, 5.0, 0.62, 0.85),
    (2.9, 0.62, 0.02, 0.5),
]


def jonswap_k(k):
    fetch = 250e3
    alpha = 0.076 * (WIND ** 2 / (fetch * GRAV)) ** 0.22
    wp = 22 * (GRAV ** 2 / (WIND * fetch)) ** (1 / 3)
    w = np.sqrt(GRAV * k * (1 + (k / 370.0) ** 2))
    sig = np.where(w <= wp, 0.07, 0.09)
    r = np.exp(-((w - wp) ** 2) / (2 * sig ** 2 * wp ** 2))
    S = alpha * GRAV ** 2 / w ** 5 * np.exp(-1.25 * (wp / w) ** 4) * 3.3 ** r
    dwdk = GRAV * (1 + 3 * (k / 370.0) ** 2) / (2 * w)
    return S * dwdk, w, wp ** 2 / GRAV


class Cascade:
    def __init__(self, L, lmax, lmin, chop, seed):
        self.L, self.chop, self.lmin = L, chop, lmin
        self.lref = 0.45 * np.sqrt(lmin * lmax) if lmin > 0.05 else 0.06
        rng = np.random.default_rng(seed)
        kk = 2 * np.pi * np.fft.fftfreq(N, L / N)
        kx, kz = np.meshgrid(kk, kk)  # axis1 = x, axis0 = z
        k = np.sqrt(kx * kx + kz * kz)
        k[0, 0] = 1e-9
        Sk, w, kp = jonswap_k(k)
        th = np.arctan2(kz, kx) - (np.pi / 2 - WDIR)  # angle rel. wind (WDIR measured from +z toward +x)
        s = 1.5 + 12.0 * np.exp(-k / (5 * kp))
        norm = np.exp(gammaln(s + 1) - gammaln(s + 0.5)) / (2 * np.sqrt(np.pi))
        D = norm * np.abs(np.cos(th / 2)) ** (2 * s)
        psi = Sk * D / k
        if seed == 0:  # distant swell from another direction
            ks, ths = 2 * np.pi / 95.0, np.radians(35.0)
            sx, sz = ks * np.sin(np.pi - ths), ks * np.cos(np.pi - ths)
            psi += 0.11 ** 2 * np.exp(-((kx - sx) ** 2 + (kz - sz) ** 2) / (2 * (0.012) ** 2)) / (2 * np.pi * 0.012 ** 2)
        band = (k >= 2 * np.pi / lmax) & (k < 2 * np.pi / lmin)
        psi = np.where(band, psi, 0)
        dk = 2 * np.pi / L
        xi = (rng.standard_normal((N, N)) + 1j * rng.standard_normal((N, N))) / np.sqrt(2)
        self.h0 = (xi * np.sqrt(psi * dk * dk / 2)).astype(np.complex64) * (0.5 if seed == 0 else 1.0)
        self.h0m = np.conj(np.roll(self.h0[::-1, ::-1], (1, 1), (0, 1)))
        self.w = w.astype(f32)
        self.kx, self.kz, self.k = kx.astype(f32), kz.astype(f32), k.astype(f32)
        self.var = None

    def fields(self, t):
        e = np.exp(1j * self.w * t).astype(np.complex64)
        hk = self.h0 * np.conj(e) + self.h0m * e   # waves travel along +k
        ikx, ikz = 1j * self.kx, 1j * self.kz
        ik = 1.0 / self.k
        spec = np.stack([
            hk, -ikx * ik * hk, -ikz * ik * hk, self.kx * self.kz * ik * hk,
            ikx * hk, ikz * hk, self.kx * self.kx * ik * hk, self.kz * self.kz * ik * hk])
        out = sfft.ifft2(spec, axes=(1, 2), workers=1).real.astype(f32) * (N * N)
        c = self.chop
        out[1:4] *= c
        out[6:8] *= c
        if self.var is None:
            self.var = float((out[4] ** 2 + out[5] ** 2).mean())
            self.hrms = float(out[0].std())
        a = np.ascontiguousarray(out[0:4].transpose(1, 2, 0))  # h, Dx, Dz, Dxz
        b = np.ascontiguousarray(out[4:8].transpose(1, 2, 0))  # hx, hz, Dxx, Dzz
        return a, b


cascades = [Cascade(*c, seed=i) for i, c in enumerate(CASC)]
OFFS = [(0.0, 0.0), (13.7, 5.1), (3.3, 9.1), (0.7, 1.9)]


def samp(tex, x, zc, L):
    u = (x / L) % 1.0 * N - 0.5
    v = (zc / L) % 1.0 * N - 0.5
    return _remap(tex, u.astype(f32), v.astype(f32), cv2.BORDER_WRAP)


def sst(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ camera
_rng = np.random.default_rng(77)
_SH = [(_rng.uniform(0.15, 1.1), _rng.uniform(0, 6.28), _rng.uniform(0.5, 1.0)) for _ in range(18)]
_JT = [(_rng.uniform(2.5, 6.0), _rng.uniform(0, 6.28), _rng.uniform(0.5, 1.0)) for _ in range(9)]


def shake(t, ch):
    a = sum(am * np.sin(2 * np.pi * fr * t + ph) / (0.6 + fr) for fr, ph, am in _SH[ch * 6:ch * 6 + 6])
    b = sum(am * np.sin(2 * np.pi * fr * t + ph) for fr, ph, am in _JT[ch * 3:ch * 3 + 3])
    return a * 0.33 + b * 0.012


def camera_rays(t):
    yaw = np.radians(-3.0 + 0.22 * shake(t, 0) + 0.10 * t)
    pitch = np.radians(2.6 + 0.16 * shake(t, 1))
    roll = np.radians(0.35 + 0.22 * shake(t, 2))
    f = (W / 2) / np.tan(HFOV / 2)
    xs = (np.arange(W, dtype=np.float64) + 0.5 - W / 2)
    ys = (H / 2 - (np.arange(H, dtype=np.float64) + 0.5))
    X, Y = np.meshgrid(xs, ys)
    # slight barrel distortion like a real wide lens
    r2 = (X * X + Y * Y) / (f * f)
    X, Y = X * (1 + 0.035 * r2), Y * (1 + 0.035 * r2)
    cr, sr = np.cos(roll), np.sin(roll)
    X, Y = X * cr - Y * sr, X * sr + Y * cr
    Z = np.full_like(X, f)
    cp, sp = np.cos(pitch), np.sin(pitch)
    Y, Z = Y * cp + Z * sp, -Y * sp + Z * cp
    cy, sy = np.cos(yaw), np.sin(yaw)
    X, Z = X * cy + Z * sy, -X * sy + Z * cy
    n = np.sqrt(X * X + Y * Y + Z * Z)
    return (X / n).astype(f32), (Y / n).astype(f32), (Z / n).astype(f32)


# ------------------------------------------------------------------ frame
WATER_C = np.array([0.012, 0.050, 0.062], f32)


def render(t):
    dx, dy, dz = camera_rays(t)
    img = np.zeros((H, W, 3), f32)

    # ---- sky
    skym = dy > -0.002
    s = sky_lookup(sky, dx, np.maximum(dy, 0), dz)
    mu = dx * SUN[0] + dy * SUN[1] + dz * SUN[2]
    ang = np.arccos(np.clip(mu, -1, 1))
    rr = np.clip(ang / SUN_ANG, 0, 1)
    limb = 1 - 0.6 * (1 - np.sqrt(1 - rr * rr))
    disc = sst(1.0, 0.94, ang / SUN_ANG) * limb * np.clip(s[..., 3], 0, 1)
    img[:] = s[..., :3] + disc[..., None] * LSUN.astype(f32)

    # ---- water
    wm = dy < -1e-4
    rdx, rdy, rdz = dx[wm], dy[wm], dz[wm]
    t0 = -CAM_Y / rdy
    apix = HFOV / W
    foot = t0 * apix / np.sqrt(np.maximum(-rdy, 1e-4)) * 1.3
    texs = [c.fields(t) for c in cascades]
    wts = [(1 - sst(0.12, 0.6, foot / c.lref)).astype(f32) for c in cascades]
    sig2 = 0.0008 + sum(0.5 * (1 - w * w) * c.var for w, c in zip(wts, cascades))

    px, pz = t0 * rdx, t0 * rdz
    x0, z0 = px.copy(), pz.copy()
    for it in range(5):
        hsum = 0
        ddx = 0
        ddz = 0
        for c, (a, b), w, o in zip(cascades, texs, wts, OFFS):
            r = samp(a, (x0 + o[0])[:, None], (z0 + o[1])[:, None], c.L)
            hsum = hsum + w * r[:, 0, 0]
            ddx = ddx + w * r[:, 0, 1]
            ddz = ddz + w * r[:, 0, 2]
        tt = np.clip((hsum - CAM_Y) / rdy, 0.05, t0 * 3)
        nx0, nz0 = tt * rdx - ddx, tt * rdz - ddz
        relax = 0.75
        x0, z0 = x0 + relax * (nx0 - x0), z0 + relax * (nz0 - z0)
    hx = hz = dxx = dzz = dxz = 0
    for c, (a, b), w, o in zip(cascades, texs, wts, OFFS):
        ra = samp(a, (x0 + o[0])[:, None], (z0 + o[1])[:, None], c.L)
        rb = samp(b, (x0 + o[0])[:, None], (z0 + o[1])[:, None], c.L)
        hx = hx + w * rb[:, 0, 0]
        hz = hz + w * rb[:, 0, 1]
        dxx = dxx + w * rb[:, 0, 2]
        dzz = dzz + w * rb[:, 0, 3]
        dxz = dxz + w * ra[:, 0, 3]
    jx, jz = 1 + dxx, 1 + dzz
    nx = hz * dxz - jz * hx
    ny = jz * jx - dxz * dxz
    nz = dxz * hx - hz * jx
    ny = np.maximum(ny, 0.05)
    nn = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / nn, ny / nn, nz / nn

    sig = np.sqrt(sig2)
    ndv = -(nx * rdx + ny * rdy + nz * rdz)
    cosv = np.maximum(ndv, 0.0) + 0.9 * sig * (1 - np.clip(ndv, 0, 1))
    cosv = np.clip(cosv, 0.0, 1)
    fres = 0.02 + 0.98 * (1 - cosv) ** 5
    # reflection
    dn = rdx * nx + rdy * ny + rdz * nz
    rx, ry, rz = rdx - 2 * dn * nx, rdy - 2 * dn * ny, rdz - 2 * dn * nz
    ry = np.abs(ry) + 0.8 * sig
    rn = np.sqrt(rx * rx + ry * ry + rz * rz)
    rx, ry, rz = rx / rn, ry / rn, rz / rn
    refl = sky_lookup(sky_lo, rx[:, None], ry[:, None], rz[:, None])[:, 0, :3]
    # sun glitter (Beckmann around resolved normal, variance = unresolved slopes)
    vx, vy, vz = -rdx, -rdy, -rdz
    hxv, hyv, hzv = vx + SUN[0], vy + SUN[1], vz + SUN[2]
    hn = np.sqrt(hxv * hxv + hyv * hyv + hzv * hzv)
    hxv, hyv, hzv = hxv / hn, hyv / hn, hzv / hn
    ndh = np.clip(nx * hxv + ny * hyv + nz * hzv, 1e-3, 1)
    m2 = 2 * sig2 + 2.5e-5
    tan2 = (1 - ndh * ndh) / (ndh * ndh)
    Dm = np.exp(-np.minimum(tan2 / m2, 60)) / (np.pi * m2 * ndh ** 4)
    vdh = np.clip(vx * hxv + vy * hyv + vz * hzv, 0, 1)
    fh = 0.02 + 0.98 * (1 - vdh) ** 5
    ndl = np.clip(nx * SUN[0] + ny * SUN[1] + nz * SUN[2], 0, 1)
    gterm = np.minimum(1, np.minimum(2 * ndh * np.maximum(ndv, 0) / np.maximum(vdh, 1e-3),
                                     2 * ndh * ndl / np.maximum(vdh, 1e-3)))
    spec = fh * Dm * gterm / (4 * np.maximum(ndv, 0.03))
    esun = (ESUN * SUNT * SUN_VIS).astype(f32)
    specc = np.minimum(spec[:, None] * esun, (LSUN * SUN_VIS).astype(f32) * fh[:, None])
    # water body (upwelling light)
    amb = z["amb"].astype(f32)
    body = WATER_C * (amb * 2.2 + esun * 0.05 * (1 + 2.0 * np.clip(hsum, 0, 2)[:, None]))
    col = refl * fres[:, None] + specc + body * (1 - fres[:, None])
    # aerial perspective toward the horizon
    hor = sky_lookup(sky_lo, rdx[:, None], np.full_like(rdx, 0.004)[:, None], rdz[:, None])[:, 0, :3]
    fog = np.exp(-tt / 16000.0)[:, None]
    col = col * fog + hor * (1 - fog)
    img[wm] = col
    return img


# ------------------------------------------------------------------ lens / film
def aces(x):
    m1 = np.array([[0.59719, 0.35458, 0.04823], [0.07600, 0.90834, 0.01566], [0.02840, 0.13383, 0.83777]], f32)
    m2 = np.array([[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]], f32)
    v = x @ m1.T
    a = v * (v + 0.0245786) - 0.000090537
    b = v * (0.983729 * v + 0.4329510) + 0.238081
    return np.clip((a / b) @ m2.T, 0, 1)


def post(img, frame):
    img = cv2.resize(img, (OW, OH), interpolation=cv2.INTER_AREA)
    EXP = 0.30
    img = np.minimum(img * EXP, 220.0)
    # bloom / veiling glare
    acc = img * 0.845
    small = img
    for i, (sg, wgt) in enumerate([(1.6, 0.07), (3.0, 0.04), (3.0, 0.025), (3.0, 0.014), (3.5, 0.006)]):
        if i > 0:
            small = cv2.resize(small, (small.shape[1] // 2, small.shape[0] // 2), interpolation=cv2.INTER_AREA)
        b = cv2.GaussianBlur(small, (0, 0), sg)
        acc += wgt * cv2.resize(b, (OW, OH), interpolation=cv2.INTER_LINEAR)
    img = acc
    # chromatic aberration (lateral)
    cx, cy = OW / 2, OH / 2
    xs, ys = np.meshgrid(np.arange(OW, dtype=f32), np.arange(OH, dtype=f32))
    for ch, k in ((0, 1.0007), (2, 0.9993)):
        img[..., ch] = cv2.remap(np.ascontiguousarray(img[..., ch]), (xs - cx) / k + cx, (ys - cy) / k + cy, cv2.INTER_LINEAR,
                                 borderMode=cv2.BORDER_REPLICATE)
    # vignette
    r2 = ((xs - cx) ** 2 + (ys - cy) ** 2) / (cx * cx + cy * cy)
    img *= (1 / (1 + 0.42 * r2) ** 2)[..., None]
    out = aces(img * 1.0)
    out = np.clip(out, 0, 1) ** (1 / 2.2)
    lum0 = (out @ np.array([0.2126, 0.7152, 0.0722], f32))[..., None]
    out = np.clip(lum0 + (out - lum0) * 1.14, 0, 1)
    # mild sensor softness then grain
    out = 0.75 * out + 0.25 * cv2.GaussianBlur(out, (0, 0), 0.7)
    rng = np.random.default_rng(1000 + frame)
    g = rng.standard_normal((OH, OW)).astype(f32)
    g = 0.6 * g + 0.4 * cv2.GaussianBlur(g, (0, 0), 0.8) * 2.0
    cg = rng.standard_normal((OH // 2, OW // 2, 3)).astype(f32)
    cg = cv2.resize(cg, (OW, OH), interpolation=cv2.INTER_LINEAR)
    lum = out.mean(-1, keepdims=True)
    amp = (0.007 + 0.010 * (1 - lum)) * min(1.0, SC + 0.2)
    out = out + amp * g[..., None] + amp * 0.35 * cg
    return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)


if __name__ == "__main__":
    for c in cascades:
        c.fields(0.0)
    print("Hs=%.2f m  mss=%.4f" % (4 * np.sqrt(sum(c.hrms ** 2 for c in cascades)), sum(c.var for c in cascades)),
          [round(c.var, 4) for c in cascades], "sunvis", SUN_VIS, flush=True)
    for fr in range(F0, F1, FSTEP):
        t = fr / FPS
        # 180-degree shutter: average two sub-frames
        im = 0.5 * (render(t) + render(t + 0.25 / FPS))
        out = post(im, fr)
        cv2.imwrite("%s/f%04d.png" % (OUTDIR, fr), out[..., ::-1])
        print("frame", fr, flush=True)
