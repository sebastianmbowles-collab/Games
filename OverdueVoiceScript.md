# OVERDUE - Voice Script

Every line below has a real sound file made by Claude, in `src/overdue/voices/`. They're built into `Overdue.html`, so the game works anywhere with no extra files.

They're made with a computer voice plus spooky effects (pitch-shifting, echo, whisper layers). To change how a voice sounds, edit `src/overdue/voices/make_voices.py` and run:

```
python3 src/overdue/voices/make_voices.py
```

Then rebuild the game. Want to hear them all at once? Open `Overdue_Voice_Reel.mp3`.

## Want to use your own voice for a line instead?
1. Record it (a phone voice memo app works).
2. Name it with the line's **ID**, for example `pages_intro.mp3`.
3. Put it in `src/overdue/voices/` (replacing Claude's file) and rebuild the game.

## The cast

**MR. PAGES:** The library's mascot: a giant walking book, as tall as a grown-up, with a smiling face on his cover. In the daytime he does storytime for little kids. At night his true nature comes out: a ripped-paper grin, black ink dripping from his eyes, and a mouth full of sharp pages. He talks only twice in the whole game. The rest of the time he just **laughs**. Voice: starts like a happy kids' TV host, then sinks down slow and deep.

**THE KID (YOU):** No name, because the kid is you. They fell asleep reading and got locked in. They never say words, only sounds: breathing, gasps and panting.

**THE BOOKWORM:** A speed reader who read so fast they couldn't stop. Now they're a giant worm that shoots down hallways. Voice: a fast, hissing whisper.

**THE BOOK BATS:** Night readers who snuck in with flashlights to read after closing. Now they're torn pages flapping in a swarm, hunting for light. Voice: lots of tiny whispers all at once (record yourself 3 times and layer them if you can!).

**THE BOOKMARKS:** People who always saved their place and said they'd come back to finish... and never did. Now they're ribbons that slither and wrap around ankles. Voice: slow, sad, sticky whisper.

## The lines

### The start of the night

| ID | Who | Line | How to say it |
|---|---|---|---|
| `pages_intro` | MR. PAGES | Storytime... starts... NOW! | Over the library speaker. Start super happy and bouncy, then each word gets slower and deeper until "NOW!" is a growl |

### Mr. Pages' laughs (during the night)

| ID | Who | Line | How to say it |
|---|---|---|---|
| `pages_laugh1` | MR. PAGES | Heh heh heh... | Quiet and far away, while he walks around |
| `pages_laugh2` | MR. PAGES | Hmm-hm-hm-hm... | Humming-laugh, like he knows a secret |
| `pages_laugh3` | MR. PAGES | Ha... ha... ha... | Very slow, every "ha" lower than the last |
| `pages_spot` | MR. PAGES | HA! | Short and sharp, when he SEES you |
| `pages_lost` | MR. PAGES | Hmmmm... | Disappointed, when he loses you |
| `pages_check` | MR. PAGES | Heh. | Right before he opens your hiding spot |

### The kid (sounds only)

| ID | Who | Line | How to say it |
|---|---|---|---|
| `kid_breathe` | THE KID | *(heavy, shaky breathing)* | When you hide too long. About 3 seconds |
| `kid_gasp` | THE KID | *(sharp gasp)* | When a villain spots you |
| `kid_pant` | THE KID | *(out-of-breath panting)* | When your stamina runs out |
| `kid_fall` | THE KID | *(oof!)* | When a bookmark trips you |
| `kid_struggle` | THE KID | *(grunting, trying to pull free)* | While a bookmark has your ankle |

### The villains

| ID | Who | Line | How to say it |
|---|---|---|---|
| `worm_rush` | THE BOOKWORM | SSSSHHHRRRAAAAA! | A rushing hiss, like a train made of paper |
| `bats_whisper` | THE BOOK BATS | Light... light... we see your light... | Many whispers, fluttery |
| `marks_whisper` | THE BOOKMARKS | Stay... stay with us... | Slow and sticky, very close to the mic |

### Death mini games (old creepy arcade)

These play after a villain catches you (not Mr. Pages, because his secret stays hidden). The words also flash on the glitchy screen.

| ID | Who | Line | How to say it |
|---|---|---|---|
| `mg_worm1` | THE BOOKWORM | I read a hundred books in one night. | Fast whisper |
| `mg_worm2` | THE BOOKWORM | I couldn't stop. Faster. Faster. FASTER. | Getting faster and louder |
| `mg_worm3` | THE BOOKWORM | Now I only run the halls. | Sad, slowing down |
| `mg_bats1` | THE BOOK BATS | We snuck in with flashlights. | Excited whisper, like kids at a sleepover |
| `mg_bats2` | THE BOOK BATS | Just one more chapter... | Pleading |
| `mg_bats3` | THE BOOK BATS | Then the lights went out. Forever. | Scared, then flat |
| `mg_marks1` | THE BOOKMARKS | We saved our place. | Calm |
| `mg_marks2` | THE BOOKMARKS | We said we'd come back to finish. | Hopeful |
| `mg_marks3` | THE BOOKMARKS | We never came back. So we stayed. | Very slow and sad |
| `mg_alive` | ALL OF THEM | Everything here was alive. | All the villain voices at once (layer them!) |

### The ending (6 AM)

| ID | Who | Line | How to say it |
|---|---|---|---|
| `kid_hands` | THE KID | *(confused, scared breathing)* | Looking at your hands turning into paper |
| `pages_end` | MR. PAGES | Welcome to the shelf. | Soft, warm and smiling. The creepiest line in the game |

### The secret

Type the secret word on the right computer in the computer lab and you'll see Mr. Pages' secret. Nobody says it out loud: it only appears on the screen. (The Bookworm's Snake game spells the secret word, one letter at a time...)
