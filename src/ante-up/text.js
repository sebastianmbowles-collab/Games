// Papers you can find in the cellar.
export const DOCS = {
  edward: {
    title: 'Diary of E. Hale',
    pages: [
      { title: 'October the 9th, 1931', body: '<p>I am Edward Hale, clockmaker, of Weller Street. I write this by the light of his candle, which he tells me is the only light there will ever be.</p><p>I do not remember coming here. I remember rain, and a man under the streetlamp shuffling a deck of cards, and a voice asking whether I would like to play. I have always been good at games. Father said I would win anything I set my mind to.</p>' },
      { title: 'Later. I think.', body: '<p>He cheats. Of course he cheats. But his body cannot keep a secret.</p><p>When his shoulders spread out like a cobra\'s hood, <b>he is certain he will win.</b> When the smoke pulls tight and dense and black, <b>he is lying.</b> And when his teeth twitch and flicker (I have only seen it twice) <b>he is afraid.</b></p><p>He is not used to being afraid.</p>' },
      { title: 'The watch', body: '<p>I have learned something tonight, and I must write it down before I forget it.</p><p>My pocket watch slipped from my waistcoat and rolled beneath the table, into the blackest part of the dark, where no candlelight reaches. He looked for it. He looked <i>straight at it</i> and could not find it.</p><p class="red"><b>He cannot see what lies wholly in absolute shadow.</b></p><p>Not partly. Wholly. A man could hide a great deal in the dark. Perhaps even himself.</p>' },
      { title: 'To whoever finds this', body: '<p>I keep these pages under the loose board behind my chair. I hid the screwdriver in the drain so he would not wonder at it.</p><p>If you are reading this, then I did not finish either.</p><p>Do not be afraid of losing to him. <b>Be afraid of winning the way he wants you to.</b></p>', sig: 'E.H.' },
    ],
  },
  marguerite: {
    title: 'A letter, folded small',
    cls: 'hand',
    pages: [
      { title: 'Rosie,', body: '<p>If this ever reaches you it will be a miracle, and I have stopped believing in those.</p><p>The teeth on the table are real. I counted them in the dark: one hundred and twelve. Some of them have fillings. I keep thinking one of them might be mine one day.</p>' },
      { title: '', body: '<p>I found matches in my coat. Eleven of them. I hid them here behind the stone, because I could not think of a single thing worth burning that he would let me burn.</p><p>Maybe whoever reads this will think of something.</p><p>Tell Mum I was brave.</p>', sig: 'Margie, 1962' },
    ],
  },
  tomas: {
    title: "Tomás's notebook",
    cls: 'blue',
    pages: [
      { title: 'Day 3??', body: '<p>Watch stopped. Whatever. This house is OLDER than the cellar, I swear. The stones up top are 1880s, I did a school project on houses like this.</p><p>There is a gas line. I can hear it hissing behind the <b>east wall</b> when he goes away.</p>' },
      { title: 'Day ?', body: '<p>If somebody had <b>oil</b>, and a <b>light</b>, and knew where the <b>valve</b> was, they could burn this whole place down. Everything. The cards, the chair, HIM.</p><p>But I think it would take the parts of you he\'s holding too. Memories. Names. Who you are.</p><p>I don\'t know if I\'d do it. I want to remember my mom.</p>' },
      { title: 'later', body: '<p>Found a pair of dice in my pocket from the arcade. They\'re honest. His aren\'t. His always roll what he wants.</p><p>I\'m going to hide mine somewhere cold where he won\'t smell them. If you find them, swap them in when he isn\'t looking.</p>', sig: '— T.R. 1994' },
    ],
  },
  drawing: {
    title: "A child's drawing",
    cls: 'hand',
    pages: [{ title: 'NELL 1908', body: '<p>Three stick figures: a tall one in a hat, one in a skirt, a small one in between. Beside them, a black dog with one red eye.</p><p>Underneath, in crayon: <i>mama papa me</i>.</p><p>On the back, smaller: <i>the woolf ate papa first</i>.</p>' }],
  },
  silas: {
    title: 'A ledger page',
    cls: 'hand',
    pages: [{ title: 'LEDGER of S. CRANE, Esq.', body: '<p>Gaming accounts, Crane House, 1887.</p><p><b>Won:</b> every hand. Every match. Every game he set before me.<br><b>Lost:</b> nothing.<br><b>Owed:</b> &mdash;</p><p>I played him perfectly. I broke no rule. And when the last die stopped, I found I could not rise from the chair. The smoke came up through the floorboards and into my sleeves, and the shackle did not open.</p><p class="red">I am the house now. The house always wins.</p>' }],
  },
  map: {
    title: 'House plan',
    cls: 'blue',
    pages: [{ title: 'CRANE HOUSE: CELLAR & GAS LINE, 1887', body: '<p>Main valve: <b>east wall, behind the third stone</b>, knee height.</p><p>Line runs up to the kitchen. Cellar is beneath the whole house. Stair door, north-east corner.</p><p class="red">DO NOT OPEN NEAR AN OPEN FLAME.</p>' }],
  },
  lastpage: {
    title: "Edward's last page",
    pages: [{ title: 'To whoever sits in my chair', body: '<p>I won. I won every game, honestly, exactly the way he wanted, and the chair kept me. <b>I am the one across the table now.</b> Silas is in here too, and others, older.</p><p>There is not much of me left, but enough to write this while he sleeps in the cold. Listen:</p><p class="red"><b>He only exists where you look.</b></p><p>In the last game, stop looking at the board. <b>Put out the light</b>, so the whole room is absolute shadow and he cannot see you. Then hold up the glass and <b>show him his face</b>. Show him all of us.</p>', sig: 'E.H.' }],
  },
  dicenote: {
    title: 'A note around two dice',
    cls: 'blue',
    pages: [{ title: '', body: '<p>These are honest.</p><p>His are not.</p>', sig: '— T.R.' }],
  },
};

export const MEMQ = {
  pet: { q: 'Tell me about an animal you loved. What was its name?', ph: 'a name', kq: 'And what was {pet}? A dog? A cat? Something else?', kph: 'what kind of animal' },
  friend: { q: 'Who would you run to, if you ever got out of here? Tell me their name.', ph: 'a name' },
  home: { q: 'Where is home? Name the place.', ph: 'a town, a street, a place' },
};

export const ENDINGS = {
  shattered: { title: 'The Shattered Illusion', hint: 'Darkness is the one place he cannot look. Put out the light, then show him what he is.' },
  hollow: { title: 'The Hollow Chair', hint: 'Win his last game. Exactly the way he wants you to.' },
  consumed: { title: 'The Consumed', hint: 'Let the candle inside you go out where the floor has fallen away, or where the frost is.' },
  sacrificial: { title: 'The Sacrificial Escape', hint: 'Oil. A light. A valve behind a stone. Some fires burn more than wood.' },
};
