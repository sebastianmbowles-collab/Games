// The five bad dreams Leon has, one per night. Each dream is Leon's own
// bedroom, but twisted, and each one wakes up a new monster.

export const MONSTERS = {
  leftDoor: {
    name: 'Shadow Twin (left door)',
    how: 'HOLD THE LEFT DOOR SHUT (hold A) until it gives up, or shine your flashlight at it.',
  },
  rightDoor: {
    name: 'Shadow Twin (right door)',
    how: 'HOLD THE RIGHT DOOR SHUT (hold D) until it gives up, or shine your flashlight at it.',
  },
  window: {
    name: 'The Tall Man',
    how: 'Click the WINDOW to close the curtains. They blow open again after a while, and the room is darker while they are shut.',
  },
  computer: {
    name: 'The Glitch',
    how: 'When the COMPUTER turns on by itself, click it to switch it off before something climbs out.',
  },
  paintings: {
    name: 'The Painted People',
    how: 'When the PAINTINGS open their eyes, do NOT shine your light at them. Hide under the blanket (hold SPACE) until they fall back asleep.',
  },
  underBed: {
    name: 'The Grabber',
    how: 'Shine your light at the END OF THE BED when claws creep up. It sneaks faster while you hide under the blanket!',
  },
}

// Leon's items. He has the same ones every night.
export const ITEMS = [
  { icon: '🔦', name: 'Flashlight', how: 'Hold the mouse to shine it. Only 1 minute of battery for the whole night!' },
  { icon: '🚪', name: 'Hold left door shut', how: 'Hold A (or the button). Your hands are busy, so no flashlight.' },
  { icon: '🚪', name: 'Hold right door shut', how: 'Hold D (or the button). Your hands are busy, so no flashlight.' },
]

export const DREAMS = [
  {
    title: 'Shadows in the Hallway',
    intro: 'Leon hears soft footsteps in the hall. Something is peeking through the doors...',
    threats: ['leftDoor', 'rightDoor'],
    newThreats: ['leftDoor', 'rightDoor'],
    chance: 0.6,
    interval: [4.5, 7.5],
    tint: [30, 40, 110],
  },
  {
    title: 'The Face at the Window',
    intro: 'The wind is howling. A very tall someone is walking across the garden...',
    threats: ['leftDoor', 'rightDoor', 'window'],
    newThreats: ['window'],
    chance: 0.63,
    interval: [4.3, 7],
    tint: [60, 30, 100],
    thunder: true,
  },
  {
    title: 'The Haunted Computer',
    intro: 'Leon\'s computer is supposed to be off. So why is it humming?',
    threats: ['leftDoor', 'rightDoor', 'window', 'computer'],
    newThreats: ['computer'],
    chance: 0.65,
    interval: [4.1, 6.7],
    tint: [20, 80, 50],
  },
  {
    title: 'The Painting People',
    intro: 'The people in the paintings are awake tonight. They do not like the light.',
    threats: ['leftDoor', 'rightDoor', 'window', 'computer', 'paintings'],
    newThreats: ['paintings'],
    chance: 0.66,
    interval: [4.1, 6.7],
    tint: [100, 30, 30],
  },
  {
    title: 'Under the Bed',
    intro: 'The worst dream of all. Something has been hiding under Leon\'s bed the whole time...',
    threats: ['leftDoor', 'rightDoor', 'window', 'computer', 'paintings', 'underBed'],
    newThreats: ['underBed'],
    chance: 0.7,
    interval: [3.9, 6.4],
    tint: [70, 0, 20],
    thunder: true,
  },
]

// What Leon and Mom say at bedtime before each dream.
export const BEDTIME_TALK = [
  [
    ['Mom', 'Time for bed, Leon. Lights out!'],
    ['Leon', 'Can you leave the light on? I\'m scared of the dark...'],
    ['Mom', 'There\'s nothing in the dark that isn\'t there in the day. Here, take your flashlight.'],
  ],
  [
    ['Leon', 'Mom, I had a bad dream about shadows...'],
    ['Mom', 'It was only a dream, sweetie. Dreams can\'t hurt you.'],
    ['Leon', 'Can you close the curtains?'],
    ['Mom', 'They\'re fine open. The moon is your nightlight.'],
  ],
  [
    ['Leon', 'There was a tall man at the window. He smiled at me.'],
    ['Mom', 'Just the old tree in the wind. Now, is your computer switched off?'],
    ['Leon', 'Yes... I think so.'],
  ],
  [
    ['Leon', 'Mom, why do those paintings have eyes that follow you?'],
    ['Mom', 'Grandma painted those! They\'re just watching over you.'],
    ['Leon', 'That\'s what I\'m worried about...'],
  ],
  [
    ['Leon', 'Mom... can you check under my bed?'],
    ['Mom', 'Nothing under there but socks and dust bunnies. You\'ve been so brave, Leon.'],
    ['Leon', 'One more night. I can do this.'],
  ],
]

export const WAKE_LINES = {
  leftDoor: 'The Shadow Twin grabbed Leon from the left door!',
  rightDoor: 'The Shadow Twin grabbed Leon from the right door!',
  window: 'The Tall Man climbed in through the window!',
  computer: 'The Glitch crawled out of the computer!',
  paintings: 'The Painted People climbed out of their frames!',
  underBed: 'The Grabber got Leon\'s feet!',
  fear: 'Leon got too scared of the dark!',
}
