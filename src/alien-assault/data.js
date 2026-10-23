import { isTouch } from './state.js';

// Words in {CURLY} get swapped for the right button names (keyboard or touch).
const KEYS = isTouch
  ? { FIX: 'the FIX button', OD: 'the OVERDRIVE button', JUMP: 'the JUMP button', DASH: 'a DASH button', AIM: 'Touch and hold where you want to shoot', FIRE: '' }
  : { FIX: 'Q', OD: 'SHIFT', JUMP: 'SPACE', DASH: 'A or D', AIM: 'Aim with the mouse and hold the mouse button', FIRE: '' };
export const fill = s => s.replace(/\{(\w+)\}/g, (_, k) => KEYS[k] ?? k);

export const CREATOR = 'SEBASTIAN BOWLES';

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
  // ===== CHAPTER 2: THE JUNGLE PLANET =====
  {
    chapter: 2, title: 'JUNGLE DROP', sub: 'A jungle planet. A rail cart. No brakes.', music: 'jungle', rail: 7,
    spawns: { soldier: 8, bug: 6 }, maxAlive: 5, gap: [1.0, 2.0],
    intro: [
      ['nova', 'UNIT-07, the missing colonists were taken to this jungle planet. We have to find them.'],
      ['patch', 'Good news: I fixed your legs! Bad news: I bolted you to a rail cart. It was the only ride left.'],
      ['unit', 'A robot on a roller coaster. My day keeps getting better.'],
      ['nova', 'Alien jungle soldiers ahead. Stay on the cart and keep shooting.'],
    ],
    outro: [['nova', 'Good. Keep following the rails.'], ['patch', 'I think I left my stomach back there.']],
  },
  {
    chapter: 2, title: 'THE GREEN TEETH', sub: 'Even the plants want to eat you.', music: 'jungle', rail: 7,
    spawns: { plant: 10, bug: 6 }, maxAlive: 6, gap: [0.8, 1.6],
    intro: [
      ['patch', 'Scanning the plants... Oh no. The plants have TEETH.'],
      ['nova', 'Shoot their heads before they spit acid. If one bites as you pass, DASH away.'],
    ],
    outro: [['unit', 'Gardening complete.'], ['patch', 'I am never complaining about weeds again.']],
  },
  {
    chapter: 2, title: 'SWAMP RUN', sub: 'Something lives in the glowing water.', music: 'jungle', rail: 6,
    spawns: { swamp: 7, soldier: 6, plant: 4 }, maxAlive: 6, gap: [0.9, 1.8],
    intro: [
      ['nova', 'The rails go straight through a swamp. Watch the glowing pools.'],
      ['patch', 'Swamp monsters throw mud bombs! Shoot the bombs out of the air!'],
    ],
    outro: [['nova', 'Through the swamp. I am picking up human life signs ahead.'], ['patch', 'Humans? Survivors? Finally some good news!']],
  },
  {
    chapter: 2, title: 'THE COLONISTS', sub: 'We found them. Something is wrong.', music: 'mutant', rail: 6,
    spawns: { mutant: 10, bug: 4 }, maxAlive: 5, gap: [1.2, 2.2],
    intro: [
      ['patch', 'I see people! Hello! We are here to save you! ...Why are their eyes red?'],
      ['nova', 'Those... are the colonists. The aliens changed them. They are not human anymore.'],
      ['unit', 'They are coming at us. Fast.'],
      ['nova', 'Human mutants. When one leaps at you, DASH. Do not let it reach your visor.'],
    ],
    outro: [['patch', 'I do not like this. I really, really do not like this.'], ['nova', 'Stay focused, UNIT-07. We need to find who did this.']],
  },
  {
    chapter: 2, title: 'NIGHT IN THE JUNGLE', sub: 'Lights out. Headlamp on.', music: 'mutant', rail: 5, night: true,
    spawns: { mutant: 10, plant: 5, bug: 5 }, maxAlive: 6, gap: [1.0, 2.0],
    intro: [
      ['nova', 'Night is falling. Your headlamp is on, but it will not show you everything.'],
      ['patch', 'Why is it so quiet? I hate when it is quiet.'],
      ['unit', 'Listen. Something is moving in the trees.'],
    ],
    outro: [['patch', 'Sunrise! I have never been so happy to see a sun. Either sun.'], ['nova', 'The signals are all coming from one place. The nest.']],
  },
  {
    chapter: 2, title: 'THE NEST', sub: 'Everything the jungle has left.', music: 'jungle', rail: 7,
    spawns: { mutant: 8, soldier: 6, bug: 6, swamp: 3, plant: 4 }, maxAlive: 8, gap: [0.6, 1.4],
    intro: [
      ['nova', 'This is where the aliens changed the colonists. Destroy everything.'],
      ['patch', 'Overdrive, repairs, moon blasts. Use EVERYTHING!'],
    ],
    outro: [['nova', 'Wait. Something huge is tearing through the trees toward you.'], ['patch', 'I would like to get off the ride now please.']],
  },
  {
    chapter: 2, title: 'PATIENT ZERO', sub: 'The first colonist they changed.', music: 'patient', boss: 'patient', rail: 8,
    intro: [
      ['nova', 'That is Patient Zero. The very first colonist the aliens mutated.'],
      ['patch', 'There is an alien parasite in its chest! When it screams, its chest opens. Shoot the parasite!'],
      ['unit', 'Then I will give it something to scream about.'],
    ],
    outro: [],
  },
];

export const SCANS = {
  soldier: { name: 'JUNGLE SOLDIER', role: 'ALIEN TROOPER', info: 'A Zippit in camouflage with a blaster. Keeps its distance and shoots.', weak: 'LOW HEALTH', line: 'Scanning... It is wearing leaves as a hat. Very fashionable.' },
  bug: { name: 'GIANT BUG', role: 'JUNGLE BEAST', info: 'Huge mantis-beetle. Skitters fast and LEAPS at the cart.', weak: 'SOFT HEAD', line: 'Scanning... That bug is bigger than me. Why is it bigger than me?' },
  plant: { name: 'ALIEN PLANT', role: 'JUNGLE TRAP', info: 'Grows beside the rails. Spits ACID. Bites if you pass too close - DASH!', weak: 'ITS HEAD', line: 'Scanning... Plant. Teeth. Plant with teeth. Nope.' },
  swamp: { name: 'SWAMP MONSTER', role: 'AMBUSH ENEMY', info: 'Rises from glowing pools and throws MUD BOMBS. Shoot the bombs!', weak: 'BIG YELLOW EYE', line: 'Scanning... Ew. It smells like a sock full of soup.' },
  mutant: { name: 'HUMAN MUTANT', role: 'CHANGED COLONIST', info: 'A colonist the aliens changed. Very fast. LEAPS at your visor - DASH!', weak: 'STILL HUMAN SIZE', line: 'Scanning... It is human. It WAS human. I need a minute.' },
  patient: { name: 'PATIENT ZERO', role: 'CHAPTER 2 BOSS', info: 'Throws trees, smashes the ground, screams for more mutants.', weak: 'CHEST PARASITE OPENS WHEN IT SCREAMS', line: 'Scanning... Scanner says it is ninety percent anger.' },
  zippit: { name: 'ZIPPIT', role: 'BASIC ENEMY', info: 'Runs fast and attacks with claws. Special: QUICK DASH.', weak: 'LOW HEALTH', line: 'Scanning... It is small, green, and very rude.' },
  bruteclaw: { name: 'BRUTECLAW', role: 'HEAVY ENEMY', info: 'Four arms. Absorbs damage. GROUND SLAM makes a shockwave - JUMP!', weak: 'SLOW MOVEMENT', line: 'Scanning... That is a lot of arms. Why so many arms?' },
  voidfly: { name: 'VOIDFLY', role: 'FLYING ENEMY', info: 'Hovers and fires a TRIPLE ENERGY BLAST. Shoot the bolts or DASH.', weak: 'FRAGILE ARMOUR', line: 'Scanning... Flying eyeball. My least favourite kind of eyeball.' },
  riftstalker: { name: 'RIFTSTALKER', role: 'ELITE ENEMY', info: 'Sniper. Hides behind cover. Turns INVISIBLE. Red laser = DODGE!', weak: 'CLOSE RANGE (3X DAMAGE)', line: 'Scanning... Sniper! Watch for the red laser!' },
  vrax: { name: 'GENERAL VRAX', role: 'FIRST MAJOR BOSS', info: 'Blade strikes, ground slams, summons Zippits. Special: SPINNING BLADE STORM.', weak: 'EXHAUSTED AFTER BIG ATTACKS', line: 'Scanning... Big sword. Bigger ego.' },
  emperor: { name: 'THE NULL EMPEROR', role: 'FINAL BOSS', info: 'Energy beams, explosive bombs, shockwaves. Special: RIFT COLLAPSE.', weak: 'CHEST CORE OPENS AFTER BIG ATTACKS', line: 'Scanning... Scanner says: RUN. I am ignoring the scanner.' },
};

// difficulty: how much damage you take, and how tough the aliens are
export const DIFFS = [
  { name: 'RECRUIT', hurt: 0.6, hp: 0.8 },
  { name: 'SOLDIER', hurt: 1, hp: 1 },
  { name: 'COMMANDER', hurt: 1.4, hp: 1.25 },
];
export const UPGRADES = [
  { id: 'rapid', name: 'RAPID CORE', desc: 'Fire 30% faster' },
  { id: 'heavy', name: 'HEAVY MOON', desc: 'Moon blasts do 50% more damage' },
  { id: 'plating', name: 'REINFORCED PLATING', desc: '+30 max armour' },
  { id: 'capacitor', name: 'OVERDRIVE CAPACITOR', desc: 'Overdrive lasts 4 seconds longer' },
  { id: 'turbo', name: 'PATCH TURBO', desc: 'Emergency Repair recharges twice as fast' },
  { id: 'twin', name: 'TWIN MOONS', desc: 'Fire two moon blasts at once' },
  { id: 'big', name: 'FULL MOON', desc: 'Bigger moon blasts that are easier to hit with' },
  { id: 'laser', name: 'PLASMA LASER', desc: 'A melting beam weapon. Press 2 for laser, 1 for moons' },
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
  ['patch', 'Fun fact: I am ninety percent screws and ten percent worry.'],
  ['patch', 'Left! No, right! No, the other left!'],
  ['patch', 'That one exploded into goo. I am naming it Gooey.'],
  ['patch', 'Is it snack time? Robots do not eat. I just like asking.'],
  ['patch', 'I scanned your aim. It is very good. I scanned my aim. It is very bad.'],
  ['patch', 'If we survive this, I want a medal. A small one. Shiny.'],
  ['patch', 'Your blaster is getting hot! That is normal! Probably!'],
  ['patch', 'Commander Nova, are you watching? We are doing SO good.'],
  ['unit', 'Patch. Less talking. More repairing.'],
  ['unit', 'Target neutralised. Next.'],
];
// extra things Patch says only on the jungle planet
export const CHATTER2 = [
  ['patch', 'This jungle smells like old socks and bananas.'],
  ['patch', 'Are we going too fast? I think we are going too fast!'],
  ['patch', 'A bug landed on me. A HUGE bug. Get it off. GET IT OFF.'],
  ['patch', 'Those mushrooms glow. Do not eat the glowing mushrooms.'],
  ['patch', 'I can see the rails ahead. And teeth. Lots of teeth.'],
  ['unit', 'Note to self: never ride a jungle roller coaster again.'],
  ['patch', 'Wheee! I mean, oh no. I mean, wheee!'],
];

export const ENDING2 = [
  ['nova', 'Patient Zero is down. The parasite is destroyed.'],
  ['patch', 'Look! The mutants are falling asleep. Maybe we can help them now.'],
  ['nova', 'There is a lab under the nest. Someone was here before the aliens.'],
  ['patch', 'There is a message on the screen... It says: UNIT-07, YOU WERE NOT THE LAST.'],
  ['unit', 'Who wrote that? And how do they know my name?'],
  ['nova', 'I do not know. But we are going to find out.'],
];
export const ENDING = [
  ['emperor', 'Impossible... a single... machine...'],
  ['nova', 'The Null Emperor is down! The alien army is retreating!'],
  ['nova', 'UNIT-07, you saved the last human colony. Thank you.'],
  ['patch', 'We did it! Well, YOU did it. I mostly screamed.'],
  ['unit', 'Mission complete. Now can someone please get my legs out of this floor?'],
  ['nova', 'Rescue team is on the way. Rest now, UNIT-07.'],
  ['nova', 'Wait. A distress signal. The missing colonists... they were taken to a jungle planet.'],
  ['unit', 'Of course they were. CHAPTER 2 it is.'],
];

export const CREDITS = [
  ['PROJECT: STARFORGE', 'big'],
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
  ['CHAPTER 2: THE JUNGLE PLANET', 'head'],
  ['PATIENT ZERO .... VERY ANGRY FORMER COLONIST', ''],
  ['THE UNKNOWN SCIENTIST .... ???', ''],
  ['', ''],
  ['THANKS FOR PLAYING!', 'head'],
];
