// ================= Engine: moving, jumping, bumping, collecting =================
let mode='menu', G=null, t60=0;
const GRAV=.62, RUN=4.3, JUMP=-12.6, DJUMP=-11, BOUNCE=-18.5;
const SOLIDS='#I?!UMW';
function tileAt(x,y){ if(x<0||x>=G.w) return y<0?'.':'#'; if(y<0||y>=ROWS) return '.'; return G.grid[y][x]; }
function solidAt(x,y){ const t=tileAt(x,y); return t!=='.'&&SOLIDS.includes(t); }
function overlap(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }
function alivePlayers(){ return G.players.filter(p=>!p.down); }
function nearestPlayer(x,y){ let best=null,bd=1e9; for(const p of alivePlayers()){ const d=Math.abs(p.x+p.w/2-x)+Math.abs(p.y+p.h/2-y)*.5; if(d<bd){bd=d;best=p;} } return best; }

// Move something through the tile world. Returns what it bumped into.
function moveBody(b,oneWay=true){
  const res={wall:false,ground:false,gt:null,bounce:false,head:[]};
  b.x+=b.vx;
  const y0=Math.floor(b.y/TS), y1=Math.floor((b.y+b.h-1)/TS);
  if(b.vx>0){ const tx=Math.floor((b.x+b.w)/TS); for(let ty=y0;ty<=y1;ty++) if(solidAt(tx,ty)){ b.x=tx*TS-b.w-.01; b.vx=0; res.wall=true; break; } }
  else if(b.vx<0){ const tx=Math.floor(b.x/TS); for(let ty=y0;ty<=y1;ty++) if(solidAt(tx,ty)){ b.x=(tx+1)*TS+.01; b.vx=0; res.wall=true; break; } }
  const prevBottom=b.y+b.h;
  b.y+=b.vy;
  const x0=Math.floor(b.x/TS), x1=Math.floor((b.x+b.w-1)/TS);
  if(b.vy>0){
    const ty=Math.floor((b.y+b.h)/TS);
    for(let tx=x0;tx<=x1;tx++){
      const ch=tileAt(tx,ty);
      if(solidAt(tx,ty) || (oneWay && ch==='=' && prevBottom<=ty*TS+1 && !(b.drop>0))){
        b.y=ty*TS-b.h; b.vy=0; res.ground=true; res.gt=ch; if(ch==='M') res.bounce=true; break;
      }
    }
  } else if(b.vy<0){
    const ty=Math.floor(b.y/TS);
    let hit=false;
    for(let tx=x0;tx<=x1;tx++) if(ty>=0&&solidAt(tx,ty)){ hit=true; res.head.push([tx,ty]); }
    if(hit){ b.y=(ty+1)*TS; b.vy=0; }
  }
  return res;
}

// ---------- Effects ----------
function burst(x,y,cols,n=12,spd=4){ for(let i=0;i<n;i++){ const a=Math.random()*PI2, s=Math.random()*spd+1; G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,life:40+Math.random()*20,col:cols[i%cols.length],sz:3+Math.random()*3}); } }
function say(x,y,txt,col='#fff',size=20){ G.texts.push({x,y,txt,col,life:70,size}); }
function toast(txt,col='#fff'){ G.toast={txt,col,t:170}; }

// ---------- Players ----------
function makePlayer(ch,idx){
  const big=ch==='seb';
  return {ch,idx,w:big?24:22,h:big?54:48,x:0,y:0,vx:0,vy:0,face:1,ground:false,gt:null,coyote:0,buffer:0,air:1,ladder:false,water:false,
    hearts:3,maxH:3,inv:0,shield:false,rushT:0,speedT:0,megaT:0,rainT:0,slam:0,spring:false,meter:0,down:false,downT:0,
    anim:0,state:'idle',drop:0,hurtT:0,told:false,ctrl:{l:0,r:0,u:0,d:0,j:0,a:0,jp:0,ap:0}};
}
function hurtPlayer(p,src){
  if(p.down||p.inv>0||p.rushT>0||p.megaT>0||mode!=='play') return;
  if(p.shield){ p.shield=false; p.inv=70; sfx.shield(); burst(p.x+p.w/2,p.y+p.h/2,['#5ad1ff','#fff'],16); say(p.x,p.y-10,'Shield!','#5ad1ff'); return; }
  p.hearts--; p.inv=100; p.hurtT=25; p.vy=-7; p.vx=(src?Math.sign(p.x+p.w/2-(src.x+(src.w||0)/2))||-p.face:-p.face)*5; p.ladder=false;
  sfx.hurt(); G.shake=8;
  if(p.hearts<=0) knockOut(p);
}
function playerFell(p){
  if(p.down) return;
  p.hearts--; sfx.hurt(); G.shake=8; p.ladder=false;
  if(p.hearts<=0){ knockOut(p); return; }
  respawnPlayer(p); p.inv=100;
}
function respawnPlayer(p){
  const o=G.players.find(q=>q!==p&&!q.down&&q.ground&&!q.water);
  if(o){ p.x=o.x; p.y=o.y+o.h-p.h-4; } else { p.x=G.respawn.x; p.y=G.respawn.y-p.h; }
  p.vx=0; p.vy=0; p.water=false;
}
function knockOut(p){
  const other=G.players.find(q=>q!==p&&!q.down);
  if(other){ p.down=true; p.downT=360; p.hearts=0; say(p.x,p.y-20,HERO[p.ch].name+' will be back!','#fff'); }
  else { p.down=true; gameOver(); }
}
function gameOver(){ if(mode!=='play') return; mode='over'; stopMusic(); setTimeout(()=>{ if(mode==='over') showOver(); },900); }

function activateAbility(p){
  if(p.meter<100){ if(!p.toldMeter){ say(p.x,p.y-30,'Collect more treats!','#fff',16); p.toldMeter=30; } return; }
  p.meter=0;
  if(p.ch==='ivy'){ p.rushT=420; sfx.power(); say(p.x+p.w/2,p.y-24,'SUGAR RUSH!','#ffd23f',24); burst(p.x+11,p.y+24,['#ffd23f','#ff8ec2','#5ad1ff'],24,6); }
  else {
    p.vy=-19; p.spring=true; p.slam=1; p.ground=false; p.ladder=false; sfx.boost();
    say(p.x+p.w/2,p.y-24,'BIG BROTHER BOOST!','#7fe08a',24);
    for(const q of alivePlayers()) if(q!==p && Math.abs(q.x-p.x)<110 && Math.abs(q.y-p.y)<90){ q.vy=-19; q.spring=true; q.air=1; q.ground=false; say(q.x,q.y-10,'Wheee!','#ff8ec2'); }
  }
}
function shockwave(p){
  const cx=p.x+p.w/2, cy=p.y+p.h;
  sfx.slam(); G.shake=16;
  for(let i=0;i<40;i++){ const a=i/40*PI2; G.parts.push({x:cx,y:cy-6,vx:Math.cos(a)*7,vy:Math.sin(a)*2.5,life:35,col:i%2?'#7fe08a':'#fff',sz:6}); }
  for(const e of G.enemies) if(e.alive && Math.abs(e.x+e.w/2-cx)<260 && Math.abs(e.y+e.h/2-cy)<180) killEnemy(e,p);
  const B=G.boss; if(B&&B.awake&&!B.dying&&B.hurt<=0&&Math.abs(B.x+B.w/2-cx)<320&&Math.abs(B.y+B.h-cy)<200) damageBoss(B,p);
}

function updatePlayer(p){
  const c=p.ctrl;
  if(p.down){
    if(mode!=='play') return;
    const o=G.players.find(q=>q!==p&&!q.down); if(!o) return;
    p.x+=(o.x-p.x-30)*.06; p.y+=(o.y-70-p.y)*.06; p.downT--;
    if(p.downT<=0){ p.down=false; p.hearts=2; p.inv=120; p.x=o.x; p.y=o.y+o.h-p.h; p.vx=p.vy=0; sfx.heart(); }
    return;
  }
  for(const k of ['inv','rushT','speedT','megaT','rainT','hurtT','drop','toldMeter']) if(p[k]>0) p[k]--;
  if(c.ap) activateAbility(p);
  const dir=(c.r?1:0)-(c.l?1:0);
  if(dir) p.face=dir;
  const fast=p.speedT>0||p.rushT>0;
  const spd=RUN*(fast?1.45:1);
  const cx=p.x+p.w/2, cy=p.y+p.h/2;
  const tc=tileAt(Math.floor(cx/TS),Math.floor(cy/TS));
  // ---- ladders ----
  if(tc==='L' && !p.ladder && (c.u||c.jp||(c.d&&!p.ground))){ p.ladder=true; p.vx=0; p.buffer=0; }
  if(p.ladder && tc!=='L'){ p.ladder=false; if(c.u||c.j){ p.vy=-7; } }
  if(p.ladder){
    p.vx=dir*2; p.vy=(c.u||c.j)?-3.2:c.d?3.2:0; p.air=1; p.slam=0;
    if(c.jp && dir){ p.ladder=false; p.vy=JUMP*.85; sfx.jump(); }
    const res=moveBody(p,false); if(res.ground&&c.d) p.ladder=false;
    p.ground=false; p.state='climb'; if(p.vy||p.vx) p.anim++;
    afterMove(p); return;
  }
  // ---- swimming ----
  if(tc==='w'){
    if(!p.water){ p.water=true; p.vy*=.3; burst(cx,p.y+p.h,G.pal.water?[G.pal.water,'#fff']:['#6b3a1e','#fff'],10,3); }
    p.air=1; p.slam=0;
    p.vx+=(dir*spd*.6-p.vx)*.1; p.vy=Math.min(p.vy+.16,2.4);
    if(c.jp){ const above=tileAt(Math.floor(cx/TS),Math.floor((p.y-2)/TS)); p.vy=above!=='w'?-10.5:-5.2; sfx.swim(); }
    const res=moveBody(p,true); p.ground=res.ground; p.gt=res.gt;
    p.state='swim'; p.anim++;
    afterMove(p); return;
  }
  p.water=false;
  // ---- running and jumping ----
  const onIce=p.ground&&p.gt==='I';
  p.vx+=(dir*spd-p.vx)*(p.ground?(onIce?.035:.28):.14);
  if(c.jp) p.buffer=8; else if(p.buffer>0) p.buffer--;
  if(p.ground){ p.coyote=7; p.air=1; } else if(p.coyote>0) p.coyote--;
  if(p.buffer>0){
    if(p.coyote>0){ p.vy=JUMP*(fast?1.06:1); p.coyote=0; p.buffer=0; p.ground=false; sfx.jump(); }
    else if(c.jp && (p.air>0||p.rainT>0)){
      p.vy=DJUMP; if(p.rainT<=0) p.air--; p.buffer=0; p.spring=false; sfx.djump();
      burst(cx,p.y+p.h,p.rainT>0?['#ff4f7b','#ffd23f','#5ee08a','#5ad1ff','#b47cff']:['#fff','#ffd1e6'],10,3);
    }
  }
  if(p.vy>=0) p.spring=false;
  if(!c.j && p.vy<-4 && !p.spring) p.vy*=.8;
  p.vy=Math.min(p.vy+GRAV,14);
  if(c.d && p.ground && p.gt==='=') p.drop=12;
  const wasGround=p.ground;
  const res=moveBody(p,true);
  p.ground=res.ground; p.gt=res.gt;
  if(res.bounce){ p.vy=BOUNCE; p.spring=true; p.ground=false; p.air=1; sfx.boing(); burst(cx,p.y+p.h,['#fff','#ffd1e6'],8,3); }
  for(const [tx,ty] of res.head) hitBlock(tx,ty,p);
  if(p.slam===1&&!p.ground) p.slam=2;
  if(p.slam===2&&p.ground){ p.slam=0; shockwave(p); }
  if(!wasGround&&p.ground&&p.megaT>0){ G.shake=4; }
  p.state=p.hurtT>0?'hurt':!p.ground?(p.vy<0?'jump':'fall'):Math.abs(p.vx)>.6?'run':'idle';
  p.anim+=Math.abs(p.vx)>.6?Math.abs(p.vx)/3.5:1;
  afterMove(p);
}
function afterMove(p){
  const cx=p.x+p.w/2;
  if(p.y>ROWS*TS+40){ playerFell(p); return; }
  if(tileAt(Math.floor(cx/TS),Math.floor((p.y+p.h-6)/TS))==='v'){ burst(cx,p.y+p.h,['#ffa83f','#ffd23f'],14,4); playerFell(p); return; }
  if((p.rushT>0||p.rainT>0)&&t60%3===0) G.parts.push({x:cx,y:p.y+p.h*.6,vx:-p.vx*.3,vy:-1,life:25,col:['#ffd23f','#ff8ec2','#5ad1ff','#7fe08a'][t60%4],sz:4});
  if(p.speedT>0&&t60%4===0) G.parts.push({x:cx,y:p.y+p.h-4,vx:-p.vx*.2,vy:-.5,life:18,col:'#fff3a8',sz:4});
  if(p.meter>=100&&!p.told){ p.told=true; toast((p.ch==='ivy'?'Sugar Rush':'Big Brother Boost')+' is ready! Press '+abilityKey(p)); }
  if(p.meter<100) p.told=false;
}
function hitBlock(tx,ty,p){
  const ch=G.grid[ty][tx];
  if(ch==='?'){ G.grid[ty][tx]='U'; sfx.coin(); addCoins(1,p); G.parts.push({x:tx*TS+20,y:ty*TS-10,vx:0,vy:-6,life:30,col:'#ffd23f',sz:12,coin:true}); }
  else if(ch==='!'){ G.grid[ty][tx]='U'; sfx.block(); const type=pick(Math.random,['sugar','shield','mega','rainbow','heart']); G.items.push({type:'power',pw:type,x:tx*TS+20,y:ty*TS+20,vy:-5,ty:ty*TS-22,pop:true,ph:0}); }
  else sfx.block();
  for(const e of G.enemies) if(e.alive&&Math.abs(e.x+e.w/2-(tx*TS+20))<30&&Math.abs(e.y+e.h-ty*TS)<8) killEnemy(e,p);
}
function addCoins(n,p){ G.coins+=n; save.coins+=n; if(p) p.meter=Math.min(100,p.meter+2*n); }

// ---------- Items ----------
function collect(it,p){
  it.got=true; const id=G.id;
  const cx=it.x, cy=it.y;
  switch(it.type){
    case 'coin': addCoins(1,p); sfx.coin(); break;
    case 'cup': G.cups++; p.meter=Math.min(100,p.meter+10); sfx.yum(); burst(cx,cy,['#fff','#ffd23f','#ff8ec2'],8,3); say(cx,cy-20,['Yum!','Mmm!','Yummy!','Nom!','Sweet!'][G.cups%5]); break;
    case 'heart': p.hearts=Math.min(5,p.hearts+1); sfx.heart(); say(cx,cy-20,'+1 heart','#ff4f7b'); break;
    case 'spoon': if(it.old){ addCoins(5,p); say(cx,cy-20,'+5 coins','#ffd23f'); } else { save.spoons[id]=1; toast('You found a SECRET GOLDEN SPOON!','#ffd23f'); } G.found.spoon=true; sfx.secret(); burst(cx,cy,['#ffd23f','#fff'],24,5); break;
    case 'star': if(it.old){ addCoins(5,p); say(cx,cy-20,'+5 coins','#ffd23f'); } else { save.stars[id]=1; toast('You found a HIDDEN STAR!','#fff3a8'); } G.found.star=true; sfx.secret(); burst(cx,cy,['#fff3a8','#ffd23f'],24,5); break;
    case 'card': if(it.old){ addCoins(5,p); say(cx,cy-20,'+5 coins','#ffd23f'); } else { save.cards[id]=1; toast('Dessert card: '+CARDS[G.L.card][0]+'!','#ff8ec2'); } G.found.card=true; sfx.secret(); burst(cx,cy,['#ff8ec2','#fff'],20,5); break;
    case 'door': { const W=G.L.W; if(!save.secrets[W.key]){ save.secrets[W.key]=1; toast('SECRET DOOR! You unlocked '+W.secret+'!','#ffd23f'); } else say(cx,cy-40,'Secret door (already found)'); sfx.secret(); it.got=false; it.used=true; break; }
    case 'power': givePower(p,it.pw); break;
  }
  persist();
}
function givePower(p,pw){
  sfx.power(); say(p.x+p.w/2,p.y-20,POWER_INFO[pw]||pw,'#ffd23f');
  if(pw==='sugar') p.speedT=540;
  else if(pw==='shield') p.shield=true;
  else if(pw==='mega'){ p.megaT=540; G.shake=6; }
  else if(pw==='rainbow') p.rainT=720;
  else if(pw==='heart') p.hearts=Math.min(5,p.hearts+1);
  else if(pw==='charge') p.meter=100;
}

// ---------- Enemies ----------
const ENEMY={
  cookie:{w:30,h:30,init:e=>e.vx=-1.1,up:walker},
  soldier:{w:28,h:40,hp:2,init:e=>e.vx=-1.5,up:walker},
  donut:{w:28,h:28,init:e=>e.vx=-2.6,up:e=>{ walker(e); e.rot=(e.rot||0)+e.vx*.08; }},
  jelly:{w:24,h:20,init:e=>e.hue=Math.floor(Math.random()*5),up:hopToward},
  gummy:{w:28,h:34,init:e=>{e.vx=-1;e.col=pick(Math.random,['#ff4f7b','#ffd23f','#5ee08a','#ffa83f']);},up:e=>{
    e.vy=Math.min(e.vy+GRAV*.8,12); const v=e.vx; const r=moveBody(e,true); if(r.wall) e.vx=-v; if(r.ground){ e.vy=-9; if(!e.vx) e.vx=-1; } }},
  hopper:{w:30,h:30,up:e=>{ e.vy=Math.min(e.vy+GRAV,14); const r=moveBody(e,true);
    if(r.ground){ e.vx=0; e.st--; if(e.st<=0){ e.vy=-11-Math.random()*4; e.vx=(Math.random()<.5?-1:1)*(1+Math.random()*2); e.st=40+Math.random()*90; } } }},
  bat:{w:34,h:22,fly:true,up:e=>{
    const p=nearestPlayer(e.x,e.y); e.cool=(e.cool||0)-1;
    if(!e.dive&&e.cool<=0&&p&&Math.abs(p.x-e.x)<130&&p.y>e.y){ e.dive=1; e.target=Math.min(p.y-e.hy,260); }
    e.oy=e.oy||0; if(e.dive){ e.oy+=5; if(e.oy>=e.target){ e.dive=0; e.cool=120; } } else e.oy=Math.max(0,e.oy-2);
    e.x=e.hx+Math.sin(e.t*.02)*90; e.y=e.hy+Math.sin(e.t*.05)*16+e.oy; }},
  spider:{w:26,h:22,fly:true,init:e=>{ e.ay=e.y; let ty=Math.floor(e.y/TS)-1; while(ty>=0&&!solidAt(Math.floor((e.x+13)/TS),ty)) ty--; e.top=(ty+1)*TS; e.st=0; },up:e=>{
    const p=G.players.find(q=>!q.down&&Math.abs(q.x+q.w/2-(e.x+13))<50&&q.y>e.y);
    if(e.st===0){ e.y=e.ay+Math.sin(e.t*.05)*4; if(p) e.st=1; }
    else if(e.st===1){ e.y+=6; const ty=Math.floor((e.y+e.h)/TS); if(solidAt(Math.floor((e.x+13)/TS),ty)||e.y>e.ay+320){ e.y=Math.min(e.y,ty*TS-e.h); e.st=2; e.wait=50; } }
    else if(e.st===2){ if(--e.wait<=0) e.st=3; }
    else { e.y-=2; if(e.y<=e.ay){ e.y=e.ay; e.st=0; } } }},
  cupcake:{w:30,h:34,up:e=>{
    e.vy=Math.min(e.vy+GRAV,14); moveBody(e,true); e.st=(e.st||0)+1;
    const p=nearestPlayer(e.x,e.y); if(p) e.face=p.x>e.x?1:-1;
    if(e.st>140&&p&&Math.abs(p.x-e.x)<520){ e.st=0; const T=55, gr=.25, dx=p.x+p.w/2-(e.x+15), dy=p.y+p.h/2-(e.y+5);
      shoot({x:e.x+15,y:e.y+5,vx:clamp(dx/T,-6,6),vy:clamp((dy-.5*gr*T*T)/T,-11,4),r:7,grav:gr,kind:'frost'}); } }},
  minion:{w:26,h:36,up:e=>{
    e.vy=Math.min(e.vy+GRAV,14); const p=nearestPlayer(e.x,e.y);
    if(p){ const dir=Math.sign(p.x-e.x)||1; e.vx+=(dir*1.7-e.vx)*.08; }
    const r=moveBody(e,true);
    if(r.ground){ const ahead=Math.floor((e.x+e.w/2+Math.sign(e.vx)*24)/TS), below=Math.floor((e.y+e.h+4)/TS);
      if(r.wall||!solidAt(ahead,below)&&tileAt(ahead,below)!=='=') e.vy=-10.5; } }},
  clone:{w:44,h:56,up:e=>{ hopToward(e,10); if(--e.life<=0){ e.alive=false; burst(e.x+22,e.y+28,['#6b3a1e','#4a2614'],10); } }},
  biscuit:{w:30,h:30,init:e=>e.vx=(Math.random()<.5?-1.4:1.4),up:walker},
};
ENEMY_ART.biscuit=ENEMY_ART.cookie;
function walker(e){
  e.vy=Math.min(e.vy+GRAV,14);
  if(e.stun>0){ e.stun--; e.vx=0; moveBody(e,true); if(e.stun===0) e.vx=e.lastVx||-1.5; return; }
  const front=e.vx>0?e.x+e.w+2:e.x-2, tx=Math.floor(front/TS), ty=Math.floor((e.y+e.h+4)/TS), ch=tileAt(tx,ty);
  const v=e.vx; const r=moveBody(e,true);
  if(r.wall) e.vx=-v; else if(r.ground&&!(solidAt(tx,ty)||ch==='=')) e.vx=-v;
  if(e.vx===0) e.vx=-v||-1;
}
function hopToward(e,power=7.5){
  e.vy=Math.min(e.vy+GRAV,14); const r=moveBody(e,true);
  if(r.ground){ e.vx*=.7; e.st=(e.st||0)+1; if(e.st>45+(e.t%25)){ e.st=0; const p=nearestPlayer(e.x,e.y); e.vy=-power; e.vx=(p&&p.x>e.x?1:-1)*2.2; } }
}
function spawnEnemy(type,x,y,extra){
  const D=ENEMY[type]; if(!D) return null;
  const e={type,x:x+(TS-D.w)/2,y:y+TS-D.h,w:D.w,h:D.h,vx:0,vy:0,t:Math.random()*60,alive:true,hp:D.hp||1,st:0,fly:!!D.fly};
  e.hx=e.x; e.hy=e.y; if(D.init) D.init(e); if(extra) Object.assign(e,extra);
  G.enemies.push(e); return e;
}
function killEnemy(e,p){
  e.alive=false; sfx.stomp(); burst(e.x+e.w/2,e.y+e.h/2,['#ffd23f','#ff8ec2','#fff','#8bd16a'],14);
  if(e.type!=='clone'&&e.type!=='biscuit'){ addCoins(1,p); say(e.x+e.w/2,e.y,'+1','#ffd23f',16); }
}
function updateEnemies(){
  for(const e of G.enemies){
    if(!e.alive) continue;
    if(e.x<G.cam-320||e.x>G.cam+VW+320) continue;
    e.t++; ENEMY[e.type].up(e);
    if(e.vx) e.lastVx=e.vx;
    if(e.y>ROWS*TS+80){ e.alive=false; continue; }
    for(const p of G.players){
      if(p.down||!e.alive||!overlap(p,e)) continue;
      if(p.rushT>0||p.megaT>0){ killEnemy(e,p); continue; }
      if(p.vy>0 && p.y+p.h-p.vy<=e.y+14){
        e.hp--; p.vy=p.ctrl.j?-12:-9; p.air=1; p.meter=Math.min(100,p.meter+8);
        if(e.hp<=0) killEnemy(e,p); else { e.stun=70; sfx.stomp(); say(e.x,e.y,'Bonk!'); }
        if(p.slam){ p.slam=0; shockwave(p); }
      } else if(!(e.stun>0)) hurtPlayer(p,e);
    }
  }
  if(G.enemies.length>60) G.enemies=G.enemies.filter(e=>e.alive);
}

// ---------- Projectiles (bad guys throw things) ----------
function shoot(o){ G.projs.push(Object.assign({t:0,life:300,grav:0,r:8,solidDie:true},o)); if(o.kind!=='crumb'&&o.kind!=='icicle') sfx.shoot(); }
function updateProjs(){
  for(const q of G.projs){
    q.t++; q.life--; q.vy+=q.grav; q.x+=q.vx; q.y+=q.vy;
    if(q.homing){ const p=nearestPlayer(q.x,q.y); if(p){ const dx=p.x+p.w/2-q.x, dy=p.y+p.h/2-q.y, d=Math.hypot(dx,dy)||1; q.vx+=dx/d*.12; q.vy+=dy/d*.12; const s=Math.hypot(q.vx,q.vy); if(s>3.2){ q.vx*=3.2/s; q.vy*=3.2/s; } } }
    if(q.solidDie && solidAt(Math.floor(q.x/TS),Math.floor((q.y+q.r*.5)/TS))){
      q.life=0;
      if(q.kind==='bomb'){ for(const s of [-1,0,1]) shoot({x:q.x,y:q.y-8,vx:s*3,vy:-4,r:6,grav:.3,kind:'splat',life:70}); burst(q.x,q.y,['#ff8ec2','#fff'],14,4); }
      else burst(q.x,q.y,['#fff','#ffd1e6'],5,2);
    }
    for(const p of G.players){ if(!p.down&&q.life>0&&Math.abs(p.x+p.w/2-q.x)<p.w/2+q.r-2&&Math.abs(p.y+p.h/2-q.y)<p.h/2+q.r-2){ hurtPlayer(p,{x:q.x,w:0}); if(!(p.rushT>0||p.megaT>0)) q.life=0; } }
    if(q.y>ROWS*TS+60||q.x<G.cam-200||q.x>G.cam+VW+200) q.life=0;
  }
  G.projs=G.projs.filter(q=>q.life>0);
}

// ---------- Starting a level ----------
function levelFor(id){
  if(id.startsWith('rematch:')){
    const boss=id.slice(8); let W=WORLDS.find(w=>w.boss[1]===boss), wi=W?WORLDS.indexOf(W):7;
    if(!W){ BONUS.forEach((b,bi)=>{ if(b.stages.some(s=>s[1]===boss)){ W=b; wi=7+bi; } }); }
    if(boss==='cakeeater') { W=WORLDS[5]; wi=5; }
    return {id,wi,W,name:'Rematch: '+SPEAKERS[boss].name,feats:[],kind:'rematch',boss};
  }
  return LEVELS[id];
}
function startLevel(id){
  const L=levelFor(id); const B=buildLevel(L);
  G={L,id,grid:B.grid,w:B.w,pal:PAL[B.pal]||PAL.forest,cave:B.cave,arena:B.arena,items:[],enemies:[],projs:[],checks:[],goal:null,boss:null,players:[],
     cam:0,parts:[],texts:[],shake:0,time:0,cups:0,cupsTotal:0,coins:0,found:{},respawn:{x:60,y:480},banner:150,toast:null,final:false};
  for(const e of B.ents){
    const px=e.x*TS, py=e.y*TS, item=(type,more)=>G.items.push(Object.assign({type,x:px+20,y:py+20,ph:Math.random()*6},more||{}));
    switch(e.ch){
      case '@': G.respawn={x:px+8,y:py+TS}; break;
      case '>': G.goal={x:px-10,y:py-40,w:60,h:80}; break;
      case 'C': G.checks.push({x:px+20,y:py+TS,on:false}); break;
      case 'o': item('coin'); break;
      case 'u': item('cup',{hue:G.cupsTotal%CUP_COLORS.length}); G.cupsTotal++; break;
      case 'H': item('heart'); break;
      case 'G': item('spoon',{old:!!save.spoons[id]}); break;
      case 'R': item('star',{old:!!save.stars[id]}); break;
      case 'Y': item('card',{old:!!save.cards[id]}); break;
      case 'D': item('door'); break;
      case 'K': G.boss=makeBoss(L.boss,px,py+TS); break;
      default: if(e.type) spawnEnemy(e.type,px,py);
    }
  }
  const chars=save.players==='duo'?['ivy','seb']:[save.players==='seb'?'seb':'ivy'];
  G.players=chars.map((ch,i)=>{ const p=makePlayer(ch,i); p.x=G.respawn.x+i*30; p.y=G.respawn.y-p.h; return p; });
  // Boosts bought in the Dessert Shop get used now.
  const used=[];
  for(const b of BOOSTS){ if((save.boosts[b.id]||0)>0){ save.boosts[b.id]--; used.push(b.name); for(const p of G.players){
    if(b.id==='shield') p.shield=true; else if(b.id==='heart'){ p.maxH=4; p.hearts=4; } else if(b.id==='sugar') p.speedT=900;
    else if(b.id==='charge') p.meter=100; else if(b.id==='rainbow') p.rainT=1200; else if(b.id==='mega') p.megaT=900; } } }
  if(used.length){ persist(); toast('Using: '+used.join(', ')); }
  G.cam=0; mode='play'; showGame(); audio();
  playSong(songForLevel(false));
}

// ---------- Big update ----------
function update(){
  t60++;
  if(!G) return;
  if(mode!=='play'){ if(mode==='done'||mode==='over'||mode==='cut'){ stepFx(); } return; }
  G.time++;
  readControls();
  for(const p of G.players) updatePlayer(p);
  if(mode!=='play') return;
  // items
  for(const it of G.items){
    if(it.got) continue;
    if(it.pop){ it.y+=it.vy; it.vy+=.3; if(it.vy>0&&it.y>=it.ty){ it.y=it.ty; it.pop=false; } continue; }
    if(it.fall){ it.vy=(it.vy||0)+.4; it.y+=it.vy; const ty=Math.floor((it.y+16)/TS); if(solidAt(Math.floor(it.x/TS),ty)){ it.y=ty*TS-18; it.fall=false; } }
    for(const p of G.players){ if(p.down||it.got) continue;
      const near=it.type==='door'?(Math.abs(p.x+p.w/2-it.x)<30&&Math.abs(p.y+p.h-(it.y+20))<40):(Math.abs(p.x+p.w/2-it.x)<p.w/2+14&&Math.abs(p.y+p.h/2-it.y)<p.h/2+14);
      if(near&&!(it.type==='door'&&it.used)) collect(it,p); }
  }
  // checkpoints
  for(const ck of G.checks) if(!ck.on&&G.players.some(p=>!p.down&&Math.abs(p.x+p.w/2-ck.x)<30)){ ck.on=true; G.respawn={x:ck.x-12,y:ck.y}; sfx.flag(); say(ck.x,ck.y-100,'Checkpoint!','#7fe08a'); }
  updateEnemies();
  updateProjs();
  // boss room
  if(G.boss&&G.arena&&!G.arena.locked&&G.players.some(p=>!p.down&&p.x>G.arena.x0+60)){
    G.arena.locked=true;
    for(let y=0;y<12;y++) G.grid[y][G.arena.wall]='W';
    for(const p of G.players) if(p.x<G.arena.x0+10){ p.x=G.arena.x0+40; p.y=G.arena.floor-p.h; p.vx=p.vy=0; }
    G.boss.awake=true; sfx.boss(); playSong(songForLevel(true));
    const lines=STORY.boss[G.boss.id]; if(lines&&G.L.kind!=='rematch') playCut(lines,()=>{ mode='play'; showGame(); });
  }
  if(G.boss) updateBoss(G.boss);
  // goal
  if(G.goal&&G.players.some(p=>!p.down&&overlap(p,G.goal))) levelDone();
  // camera
  const al=alivePlayers();
  if(al.length){
    let tx=al.reduce((s,p)=>s+p.x+p.w/2,0)/al.length-VW*.42;
    if(al.length===1) tx+=al[0].face*50;
    if(G.arena&&G.arena.locked) tx=(G.arena.x0+G.arena.x1)/2-VW/2;
    tx=clamp(tx,0,G.w*TS-VW); G.cam+=(tx-G.cam)*.12;
    if(G.players.length>1) for(const p of al) p.x=clamp(p.x,G.cam+2,G.cam+VW-p.w-2);
  }
  if(G.shake>0) G.shake--;
  if(G.banner>0) G.banner--;
  if(G.toast&&--G.toast.t<=0) G.toast=null;
  stepFx();
}
function stepFx(){
  for(const p of G.parts){ p.x+=p.vx; p.y+=p.vy; p.vy+=p.coin?.3:.15; p.life--; }
  G.parts=G.parts.filter(p=>p.life>0);
  for(const f of G.texts){ f.y-=.7; f.life--; }
  G.texts=G.texts.filter(f=>f.life>0);
}
function levelDone(){
  if(mode!=='play') return;
  mode='done'; stopMusic(); playSong('win');
  const id=G.id;
  if(G.L.kind!=='rematch'){
    save.done[id]=1; save.best[id]=Math.max(save.best[id]||0,G.cups);
    if(G.L.kind==='boss') save.villains[G.L.boss]=1;
  }
  persist();
  for(const p of G.players) p.state='happy';
  setTimeout(()=>{ if(mode==='done') showDone(); },1000);
}
