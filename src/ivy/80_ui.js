// ================= Menus, cutscenes, controls, main loop =================
const UI=$('ui'), CARD=$('card');
let previews=[]; // little live drawings inside menus
let curWorld=save.world||0, shopTab='ivy', cutState=null;
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function ui(html,cls=''){
  UI.className=cls; CARD.className='card'+(cls==='cut'?' cutbox':''); CARD.innerHTML=html; CARD.scrollTop=0; UI.hidden=false; $('pauseBtn').hidden=true; $('touch').hidden=true; previews=[];
  const f=CARD.querySelector('.btn:not([disabled]),.lvl:not([disabled])'); if(f) setTimeout(()=>f.focus({preventScroll:true}),30);
}
function showGame(){ UI.hidden=true; $('pauseBtn').hidden=false; $('touch').hidden=!(isTouch&&G&&G.players.length===1); }
function preview(id,fn){ previews.push({id,fn}); }
function drawPreviews(){ for(const p of previews){ const c=$(p.id); if(!c) continue; const x=c.getContext('2d'); x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,c.width,c.height); withCtx(x,()=>p.fn(c.width,c.height)); } }
function heroesPreview(w,h){ fs('rgba(255,126,182,.2)'); ell(w/2,h-16,w*.35,12); drawHero('ivy',w/2-60,h-16,1,t60,'idle',null,2.6); drawHero('seb',w/2+60,h-16,-1,t60+40,'idle',null,2.6); }
function bossPreview(id,w,h,face=-1){ const D=BOSSES[id]; const s=Math.min(w/(D.w*1.3),h/(D.h*1.25));
  g.save(); g.translate(w/2,h*.94); g.scale(s,s); D.draw({id,x:-D.w/2,y:-D.h,w:D.w,h:D.h,t:t60,face,vx:face,st:id==='max'?'big':'idle',hp:3,max:3,hurt:0,alpha:1,ice:[],timer:60,ground:true,rot:0}); g.restore(); }

// ---------- Title ----------
function showTitle(){
  G=null; mode='menu'; if(ac) playSong('title');
  ui(`<h1><small>Ivy and the</small>Quest for More Dessert</h1>
    <canvas id="pv" width="520" height="300" style="width:260px;height:150px"></canvas>
    <p>Save the Dessert Kingdom and find the legendary Ultimate Dessert!</p>
    <div><button class="btn" data-a="play">Play!</button><button class="btn mint" data-a="help">How to play</button><button class="btn choc" data-a="settings">Settings</button></div>`);
  preview('pv',heroesPreview);
}
// ---------- Map ----------
function showMap(){
  G=null; mode='menu'; if(ac) playSong('title');
  const spoons=count(save.spoons), stars=count(save.stars), cards=count(save.cards), vill=count(save.villains);
  const tabs=[...WORLDS.map((W,i)=>({i,label:W.key+'. '+W.name,ok:worldUnlocked(i)})),...BONUS.map((W,b)=>({i:7+b,label:W.name,ok:spoons>=W.need&&isUnlocked(W.key+'-1')||spoons>=W.need,need:W.need}))];
  if(!tabs[curWorld]||!tabs[curWorld].ok) curWorld=0;
  const W=curWorld<7?WORLDS[curWorld]:BONUS[curWorld-7];
  const ids=curWorld<7?[1,2,3,4].map(n=>`${W.key}-${n}`).concat([`${W.key}-S`]):W.stages.map((s,i)=>`${W.key}-${i+1}`);
  const lvBtns=ids.map(id=>{ const L=LEVELS[id], ok=isUnlocked(id);
    if(L.kind==='secret'&&!ok) return `<button class="lvl" disabled style="background:#555"><div class="num">?</div><div>Secret level</div><div class="got">Find the secret door in ${W.key}-2</div></button>`;
    const got=L.kind==='level'?`${save.spoons[id]?'🥄':'·'} ${save.stars[id]?'⭐':'·'} ${save.cards[id]?'🃏':'·'}`:L.kind==='boss'?(save.done[id]?'Defeated!':''):(save.spoons[id]?'🥄':'');
    return `<button class="lvl" data-a="level" data-v="${id}" ${ok?'':'disabled'} style="background:${L.kind==='secret'?'#c98e00':W.color}">
      <div class="num">${ok?(save.done[id]?'✓ ':'')+id:'🔒'}</div><div>${esc(L.name)}</div><div class="got">${ok?got:''}</div></button>`; }).join('');
  const pl=save.players;
  ui(`<h2>The Dessert Kingdom</h2>
    <div class="stats"><span class="chip">🪙 ${save.coins}</span><span class="chip">🥄 ${spoons}/28</span><span class="chip">⭐ ${stars}/21</span><span class="chip">🃏 ${cards}/21</span><span class="chip">😈 ${vill}/12</span></div>
    <div class="tabs">${['ivy','seb','duo'].map(k=>`<button class="tab ${pl===k?'on':''}" data-a="players" data-v="${k}">${{ivy:'1 player: Ivy',seb:'1 player: Sebastian',duo:'2 players'}[k]}</button>`).join('')}</div>
    <div class="tabs">${tabs.map(t=>`<button class="tab ${t.i===curWorld?'on':''}" data-a="world" data-v="${t.i}" ${t.ok?'':'disabled'}>${t.ok?esc(t.label):'🔒 '+(t.need?`${t.need} spoons`:esc(t.label))}</button>`).join('')}</div>
    <div class="levels">${lvBtns}</div>
    <div><button class="btn gold" data-a="shop">Dessert Shop</button><button class="btn mint" data-a="album">Card Album</button><button class="btn" data-a="rematch">Boss Rematch</button><button class="btn choc" data-a="title">Title</button></div>
    ${save.beatGame?`<div><button class="btn small mint" data-a="replayEnd">Watch the ending</button>${save.secretEnd?'<button class="btn small gold" data-a="replaySecret">Secret ending</button>':''}</div>`:''}`);
}
// ---------- Dessert Shop ----------
function showShop(){
  mode='menu';
  let body='';
  if(shopTab==='boost'){
    body=`<div class="grid">${BOOSTS.map(b=>`<div class="item"><canvas id="sb_${b.id}" width="120" height="90" style="width:80px;height:60px"></canvas><b>${b.name}</b><div style="font-weight:400">${b.desc}</div><div>You have: ${save.boosts[b.id]||0}</div>
      <button class="btn small gold" data-a="buyBoost" data-v="${b.id}" ${save.coins<b.price?'disabled':''}>Buy 🪙${b.price}</button></div>`).join('')}</div>`;
  } else {
    const ch=shopTab;
    body=`<div class="grid">${COSTUMES[ch].map(c=>{ const own=save.owned[ch].includes(c.id), wear=save.wear[ch]===c.id;
      return `<div class="item ${wear?'wear':''}"><canvas id="sc_${c.id}" width="160" height="200" style="width:80px;height:100px"></canvas><b>${c.name}</b><br>
      ${wear?'<button class="btn small" disabled>Wearing</button>':own?`<button class="btn small mint" data-a="wear" data-v="${c.id}">Wear</button>`:`<button class="btn small gold" data-a="buyCos" data-v="${c.id}" ${save.coins<c.price?'disabled':''}>Buy 🪙${c.price}</button>`}</div>`; }).join('')}</div>`;
  }
  ui(`<h2>The Dessert Shop</h2><div class="stats"><span class="chip">🪙 ${save.coins} coins</span></div>
    <div class="tabs">${[['ivy',"Ivy's costumes"],['seb',"Sebastian's costumes"],['boost','Power-ups']].map(([k,l])=>`<button class="tab ${shopTab===k?'on':''}" data-a="shopTab" data-v="${k}">${l}</button>`).join('')}</div>
    ${body}<button class="btn choc" data-a="map">Back to map</button>`);
  if(shopTab==='boost') BOOSTS.forEach(b=>preview('sb_'+b.id,(w,h)=>{ if(b.id==='charge'){ star(w/2,h/2,26,12,'#ffd23f','#fff'); } else drawPower(b.id,w/2,h/2,t60,1.6); }));
  else COSTUMES[shopTab].forEach(c=>preview('sc_'+c.id,(w,h)=>drawHero(shopTab,w/2,h-12,1,t60,'idle',c,2.5)));
}
// ---------- Album ----------
function showAlbum(){
  mode='menu';
  const cards=CARDS.map((c,i)=>{ const id=`${WORLDS[Math.floor(i/3)].key}-${i%3+1}`, has=save.cards[id];
    return `<div class="item ${has?'':'lock'}"><canvas id="ac_${i}" width="140" height="120" style="width:70px;height:60px"></canvas>${has?esc(c[0]):'??? ('+id+')'}</div>`; }).join('');
  const vill=VILLAINS.map(([id,desc])=>{ const has=save.villains[id];
    return `<div class="item ${has?'':'lock'}"><canvas id="av_${id}" width="160" height="140" style="width:80px;height:70px"></canvas><b>${has?esc(SPEAKERS[id].name):'???'}</b><div style="font-weight:400;font-size:13px">${has?esc(desc):'Defeat this villain to unlock the card.'}</div></div>`; }).join('');
  ui(`<h2>Card Album</h2><h3>Dessert Cards (${count(save.cards)}/21)</h3><div class="grid">${cards}</div>
    <h3>Villain Cards (${count(save.villains)}/12)</h3><div class="grid">${vill}</div><button class="btn choc" data-a="map">Back to map</button>`);
  CARDS.forEach((c,i)=>{ const id=`${WORLDS[Math.floor(i/3)].key}-${i%3+1}`; preview('ac_'+i,(w,h)=>{ if(save.cards[id]) drawCardArt(i,w/2,h/2,1.5); else outlineText('?',w/2,h/2+16,'#ccc',44); }); });
  VILLAINS.forEach(([id])=>preview('av_'+id,(w,h)=>{ if(save.villains[id]) bossPreview(id,w,h); else outlineText('?',w/2,h/2+16,'#ccc',44); }));
}
// ---------- Boss rematch ----------
function showRematch(){
  mode='menu';
  const list=VILLAINS.filter(([id])=>save.villains[id]);
  ui(`<h2>Boss Rematch</h2><p>Fight any villain you have already beaten.</p>
    ${list.length?`<div class="grid">${list.map(([id])=>`<div class="item"><canvas id="rm_${id}" width="160" height="140" style="width:80px;height:70px"></canvas><b>${esc(SPEAKERS[id].name)}</b><br><button class="btn small" data-a="level" data-v="rematch:${id}">Fight!</button></div>`).join('')}</div>`:'<p><i>Beat a boss first!</i></p>'}
    <button class="btn choc" data-a="map">Back to map</button>`);
  list.forEach(([id])=>preview('rm_'+id,(w,h)=>bossPreview(id,w,h)));
}
// ---------- Help and settings ----------
function showHelp(back='title'){
  ui(`<h2>How to play</h2>
    <div class="keys"><b>1 player</b><br>Run: <kbd>←</kbd><kbd>→</kbd> or <kbd>A</kbd><kbd>D</kbd> · Jump: <kbd>Space</kbd> or <kbd>↑</kbd> (press again in the air to double jump)<br>
    Climb ladders: <kbd>↑</kbd><kbd>↓</kbd> · Drop through a ledge: <kbd>↓</kbd> · Swim: tap jump · Ability: <kbd>X</kbd><br>
    <b>2 players</b><br>Ivy: <kbd>A</kbd><kbd>D</kbd> run, <kbd>W</kbd> jump, <kbd>S</kbd> down, <kbd>E</kbd> ability<br>
    Sebastian: <kbd>←</kbd><kbd>→</kbd> run, <kbd>↑</kbd> jump, <kbd>↓</kbd> down, <kbd>Enter</kbd> ability<br>
    Game controllers work too (one each). Pause: <kbd>Esc</kbd></div>
    <p><b>Ivy's ability, Sugar Rush:</b> super fast, and nothing can hurt her. <b>Sebastian's ability, Big Brother Boost:</b> a giant jump that throws anyone next to him up too, then a ground slam that squishes every enemy nearby. Fill the ability meter by collecting cupcakes and coins.</p>
    <p><b>Power-ups:</b> Sugar Cupcake (fast), Candy Shield (blocks one hit), Mega Cookie (giant!), Rainbow Lollipop (jump as many times as you want in the air).</p>
    <p><b>Secrets:</b> every level hides a golden spoon behind a wall, a hidden star and a dessert card. Some walls are fake... walk into them!</p>
    <button class="btn" data-a="${back}">Got it!</button>`);
}
function showSettings(back='title'){
  ui(`<h2>Settings</h2>
    <button class="btn mint" data-a="toggleSound" data-v="${back}">Sound: ${save.sound?'on':'off'}</button>
    <button class="btn mint" data-a="toggleMusic" data-v="${back}">Music: ${save.music?'on':'off'}</button><br>
    <button class="btn choc" data-a="resetAsk">Start the whole game over</button><br>
    <button class="btn" data-a="${back}">Back</button>`);
}
// ---------- In-game panels ----------
function pause(){ if(mode!=='play') return; mode='pause'; stopMusic();
  ui(`<h2>Snack break!</h2><button class="btn" data-a="resume">Keep going</button><button class="btn mint" data-a="restart">Start level over</button><button class="btn choc" data-a="map">Back to map</button>
    <div><button class="btn small mint" data-a="toggleSound" data-v="pause">Sound: ${save.sound?'on':'off'}</button><button class="btn small mint" data-a="toggleMusic" data-v="pause">Music: ${save.music?'on':'off'}</button></div>`); }
function resume(){ if(mode!=='pause') return; mode='play'; showGame(); playSong(songForLevel(!!(G.boss&&G.boss.awake))); }
function nextLevelId(id){
  const L=LEVELS[id]; if(!L) return null;
  if(L.kind==='secret') return null;
  if(L.bonus){ const W=L.W, n=+id.split('-')[1]; return n<W.stages.length?`${W.key}-${n+1}`:null; }
  const i=ORDER.indexOf(id); return ORDER[i+1]||null;
}
function showDone(){
  const L=G.L, rem=L.kind==='rematch';
  let extra='';
  if(L.kind==='level') extra=`<div class="stats"><span class="chip">${save.spoons[G.id]?'🥄 Golden spoon found':'🥄 Spoon still hidden'}</span><span class="chip">${save.stars[G.id]?'⭐ Hidden star found':'⭐ Star still hidden'}</span><span class="chip">${save.cards[G.id]?'🃏 '+esc(CARDS[L.card][0]):'🃏 Card still hidden'}</span></div>`;
  if(L.kind==='boss'||rem) extra=`<canvas id="dv" width="200" height="170" style="width:100px;height:85px"></canvas><p>${rem?'You won the rematch!':'Villain card unlocked: <b>'+esc(SPEAKERS[L.boss].name)+'</b>'}</p>`;
  const nx=rem?null:nextLevelId(G.id);
  ui(`<h2>${L.kind==='boss'||rem?'Villain defeated!':L.kind==='secret'?'Secret level cleared!':'Level complete!'}</h2>
    <p>${esc(L.name)}</p>${extra}
    <div class="stats"><span class="chip">🧁 ${G.cups}/${G.cupsTotal} cupcakes</span><span class="chip">🪙 +${G.coins} coins</span></div>
    ${nx&&isUnlocked(nx)?`<button class="btn" data-a="level" data-v="${nx}">Next: ${esc(nx)}</button>`:''}
    <button class="btn mint" data-a="restart">Play again</button><button class="btn choc" data-a="map">Map</button>`);
  if(L.kind==='boss'||rem) preview('dv',(w,h)=>bossPreview(L.boss,w,h));
}
function showOver(){
  ui(`<h2>Oh no!</h2><p>${G.players.length>1?'Ivy and Sebastian are':(G.players[0].ch==='ivy'?'Ivy is':'Sebastian is')} out of hearts. But dessert heroes never give up!</p>
    <button class="btn" data-a="restart">Try again</button><button class="btn choc" data-a="map">Map</button>`);
}
function showEnd(secret){
  mode='menu';
  ui(`<h1>THE END</h1><canvas id="pv" width="520" height="300" style="width:260px;height:150px"></canvas>
    <div class="stats"><span class="chip">🥄 ${count(save.spoons)}/28</span><span class="chip">⭐ ${count(save.stars)}/21</span><span class="chip">🃏 ${count(save.cards)}/21</span><span class="chip">🪙 ${save.coins}</span></div>
    ${secret?'<p><b>You saw the secret ending!</b></p>':`<p>Find all 21 hidden stars to unlock the secret ending and discover who created the Dessert Kingdom!</p>`}
    ${count(save.spoons)<20?`<p>Collect golden spoons to open the bonus worlds (10 and 20 spoons).</p>`:''}
    <button class="btn" data-a="map">Back to map</button>`);
  preview('pv',(w,h)=>{ fs('#ffd1e6'); for(let i=0;i<10;i++){ fs(i%2?'#ffc1dc':'#fff3c4'); rr(w/2-120+i*4,h-30-i*22,240-i*8,22,6); } drawHero('ivy',w/2-150,h-14,1,t60,'happy',null,2.2); drawHero('seb',w/2+150,h-14,-1,t60,'idle',null,2.2,{mouth:'o'}); });
}

// ---------- Cutscenes ----------
function playCut(lines,done){ mode='cut'; cutState={lines,i:0,done,at:performance.now()}; renderCut(); }
function renderCut(){
  const [who,text]=cutState.lines[cutState.i];
  const name=SPEAKERS[who]?SPEAKERS[who].name:'';
  ui(`${who==='narr'?'':'<canvas id="por" width="240" height="240" style="width:110px;height:110px"></canvas>'}
    <div style="flex:1">${name?`<div class="who">${esc(name)}</div>`:''}<p>${esc(text)}</p>
    <div style="text-align:right"><button class="btn small" data-a="cutNext">${cutState.i<cutState.lines.length-1?'Next ▶':'OK!'}</button></div></div>`,'cut');
  if(who!=='narr') preview('por',(w,h)=>{
    if(who==='ivy'||who==='seb'){ const s=4.2; drawHero(who,w/2-6,h*.42+46*s*HERO[who].scale,1,t60,'idle',null,s,{mouth:text.includes('!')?'o':''}); }
    else bossPreview(who,w,h);
  });
}
function cutNext(){
  if(!cutState||performance.now()-cutState.at<200) return;
  cutState.at=performance.now(); sfx.select();
  cutState.i++;
  if(cutState.i>=cutState.lines.length){ const d=cutState.done; cutState=null; d&&d(); }
  else renderCut();
}

// ---------- Button actions ----------
const ACT={
  play(){ audio(); if(!save.seenIntro){ playCut(STORY.intro,()=>{ save.seenIntro=true; persist(); showMap(); }); } else showMap(); },
  help(){ showHelp(G?'map':'title'); }, settings(){ showSettings('title'); }, title:showTitle, map:showMap,
  level(v){ audio(); sfx.select(); startLevel(v); },
  restart(){ if(G) startLevel(G.id); },
  resume,
  world(v){ curWorld=+v; save.world=curWorld; persist(); showMap(); },
  players(v){ save.players=v; persist(); showMap(); },
  shop(){ showShop(); }, album:showAlbum, rematch:showRematch,
  shopTab(v){ shopTab=v; showShop(); },
  buyCos(v){ const c=costumeOf(shopTab,v); if(save.coins>=c.price&&!save.owned[shopTab].includes(v)){ save.coins-=c.price; save.owned[shopTab].push(v); save.wear[shopTab]=v; persist(); sfx.power(); } showShop(); },
  wear(v){ save.wear[shopTab]=v; persist(); sfx.select(); showShop(); },
  buyBoost(v){ const b=BOOSTS.find(x=>x.id===v); if(save.coins>=b.price){ save.coins-=b.price; save.boosts[v]=(save.boosts[v]||0)+1; persist(); sfx.coin(); } showShop(); },
  toggleSound(v){ save.sound=!save.sound; persist(); v==='pause'?(mode='play',pause()):showSettings(v); },
  toggleMusic(v){ save.music=!save.music; persist(); if(!save.music) stopMusic(); else if(mode==='menu') playSong('title'); v==='pause'?(mode='play',pause()):showSettings(v); },
  resetAsk(){ ui(`<h2>Are you sure?</h2><p>This wipes ALL progress: levels, coins, costumes, spoons, stars and cards.</p><button class="btn choc" data-a="settings">No, keep it</button><button class="btn" data-a="resetYes">Yes, start over</button>`); },
  resetYes(){ save=JSON.parse(JSON.stringify(SAVE0)); persist(); curWorld=0; showTitle(); },
  cutNext,
  replayEnd(){ playCut(STORY.ending,showMap); }, replaySecret(){ playCut(STORY.secret,showMap); },
};
CARD.addEventListener('click',e=>{ const b=e.target.closest('[data-a]'); if(b&&!b.disabled){ ACT[b.dataset.a](b.dataset.v); } else if(mode==='cut'&&!b) cutNext(); });
$('pauseBtn').onclick=pause;

// ---------- Controls ----------
const kb=new Set();
const GAME_KEYS=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space']);
addEventListener('keydown',e=>{
  if(mode==='play'&&(GAME_KEYS.has(e.code)||e.code==='Enter')) e.preventDefault();
  if(mode==='cut'&&(e.code==='Space'||e.code==='Enter')){ e.preventDefault(); if(!e.repeat) cutNext(); return; }
  if(e.code==='Escape'){ if(mode==='play') pause(); else if(mode==='pause') resume(); return; }
  if(e.code==='KeyP'&&mode==='play'){ pause(); return; }
  kb.add(e.code);
});
addEventListener('keyup',e=>{ kb.delete(e.code); if(mode==='cut'&&e.code==='Space') e.preventDefault(); });
addEventListener('blur',()=>{ kb.clear(); for(const k in touch) touch[k]=false; if(mode==='play') pause(); });
const MAP1={l:['ArrowLeft','KeyA'],r:['ArrowRight','KeyD'],u:['ArrowUp','KeyW'],d:['ArrowDown','KeyS'],j:['Space','KeyZ','ArrowUp','KeyW','KeyK'],a:['KeyX','KeyE','ShiftLeft','ShiftRight','KeyJ','Enter']};
const MAPS2=[{l:['KeyA'],r:['KeyD'],u:['KeyW'],d:['KeyS'],j:['KeyW','Space'],a:['KeyE','KeyQ']},
             {l:['ArrowLeft'],r:['ArrowRight'],u:['ArrowUp'],d:['ArrowDown'],j:['ArrowUp'],a:['Enter','ShiftRight','Slash','Numpad0','Period']}];
const touch={l:false,r:false,d:false,j:false,a:false};
const prevBtn=[{},{}];
function padState(i,single){
  const pads=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];
  const p=single?pads[0]:pads[i]; if(!p) return null;
  const b=k=>!!(p.buttons[k]&&p.buttons[k].pressed), ax=p.axes[0]||0, ay=p.axes[1]||0;
  return {l:ax<-.4||b(14),r:ax>.4||b(15),u:ay<-.5||b(12),d:ay>.5||b(13),j:b(0),a:b(2)||b(1)||b(3)};
}
function readControls(){
  const n=G.players.length;
  G.players.forEach((p,i)=>{
    const M=n>1?MAPS2[i]:MAP1, any=k=>M[k].some(c=>kb.has(c));
    const s={l:any('l'),r:any('r'),u:any('u'),d:any('d'),j:any('j'),a:any('a')};
    if(i===0) for(const k in touch) s[k]=s[k]||touch[k];
    const pad=padState(i,n===1); if(pad) for(const k in pad) s[k]=s[k]||pad[k];
    const pb=prevBtn[i];
    p.ctrl={...s,jp:s.j&&!pb.j,ap:s.a&&!pb.a};
    prevBtn[i]={j:s.j,a:s.a};
  });
}
function bindTouch(id,k){ const el=$(id);
  const on=e=>{ e.preventDefault(); touch[k]=true; el.classList.add('on'); audio(); };
  const off=e=>{ e.preventDefault(); touch[k]=false; el.classList.remove('on'); };
  el.addEventListener('pointerdown',on); el.addEventListener('pointerup',off); el.addEventListener('pointercancel',off); el.addEventListener('pointerleave',off); }
bindTouch('tl','l'); bindTouch('tr','r'); bindTouch('td','d'); bindTouch('tj','j'); bindTouch('ta','a');
// a game controller can skip cutscenes and pause
let padPrev={};
function pollPadMenus(){ const p=padState(0,true); if(!p) return; const st=navigator.getGamepads()[0]; const start=!!(st&&st.buttons[9]&&st.buttons[9].pressed);
  if(mode==='cut'&&p.j&&!padPrev.j) cutNext();
  if(start&&!padPrev.start){ if(mode==='play') pause(); else if(mode==='pause') resume(); }
  padPrev={j:p.j,start}; }

// ---------- Main loop ----------
let last=performance.now(), acc=0;
function frame(now){
  acc+=Math.min(100,now-last); last=now;
  while(acc>=1000/60){ update(); acc-=1000/60; }
  pollPadMenus();
  draw(); drawPreviews();
  requestAnimationFrame(frame);
}
showTitle();
requestAnimationFrame(frame);
window.__ivy={get G(){return G;},get mode(){return mode;},startLevel,LEVELS,ORDER,save:()=>save,kb,BOSSES,damageBoss};
