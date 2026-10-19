import { isTouch } from './state.js';

// Words in {CURLY} get swapped for the right button names (keyboard or touch).
const KEYS = isTouch
  ? { FIX: 'the FIX button', OD: 'the OVERDRIVE button', JUMP: 'the JUMP button', DASH: 'a DASH button', AIM: 'Touch and hold where you want to shoot', FIRE: '' }
  : { FIX: 'Q', OD: 'SHIFT', JUMP: 'SPACE', DASH: 'A or D', AIM: 'Aim with the mouse and hold the mouse button', FIRE: '' };
export const fill = s => s.replace(/\{(\w+)\}/g, (_, k) => KEYS[k] ?? k);

export const CREATOR = 'THE GAME DESIGNER';

export const MISSIONS = [
  {
    title: 'THE INVASION BEGINS', sub: 'Hold the door. Zippits incoming.', music: 'battle',
    spawns: { zippit: 12 }, maxAlive: 4, gap: [0.9, 2.0],
    intro: [
      ['nova', 'UNIT-07, come in. Your landing went... badly. You crashed into an abandoned alien UFO.'],
      ['patch', 'Your legs are jammed in the floor! Totally stuck! This is fine. Everything is fine.'],
      ['unit', 'Great. A combat robot that cannot walk. Very useful.'],
      ['nova', 'The UFO door is wide open and the aliens are coming through it. Hold your ground.'],
      ['patch', '{AIM} to fire moon blasts!'],
      ['patch', 'Your thrusters still work! {DASH} dashes sideways. {JUMP} jumps.'],
    ],
    outro: [['nova', 'Wave cleared. Nice shooting, UNIT-07.'], ['unit', 'They just ran straight at me. Not a great plan.']],
  },
  {
    title: 'HEAVY CONTACT', sub: 'Something big is coming through that door.', music: 'battle',
    spawns: { zippit: 10, bruteclaw: 2 }, maxAlive: 5, gap: [1.0, 2.2],
    intro: [
      ['nova', 'Heavy footsteps on the scanner. Brace yourself.'],
      ['patch', 'When a big one slams the floor, a shockwave comes at you. JUMP over it!'],
    ],
    outro: [['nova', 'Bruteclaws down. The colony thanks you.'], ['patch', 'The floor is still shaking. Or is that me?']],
  },
  {
    title: 'SKY SWARM', sub: 'They fly now. Of course they fly.', music: 'battle',
    spawns: { voidfly: 8, zippit: 8 }, maxAlive: 6, gap: [0.8, 1.8],
    intro: [
      ['nova', 'Flying drones inbound. Voidflies. They shoot energy bolts in threes.'],
      ['patch', 'You can shoot their bolts out of the air! Or DASH out of the way!'],
      ['unit', 'Flying aliens. Wonderful. I will add that to my list of complaints.'],
    ],
    outro: [['nova', 'Airspace clear. But I am reading a huge energy signature...'], ['patch', 'Huge? How huge? Medium huge? Please say medium.']],
  },
  {
    title: 'GENERAL VRAX', sub: 'The warlord of the invasion.', music: 'boss', boss: 'vrax',
    intro: [
      ['nova', 'That is General Vrax, commander of the invasion army.'],
      ['vrax', 'A single rusty robot? I have conquered forty-two planets. Yours will be forty-three!'],
      ['unit', 'Forty-two? Did you count them yourself?'],
      ['nova', 'Intel says he gets EXHAUSTED after his big attacks. That is when you hit him hardest.'],
    ],
    outro: [['vrax', 'This... is not... over...'], ['nova', 'General Vrax is down! Outstanding work.'], ['patch', 'I was not scared. My eye was just... leaking.']],
  },
  {
    title: 'SHADOWS IN THE SHIP', sub: 'Snipers. Invisible ones.', music: 'battle',
    spawns: { riftstalker: 4, zippit: 8, voidfly: 4 }, maxAlive: 6, gap: [1.0, 2.0],
    intro: [
      ['nova', 'Riftstalkers. Elite snipers that hide behind cover and turn invisible.'],
      ['patch', 'When you see a red laser on you, DASH or JUMP before it fires!'],
      ['patch', 'And they are weak up close! Shoot the ones hiding near you!'],
    ],
    outro: [['nova', 'Snipers neutralised. One more wave and we can push them back.'], ['unit', 'Hiding behind boxes. Bold strategy.']],
  },
  {
    title: 'LAST STAND', sub: 'Everything they have left.', music: 'battle',
    spawns: { zippit: 14, bruteclaw: 2, voidfly: 6, riftstalker: 3 }, maxAlive: 7, gap: [0.7, 1.6],
    intro: [
      ['nova', 'This is it. The whole alien army is charging the UFO.'],
      ['patch', 'That is a LOT of aliens. Remember Overdrive! And I can fix you any time!'],
      ['unit', 'Good. I was getting bored.'],
    ],
    outro: [['nova', 'They are retreating! Wait... something is landing outside the UFO.'], ['patch', 'Why is the sky getting darker? WHY IS THE SKY GETTING DARKER?']],
  },
  {
    title: 'THE NULL EMPEROR', sub: 'The king of the alien army.', music: 'final', boss: 'emperor',
    intro: [
      ['emperor', 'I have ruled this galaxy since before your sun was born.'],
      ['emperor', 'Your colony is mine. Your stars are mine. Even your little toaster is mine.'],
      ['unit', 'Toaster? Rude.'],
      ['nova', 'His chest core is armoured. It only opens after his biggest attacks.'],
      ['patch', 'Survive his attacks, then blast the glowing core when it opens!'],
    ],
    outro: [],
  },
];

export const SCANS = {
  zippit: { name: 'ZIPPIT', role: 'BASIC ENEMY', info: 'Runs fast and attacks with claws. Special: QUICK DASH.', weak: 'LOW HEALTH', line: 'Scanning... It is small, green, and very rude.' },
  bruteclaw: { name: 'BRUTECLAW', role: 'HEAVY ENEMY', info: 'Four arms. Absorbs damage. GROUND SLAM makes a shockwave - JUMP!', weak: 'SLOW MOVEMENT', line: 'Scanning... That is a lot of arms. Why so many arms?' },
  voidfly: { name: 'VOIDFLY', role: 'FLYING ENEMY', info: 'Hovers and fires a TRIPLE ENERGY BLAST. Shoot the bolts or DASH.', weak: 'FRAGILE ARMOUR', line: 'Scanning... Flying eyeball. My least favourite kind of eyeball.' },
  riftstalker: { name: 'RIFTSTALKER', role: 'ELITE ENEMY', info: 'Sniper. Hides behind cover. Turns INVISIBLE. Red laser = DODGE!', weak: 'CLOSE RANGE (3X DAMAGE)', line: 'Scanning... Sniper! Watch for the red laser!' },
  vrax: { name: 'GENERAL VRAX', role: 'FIRST MAJOR BOSS', info: 'Blade strikes, ground slams, summons Zippits. Special: SPINNING BLADE STORM.', weak: 'EXHAUSTED AFTER BIG ATTACKS', line: 'Scanning... Big sword. Bigger ego.' },
  emperor: { name: 'THE NULL EMPEROR', role: 'FINAL BOSS', info: 'Energy beams, explosive bombs, shockwaves. Special: RIFT COLLAPSE.', weak: 'CHEST CORE OPENS AFTER BIG ATTACKS', line: 'Scanning... Scanner says: RUN. I am ignoring the scanner.' },
};

export const UPGRADES = [
  { id: 'rapid', name: 'RAPID CORE', desc: 'Fire 30% faster' },
  { id: 'heavy', name: 'HEAVY MOON', desc: 'Moon blasts do 50% more damage' },
  { id: 'plating', name: 'REINFORCED PLATING', desc: '+30 max armour' },
  { id: 'capacitor', name: 'OVERDRIVE CAPACITOR', desc: 'Overdrive lasts 4 seconds longer' },
  { id: 'turbo', name: 'PATCH TURBO', desc: 'Emergency Repair recharges twice as fast' },
  { id: 'twin', name: 'TWIN MOONS', desc: 'Fire two moon blasts at once' },
  { id: 'big', name: 'FULL MOON', desc: 'Bigger moon blasts that are easier to hit with' },
];

export const PATCH_REPAIR = [
  'Hold still! This might tickle.',
  'Patching you up! Get it? PATCHING?',
  'Glue, tape, and hope. You are good!',
  'Fixed! Please stop getting hit. For me.',
  'Emergency Repair complete! I am a genius.',
];
export const PATCH_LOW = [
  'Your visor is cracking! Press {FIX} and I will fix you!',
  'Uh oh. That is a lot of cracks. {FIX}! Use {FIX}!',
  'Armour low! I am not panicking. YOU are panicking!',
];
export const PATCH_OD = ['OVERDRIVE! Go go go!', 'Whoa, you are glowing! Is that normal?', 'Maximum moon power!'];
export const CHATTER = [
  ['patch', 'Nice shot!'],
  ['patch', 'Ew. Alien goo on my lens.'],
  ['patch', 'I counted that one. You are welcome.'],
  ['unit', 'Calculating... yep, that one is done.'],
  ['unit', 'I would step aside, but my legs are busy being stuck.'],
  ['unit', 'Please form an orderly line. Thank you.'],
  ['patch', 'Keep going! You are doing great! I think!'],
];

export const ENDING = [
  ['emperor', 'Impossible... a single... machine...'],
  ['nova', 'The Null Emperor is down! The alien army is retreating!'],
  ['nova', 'UNIT-07, you saved the last human colony. Thank you.'],
  ['patch', 'We did it! Well, YOU did it. I mostly screamed.'],
  ['unit', 'Mission complete. Now can someone please get my legs out of this floor?'],
  ['nova', 'Rescue team is on the way. Rest now, UNIT-07.'],
];

export const CREDITS = [
  ['ALIEN ASSAULT', 'big'],
  ['', ''],
  ['STORY, CHARACTERS AND IDEAS', 'head'],
  [CREATOR, ''],
  ['', ''],
  ['CODE, 3D MODELS, MUSIC AND SOUND', 'head'],
  ['CLAUDE', ''],
  ['', ''],
  ['STARRING', 'head'],
  ['UNIT-07 .... THE LAST COMBAT ROBOT', ''],
  ['PATCH .... REPAIR DRONE AND PROFESSIONAL WORRIER', ''],
  ['COMMANDER NOVA .... MISSION COMMANDER', ''],
  ['GENERAL VRAX .... VERY RUDE ALIEN', ''],
  ['THE NULL EMPEROR .... EVEN RUDER ALIEN', ''],
  ['', ''],
  ['ALSO STARRING', 'head'],
  ['ZIPPITS, BRUTECLAWS, VOIDFLIES, RIFTSTALKERS', ''],
  ['', ''],
  ['NO ROBOTS WERE HARMED IN THE MAKING OF THIS GAME', ''],
  ['EXCEPT UNIT-07. A LOT.', ''],
  ['', ''],
  ['THANKS FOR PLAYING!', 'head'],
];
