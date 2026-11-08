// ================= Music: the soundtrack =================
// Each song is written like sheet music, one 8th note per word:
//   C5 = play note C in octave 5    - = keep holding the note    . = quiet
//   | splits the bars (8 eighth notes per bar)
// Drums: k = kick (boom)   s = snare (tsh)   h = hi-hat (tk)   . = quiet
const SONGS={
  title:{name:'Quest for More Dessert',bpm:120,lead:'square',leadVol:.05,arp:true,
    mel:`C5 . E5 G5 C6 - B5 G5 | A5 - G5 E5 F5 - E5 D5 | C5 . E5 G5 C6 - D6 E6 | D6 - B5 G5 C6 - - . |
         F5 - A5 C6 E5 - G5 C6 | D5 - F5 A5 G5 - - . | A5 G5 F5 E5 D5 E5 F5 D5 | C5 - G4 - C5 - - .`,
    bass:`C3 . C3 . G2 . C3 . | F2 . F2 . C3 . F2 . | C3 . C3 . G2 . C3 . | G2 . G2 . D3 . G2 . |
          F2 . F2 . C3 . F2 . | D3 . D3 . G2 . G2 . | F2 . F2 . G2 . G2 . | C3 . G2 . C3 . . .`,
    drums:'k.h.s.h.|k.h.s.hk|k.h.s.h.|k.h.s.ss'},
  w1:{name:'Candy Forest Hop',bpm:132,lead:'square',leadVol:.045,arp:true,
    mel:`G5 . B5 D6 B5 . G5 . | A5 . C6 E6 D6 - . . | G5 . B5 D6 G6 - F#6 E6 | D6 - B5 - A5 - . . |
         E5 . G5 B5 C6 - B5 A5 | D5 . F#5 A5 B5 - A5 G5 | C6 B5 A5 G5 F#5 G5 A5 F#5 | G5 - D5 - G5 - - .`,
    bass:`G2 . D3 . G2 . D3 . | A2 . E3 . D3 . A2 . | G2 . D3 . G2 . B2 . | D3 . A2 . D3 . F#2 . |
          C3 . G2 . C3 . E3 . | D3 . A2 . G2 . B2 . | C3 . C3 . D3 . D3 . | G2 . D3 . G2 . . .`,
    drums:'k.h.s.h.|k.hks.h.'},
  w2:{name:'Gingerbread March',bpm:112,lead:'square',leadVol:.045,arp:false,
    mel:`F5 . F5 G5 A5 . F5 . | A#5 . A5 G5 A5 . . . | C6 . A5 F5 G5 . E5 C5 | F5 . E5 D5 C5 - . . |
         A5 . A5 A#5 C6 . A5 . | D6 . C6 A#5 A5 . G5 . | F5 A5 G5 E5 F5 . C5 . | F5 - . . F4 . . .`,
    bass:`F2 . C3 . F2 . C3 . | A#2 . F3 . A#2 . F3 . | F2 . C3 . C3 . G2 . | F2 . C3 . F2 . . . |
          F2 . C3 . F2 . C3 . | A#2 . F3 . A#2 . C3 . | F2 . C3 . F2 . C3 . | F2 . . . F2 . . .`,
    drums:'k.s.k.s.|k.s.k.ss'},
  w3:{name:'Frosting Peaks Snowfall',bpm:100,lead:'triangle',leadVol:.09,arp:true,bell:true,
    mel:`E6 . B5 . G5 . B5 . | D6 . A5 . F#5 . A5 . | C6 . G5 . E5 . G5 . | B5 - - - . . . . |
         E6 . F#6 . G6 . F#6 E6 | D6 . E6 . F#6 - D6 . | C6 B5 A5 G5 A5 . B5 . | E5 - - - . . . .`,
    bass:`E3 - - - B2 - - - | D3 - - - A2 - - - | C3 - - - G2 - - - | B2 - - - B2 - - - |
          E3 - - - B2 - - - | D3 - - - A2 - - - | C3 - - - D3 - - - | E3 - - - E2 - - -`,
    drums:'k...h.h.|h...h.h.'},
  w4:{name:'Donut Mountain Groove',bpm:118,lead:'square',leadVol:.045,arp:false,
    mel:`A5 . . C6 . A5 G5 . | E5 . G5 . A5 - . . | A5 . . C6 . D6 E6 . | D6 C6 A5 . G5 - . . |
         F5 . . A5 . C6 D6 . | E6 . D6 . C6 . A5 . | G5 . A5 . C6 . D6 . | A5 - - . . . . .`,
    bass:`A2 . A2 A3 . A2 G2 . | E2 . E2 E3 . E2 G2 . | A2 . A2 A3 . A2 C3 . | D3 . D3 D2 . E2 G2 . |
          F2 . F2 F3 . F2 A2 . | C3 . C3 C2 . E2 G2 . | G2 . G2 G3 . G2 G#2 . | A2 . A2 E2 . A2 . .`,
    drums:'k.hsk.hs|k.hskkhs'},
  w5:{name:'The Royal Sugar Fanfare',bpm:108,lead:'square',leadVol:.05,arp:true,
    mel:`D5 . F#5 A5 D6 - - . | C#6 . B5 A5 B5 - A5 . | G5 . B5 D6 G6 - F#6 E6 | F#6 - - . A5 - . . |
         D6 . C#6 B5 A5 . G5 F#5 | E5 . F#5 G5 A5 - . . | B5 A5 G5 F#5 E5 . C#5 . | D5 - - - D6 - - .`,
    bass:`D3 . A2 . D3 . A2 . | A2 . E3 . G2 . D3 . | G2 . D3 . G2 . E3 . | D3 . A2 . D3 . A2 . |
          B2 . F#2 . F#2 . B2 . | E2 . B2 . A2 . E3 . | G2 . G2 . A2 . A2 . | D3 . A2 . D2 . . .`,
    drums:'k.s.k.s.|k.s.ksss'},
  w6:{name:'Chocolate Volcano Rumble',bpm:140,lead:'sawtooth',leadVol:.035,arp:false,
    mel:`D5 . D5 F5 . D5 A5 . | G5 . F5 E5 F5 - . . | D5 . D5 F5 . A5 C6 . | A#5 . A5 G5 A5 - . . |
         A#5 . A5 G5 . F5 E5 . | F5 . E5 D5 E5 - C#5 . | D5 F5 A5 D6 C6 A#5 A5 G5 | A5 - - . . . . .`,
    bass:`D2 D3 D2 D3 D2 D3 D2 D3 | A#1 A#2 A#1 A#2 C2 C3 C2 C3 | D2 D3 D2 D3 D2 D3 D2 D3 | G1 G2 G1 G2 A1 A2 A1 A2 |
          A#1 A#2 A#1 A#2 A#1 A#2 A#1 A#2 | A1 A2 A1 A2 A1 A2 A1 A2 | D2 D3 D2 D3 F2 F3 G2 G3 | A1 A2 A1 A2 A1 A2 C#2 C#3`,
    drums:'k.skk.s.|k.skk.ss'},
  w7:{name:'Licorice Castle Creep',bpm:96,lead:'square',leadVol:.04,arp:false,spooky:true,
    mel:`A4 . C5 . E5 . D#5 . | E5 - - . . . . . | F5 . E5 . D5 . C5 . | B4 - - . G#4 - . . |
         A4 . C5 . E5 . A5 . | G#5 - - . F5 . E5 . | D5 . F5 . E5 . B4 . | A4 - - - . . . .`,
    bass:`A2 - E3 - A2 - E3 - | A2 - E3 - G#2 - E3 - | D2 - A2 - D2 - A2 - | E2 - B2 - E2 - G#2 - |
          A2 - E3 - A2 - E3 - | E2 - B2 - E2 - B2 - | D2 - A2 - E2 - G#2 - | A2 - E2 - A1 - - -`,
    drums:'k...s...|k.k.s..h'},
  bonus:{name:'Pudding Island Party',bpm:126,lead:'triangle',leadVol:.09,arp:true,
    mel:`E5 . G5 . C6 . G5 E5 | F5 . A5 . D6 . A5 F5 | E5 . G5 . C6 . E6 . | D6 . B5 . G5 - . . |
         C6 . A5 F5 . A5 C6 . | B5 . G5 E5 . G5 B5 . | A5 G5 F5 E5 D5 E5 F5 G5 | C5 - - . . . . .`,
    bass:`C3 . . C3 G2 . C3 . | F2 . . F2 C3 . F2 . | C3 . . C3 G2 . C3 . | G2 . . G2 D3 . G2 . |
          F2 . . F2 C3 . F2 . | E2 . . E2 B2 . E2 . | D2 . . D2 G2 . G2 . | C3 . . C3 G2 . C3 .`,
    drums:'k.hsk.hs|khhsk.hs'},
  boss:{name:'Villain Showdown',bpm:160,lead:'sawtooth',leadVol:.035,arp:false,
    mel:`E5 . E5 G5 . E5 B5 . | A5 G5 F#5 G5 - . . . | E5 . E5 G5 . B5 D6 . | C6 B5 A5 B5 - . . . |
         C6 . C6 B5 . A5 G5 . | A5 . G5 F#5 G5 . E5 . | F#5 . F#5 G5 A5 . B5 . | B5 - A#5 - B5 - - .`,
    bass:`E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 D2 D3 D2 D3 | E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 B1 B2 B1 B2 |
          A1 A2 A1 A2 A1 A2 A1 A2 | C2 C3 C2 C3 C2 C3 C2 C3 | D2 D3 D2 D3 D2 D3 D2 D3 | B1 B2 B1 B2 B1 B2 B1 B2`,
    drums:'k.skk.sh|kks.k.ss'},
  final:{name:'Lord Licorice\'s Last Stand',bpm:168,lead:'sawtooth',leadVol:.04,arp:true,
    mel:`C5 . D#5 G5 C6 . G5 . | G#5 - G5 F5 G5 - . . | C5 . D#5 G5 C6 . D6 . | D#6 - D6 C6 D6 - . . |
         G#5 . G5 F5 D#5 . F5 . | G5 . F5 D#5 D5 . B4 . | C5 D#5 G5 C6 D#6 D6 C6 B5 | C6 - - . . . . .`,
    bass:`C2 C3 C2 C3 C2 C3 C2 C3 | G#1 G#2 G#1 G#2 G#1 G#2 G#1 G#2 | C2 C3 C2 C3 C2 C3 C2 C3 | G1 G2 G1 G2 G1 G2 G1 G2 |
          G#1 G#2 G#1 G#2 G#1 G#2 G#1 G#2 | G1 G2 G1 G2 G1 G2 G1 G2 | C2 C3 C2 C3 C2 C3 C2 C3 | G1 G2 G1 G2 B1 B2 B1 B2`,
    drums:'kskskkss|ksksksss'},
  win:{name:'Victory!',bpm:150,lead:'square',leadVol:.06,arp:false,once:true,
    mel:`C5 E5 G5 C6 - - G5 C6 | E6 - - - . . . .`,
    bass:`C3 . G2 . C3 . G2 . | C3 - - - . . . .`,
    drums:'k.k.s.ss|k.......'},
  ending:{name:'The Ultimate Dessert',bpm:92,lead:'triangle',leadVol:.1,arp:true,bell:true,
    mel:`C5 . E5 G5 C6 - B5 G5 | A5 - G5 E5 F5 - E5 D5 | C5 . E5 G5 C6 - D6 E6 | D6 - B5 G5 C6 - - . |
         F5 - A5 C6 E5 - G5 C6 | D5 - F5 A5 G5 - - . | A5 G5 F5 E5 D5 E5 F5 D5 | C5 - - - - - - .`,
    bass:`C3 - - - G2 - - - | F2 - - - C3 - - - | C3 - - - G2 - - - | G2 - - - D3 - - - |
          F2 - - - C3 - - - | D3 - - - G2 - - - | F2 - - - G2 - - - | C3 - - - - - - -`,
    drums:'h...h...|h...h.h.'},
};

// Turn the written notes into a list of sounds.
const NOTE_IDX={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
function noteHz(n){ const m=/^([A-G]#?)(\d)$/.exec(n); if(!m) return 0; return 440*Math.pow(2,(NOTE_IDX[m[1]]+(+m[2]+1)*12-69)/12); }
function parseLine(txt){
  const toks=txt.replace(/\|/g,' ').trim().split(/\s+/); const ev=[];
  toks.forEach((t,i)=>{ if(t==='-'||t==='.') return; let len=1; while(toks[i+len]==='-') len++; ev.push({step:i,hz:noteHz(t),len}); });
  return {ev,steps:toks.length};
}
for(const k in SONGS){ const S=SONGS[k]; S.m=parseLine(S.mel); S.b=parseLine(S.bass); S.d=S.drums.replace(/\|/g,''); S.steps=Math.max(S.m.steps,S.b.steps); }

// ---------- Instruments ----------
let musicBus=null, noiseBuf=null;
function musicOut(){
  const a=audio(); if(!a) return null;
  if(!musicBus){ musicBus=a.createGain(); musicBus.gain.value=.9; musicBus.connect(master);
    noiseBuf=a.createBuffer(1,a.sampleRate*.5,a.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
  return musicBus;
}
function mNote(hz,when,dur,type,vol,opts={}){
  const a=ac, o=a.createOscillator(), v=a.createGain();
  o.type=type; o.frequency.setValueAtTime(hz,when);
  if(opts.vibrato){ const lfo=a.createOscillator(), lg=a.createGain(); lfo.frequency.value=5.5; lg.gain.value=hz*.008; lfo.connect(lg); lg.connect(o.frequency); lfo.start(when+.08); lfo.stop(when+dur+.05); }
  const atk=.008, rel=opts.bell?dur:Math.min(.08,dur*.3);
  v.gain.setValueAtTime(.0001,when); v.gain.exponentialRampToValueAtTime(vol,when+atk);
  if(opts.bell) v.gain.exponentialRampToValueAtTime(.0001,when+dur);
  else { v.gain.setValueAtTime(vol*.7,when+Math.max(atk,dur-rel)); v.gain.exponentialRampToValueAtTime(.0001,when+dur); }
  o.connect(v); v.connect(musicBus); o.start(when); o.stop(when+dur+.05);
}
function drum(kind,when){
  const a=ac;
  if(kind==='k'){ const o=a.createOscillator(), v=a.createGain(); o.frequency.setValueAtTime(150,when); o.frequency.exponentialRampToValueAtTime(45,when+.12);
    v.gain.setValueAtTime(.22,when); v.gain.exponentialRampToValueAtTime(.0001,when+.16); o.connect(v); v.connect(musicBus); o.start(when); o.stop(when+.18); return; }
  const src=a.createBufferSource(), f=a.createBiquadFilter(), v=a.createGain(); src.buffer=noiseBuf;
  f.type='highpass'; f.frequency.value=kind==='s'?1200:7000;
  const len=kind==='s'?.13:.035, vol=kind==='s'?.09:.035;
  v.gain.setValueAtTime(vol,when); v.gain.exponentialRampToValueAtTime(.0001,when+len);
  src.connect(f); f.connect(v); v.connect(musicBus); src.start(when,Math.random()*.3); src.stop(when+len+.02);
}

// ---------- Player ----------
const music={timer:null,song:null,step:0,next:0};
function playSong(name){
  if(music.song===name&&music.timer) return; // already playing
  stopMusic(); if(!save.music) return;
  const out=musicOut(); if(!out) return;
  const S=SONGS[name]; if(!S) return;
  music.song=name; music.step=0; music.next=ac.currentTime+.08;
  const spb=60/S.bpm/2;
  const mi=new Map(S.m.ev.map(e=>[e.step,e])), bi=new Map(S.b.ev.map(e=>[e.step,e]));
  music.timer=setInterval(()=>{
    if(!ac||!save.music) return;
    while(music.next<ac.currentTime+.25){
      const s=music.step;
      if(S.once&&s>=S.steps){ stopMusic(); return; }
      const i=s%S.steps, t=music.next;
      const m=mi.get(i); if(m){ const d=m.len*spb*.95; mNote(m.hz,t,d,S.lead,S.leadVol,{vibrato:m.len>=3&&!S.bell,bell:S.bell}); if(S.bell) mNote(m.hz*2,t,d*.6,'sine',S.leadVol*.25,{bell:true}); }
      const b=bi.get(i); if(b){ mNote(b.hz,t,b.len*spb*.9,'triangle',.11); mNote(b.hz,t,Math.min(b.len*spb*.5,.12),'square',.018); }
      if(S.arp&&b===undefined&&s%2===1){ // sparkly echo notes: the bass note, one or two octaves up
        let root=null; for(let k=i;k>=0;k--){ const e=bi.get(k); if(e){ root=e.hz; break; } }
        if(root) mNote(root*(s%4===1?4:6),t,spb*.6,'triangle',.018,{bell:true});
      }
      const dch=S.d[i%S.d.length]; if(dch&&dch!=='.') drum(dch,t);
      if(S.spooky&&i%16===0) mNote(noteHz('A1'),t,spb*8,'sawtooth',.012);
      music.step++; music.next+=spb;
    }
  },60);
}
function stopMusic(){ clearInterval(music.timer); music.timer=null; music.song=null; }
function songForLevel(boss){
  const L=G.L;
  if(boss) return (G.id==='7-4'||L.boss==='licorice'||G.final)?'final':'boss';
  if(L.wi>=7||L.kind==='secret') return 'bonus';
  return 'w'+(L.wi+1);
}
// Browsers only allow sound after you click or press a key, so start the title song then.
function firstTouch(){ audio(); if(mode==='menu'&&!music.timer) playSong('title'); }
addEventListener('pointerdown',firstTouch); addEventListener('keydown',firstTouch);
