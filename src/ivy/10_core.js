'use strict';
// ================= Core: screen, random numbers, save file, sound =================
const cv=document.getElementById('c');
const MAIN=cv.getContext('2d');
let g=MAIN; // the pen we draw with (swapped when drawing little pictures in menus)
const TS=40, ROWS=14, VW=960, VH=560;
const $=id=>document.getElementById(id);
const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PI2=Math.PI*2;

function fit(){
  const s=Math.min(innerWidth/VW, innerHeight/VH);
  cv.style.width=Math.floor(VW*s)+'px'; cv.style.height=Math.floor(VH*s)+'px';
}
addEventListener('resize',fit); fit();

// Seeded random numbers: the same level always comes out the same.
function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function hashStr(s){ let h=2166136261; for(const c of s){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
const ri=(r,a,b)=>a+Math.floor(r()*(b-a+1));

// ---------- Save ----------
const SAVE_KEY='ivyQuest.v2';
const SAVE0={coins:0,done:{},best:{},spoons:{},stars:{},cards:{},villains:{},secrets:{},
  owned:{ivy:['classic'],seb:['classic']},wear:{ivy:'classic',seb:'classic'},boosts:{},
  players:'ivy',sound:true,music:true,seenIntro:false,beatGame:false,secretEnd:false,world:0};
let save=JSON.parse(JSON.stringify(SAVE0));
try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); if(s&&typeof s==='object') save=Object.assign(save,s); }catch(e){}
function persist(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(save)); }catch(e){} }
const count=o=>Object.keys(o||{}).length;

// ---------- Sound: little beeps the computer makes ----------
let ac=null, master=null;
function audio(){
  if(!ac){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); master=ac.createGain(); master.gain.value=.8; master.connect(ac.destination); }catch(e){ return null; } }
  if(ac.state==='suspended') ac.resume();
  return ac;
}
function note(freq,when,dur,type='square',vol=.05,slide=0){
  const a=ac; if(!a) return;
  const o=a.createOscillator(), v=a.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,when);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),when+dur);
  v.gain.setValueAtTime(vol,when); v.gain.exponentialRampToValueAtTime(.0001,when+dur);
  o.connect(v); v.connect(master); o.start(when); o.stop(when+dur+.03);
}
function tone(freq,dur,type='square',vol=.05,delay=0,slide=0){
  if(!save.sound) return; const a=audio(); if(!a) return;
  note(freq,a.currentTime+delay,dur,type,vol,slide);
}
const arp=(fs,step=.07,type='triangle',vol=.07)=>fs.forEach((f,i)=>tone(f,.13,type,vol,i*step));
const sfx={
  jump:()=>tone(330,.14,'square',.045,0,300),
  djump:()=>tone(520,.14,'triangle',.06,0,400),
  coin:()=>{tone(988,.06,'square',.04);tone(1319,.12,'square',.04,.05);},
  yum:()=>{tone(784,.08,'triangle',.08);tone(1046,.12,'triangle',.08,.07);},
  stomp:()=>tone(200,.18,'square',.07,0,-140),
  hurt:()=>{tone(220,.2,'sawtooth',.06,0,-120);tone(160,.25,'sawtooth',.05,.12,-80);},
  boing:()=>tone(180,.3,'sine',.14,0,500),
  power:()=>arp([523,659,784,1046,1318],.06),
  heart:()=>{tone(660,.1,'sine',.1);tone(880,.15,'sine',.1,.1);},
  flag:()=>arp([392,523,659],.08),
  win:()=>arp([523,659,784,659,784,1046],.12,'triangle',.08),
  boss:()=>{tone(110,.5,'sawtooth',.08,0,-60);tone(82,.6,'sawtooth',.06,.2,-40);},
  block:()=>tone(150,.08,'square',.07),
  swim:()=>tone(260,.12,'sine',.06,0,180),
  shield:()=>arp([880,660,440],.05,'sine',.08),
  boost:()=>{tone(120,.4,'sawtooth',.08,0,600);},
  slam:()=>{tone(90,.4,'sawtooth',.1,0,-50);tone(60,.5,'square',.06,.05,-30);},
  secret:()=>arp([523,622,784,1046,1245,1568],.09,'sine',.08),
  shoot:()=>tone(440,.12,'triangle',.04,0,-200),
  bossHit:()=>{tone(300,.15,'square',.08,0,-200);tone(150,.3,'sawtooth',.06,.1,-80);},
  select:()=>tone(660,.07,'triangle',.06),
};

// ---------- Music: a tiny tune that changes for every world ----------
const music={timer:null,step:0,next:0,mel:null,bass:null,spb:.15,seed:0};
function startMusic(seed,boss=false){
  stopMusic(); if(!save.music) return; const a=audio(); if(!a) return;
  const r=mulberry(seed*7+3);
  const root=boss?110:[131,147,165,175,196,220][seed%6];
  const scale=boss?[0,3,5,7,10,12,15]:[0,2,4,7,9,12,14,16];
  const hz=s=>root*2*Math.pow(2,s/12);
  music.mel=[]; let idx=3;
  for(let i=0;i<32;i++){ if(r()<(i%4===0?.9:.45)){ idx=clamp(idx+ri(r,-2,2),0,scale.length-1); music.mel.push(hz(scale[idx])); } else music.mel.push(0); }
  const prog=boss?[0,0,3,5]:[0,5,3,4];
  music.bass=prog.map(d=>root*Math.pow(2,(scale[d%scale.length]-12)/12));
  music.spb=boss?.12:.15; music.step=0; music.next=a.currentTime+.1;
  music.timer=setInterval(()=>{
    if(!ac||!save.music) return;
    while(music.next<ac.currentTime+.3){
      const s=music.step, f=music.mel[s%32];
      if(f) note(f,music.next,music.spb*1.6,'triangle',.028);
      if(s%4===0) note(music.bass[Math.floor(s/8)%4],music.next,music.spb*3,'square',.018);
      if(s%2===1) note(2400,music.next,.03,'square',.006);
      music.step++; music.next+=music.spb;
    }
  },90);
}
function stopMusic(){ clearInterval(music.timer); music.timer=null; }
