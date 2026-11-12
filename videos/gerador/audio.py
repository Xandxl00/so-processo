"""Synthesised open-sea ambience: wind bed + water wash + small lapping sounds."""
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR, DUR = 48000, 10.0
n = int(SR * DUR)
rng = np.random.default_rng(5)
t = np.arange(n) / SR


def band(x, lo, hi, order=2):
    sos = butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfilt(sos, x)


def lowp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def slow(seed, f, lo=0.0):
    r = np.random.default_rng(seed)
    k = int(DUR * f) + 4
    pts = r.uniform(lo, 1, k)
    x = np.interp(t * f, np.arange(k), pts)
    return lowp(x, f * 2)


def chan(seed):
    r = np.random.default_rng(seed)
    w = r.standard_normal(n)
    wind = lowp(w, 180, 2) * 3.0 * (0.6 + 0.4 * slow(seed + 1, 0.35))
    gust = band(r.standard_normal(n), 250, 900, 1) * 0.35 * slow(seed + 2, 0.5) ** 2
    # water wash: broadband hiss with slow swells
    swell = (0.35 + 0.65 * slow(40, 0.22) ** 1.5) * (0.8 + 0.2 * slow(seed + 3, 0.6))
    wash = band(r.standard_normal(n), 400, 5000, 1) * 0.5 * swell
    hiss = band(r.standard_normal(n), 2500, 9000, 1) * 0.16 * swell ** 2
    # small lapping / splashes
    lap = np.zeros(n)
    for _ in range(26):
        t0 = r.uniform(0, DUR)
        d = r.uniform(0.15, 0.5)
        env = np.clip((t - t0) / 0.04, 0, 1) * np.exp(-np.clip(t - t0, 0, None) / d) * (t > t0)
        fc = r.uniform(500, 2200)
        lap += band(r.standard_normal(n), fc * 0.6, fc * 1.8, 1) * env * r.uniform(0.15, 0.5)
    return wind + gust + wash + hiss + lap


L, R = chan(100), chan(200)
mid = chan(300)
L, R = 0.6 * L + 0.5 * mid, 0.6 * R + 0.5 * mid
x = np.stack([L, R], 1)
fade = np.clip(np.minimum(t, DUR - t) / 0.4, 0, 1)[:, None]
x = x * fade
x = x / np.abs(x).max() * 0.5
wavfile.write("audio.wav", SR, (x * 32767).astype(np.int16))
