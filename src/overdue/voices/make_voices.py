#!/usr/bin/env python3
"""Makes every voice line in OVERDUE.
Mr. Pages and the kid: ffmpeg's built-in speech (flite) plus effects.
The Bookworm, Book Bats and Bookmarks: Piper voices (more human) through sherpa-onnx.

Setup (once):
  pip install sherpa-onnx==1.12.40 numpy
  mkdir -p ~/.cache/overdue-tts && cd ~/.cache/overdue-tts
  for m in en_US-libritts_r-medium en_US-amy-medium en_GB-jenny_dioco-medium; do
    curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-$m.tar.bz2 | tar xj
  done
Run:  python3 src/overdue/voices/make_voices.py   (needs ffmpeg with flite + rubberband)
Writes one .mp3 per line ID (see OverdueVoiceScript.md) next to this file."""
import os, subprocess, tempfile, wave
import numpy as np
import sherpa_onnx

OUT = os.path.dirname(os.path.abspath(__file__))
TMP = tempfile.mkdtemp()
SR = 22050

def ff(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)

TTS_DIR = os.environ.get('OVERDUE_TTS_DIR', os.path.expanduser('~/.cache/overdue-tts'))
_models = {}
def piper(model, text, path, sid=0, speed=1.0, pitch=1.0, fx=''):
    """Say text with a Piper voice (sid picks one of the speakers), then add effects."""
    if model not in _models:
        d = os.path.join(TTS_DIR, 'vits-piper-' + model)
        cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f'{d}/{model}.onnx', tokens=f'{d}/tokens.txt', data_dir=f'{d}/espeak-ng-data'), num_threads=4))
        _models[model] = sherpa_onnx.OfflineTts(cfg)
    a = _models[model].generate(text, sid=sid, speed=speed)
    raw = path + '.raw.wav'
    pcm = (np.clip(np.array(a.samples), -1, 1) * 32767).astype('<i2')
    with wave.open(raw, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(a.sample_rate); w.writeframes(pcm.tobytes())
    chain = f'aresample={SR}'
    if pitch != 1: chain += f',rubberband=pitch={pitch}:formant=shifted'
    if fx: chain += ',' + fx
    ff('-i', raw, '-af', chain, '-ac', '1', path)
    return path

def speak(text, voice, path, pitch=1.0, tempo=1.0, fx=''):
    """Say text with a flite voice, then shift pitch / speed and add effects."""
    chain = f'aresample={SR},rubberband=pitch={pitch}:tempo={tempo}:formant=preserved' if (pitch != 1 or tempo != 1) else f'aresample={SR}'
    if fx: chain += ',' + fx
    ff('-f', 'lavfi', '-i', f"flite=text='{text}':voice={voice}", '-af', chain, '-ac', '1', path)
    return path

def tmp(name): return os.path.join(TMP, name + '.wav')

def silence(sec, name):
    p = tmp(name)
    ff('-f', 'lavfi', '-i', f'anullsrc=r={SR}:cl=mono', '-t', str(sec), p)
    return p

def concat(parts, path):
    inputs = []
    for p in parts: inputs += ['-i', p]
    ff(*inputs, '-filter_complex', ''.join(f'[{i}:a]' for i in range(len(parts))) + f'concat=n={len(parts)}:v=0:a=1[o]', '-map', '[o]', path)
    return path

def mix(parts, path, delays=None, fx=''):
    inputs = []
    for p in parts: inputs += ['-i', p]
    delays = delays or [0] * len(parts)
    pre = ''.join(f'[{i}:a]adelay={d}|{d}[d{i}];' for i, d in enumerate(delays))
    tail = f',{fx}' if fx else ''
    ff(*inputs, '-filter_complex', pre + ''.join(f'[d{i}]' for i in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0{tail}[o]', '-map', '[o]', path)
    return path

def noise(path, sec, fx, color='pink'):
    ff('-f', 'lavfi', '-i', f'anoisesrc=color={color}:sample_rate={SR}:amplitude=0.8', '-t', str(sec), '-af', fx, '-ac', '1', path)
    return path

def mp3(src, line_id, gain=1.0):
    dst = os.path.join(OUT, line_id + '.mp3')
    ff('-i', src, '-af', f'volume={gain},loudnorm=I=-16:TP=-1.5', '-ac', '1', '-ar', str(SR), '-b:a', '48k', dst)
    print('made', line_id)

# a whisper: keep the loudness of each sound but scramble its pitch into breath
WHISPER = "afftfilt=real='hypot(re,im)*cos((random(0)*2-1)*2*3.14)':imag='hypot(re,im)*sin((random(1)*2-1)*2*3.14)':win_size=256:overlap=0.75"
SPEAKER = 'highpass=f=320,lowpass=f=3400,acrusher=bits=10:mix=0.25,aecho=0.8:0.6:220|430:0.35|0.2'
ROOM = 'aecho=0.8:0.7:90|260:0.3|0.18'
PAGES = 'rms'

# ---------------- MR. PAGES ----------------
a = speak('Storytime!', PAGES, tmp('i1'), pitch=1.45, tempo=1.1)
b = speak('starts', PAGES, tmp('i2'), pitch=0.82, tempo=0.6)
c = speak('NOW!', PAGES, tmp('i3'), pitch=0.48, tempo=0.55, fx='volume=1.8,acrusher=bits=8:mix=0.35')
intro = concat([a, silence(0.55, 's1'), b, silence(0.75, 's2'), c, silence(1.2, 's3')], tmp('intro'))
ff('-i', intro, '-af', SPEAKER, tmp('intro_fx'))
mp3(tmp('intro_fx'), 'pages_intro')

mp3(speak('heh heh heh', PAGES, tmp('l1'), pitch=0.58, tempo=0.85, fx=ROOM), 'pages_laugh1')
mp3(speak('hm hm hm hm', PAGES, tmp('l2'), pitch=0.55, tempo=0.9, fx=ROOM), 'pages_laugh2')
h1 = speak('ha', PAGES, tmp('h1'), pitch=0.72, tempo=0.7)
h2 = speak('ha', PAGES, tmp('h2'), pitch=0.56, tempo=0.65)
h3 = speak('ha', PAGES, tmp('h3'), pitch=0.42, tempo=0.6)
ha = concat([h1, silence(0.5, 'g1'), h2, silence(0.6, 'g2'), h3], tmp('ha'))
ff('-i', ha, '-af', ROOM, tmp('ha_fx')); mp3(tmp('ha_fx'), 'pages_laugh3')
mp3(speak('HA!', PAGES, tmp('spot'), pitch=0.55, tempo=0.9, fx='volume=2,acrusher=bits=9:mix=0.3,' + ROOM), 'pages_spot')
mp3(speak('hmmmmmmm', PAGES, tmp('lost'), pitch=0.5, tempo=0.6, fx=ROOM), 'pages_lost')
mp3(speak('heh.', PAGES, tmp('check'), pitch=0.5, tempo=0.8, fx=ROOM), 'pages_check', 0.8)
mp3(speak('Welcome... to the shelf.', PAGES, tmp('end'), pitch=0.86, tempo=0.72, fx='aecho=0.8:0.5:60:0.15'), 'pages_end')

# ---------------- THE KID (sounds only) ----------------
# breathing: pink noise shaped into in-out breaths
breath = "bandpass=f=900:width_type=h:w=1400,volume='0.15+0.85*pow(max(0,sin(2*PI*t*0.75)),2)':eval=frame"
mp3(noise(tmp('breathe'), 3.2, breath + ',afade=t=in:d=0.2,afade=t=out:st=2.9:d=0.3'), 'kid_breathe', 0.9)
mp3(noise(tmp('gasp'), 0.55, "highpass=f=700,bandpass=f=1700:width_type=h:w=1800,volume='if(lt(t,0.06),t/0.06,exp(-(t-0.06)*7))':eval=frame", 'white'), 'kid_gasp')
mp3(noise(tmp('pant'), 2.6, "bandpass=f=1100:width_type=h:w=1500,volume='pow(max(0,sin(2*PI*t*2.1)),3)':eval=frame,afade=t=out:st=2.2:d=0.4"), 'kid_pant', 0.9)
oof = speak('oof!', 'slt', tmp('oof'), pitch=1.25, tempo=1.2)
mp3(oof, 'kid_fall')
st1 = speak('nnngh', 'slt', tmp('st1'), pitch=1.2, tempo=1.0)
st2 = speak('hnnnh!', 'slt', tmp('st2'), pitch=1.3, tempo=1.0)
mp3(concat([st1, silence(0.25, 'g3'), st2], tmp('struggle')), 'kid_struggle')
mp3(noise(tmp('hands'), 4.5, "bandpass=f=800:width_type=h:w=1000,volume='0.1+0.9*pow(max(0,sin(2*PI*t*0.55)),2)*(0.7+0.3*sin(2*PI*t*9))':eval=frame,afade=t=out:st=4:d=0.5"), 'kid_hands', 0.8)

# ---------------- THE BOOKWORM: a fast, nervous kid (he was a speed reader) ----------------
LIB = 'en_US-libritts_r-medium'
def worm(text, path, speed=1.35):
    return piper(LIB, text, path, sid=150, speed=speed, pitch=1.12,
                 fx='vibrato=f=6.5:d=0.12,highpass=f=140,aecho=0.8:0.4:35:0.25')
rush_noise = noise(tmp('rushn'), 1.6, "highpass=f=300,lowpass=f=5000,volume='if(lt(t,0.15),t/0.15,exp(-(t-0.15)*2.2))':eval=frame", 'brown')
rush_voice = worm('Faster faster faster!', tmp('rushv'), speed=1.9)
mp3(mix([rush_noise, rush_voice], tmp('rush'), [0, 120]), 'worm_rush')
mp3(worm('I-I read a hundred books in one night.', tmp('w1')), 'mg_worm1')
mp3(worm("I couldn't stop. Faster. Faster! FASTER!", tmp('w2'), speed=1.55), 'mg_worm2')
mp3(worm('Now I... I only run the halls.', tmp('w3'), speed=1.05), 'mg_worm3')

# ---------------- THE BOOK BATS: a whispery chorus of night readers ----------------
BAT_SPEAKERS = [(60, 1.0, 0), (315, 1.08, 70), (285, 0.96, 140), (765, 1.04, 45), (15, 1.1, 190)]
def bats(text, path, speed=1.05):
    voices = []
    for i, (sid, sp, _) in enumerate(BAT_SPEAKERS):
        v = piper(LIB, text, tmp(f'bat{i}'), sid=sid, speed=speed * sp, pitch=1.06)
        if i % 2:  # every other voice is a breathy whisper, the rest stay clear
            ff('-i', v, '-af', WHISPER + ',volume=0.7', tmp(f'batw{i}')); v = tmp(f'batw{i}')
        voices.append(v)
    return mix(voices, path, [d for _, _, d in BAT_SPEAKERS],
               'volume=0.45,highpass=f=260,tremolo=f=11:d=0.35,aecho=0.8:0.6:70|150:0.25|0.15')
mp3(bats('Light... light... we see your light.', tmp('bw')), 'bats_whisper')
mp3(bats('We snuck in with flashlights.', tmp('b_1')), 'mg_bats1')
mp3(bats('Just one more chapter...', tmp('b_2'), 0.85), 'mg_bats2')
mp3(bats('Then the lights went out. Forever.', tmp('b_3'), 0.8), 'mg_bats3')

# ---------------- THE BOOKMARKS: soft, sad ghosts ----------------
def marks(text, path):
    a = piper('en_US-amy-medium', text, tmp('mk_a'), speed=0.72, pitch=0.97)
    b = piper('en_GB-jenny_dioco-medium', text, tmp('mk_b'), speed=0.74, pitch=0.93, fx='volume=0.45')
    return mix([a, b], path, [0, 55],
               "lowpass=f=5200,chorus=0.7:0.9:45|60:0.3|0.25:0.3|0.4:1.5|2,aecho=0.85:0.75:320|700|1100:0.35|0.25|0.15,afade=t=in:d=0.25")
mp3(marks('Stay... stay with us.', tmp('mw')), 'marks_whisper')
mp3(marks('We saved our place.', tmp('m1')), 'mg_marks1')
mp3(marks("We said we'd come back to finish.", tmp('m2')), 'mg_marks2')
mp3(marks('We never came back... so we stayed.', tmp('m3')), 'mg_marks3')

# ---------------- ALL OF THEM ----------------
line = 'Everything here was alive.'
p = speak(line, PAGES, tmp('a1'), pitch=0.5, tempo=0.6)
w = worm(line, tmp('a2'), speed=0.75)
bt = bats(line, tmp('a3'), 0.7)
mk = marks(line, tmp('a4'))
mp3(mix([p, w, bt, mk], tmp('alive'), [0, 40, 80, 0], ROOM), 'mg_alive')
