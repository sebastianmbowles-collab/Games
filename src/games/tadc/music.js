// The soundtrack. Every song is original, written as notes for sound.js to play.
// Each step is a 16th note. "C5:4" = C in octave 5 for 4 steps, "." = rest, "+" = chord, "~" = slide.
// Drums: k kick, s snare, h hat, o open hat, c crash, t tom.

const rep = (s, n) => Array(n).fill(s).join(' ')

export const SONGS = {
  // Title and menus: a bouncy little circus march.
  menu: {
    bpm: 128,
    tracks: [
      {
        wave: 'p25',
        vol: 0.06,
        notes: [
          'G4:2 C5:2 E5:2 G5:2 F#5:2 G5:2 E5:4',
          'D5:2 F5:2 A5:2 G5:2 E5:2 C5:2 D5:4',
          'G4:2 C5:2 E5:2 G5:2 A5:2 G5:2 E5:2 C5:2',
          'D5:2 E5:2 F5:2 D5:2 C5:8',
          'E5:2 E5:2 F5:2 G5:2 G5:2 F5:2 E5:2 D5:2',
          'C5:2 C5:2 D5:2 E5:2 E5:3 D5:1 D5:4',
          'A5:2 G5:2 F#5:2 G5:2 E5:2 C5:2 A4:2 C5:2',
          'D5:2 G4:2 B4:2 D5:2 C5:8',
        ].join(' | '),
      },
      {
        wave: 'tri',
        vol: 0.16,
        notes: [
          rep('C3:2 .:2 G2:2 .:2', 2),
          rep('G2:2 .:2 D3:2 .:2', 2),
          rep('C3:2 .:2 G2:2 .:2', 2),
          'G2:2 .:2 D3:2 .:2 C3:2 .:2 G2:2 .:2',
          rep('C3:2 .:2 G2:2 .:2', 2),
          rep('G2:2 .:2 D3:2 .:2', 2),
          'F2:2 .:2 C3:2 .:2 A2:2 .:2 E3:2 .:2',
          'G2:2 .:2 D3:2 .:2 C3:2 .:2 G2:2 .:2',
        ].join(' | '),
      },
      {
        wave: 'p12',
        vol: 0.025,
        notes: [
          rep('.:2 E4+G4:2', 4),
          rep('.:2 D4+F4:2', 4),
          rep('.:2 E4+G4:2', 4),
          rep('.:2 D4+F4:2', 2) + ' ' + rep('.:2 E4+G4:2', 2),
          rep('.:2 E4+G4:2', 4),
          rep('.:2 D4+F4:2', 4),
          rep('.:2 F4+A4:2', 2) + ' ' + rep('.:2 E4+A4:2', 2),
          rep('.:2 D4+F4:2', 2) + ' ' + rep('.:2 E4+G4:2', 2),
        ].join(' | '),
      },
      { vol: 0.08, notes: rep('k:2 h:2 s:2 h:2', 4) },
    ],
  },

  // Jax: fast and goofy, lots of bouncing notes and a silly slide whistle.
  jax: {
    bpm: 160,
    tracks: [
      {
        wave: 'p12',
        vol: 0.06,
        notes: [
          'F4 . F5 . C5 . A4:2 Bb4 . D5 . C5:2 .:2',
          'F4 . F5 . C5 . A4:2 G4 . A4 Bb4 C5:4',
          'D5 . D5 C5 Bb4:2 A4:2 G4 . G4 A4 Bb4:2 G4:2',
          'C5 . E5 . G5 . E5 C5 F5:4 .:4',
          'A5 . A5 . G5 . F5 . D5 . F5 . A5:2 G5:2',
          'F5 . C5 . A4 . C5 . F5:2 E5:2 D5:2 C5:2',
          'Bb4 . D5 . F5 . D5 . G4 . Bb4 . D5:2 C5:2',
          'C5 . C5 . E5 . G5 . F5:4 .:4',
        ].join(' | '),
      },
      {
        wave: 'tri',
        vol: 0.17,
        notes: [
          rep('F2 . C3 .', 4),
          rep('F2 . C3 .', 4),
          rep('Bb2 . F3 .', 2) + ' ' + rep('G2 . D3 .', 2),
          rep('C3 . G2 .', 2) + ' F2 . C3 . F2:4',
          rep('F2 . C3 .', 4),
          rep('F2 . C3 .', 2) + ' ' + rep('A2 . E3 .', 2),
          rep('Bb2 . F3 .', 2) + ' ' + rep('G2 . D3 .', 2),
          rep('C3 . G2 .', 2) + ' F2 . C3 . F2:4',
        ].join(' | '),
      },
      { vol: 0.07, notes: rep('k:2 h h s:2 h k k:2 h:2 s:2 h:2', 4) + ' | ' + rep('k:2 h h s:2 h k k:2 h:2 s:2 s s', 4) },
      { wave: 'p50', vol: 0.03, notes: '.:48 .:12 C5~C6:4 | .:48 .:12 G5~C5:4' },
    ],
  },

  // Ragatha: energetic runs of quick notes. The game speeds it up as the buttons pile up.
  ragatha: {
    bpm: 150,
    tracks: [
      {
        wave: 'p25',
        vol: 0.055,
        notes: [
          'D5 F#5 A5 F#5 D5 F#5 A5 D6 C#6 A5 E5 A5 C#6 A5 E5 C#5',
          'B4 D5 G5 D5 B4 D5 G5 B5 A5 F#5 D5 F#5 A5:2 .:2',
          'D5 F#5 A5 F#5 D5 F#5 A5 D6 E6 D6 C#6 B5 A5 G5 F#5 E5',
          'D5:2 A4:2 F#4:2 A4:2 D5:4 .:4',
          'G5 B5 D6 B5 G5 B5 D6 B5 F#5 A5 D6 A5 F#5 A5 D6 A5',
          'E5 G5 B5 G5 E5 G5 B5 G5 A5 C#6 E6 C#6 A5:2 .:2',
          'D6 C#6 B5 A5 G5 F#5 E5 D5 C#5 D5 E5 F#5 G5 A5 B5 C#6',
          'D6:2 A5:2 F#5:2 A5:2 D6:4 .:4',
        ].join(' | '),
      },
      {
        wave: 'tri',
        vol: 0.16,
        notes: [
          'D2:2 D3:2 D2:2 D3:2 A2:2 A3:2 A2:2 A3:2',
          'G2:2 G3:2 G2:2 G3:2 D2:2 D3:2 D2:2 D3:2',
          'D2:2 D3:2 D2:2 D3:2 A2:2 A3:2 A2:2 A3:2',
          'A2:2 A3:2 A2:2 A3:2 D2:2 D3:2 D2:4',
          'G2:2 G3:2 G2:2 G3:2 D2:2 D3:2 D2:2 D3:2',
          'E2:2 E3:2 E2:2 E3:2 A2:2 A3:2 A2:2 A3:2',
          'B2:2 B3:2 G2:2 G3:2 A2:2 A3:2 A2:2 A3:2',
          'A2:2 A3:2 A2:2 A3:2 D2:2 D3:2 D2:4',
        ].join(' | '),
      },
      { vol: 0.075, notes: rep('k:2 h:2 s:2 h h k:2 k:2 s:2 h:2', 7) + ' | k s k s k s s s k:2 s:2 c:4' },
    ],
  },

  // Gangle: mysterious and dramatic, long notes, soft arpeggios and a slow heartbeat.
  gangle: {
    bpm: 100,
    tracks: [
      {
        wave: 'tri',
        vol: 0.11,
        vib: 0.012,
        notes: 'E5:6 D5:2 B4:8 | C5:6 B4:2 A4:8 | G4:4 A4:4 B4:4 D5:4 | B4:12 .:4 | E5:6 F#5:2 G5:8 | F#5:6 E5:2 D#5:8 | E5:4 B4:4 G4:4 F#4:4 | E4:12 .:4',
      },
      {
        wave: 'p25',
        vol: 0.022,
        notes: [
          rep('E4:2 G4:2 B4:2 G4:2', 2),
          rep('A4:2 C5:2 E5:2 C5:2', 2),
          rep('D4:2 G4:2 B4:2 G4:2', 2),
          rep('B3:2 D#4:2 F#4:2 D#4:2', 2),
          rep('E4:2 G4:2 B4:2 G4:2', 2),
          rep('C4:2 E4:2 G4:2 E4:2', 2),
          'A3:2 C4:2 E4:2 C4:2 B3:2 D#4:2 F#4:2 D#4:2',
          rep('E4:2 G4:2 B4:2 G4:2', 2),
        ].join(' | '),
      },
      { wave: 'tri', vol: 0.12, notes: 'E2:16 | A2:16 | G2:8 D2:8 | B1:16 | E2:16 | C2:16 | A1:8 B1:8 | E2:16' },
      { vol: 0.06, notes: rep('k:4 .:4 h:2 .:2 s:4', 1) + ' | ' + rep('k:2 k:2 .:4 h:2 .:2 s:4', 1) },
    ],
  },

  // Kinger: chaotic and bouncy, as if the music itself is confused.
  kinger: {
    bpm: 140,
    tracks: [
      {
        wave: 'p12',
        vol: 0.05,
        notes: [
          'C5 . C#5 . C5 G4:3 .:2 Eb5 D5 .:2 B4:2',
          'F#4:2 G4 . A#4 B4 .:2 C5 . C6 . C5:2 .:2',
          'E5 D#5 E5 . G4 . E5 .:3 F5 E5 Eb5 D5 .:2',
          'C5 . B4 . Bb4 . A4 . Ab4:2 G4:6',
          'G5 . F#5 . G5 . C5 .:2 A5 G#5 A5 .:2 D5:2',
          'C6 B5 Bb5 A5 Ab5 G5 F#5 F5 E5:2 .:2 E4 F4 F#4 G4',
          'C5 . E5 . C5 . G5 . C5 . Eb5 . C5:2 Db5:2',
          'C5:2 .:2 C4:2 .:2 C6:1 .:3 C5:4',
        ].join(' | '),
      },
      {
        wave: 'tri',
        vol: 0.12,
        notes: [
          'C3 .:2 C3 G2 .:2 G2 C3 . E3 . G2:2 .:2',
          'F2 .:2 F2 C3 .:2 C3 F#2 . A2 . G2:2 .:2',
          'C3 .:2 C3 G2 .:2 G2 A2 . C3 . Eb3:2 .:2',
          'D3 .:2 G2 D3 .:2 G2 G2:2 A2:2 B2:4',
        ].join(' | '),
      },
      { wave: 'p50', vol: 0.02, notes: '.:24 C6~F5:4 .:4 | .:40 G5~G6:2 .:6 | .:16' },
      { vol: 0.075, notes: 'k .:2 k s . h k . s:2 h h k s:2 | k:2 t t s . k . k k s:2 t t t:2' },
    ],
  },

  // Caine & Bubble: the huge final boss. Fast drums, deep bass, electronic zaps. It speeds up.
  caine: {
    bpm: 168,
    tracks: [
      {
        wave: 'p25',
        vol: 0.055,
        notes: [
          'A4:2 C5:2 E5:2 A5:4 G5:2 E5:2 G5:2',
          'F5:4 E5:2 D5:2 E5:4 B4:4',
          'A4:2 C5:2 E5:2 A5:4 B5:2 C6:2 D6:2',
          'C6:4 B5:2 G#5:2 A5:8',
          'E6:2 D6:2 C6:2 B5:2 A5:2 G5:2 A5:4',
          'F5:2 G5:2 A5:2 C6:2 B5:4 G#5:4',
          'A5:2 E5:2 A5:2 C6:2 B5:2 G5:2 E5:4',
          'F5:2 E5:2 D5:2 B4:2 A4:8',
        ].join(' | '),
      },
      {
        wave: 'p12',
        vol: 0.022,
        notes: [
          'A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5 G4 B4 D5 B4',
          'F4 A4 C5 A4 F4 A4 C5 A4 E4 G#4 B4 G#4 E4 G#4 B4 G#4',
        ].join(' | '),
      },
      {
        wave: 'saw',
        vol: 0.07,
        gate: 0.6,
        notes: [
          'A1 A1 A2 A1 A1 A2 A1 A2 A1 A1 A2 A1 G1 G2 G1 G2',
          'F1 F1 F2 F1 F1 F2 F1 F2 E1 E1 E2 E1 E1 E2 E1 E2',
        ].join(' | '),
      },
      { vol: 0.085, notes: rep('k h s h k k s h k h s h k k s s', 3) + ' | k k s k k s k s k s k s s s s s' },
      { wave: 'p50', vol: 0.02, notes: '.:28 C7~C5:4 | .:12 G6~G4:2 .:10 E7~A4:2 .:2 A6~A5:4' },
    ],
  },

  // The end: a slow, slightly spooky music box.
  ending: {
    bpm: 84,
    tracks: [
      { wave: 'tri', vol: 0.12, notes: 'E5:4 G5:4 B5:4 A5:4 | G5:4 E5:4 F#5:8 | E5:4 G5:4 B5:4 D6:4 | C6:4 B5:4 A5:8 | G5:4 E5:4 C5:4 E5:4 | D5:4 B4:4 G4:8 | A4:4 C5:4 E5:4 D#5:4 | E5:16' },
      { wave: 'p12', vol: 0.02, notes: rep('E3:2 B3:2 G4:2 B3:2', 8) },
    ],
  },

  // Very short, doesn't loop: after the final boss.
  silence: { bpm: 60, loop: false, tracks: [{ wave: 'tri', vol: 0, notes: '.:4' }] },
}
