// ================= The 12 villains =================
// Every boss: jump on its head to hurt it. Some can only be hurt at certain times.
function makeBoss(id,x,bottom){
  const D=BOSSES[id];
  const B={id,def:D,x:x+20-D.w/2,y:bottom-D.h,w:D.w,h:D.h,hp:D.hp,max:D.hp,t:0,vx:0,vy:0,face:-1,hurt:0,awake:false,dying:0,st:'idle',timer:60,hit:[],ground:false,alpha:1};
  if(D.init) D.init(B);
  return B;
}
function bgrav(B,g2=GRAV){ B.vy=Math.min(B.vy+g2,14); const r=moveBody(B,false); B.ground=r.ground; return r; }
function towardP(B){ const p=nearestPlayer(B.x+B.w/2,B.y); return p?(Math.sign(p.x+p.w/2-(B.x+B.w/2))||1):-1; }
function lob(x,y,kind,T=50,gr=.3,dx=0,r=9){ const p=nearestPlayer(x,y); if(!p) return; const tx=p.x+p.w/2+dx, ty=p.y+p.h/2;
  shoot({x,y,vx:clamp((tx-x)/T,-9,9),vy:clamp((ty-y-.5*gr*T*T)/T,-16,6),grav:gr,kind,r}); }
function bossMinions(type){ return G.enemies.filter(e=>e.alive&&e.type===type).length; }

function updateBoss(B){
  B.t++;
  if(!B.awake){ bgrav(B); return; }
  if(B.dying){
    B.dying--; if(B.dying%5===0) burst(B.x+Math.random()*B.w,B.y+Math.random()*B.h,['#ffd23f','#ff8ec2','#fff','#8bd16a'],8,4);
    if(B.dying<=0) bossDefeated(B); return;
  }
  if(B.hurt>0) B.hurt--;
  B.hit=[];
  B.def.update(B);
  const A=G.arena;
  if(A){ if(B.x<A.x0){ B.x=A.x0; if(B.vx<0) B.vx=0; } if(B.x+B.w>A.x1){ B.x=A.x1-B.w; if(B.vx>0) B.vx=0; } }
  if(B.y>ROWS*TS){ B.y=(A?A.floor:400)-B.h; B.vy=0; }
  const D=B.def;
  for(const p of G.players){
    if(p.down) continue;
    if(overlap(p,B)){
      const fromTop=p.vy>0 && p.y+p.h-p.vy<=B.y+(D.stompZone||24);
      if(fromTop){
        if((D.canStomp?D.canStomp(B):true)&&B.hurt<=0){ damageBoss(B,p); p.vy=-13; }
        else { p.vy=-12; sfx.boing(); if(D.noStompMsg&&t60%20===0) say(B.x+B.w/2,B.y-20,D.noStompMsg,'#fff',16); }
        p.y=B.y-p.h-1; p.air=1; p.spring=true;
      } else if(!(D.harmless&&D.harmless(B)) && B.hurt<50) hurtPlayer(p,B);
    }
    for(const h of B.hit) if(overlap(p,h)) hurtPlayer(p,B);
  }
}
function damageBoss(B,p){
  B.hp--; B.hurt=70; sfx.bossHit(); G.shake=12;
  burst(B.x+B.w/2,B.y+10,['#fff','#ffd23f','#ff8ec2'],20,5);
  if(p){ p.inv=Math.max(p.inv,30); p.meter=Math.min(100,p.meter+15); }
  const lines=B.def.ouch||['Ouch!'];
  if(B.hp>0) say(B.x+B.w/2,B.y-24,lines[(B.max-B.hp-1)%lines.length],'#fff',20);
  if(B.def.onHurt) B.def.onHurt(B);
  if(B.hp<=0){ B.dying=100; B.hit=[]; G.projs=[]; for(const e of G.enemies) if(['biscuit','clone','minion','gummy'].includes(e.type)&&e.alive) killEnemy(e,null); say(B.x+B.w/2,B.y-30,B.def.lose||'Nooooo!','#ffd23f',24); sfx.win(); }
}
function bossDefeated(B){
  G.boss=null;
  if(G.id==='7-4'&&B.id==='licorice'&&!G.final){
    playCut(STORY.twist,()=>{
      G.final=true; const A=G.arena;
      G.boss=makeBoss('cakeeater',(A.x0+A.x1)/2+120,A.floor); G.boss.final=true; G.boss.hp=G.boss.max=6; G.boss.awake=true; G.boss.y=-200;
      G.shake=30; sfx.boss(); stopMusic(); playSong('final'); mode='play'; showGame(); toast('SECRET FINAL BOSS: THE CAKE EATER!','#ff8ec2');
    });
    return;
  }
  if(B.final){
    save.done['7-4']=1; save.villains.licorice=1; save.villains.cakeeater=1; save.beatGame=true; save.best['7-4']=Math.max(save.best['7-4']||0,G.cups); persist();
    stopMusic(); playSong('ending'); for(const p of G.players) p.state='happy';
    playCut(STORY.ending,()=>{
      if(count(save.stars)>=21) playCut(STORY.secret,()=>{ save.secretEnd=true; persist(); showEnd(true); });
      else showEnd(false);
    });
    return;
  }
  if(G.id==='6-4'){ playCut(STORY.cakeEscape,()=>{ mode='play'; levelDone(); }); return; }
  levelDone();
}

const BOSSES={
  // ---------- Ginger Grim ----------
  ginger:{w:66,h:104,hp:3,ouch:['My icing!','You crumbled my arm!'],lose:'I have... CRUMBLED!',
    init:B=>{ B.vx=-1.4; B.timer=90; },
    update(B){ const r=bgrav(B); if(r.wall) B.dir=-(B.dir||-1); B.dir=B.dir||-1;
      B.vx=B.dir*(1.4+(3-B.hp)*.5); B.face=towardP(B);
      if(--B.timer<=0){ const n=4-B.hp; for(let i=0;i<n;i++) lob(B.x+B.w/2+B.face*20,B.y+24,'ginger',42+i*8,.3,(i-(n-1)/2)*70,10); B.timer=100-(3-B.hp)*15; B.throwT=20; }
      if(B.throwT>0) B.throwT--; if(B.hp===1&&r.ground&&B.t%150===0) B.vy=-12; },
    draw(B){ const cx=B.x+B.w/2, by=B.y+B.h, f=B.face||-1, st=Math.sin(B.t*.15)*5;
      fs('#9c5524'); rr(cx-22+st*.5,by-30,18,30,8); rr(cx+4-st*.5,by-30,18,30,8);
      fs('#b5652d'); rr(cx-30,by-80,60,56,22); circ(cx,by-84,25);
      g.save(); g.translate(cx-f*28,by-66); g.rotate(f*(B.throwT>0?-2.2:.5)); fs('#b5652d'); rr(-8,0,16,36,8); g.restore();
      g.save(); g.translate(cx+f*26,by-66); g.rotate(f*-.4); fs('#b5652d'); rr(-8,0,16,32,8); fs('#fff'); g.fillRect(-2,30,4,-50); fs('#e8213a'); for(let i=0;i<4;i++) g.fillRect(-2,22-i*12,4,5); g.restore();
      g.strokeStyle='#fff'; g.lineWidth=3; g.beginPath(); for(let i=-1;i<=1;i++){ g.moveTo(cx-24,by-50+i*14); g.quadraticCurveTo(cx-20,by-54+i*14,cx-16,by-50+i*14); g.moveTo(cx+16,by-50+i*14); g.quadraticCurveTo(cx+20,by-54+i*14,cx+24,by-50+i*14);} g.stroke();
      [['#e8213a',-62],['#5ee08a',-48],['#ffd23f',-34]].forEach(([c,yy])=>{ fs(c); circ(cx,by+yy,5); });
      fs('#8a8f9a'); g.beginPath(); g.arc(cx,by-96,24,Math.PI,0); g.fill(); fs('#e8213a'); poly([[cx-4,by-120],[cx+4,by-120],[cx+f*-20,by-134]]);
      eyes(cx+f*5,by-84,f,true,1.5);
      g.strokeStyle='#fff'; g.lineWidth=3; g.beginPath(); g.arc(cx+f*5,by-68,8,Math.PI*1.15,Math.PI*1.85); g.stroke(); }},
  // ---------- Crumb Goblin ----------
  crumb:{w:36,h:42,hp:3,ouch:['Hey! My crumbs!','Grrr! MORE MINIONS!'],lose:'My shiiinies...',
    init:B=>{ B.dir=1; B.timer=120; },
    update(B){ const r=bgrav(B); if(r.wall) B.dir=-B.dir; B.vx=B.dir*(3+(3-B.hp)*.6); B.face=B.dir;
      if(r.ground&&B.t%60===0) B.vy=-11;
      if(--B.timer<=0){ if(bossMinions('biscuit')<4){ for(let i=0;i<2;i++) spawnEnemy('biscuit',B.x+i*20-10,B.y+B.h-TS); say(B.x+18,B.y-14,'Minions!','#ffd23f',16); } B.timer=200; } },
    draw(B){ const cx=B.x+B.w/2, by=B.y+B.h, f=B.face||1, st=Math.sin(B.t*.4)*4;
      fs('#8a5636'); ell(cx-f*14,by-24,10,13); fs('#c98e00'); circ(cx-f*14,by-36,3);
      fs('#6b3a1e'); g.fillRect(cx-8+st,by-8,6,8); g.fillRect(cx+2-st,by-8,6,8);
      fs('#d9a35a'); circ(cx,by-20,15); circ(cx,by-34,12); for(let i=0;i<8;i++){ fs(i%2?'#c9853f':'#e8c07a'); circ(cx-12+((i*7)%24),by-10-((i*11)%30),3); }
      fs('#d9a35a'); poly([[cx-10,by-38],[cx-24,by-46],[cx-12,by-32]]); poly([[cx+10,by-38],[cx+24,by-46],[cx+12,by-32]]);
      eyes(cx+f*3,by-36,f,true,.9); fs('#fff'); poly([[cx-6,by-27],[cx+6,by-27],[cx,by-23]]); }},
  // ---------- Meltmaster ----------
  melt:{w:66,h:96,hp:4,ouch:['Brrr-OUCH!','I\'m MELTING!','Not cool!'],lose:'Meeeeelting...',
    init:B=>{ B.dir=-1; B.timer=120; B.ice=[]; },
    update(B){ const r=bgrav(B); if(r.wall) B.dir=-B.dir; B.vx=B.dir*(2.4+(4-B.hp)*.4); B.face=B.dir;
      if(--B.timer<=0){ const xs=alivePlayers().map(p=>p.x+p.w/2); while(xs.length<3) xs.push(G.arena.x0+60+Math.random()*(G.arena.x1-G.arena.x0-120)); B.ice=xs.map(x=>({x,t:50})); B.timer=150-(4-B.hp)*15; B.cast=20; }
      if(B.cast>0) B.cast--;
      for(const c of B.ice){ if(--c.t===0) shoot({x:c.x,y:40,vx:0,vy:2,grav:.45,kind:'icicle',r:11}); } B.ice=B.ice.filter(c=>c.t>0); },
    draw(B){ const cx=B.x+B.w/2, by=B.y+B.h, f=B.face||-1;
      for(const c of B.ice){ fs('rgba(90,209,255,'+(.25+.25*Math.sin(t60*.4))+')'); ell(c.x,G.arena.floor-4,24,6); star(c.x,46,8,4,'#c9f2ff'); }
      fs('#e8b26a'); poly([[cx-26,by-50],[cx+26,by-50],[cx,by]]); g.strokeStyle='#c48a45'; g.lineWidth=2; g.beginPath(); g.moveTo(cx-18,by-44); g.lineTo(cx+6,by-12); g.moveTo(cx+18,by-44); g.lineTo(cx-6,by-12); g.stroke();
      fs('#9ff0d0'); circ(cx,by-66,30); circ(cx-22,by-56,12); circ(cx+22,by-56,12); for(let i=0;i<5;i++) rr(cx-24+i*11,by-56,7,10+Math.sin(B.t*.1+i)*5,4);
      fs('#4a2614'); [[-12,-80],[8,-74],[-2,-60],[14,-86]].forEach(([a,b])=>rr(cx+a,by+b,5,3,1));
      fs('#151515'); rr(cx-20+f*4,by-76,18,9,3); rr(cx+2+f*4,by-76,18,9,3); g.fillRect(cx-4+f*4,by-74,8,2);
      g.strokeStyle='#3a2416'; g.lineWidth=2.5; g.beginPath(); g.arc(cx+f*4,by-60,7,.3,Math.PI-.3); g.stroke();
      g.save(); g.translate(cx+f*30,by-60); g.rotate(f*(B.cast>0?-1:.3)); fs('#c9f2ff'); g.fillRect(-2,-30,4,30); star(0,-34,9,4,'#fff','#5ad1ff'); g.restore(); }},
  // ---------- Donut Doom ----------
  donut:{w:92,h:92,hp:3,ouch:['My sprinkles!','You glazed me!'],lose:'I\'m... toast...',noStompMsg:'Wait till he\'s dizzy!',
    canStomp:B=>B.st==='dizzy', harmless:B=>B.st==='dizzy',
    init:B=>{ B.st='roll'; B.dir=-1; B.bounces=0; B.rot=0; },
    update(B){ const r=bgrav(B);
      if(B.st==='roll'){ if(r.wall){ B.dir=-B.dir; B.bounces++; G.shake=8; sfx.block(); }
        B.vx=B.dir*(5.5+(3-B.hp)*.8); B.rot+=B.vx*.025; if(B.hp<=1&&r.ground&&B.t%70===0) B.vy=-10;
        if(B.bounces>=3&&r.ground){ B.st='dizzy'; B.timer=150; B.vx=0; } }
      else { B.vx=0; if(--B.timer<=0){ B.st='roll'; B.bounces=0; B.dir=towardP(B); } } },
    draw(B){ const cx=B.x+B.w/2, cy=B.y+B.h/2;
      g.save(); g.translate(cx,cy); g.rotate(B.rot||0); fs('#d9944a'); circ(0,0,46); fs('#6b3a1e'); circ(0,-2,40);
      ['#ffd23f','#5ad1ff','#fff','#ff4f7b','#7fe08a'].forEach((c,i)=>{ for(let k=0;k<3;k++){ fs(c); g.save(); g.rotate(i*1.25+k*2.1); g.fillRect(20+k*4,-2,9,4); g.restore(); } });
      fs('#2a1838'); circ(0,0,13); g.restore();
      const f=B.st==='dizzy'?0:Math.sign(B.vx||-1);
      if(B.st==='dizzy'){ for(let i=0;i<3;i++){ const a=t60*.1+i*2.1; star(cx+Math.cos(a)*30,B.y-6+Math.sin(a)*8,8,4,'#ffd23f'); } fs('#fff'); circ(cx-16,cy-22,9); circ(cx+16,cy-22,9); g.strokeStyle='#000'; g.lineWidth=2; g.beginPath(); g.arc(cx-16,cy-22,4,0,5); g.arc(cx+16,cy-22,4,0,5); g.stroke(); }
      else eyes(cx+f*6,cy-24,f,true,2); }},
  // ---------- The Candy Wizard ----------
  wizard:{w:48,h:88,hp:4,ouch:['My beard!','Ow! Abra-ca-OUCH!','You\'ll pay for that!'],lose:'My magic... is gone!',
    canStomp:B=>B.st==='idle', harmless:B=>B.st!=='idle',
    init:B=>{ B.st='idle'; B.timer=70; B.casts=0; },
    update(B){ B.vx=0; B.vy=0; B.face=towardP(B); const A=G.arena;
      if(B.st==='idle'){ B.alpha=1; if(--B.timer<=0){ B.casts++;
          if(B.casts%3===0&&bossMinions('gummy')<3){ for(let i=0;i<2;i++) spawnEnemy('gummy',B.x+(i?60:-60),A.floor-TS); say(B.x+24,B.y-14,'Rise, gummies!','#ff8ec2',16); }
          else for(let i=0;i<3;i++) shoot({x:B.x+24,y:B.y+10,vx:(i-1)*2.5,vy:-3,r:10,kind:'magic',homing:true,life:200,solidDie:false});
          B.st='fade'; B.timer=30; } }
      else if(B.st==='fade'){ B.alpha=B.timer/30; if(--B.timer<=0){
          const spots=[...A.plats.map(([a,b,y])=>[a+Math.random()*(b-a-B.w),y]),[A.x0+20+Math.random()*(A.x1-A.x0-80),A.floor],[A.x0+20+Math.random()*(A.x1-A.x0-80),A.floor]];
          const [sx,sy]=pick(Math.random,spots); B.x=sx; B.y=sy-B.h; B.st='appear'; B.timer=30; } }
      else { B.alpha=1-B.timer/30; if(--B.timer<=0){ B.st='idle'; B.timer=80-(4-B.hp)*10; } } },
    draw(B){ const cx=B.x+B.w/2, by=B.y+B.h, f=B.face||-1; g.save(); g.globalAlpha=clamp(B.alpha??1,0,1);
      fs('#6b3fbf'); poly([[cx-26,by],[cx+26,by],[cx+10,by-54],[cx-10,by-54]]); star(cx-10,by-20,6,3,'#ffd23f'); star(cx+12,by-34,5,2.5,'#ffd23f');
      fs('#ffd3b0'); circ(cx,by-62,13); fs('#fff'); poly([[cx-12,by-58],[cx+12,by-58],[cx+f*4,by-28]]);
      eyes(cx+f*3,by-65,f,true,.9);
      fs('#6b3fbf'); poly([[cx-20,by-70],[cx+20,by-70],[cx-f*14,by-112]]); fs('#ff8ec2'); g.fillRect(cx-18,by-74,36,5);
      g.save(); g.translate(cx+f*22,by-50); g.rotate(f*.4); fs('#fff'); g.fillRect(-2,-30,4,34); fs('#ff4f7b'); circ(0,-34,8); fs('#fff'); circ(-2,-36,2.5); g.restore();
      g.restore(); }},
  // ---------- The Cake Eater ----------
  cakeeater:{w:150,h:130,hp:4,stompZone:44,ouch:['GRRRAWR!','NOM... ow!','HUNGRY!!','STILL HUNGRY!'],lose:'B U R P',noStompMsg:'Make him crash first!',
    canStomp:B=>B.st==='stunned', harmless:B=>B.st==='stunned',
    init:B=>{ B.st='walk'; B.timer=100; },
    update(B){ const r=bgrav(B); const fin=B.final?1:0;
      if(B.st==='walk'){ B.face=towardP(B); B.vx=B.face*(1.2+fin*.6); if(fin&&B.t%45===0) shoot({x:G.arena.x0+40+Math.random()*(G.arena.x1-G.arena.x0-80),y:30,vx:0,vy:1,grav:.3,kind:'crumb',r:9});
        if(--B.timer<=0){ B.st='roar'; B.timer=45; } }
      else if(B.st==='roar'){ B.vx=0; G.shake=Math.max(G.shake,3); if(--B.timer<=0){ B.st='charge'; B.cdir=towardP(B); B.face=B.cdir; } }
      else if(B.st==='charge'){ B.vx=B.cdir*(7+fin*1.5); if(r.wall||Math.abs(B.vx)<.1&&B.t>5){ B.st='stunned'; B.timer=150; G.shake=16; sfx.slam();
          for(let i=0;i<4+fin*3;i++) shoot({x:G.arena.x0+40+Math.random()*(G.arena.x1-G.arena.x0-80),y:20,vx:0,vy:1,grav:.3,kind:'crumb',r:9}); } }
      else { B.vx=0; if(--B.timer<=0){ B.st='walk'; B.timer=110; } } },
    draw(B){ const cx=B.x+B.w/2, by=B.y+B.h, f=B.face||-1, roar=B.st==='roar'||B.st==='charge', st=Math.sin(B.t*.12)*6;
      fs('#4a2a6a'); rr(cx-50+st,by-36,34,36,12); rr(cx+16-st,by-36,34,36,12);
      fs('#5b3a8a'); ell(cx,by-72,76,62); for(let i=0;i<9;i++){ fs(i%2?'#6b4a9a':'#4a2a6a'); circ(cx-66+i*16,by-120+Math.abs(Math.sin(i))*8,12); }
      fs('#fff'); for(let i=0;i<6;i++) rr(cx-60+i*20,by-128,14,10+(i%2)*8,6);
      const mo=roar?30:12; fs('#2a0f1a'); ell(cx+f*12,by-58,46,mo); fs('#fff');
      for(let i=0;i<7;i++){ poly([[cx+f*12-40+i*12,by-58-mo+2],[cx+f*12-34+i*12,by-58-mo+2],[cx+f*12-37+i*12,by-58-mo+12]]); poly([[cx+f*12-40+i*12,by-58+mo-2],[cx+f*12-34+i*12,by-58+mo-2],[cx+f*12-37+i*12,by-58+mo-12]]); }
      if(B.st==='stunned'){ for(let i=0;i<3;i++){ const a=t60*.1+i*2.1; star(cx+Math.cos(a)*40,B.y-10+Math.sin(a)*10,9,4,'#ffd23f'); } fs('#fff'); circ(cx-22,by-104,9); circ(cx+22,by-104,9); g.strokeStyle='#000'; g.lineWidth=2; g.beginPath(); g.arc(cx-22,by-104,4,0,5); g.arc(cx+22,by-104,4,0,5); g.stroke(); }
      else { fs('#ffd23f'); circ(cx-20+f*6,by-104,8); circ(cx+20+f*6,by-104,8); fs('#e8213a'); circ(cx-20+f*8,by-104,4); circ(cx+20+f*8,by-104,4); }
      fs('#ff8ec2'); circ(cx+40,by-96,6); fs('#e8213a'); circ(cx,by-140,7); }},
  // ---------- Lord Licorice ----------
  licorice:{w:56,h:118,hp:5,ouch:['How DARE you!','My hat!','Insolent child!','Minions! HELP!'],lose:'Impossible... IMPOSSIBLE!',
    init:B=>{ B.st='walk'; B.timer=90; B.summon=200; },
    update(B){ const r=bgrav(B); const A=G.arena;
      if(B.st!=='whip'&&B.st!=='air') B.face=towardP(B);
      if(B.st==='walk'){ B.vx=B.face*(1.8+(5-B.hp)*.25); if(--B.timer<=0){ B.st='wind'; B.timer=28; } }
      else if(B.st==='wind'){ B.vx=0; if(--B.timer<=0){ B.st='whip'; B.timer=22; } }
      else if(B.st==='whip'){ B.vx=0; B.hit.push({x:B.face>0?B.x+B.w:B.x-170,y:B.y+40,w:170,h:24}); if(--B.timer<=0){ if(Math.random()<.5){ B.st='jumpPrep'; } else { B.st='walk'; B.timer=90; } } }
      else if(B.st==='jumpPrep'){ if(r.ground){ B.vy=-14; B.vx=B.face*4; B.st='air'; } }
      else if(B.st==='air'){ if(r.ground&&B.vy===0){ G.shake=8; B.st='walk'; B.timer=80; } }
      if(--B.summon<=0){ if(bossMinions('minion')<3){ spawnEnemy('minion',A.x0+20,A.floor-TS); spawnEnemy('minion',A.x1-60,A.floor-TS); say(B.x+28,B.y-20,'Minions! GET THEM!','#e8213a',16); } B.summon=260; } },
    draw(B){ const cx=B.x+B.w/2, by=B.y+B.h, f=B.face||-1, st=Math.sin(B.t*.15)*4;
      fs('#a0101e'); poly([[cx-14,by-92],[cx+14,by-92],[cx-f*30+st,by-12],[cx-f*4,by-14]]);
      g.strokeStyle='#151515'; g.lineWidth=9; g.lineCap='round'; g.beginPath(); g.moveTo(cx-6,by-40); g.lineTo(cx-8+st,by-3); g.moveTo(cx+6,by-40); g.lineTo(cx+8-st,by-3); g.stroke();
      fs('#1a1a1a'); rr(cx-15,by-96,30,60,10); g.strokeStyle='#3a3a3a'; g.lineWidth=2; for(let i=0;i<6;i++){ g.beginPath(); g.moveTo(cx-15,by-90+i*10); g.lineTo(cx+15,by-84+i*10); g.stroke(); }
      fs('#e8213a'); poly([[cx-6,by-94],[cx+6,by-94],[cx,by-82]]);
      fs('#2a2a2a'); circ(cx,by-104,15); fs('#ffd23f'); g.lineWidth=1.5; g.strokeStyle='#ffd23f'; g.beginPath(); g.arc(cx+f*7,by-106,5,0,PI2); g.stroke();
      eyes(cx+f*4,by-106,f,true,.8);
      g.strokeStyle='#151515'; g.lineWidth=3; g.beginPath(); g.arc(cx+f*4-6,by-96,5,0,Math.PI); g.arc(cx+f*4+6,by-96,5,0,Math.PI); g.stroke();
      fs('#151515'); g.fillRect(cx-18,by-120,36,4); rr(cx-12,by-148,24,30,3); fs('#e8213a'); g.fillRect(cx-12,by-126,24,5);
      const whip=B.st==='whip', wind=B.st==='wind';
      g.save(); g.translate(cx+f*14,by-82); g.rotate(f*(wind?-2.4:whip?.0:.4)); g.strokeStyle='#151515'; g.lineWidth=7; g.beginPath(); g.moveTo(0,0); g.lineTo(0,24); g.stroke(); g.restore();
      if(whip){ g.strokeStyle='#e8213a'; g.lineWidth=7; g.beginPath(); g.moveTo(cx+f*20,by-66); for(let i=1;i<=8;i++) g.lineTo(cx+f*(20+i*19),by-66+Math.sin(i+t60*.8)*6); g.stroke(); }
      g.lineCap='butt'; }},
  // ---------- Chocobun ----------
  chocobun:{w:44,h:56,hp:3,ouch:['Ow! My ears!','Hop-hop-OUCH!'],lose:'I\'m melting!',
    init:B=>{ B.ct=150; },
    update(B){ const r=bgrav(B);
      if(r.ground){ B.vx*=.7; B.st2=(B.st2||0)+1; if(B.st2>38){ B.st2=0; B.face=towardP(B); B.vy=-11; B.vx=B.face*3; } }
      if(--B.ct<=0){ if(bossMinions('clone')<3){ const A=G.arena; for(let i=0;i<3;i++) spawnEnemy('clone',A.x0+40+Math.random()*(A.x1-A.x0-120),A.floor-TS*2,{life:480}); say(B.x+22,B.y-14,'Clones, GO!','#fff',16); } B.ct=300; } },
    draw(B){ const cx=B.x+B.w/2, by=B.y+B.h, f=B.face||(B.vx>0?1:-1), sq=B.vy<-2?1.08:1;
      g.save(); g.translate(cx,by); g.scale(1/sq,sq);
      fs(B.clone?'#5a2e14':'#6b3a1e'); ell(-8,-48,6,15,-.2); ell(8,-50,6,15,.2); fs('#ffb3d1'); ell(-8,-48,2.5,10,-.2); ell(8,-50,2.5,10,.2);
      fs(B.clone?'#5a2e14':'#6b3a1e'); ell(0,-18,18,18); circ(0,-34,13); fs('#8a5636'); ell(0,-14,10,12);
      if(B.clone){ fs('rgba(90,46,20,.8)'); for(let i=0;i<3;i++) rr(-12+i*10,-4,6,6+Math.sin(B.t*.1+i)*3,3); }
      else { fs('#ffd23f'); poly([[-8,-24],[0,-20],[-8,-16]]); poly([[8,-24],[0,-20],[8,-16]]); circ(0,-20,3); if(t60%30<15) star(10,-40,4,2,'#fff'); }
      g.restore(); eyes(cx+f*3,by-36*sq,f,!B.clone,.9); fs('#ff8ec2'); circ(cx+f*6,by-30*sq,2.2); }},
  // ---------- Cupcake Chaos ----------
  chaos:{w:60,h:70,hp:4,ouch:['My frosting!','Hee-OUCH!','No fair!'],lose:'I\'m... crumbs...',
    init:B=>{ B.dir=1; B.timer=80; },
    update(B){ const r=bgrav(B); if(r.wall) B.dir=-B.dir; B.vx=B.dir*2; B.face=towardP(B);
      if(r.ground&&B.t%130===0) B.vy=-11;
      if(--B.timer<=0){ const n=2+((4-B.hp)>>1); for(let i=0;i<n;i++) lob(B.x+30,B.y+5,'bomb',50+i*10,.3,(i-(n-1)/2)*90,11); B.timer=110; B.fire=20; } if(B.fire>0) B.fire--; },
    draw(B){ const cx=B.x+B.w/2, by=B.y+B.h, f=B.face||1;
      fs('#7fc8ff'); poly([[cx-26,by-30],[cx+26,by-30],[cx+20,by],[cx-20,by]]); g.strokeStyle='#4f9ad6'; g.lineWidth=2; for(let i=-18;i<=18;i+=9){ g.beginPath(); g.moveTo(cx+i,by-29); g.lineTo(cx+i*.8,by-1); g.stroke(); }
      fs('#ff8ec2'); circ(cx-16,by-34,14); circ(cx+16,by-34,14); circ(cx,by-46,18); circ(cx,by-36,16);
      fs('#e8213a'); circ(cx,by-66,7); g.strokeStyle='#3a2416'; g.lineWidth=2; g.beginPath(); g.moveTo(cx,by-72); g.lineTo(cx+4,by-78); g.stroke();
      if(B.fire>0||t60%20<10){ star(cx+5,by-80,5,2,'#ffd23f'); }
      eyes(cx+f*4,by-42,f,true,1.1); g.strokeStyle='#3a2416'; g.lineWidth=2.5; g.beginPath(); g.arc(cx+f*4,by-34,7,.2,Math.PI-.2); g.stroke(); }},
  // ---------- Jelly Jaws ----------
  jaws:{w:96,h:80,hp:4,ouch:['WOBBLE-OW!','Grrr-ble!','My jiggle!'],lose:'W o b b l e . . .',noStompMsg:'Wait till he lands!',
    canStomp:B=>B.ground&&!B.inAir,
    init:B=>{ B.timer=40; },
    update(B){ const r=bgrav(B);
      if(r.ground){ if(B.inAir){ B.inAir=false; G.shake=8; B.timer=45-(4-B.hp)*5; if(B.hp<=2) for(const s of [-1,1]) shoot({x:B.x+B.w/2+s*40,y:B.y+B.h-10,vx:s*4,vy:-5,grav:.3,kind:'jelly',r:8}); }
        B.vx=0; if(--B.timer<=0){ const p=nearestPlayer(B.x+B.w/2,B.y); const dx=p?p.x-B.x-B.w/2:0; B.vy=-15; B.vx=clamp(dx/55,-5,5); B.inAir=true; B.face=Math.sign(dx)||1; } } },
    draw(B){ const cx=B.x+B.w/2, by=B.y+B.h, f=B.face||1, sq=B.ground?1+Math.max(0,(20-B.timer))/60:.9;
      g.save(); g.translate(cx,by); g.scale(sq,1/sq);
      fs('rgba(255,60,100,.85)'); g.beginPath(); g.moveTo(-48,0); g.quadraticCurveTo(-52,-80,0,-80); g.quadraticCurveTo(52,-80,48,0); g.closePath(); g.fill();
      fs('rgba(255,255,255,.35)'); ell(-20,-56,10,16,.3);
      fs('#7a0f2a'); ell(f*8,-28,30,12); fs('#fff'); for(let i=0;i<6;i++){ poly([[f*8-26+i*9,-38],[f*8-18+i*9,-38],[f*8-22+i*9,-30]]); poly([[f*8-26+i*9,-18],[f*8-18+i*9,-18],[f*8-22+i*9,-26]]); }
      g.restore(); eyes(cx+f*8,by-60/sq,f,true,1.4); }},
  // ---------- Marshmallow Max ----------
  max:{w:150,h:150,hp:4,ouch:['Squish-ouch!','Hey! I\'m soft!','Toasty!'],lose:'I\'m... s\'more of a loser...',noStompMsg:'Too big! Wait till he\'s small!',
    canStomp:B=>B.st==='small',
    init:B=>{ B.st='big'; B.timer=240; B.dir=-1; },
    update(B){ const r=bgrav(B); const setSize=s=>{ const cx=B.x+B.w/2, by=B.y+B.h; B.w=B.h=s; B.x=cx-s/2; B.y=by-s; };
      if(B.st==='big'){ B.vx=towardP(B)*.9; if(r.ground&&B.t%90===0) B.vy=-9; if(--B.timer<=0){ B.st='shrink'; B.timer=30; } }
      else if(B.st==='shrink'){ B.vx=0; setSize(50+100*B.timer/30); if(--B.timer<=0){ setSize(50); B.st='small'; B.timer=220; } }
      else if(B.st==='small'){ if(r.wall) B.dir=-B.dir; B.vx=B.dir*3.8; if(r.ground&&B.t%40===0) B.vy=-10; if(--B.timer<=0){ B.st='grow'; B.timer=30; } }
      else { B.vx=0; setSize(150-100*B.timer/30); if(--B.timer<=0){ setSize(150); B.st='big'; B.timer=240; } }
      B.face=B.vx>0?1:B.vx<0?-1:B.face; },
    draw(B){ const cx=B.x+B.w/2, by=B.y+B.h, s=B.w/150, f=B.face||-1;
      fs('#fff'); rr(B.x,B.y+6*s,B.w,B.h-6*s,30*s); fs('#f5e6dc'); ell(cx,B.y+12*s,B.w/2,14*s); fs('#e8b88a'); ell(cx,B.y+10*s,B.w/2-8*s,9*s);
      fs('rgba(255,180,200,.5)'); ell(cx-40*s,by-70*s,12*s,8*s); ell(cx+40*s,by-70*s,12*s,8*s);
      eyes(cx+f*6*s,by-88*s,f,B.st==='big',2.4*s+.6);
      g.strokeStyle='#3a2416'; g.lineWidth=Math.max(2,4*s); g.beginPath(); g.arc(cx+f*6*s,by-62*s,14*s,.2,Math.PI-.2); g.stroke(); }},
  // ---------- Captain Custard ----------
  custard:{w:60,h:96,hp:5,ouch:['My pudding!','Mutiny!','Wobbly-ouch!','Spoon defence FAILED!'],lose:'The vault... is yours...',noStompMsg:'Spoon is up! Wait!',
    canStomp:B=>B.st!=='guard',
    init:B=>{ B.st='walk'; B.timer=80; },
    update(B){ const r=bgrav(B);
      if(B.st==='walk'){ B.face=towardP(B); B.vx=B.face*1.8; if(--B.timer<=0){ B.st='raise'; B.timer=30; } }
      else if(B.st==='raise'){ B.vx=0; if(--B.timer<=0){ B.st='swing'; B.timer=18; } }
      else if(B.st==='swing'){ B.vx=0; B.hit.push({x:B.face>0?B.x+B.w-10:B.x-110,y:B.y+20,w:120,h:70}); if(--B.timer<=0){ B.st='guard'; B.timer=70; } }
      else if(B.st==='guard'){ B.vx=0; if(--B.timer<=0){ for(let i=0;i<3;i++) lob(B.x+30,B.y+10,'custard',45+i*12,.3,(i-1)*80,10); B.st='walk'; B.timer=80; } } },
    draw(B){ const cx=B.x+B.w/2, by=B.y+B.h, f=B.face||-1;
      fs('#ffe27a'); poly([[cx-30,by],[cx+30,by],[cx+22,by-62],[cx-22,by-62]]); fs('#c98e00'); ell(cx,by-62,22,7); poly([[cx-22,by-62],[cx-18,by-52],[cx-12,by-60],[cx-4,by-50],[cx+4,by-60],[cx+12,by-50],[cx+18,by-60],[cx+22,by-62]]);
      fs('#1d3a7a'); poly([[cx-26,by-66],[cx+26,by-66],[cx+18,by-84],[cx-18,by-84]]); fs('#ffd23f'); circ(cx,by-76,5); fs('#fff'); g.fillRect(cx-26,by-68,52,3);
      eyes(cx+f*4,by-40,f,true,1); fs('#5a3420'); ell(cx+f*4-7,by-30,8,3,.3); ell(cx+f*4+7,by-30,8,3,-.3);
      if(B.st==='guard'){ fs('#cfd6de'); g.fillRect(cx-40,by-100,60,6); ell(cx+30,by-97,22,13); fs('#fff'); ell(cx+26,by-100,8,4); }
      else { const a=B.st==='raise'?-2.2:B.st==='swing'?.9:.4;
        g.save(); g.translate(cx+f*22,by-40); g.rotate(f*a); fs('#cfd6de'); g.fillRect(-3,-56,6,56); ell(0,-66,14,20); fs('#fff'); ell(-4,-70,4,8); g.restore(); } }},
};
