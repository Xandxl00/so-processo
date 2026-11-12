"""Sound design for the Monólito reel: sea bed, low drone, riser, one tick per
square igniting (rising pitch), sub impact on 'apareça.', held chord."""
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR, DUR = 48000, 13.0
n = int(SR * DUR)
t = np.arange(n) / SR
T_ON0, T_STEP, T_BOOM, NSQ = 5.6, 0.17, 9.15, 18


def band(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lowp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def slow(seed, f):
    r = np.random.default_rng(seed)
    k = int(DUR * f) + 4
    return lowp(np.interp(t * f, np.arange(k), r.uniform(0, 1, k)), f * 2)


def sea(seed):
    r = np.random.default_rng(seed)
    sw = 0.4 + 0.6 * slow(seed + 1, 0.25) ** 1.5
    return (lowp(r.standard_normal(n), 160) * 2.2 * (0.6 + 0.4 * slow(seed + 2, 0.3))
            + band(r.standard_normal(n), 400, 4500, 1) * 0.30 * sw
            + band(r.standard_normal(n), 2500, 8000, 1) * 0.08 * sw ** 2)


def place(buf, sig, t0, pan=0.0):
    i = int(t0 * SR)
    m = min(len(sig), n - i)
    if m <= 0:
        return
    buf[i:i + m, 0] += sig[:m] * (1 - max(pan, 0))
    buf[i:i + m, 1] += sig[:m] * (1 + min(pan, 0))


out = np.stack([sea(10), sea(20)], 1) * 0.22
duck = 1 - 0.5 * np.clip((t - T_ON0) / 3.0, 0, 1)
out *= duck[:, None]

# drone (D1 + fifth), slowly opening
env = np.clip(t / 2.5, 0, 1) * (0.55 + 0.45 * np.clip((t - 3) / 6, 0, 1))
dr = (np.sin(2 * np.pi * 36.71 * t) + 0.5 * np.sin(2 * np.pi * 73.42 * t + 0.4 * np.sin(2 * np.pi * 0.11 * t))
      + 0.22 * np.sin(2 * np.pi * 110.0 * t)) * env * 0.16
out += dr[:, None]

# riser into the impact
rng = np.random.default_rng(1)
rt = np.clip((t - T_ON0) / (T_BOOM - T_ON0), 0, 1)
ris = np.zeros(n)
for i in range(0, n, 2048):
    seg = slice(i, min(n, i + 4096))
    fc = 300 + 5000 * rt[i] ** 2
    ris[seg] += band(rng.standard_normal(seg.stop - seg.start), fc * 0.7, fc * 1.4, 1) * np.hanning(seg.stop - seg.start)
ris *= rt ** 2.5 * (t < T_BOOM) * 0.16
out += ris[:, None]

# one electric tick per square, pitch climbing
for k in range(NSQ):
    tk = T_ON0 + k * T_STEP
    d = np.arange(int(0.22 * SR)) / SR
    f0 = 520 * 2 ** (k / 12 * 0.9)
    tone = np.sin(2 * np.pi * f0 * d) * np.exp(-d / 0.05) * 0.16
    click = band(rng.standard_normal(len(d)), 1800, 7000, 1) * np.exp(-d / 0.006) * 0.35
    hum = np.sin(2 * np.pi * 120 * d) * np.exp(-d / 0.09) * 0.06
    place(out, tone + click + hum, tk, pan=((k % 3) - 1) * 0.35)

# impact
d = np.arange(int(3.5 * SR)) / SR
ph = 2 * np.pi * np.cumsum(34 + 50 * np.exp(-d / 0.12)) / SR
boom = np.sin(ph) * np.exp(-d / 0.9) * 0.75
crack = lowp(rng.standard_normal(len(d)), 2500) * np.exp(-d / 0.10) * 0.5
air = band(rng.standard_normal(len(d)), 3000, 9000, 1) * np.exp(-d / 0.7) * 0.07
place(out, boom + crack + air, T_BOOM)

# held chord after the impact (D minor add9, soft)
d = np.arange(n - int(T_BOOM * SR)) / SR
ch = sum(np.sin(2 * np.pi * f * d + p) * a for f, a, p in
         [(146.83, .30, 0), (220.0, .22, 1), (293.66, .2, 2), (349.23, .14, .5), (440.0, .1, 3), (659.25, .05, 1.2)])
ch *= np.clip(d / 0.05, 0, 1) * (0.6 + 0.4 * np.exp(-d / 1.5)) * 0.16 * (1 + 0.05 * np.sin(2 * np.pi * 4.5 * d))
place(out, ch, T_BOOM)

fade = np.clip(t / 0.5, 0, 1) * np.clip((DUR - t) / 0.5, 0, 1)
out *= fade[:, None]
out = np.tanh(out * 1.3) / np.tanh(1.3)
out = out / np.abs(out).max() * 0.89
wavfile.write("audio_mono.wav", SR, (out * 32767).astype(np.int16))
