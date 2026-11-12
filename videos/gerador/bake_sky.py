"""Bake a physically based sunset sky (Rayleigh + Mie + ozone single scattering,
approximated multiple scattering) plus two cloud layers into an HDR panorama."""
import sys
import numpy as np
import cv2
from scipy.ndimage import uniform_filter1d, gaussian_filter

SCALE = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
OUT = sys.argv[2] if len(sys.argv) > 2 else "sky.npz"
f32 = np.float32

RE, RA = 6360.0, 6420.0
HR, HM = 8.0, 1.2
BR = np.array([5.8e-3, 13.5e-3, 33.1e-3])
BM = 0.021
BO = np.array([0.65e-3, 1.881e-3, 0.085e-3])
G = 0.76
ESUN = 20.0
SUN_EL = np.radians(float(sys.argv[3]) if len(sys.argv) > 3 else 3.6)
CL_EL = max(abs(SUN_EL), np.radians(2.5))
SUN = np.array([0.0, np.sin(SUN_EL), np.cos(SUN_EL)])
CAM_H = 0.003


def dens(h):
    return np.exp(-h / HR), np.exp(-h / HM), np.clip(1 - np.abs(h - 25.0) / 15.0, 0, None)


def depth_to_top(p, d, n=14):
    """optical depth columns (R, M, O) from points p along direction d to atmosphere top"""
    b = (p * d).sum(-1)
    r2 = (p * p).sum(-1)
    tmax = -b + np.sqrt(np.maximum(b * b - (r2 - RA * RA), 0))
    acc = [0, 0, 0]
    for i in range(n):
        t = tmax * (i + 0.5) / n
        q = p + d * t[..., None]
        h = np.sqrt((q * q).sum(-1)) - RE
        for j, x in enumerate(dens(h)):
            acc[j] = acc[j] + x * tmax / n
    return acc


def trans(tr, tm, to):
    return np.exp(-(tr[..., None] * BR + tm[..., None] * BM * 1.1 + to[..., None] * BO))


def clear_sky(A=256, E=192, NS=56):
    az = np.linspace(0, np.pi, A)
    el = (np.pi / 2) * np.linspace(0, 1, E) ** 2
    az, el = np.meshgrid(az, el)
    d = np.stack([np.cos(el) * np.sin(az), np.sin(el), np.cos(el) * np.cos(az)], -1)
    o = np.array([0, RE + CAM_H, 0.0])
    b = (o * d).sum(-1)
    tmax = -b + np.sqrt(b * b - (o @ o - RA * RA))
    mu = d @ SUN
    PR = 3 / (16 * np.pi) * (1 + mu * mu)
    PM = 3 / (8 * np.pi) * ((1 - G * G) * (1 + mu * mu)) / ((2 + G * G) * (1 + G * G - 2 * G * mu) ** 1.5)
    L = np.zeros(d.shape)
    vr = vm = vo = 0
    for i in range(NS):
        u0, u1 = i / NS, (i + 1) / NS
        t0, t1 = tmax * u0 ** 2, tmax * u1 ** 2
        t, dt = 0.5 * (t0 + t1), t1 - t0
        q = o + d * t[..., None]
        h = np.sqrt((q * q).sum(-1)) - RE
        r, m, oz = dens(h)
        vr, vm, vo = vr + r * dt * .5, vm + m * dt * .5, vo + oz * dt * .5
        sr, sm, so = depth_to_top(q, SUN)
        Tv = trans(vr, vm, vo)
        Ts = trans(sr, sm, so)
        Ts2 = trans(sr * .25, sm * .25, so * .6)  # softened, for multiple scattering
        scat = (r[..., None] * BR * PR[..., None] + m[..., None] * BM * PM[..., None])
        ms = (r[..., None] * BR + m[..., None] * BM) / (4 * np.pi) * 0.45
        L += Tv * (Ts * scat + Ts2 * ms) * dt[..., None]
        vr, vm, vo = vr + r * dt * .5, vm + m * dt * .5, vo + oz * dt * .5
    return (ESUN * L).astype(f32)


def sun_trans(h):
    p = np.array([[0, RE + h, 0.0]])
    return trans(*depth_to_top(p, SUN, 64))[0]


def spectral_noise(n, beta, seed, lo=1.0, hi=1e9, aniso=None):
    rng = np.random.default_rng(seed)
    w = rng.standard_normal((n, n)).astype(f32)
    F = np.fft.rfft2(w)
    ky = np.fft.fftfreq(n, 1 / n)[:, None]
    kx = np.fft.rfftfreq(n, 1 / n)[None, :]
    if aniso:
        ang, s = aniso
        ca, sa = np.cos(ang), np.sin(ang)
        k1, k2 = kx * ca + ky * sa, -kx * sa + ky * ca
        k = np.sqrt((k1 / s) ** 2 + (k2 * s) ** 2)
    else:
        k = np.sqrt(kx * kx + ky * ky)
    amp = np.where((k >= lo) & (k <= hi), np.maximum(k, 1e-6) ** (-beta), 0)
    x = np.fft.irfft2(F * amp, s=(n, n)).astype(f32)
    return (x - x.mean()) / x.std()


def sst(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def hg(mu, g):
    return (1 - g * g) / (4 * np.pi * (1 + g * g - 2 * g * mu) ** 1.5)


def main():
    clear = clear_sky()
    A, E = clear.shape[1], clear.shape[0]

    W, H = int(8192 * SCALE), int(3072 * SCALE)
    AZ_HALF = np.radians(75.0)
    NT = 4096 if SCALE >= 0.9 else 2048

    # ---- cloud layer A: broken altocumulus / stratocumulus ----
    tileA, hA, thA = 110.0, 3.6, 0.55
    cov = spectral_noise(NT, 2.2, 11, lo=2, hi=14)
    det = spectral_noise(NT, 1.75, 12, lo=6, hi=NT // 12)
    fine = spectral_noise(NT, 1.6, 13, lo=60, hi=NT // 10)
    rhoA = sst(0.0, 1.0, 0.75 * cov + 0.62 * det + 0.16 * fine - 0.72)
    nwin = int(thA / np.tan(CL_EL) / tileA * NT)
    # rows = +z = toward the sun ; average density on the sun-ward side of each texel
    tsA = uniform_filter1d(rhoA, size=nwin, axis=0, mode="wrap", origin=-(nwin // 2)) * (thA / np.sin(CL_EL)) * 5.0
    tsA = gaussian_filter(tsA, 2.0, mode='wrap')
    texA = np.dstack([rhoA, tsA]).astype(f32)

    # ---- cloud layer B: cirrus ----
    tileB, hB = 170.0, 9.5
    c1 = spectral_noise(NT, 1.9, 21, lo=3, hi=NT // 10, aniso=(0.5, 2.6))
    c2 = spectral_noise(NT, 2.3, 22, lo=1, hi=8)
    rhoB = sst(0.1, 2.8, 0.9 * c1 + 0.9 * c2 - 0.35) ** 1.5
    texB = rhoB.astype(f32)

    TsA, TsB = sun_trans(hA), sun_trans(hB)
    amb = clear[E // 2:, :, :].mean((0, 1))
    print("sunT sea", sun_trans(CAM_H), "A", TsA, "B", TsB, "amb", amb)

    out = np.zeros((H, W, 4), f32)
    CH = 256
    azs = np.linspace(-AZ_HALF, AZ_HALF, W, dtype=f32)[None, :]
    for y0 in range(0, H, CH):
        y1 = min(H, y0 + CH)
        v = (np.arange(y0, y1, dtype=f32) / (H - 1))[:, None]
        el = (np.pi / 2) * v * v
        el = np.maximum(el, 1e-4) + 0 * azs
        az = azs + 0 * el
        ce, se = np.cos(el), np.sin(el)
        mu = ce * np.cos(az) * SUN[2] + se * SUN[1]
        hole = sst(np.radians(1.2), np.radians(7.0), np.arccos(np.clip(mu, -1, 1)))
        base = cv2.remap(clear, (np.abs(az) / np.pi * (A - 1)).astype(f32),
                         (np.sqrt(el / (np.pi / 2)) * (E - 1)).astype(f32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        col = base.copy()
        T = np.ones_like(el)

        def layer_geo(h):
            d = np.sqrt((RE + h) ** 2 - (RE * ce) ** 2) - RE * se
            sl = np.sqrt(1 - (RE * ce / (RE + h)) ** 2)
            return d, np.maximum(sl, 0.03)

        def aerial(d, h):
            # extinction between viewer and cloud (mean density of the slant path)
            k = (BR * np.exp(-0.5 * h / HR) + BM * 1.1 * (HM / h) * (1 - np.exp(-h / HM)))
            return np.exp(-d[..., None] * k)

        # cirrus (behind)
        d, sl = layer_geo(hB)
        gx, gz = d * ce * np.sin(az), d * ce * np.cos(az)
        r = cv2.remap(texB, ((gx / tileB) % 1 * NT).astype(f32), ((gz / tileB) % 1 * NT).astype(f32),
                      cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
        tv = 0.30 * r / sl * (0.25 + 0.75 * hole)
        a = 1 - np.exp(-tv)
        ph = 0.55 * hg(mu, 0.75) + 0.45 * hg(mu, 0.2)
        Lc = ESUN * TsB * (ph * np.exp(-0.4 * tv))[..., None] * 1.25 + amb * 0.5
        Ta = aerial(d, hB)
        Lc = Lc * Ta + base * (1 - Ta)
        col = col * (1 - a[..., None]) + Lc * a[..., None]
        T *= 1 - a

        # altocumulus (front) : 3 slab samples for parallax depth
        tv = 0
        ts = 0
        NSL = 56
        for j in range(NSL):
            fr = (j + 0.5) / NSL
            d, sl = layer_geo(hA + thA * fr)
            gx, gz = d * ce * np.sin(az), d * ce * np.cos(az)
            r = cv2.remap(texA, ((gx / tileA) % 1 * NT).astype(f32), ((gz / tileA) % 1 * NT).astype(f32),
                          cv2.INTER_CUBIC, borderMode=cv2.BORDER_WRAP)
            prof = min(1.0, fr / 0.25) * (1 - 0.35 * fr)
            dens_ = np.clip(r[..., 0] * prof - 0.3 * fr * fr, 0, None) * hole
            tv = tv + 9.0 * dens_ * (thA / NSL) / sl
            ts = ts + np.maximum(r[..., 1], 0) / NSL
        a = 1 - np.exp(-tv)
        Lc = 0
        for n in range(4):
            Lc = Lc + (0.55 ** n) * hg(mu, 0.8 * 0.5 ** n) * np.exp(-ts * 0.3 ** n)
        # thin edges looking toward the sun: silver lining
        Lc = Lc + 0.9 * hg(mu, 0.85) * np.exp(-0.35 * tv) * np.exp(-0.25 * ts)
        Lc = ESUN * TsA * Lc[..., None] * 1.0 + amb * np.array([0.95, 0.85, 0.85]) * 0.75
        Ta = aerial(d, hA)
        Lc = Lc * Ta + base * (1 - Ta)
        col = col * (1 - a[..., None]) + Lc * a[..., None]
        T *= 1 - a
        out[y0:y1, :, :3] = col
        out[y0:y1, :, 3] = T
    np.savez(OUT, sky=out, sun=SUN.astype(f32), az_half=AZ_HALF, esun=ESUN,
             sunT=sun_trans(CAM_H).astype(f32), amb=amb.astype(f32))
    # preview
    def tm(x):
        x = x * 0.16
        return np.clip((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0, 1) ** (1 / 2.2)
    # perspective preview of the camera view
    pw, ph_ = 960, 540
    f = (pw / 2) / np.tan(np.radians(31))
    xx, yy = np.meshgrid(np.arange(pw) - pw / 2, ph_ * 0.62 - np.arange(ph_))
    dz = f + 0 * xx
    n_ = np.sqrt(xx * xx + yy * yy + dz * dz)
    el = np.arcsin(yy / n_)
    az = np.arctan2(xx, dz)
    img = cv2.remap(out, ((az / AZ_HALF * .5 + .5) * (W - 1)).astype(f32),
                    (np.sqrt(np.clip(el, 0, None) / (np.pi / 2)) * (H - 1)).astype(f32), cv2.INTER_LINEAR)
    img[el < 0] = 0
    cv2.imwrite(OUT.replace(".npz", ".png"), (tm(img[..., 2::-1]) * 255).astype(np.uint8))


main()
