// ================= Drawing the world =================
const PAL={
  forest:{sky:['#8fe3ff','#e5fff2'],ground:'#7a4a2c',top:'#7fe08a',top2:'#4fc06a',plat:'#ff8ec2',plat2:'#c2457f',wall:'#c2457f',water:'#6b3a1e',bg:'forest'},
  ginger:{sky:['#ffb36b','#ffe7c2'],ground:'#b5652d',top:'#ffffff',top2:'#f3d9c0',plat:'#d98b4a',plat2:'#8a4b1f',wall:'#8a4b1f',water:'#6b3a1e',bg:'houses'},
  frost:{sky:['#a8d8ff','#f2fbff'],ground:'#8fc4ea',top:'#ffffff',top2:'#e0f0ff',plat:'#ffd1e6',plat2:'#ff8ec2',wall:'#5ab8e8',water:'#3c9fd8',bg:'peaks'},
  donut:{sky:['#ffc2a8','#fff0d6'],ground:'#d9944a',top:'#ff8ec2',top2:'#e2639f',plat:'#ffd23f',plat2:'#c98e00',wall:'#e2639f',water:'#6b3a1e',bg:'donuts'},
  sugar:{sky:['#c9b6ff','#fde6ff'],ground:'#f7f0ff',top:'#ff8ec2',top2:'#ffd1e6',plat:'#ffffff',plat2:'#e8213a',wall:'#e8213a',water:'#b47cff',bg:'canecastle'},
  volcano:{sky:['#4a1d1d','#b5532a'],ground:'#4a2614',top:'#7a3e1d',top2:'#c87a2a',plat:'#8a5636',plat2:'#3a1d0c',wall:'#3a1d0c',water:'#6b3a1e',bg:'volcano'},
  castle:{sky:['#1a1030','#4a2a6a'],ground:'#2a2a33',top:'#e8213a',top2:'#8a1020',plat:'#555566',plat2:'#e8213a',wall:'#151515',water:'#6b3a1e',bg:'darkcastle'},
  pudding:{sky:['#fff3a8','#ffe0f0'],ground:'#e8b04a',top:'#fff6d0',top2:'#ffd27a',plat:'#ffffff',plat2:'#e8b04a',wall:'#c98e00',water:'#ffe27a',bg:'islands'},
  vault:{sky:['#3a2a10','#8a6a20'],ground:'#b58a10',top:'#ffe27a',top2:'#c9a227',plat:'#ffe27a',plat2:'#8a6a10',wall:'#6b4a00',water:'#ffe27a',bg:'vault'},
};

function draw(){
  g=MAIN; g.setTransform(1,0,0,1,0,0);
  if(!G){ drawMenuBg(); return; }
  const P=G.pal;
  drawSky(P);
  const sx=G.shake?(Math.random()-.5)*G.shake:0, sy=G.shake?(Math.random()-.5)*G.shake:0;
  g.save(); g.translate(Math.round(-G.cam+sx),Math.round(sy));
  const c0=Math.max(0,Math.floor(G.cam/TS)-1), c1=Math.min(G.w-1,Math.ceil((G.cam+VW)/TS)+1);
  // which fake walls should turn see-through
  const near=(x,y)=>G.players.some(p=>!p.down&&Math.abs(p.x+p.w/2-(x*TS+20))<90&&Math.abs(p.y+p.h/2-(y*TS+20))<70);
  // checkpoints
  for(const c of G.checks){ fs('#ddd'); g.fillRect(c.x-2,c.y-80,4,80); fs('#bbb'); rr(c.x-6,c.y-86,12,10,5);
    fs(c.on?'#7fe08a':'#999'); poly([[c.x+2,c.y-78],[c.x+30+Math.sin(t60*.1)*3,c.y-68],[c.x+2,c.y-58]]); if(c.on) drawCupcake(c.x+14,c.y-70,.45); }
  if(G.goal) drawGoal(G.goal);
  // items
  for(const it of G.items){ if(it.got) continue; if(it.x<G.cam-40||it.x>G.cam+VW+40) continue; const bob=it.pop||it.fall?0:Math.sin(t60*.07+it.ph)*4, y=it.y+bob;
    if(it.old) g.globalAlpha=.45;
    switch(it.type){
      case 'coin': drawCoin(it.x,y,t60+it.ph*20); break;
      case 'cup': drawCupcake(it.x,y,1,CUP_COLORS[it.hue||0]); break;
      case 'heart': drawPower('heart',it.x,y,t60); break;
      case 'spoon': fs('rgba(255,210,63,.3)'); circ(it.x,y,22+Math.sin(t60*.1)*3); drawSpoon(it.x,y+4); break;
      case 'star': fs('rgba(255,243,168,.35)'); circ(it.x,y,24+Math.sin(t60*.1)*3); drawHiddenStar(it.x,y,t60); break;
      case 'card': fs('rgba(255,142,194,.3)'); circ(it.x,y,22); drawCardIcon(it.x,y); break;
      case 'door': drawDoor(it.x,it.y+20,t60); break;
      case 'power': fs('rgba(255,255,255,.35)'); circ(it.x,y,20); drawPower(it.pw,it.x,y,t60); break;
    }
    g.globalAlpha=1; }
  // tiles are drawn after items, so secrets stay hidden inside fake walls
  for(let y=0;y<ROWS;y++) for(let x=c0;x<=c1;x++){ const ch=G.grid[y][x]; if(ch!=='.') drawTile(P,x,y,ch,near); }
  // enemies
  for(const e of G.enemies) if(e.alive&&e.x>G.cam-80&&e.x<G.cam+VW+80) ENEMY_ART[e.type](e);
  if(G.boss){ const B=G.boss; if(!(B.hurt>0&&Math.floor(B.hurt/4)%2===0)){ g.save(); if(B.dying) g.globalAlpha=B.dying/100; B.def.draw(B); g.restore(); } }
  for(const q of G.projs) drawProj(q);
  // heroes
  for(const p of G.players) drawPlayer(p);
  // particles and words
  for(const p of G.parts){ g.globalAlpha=Math.min(1,p.life/20); if(p.coin) drawCoin(p.x,p.y,t60); else { fs(p.col); g.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz); } }
  g.globalAlpha=1;
  for(const f of G.texts){ g.globalAlpha=Math.min(1,f.life/20); outlineText(f.txt,f.x,f.y,f.col,f.size); }
  g.globalAlpha=1;
  g.restore();
  if(G.cave){ const gr=g.createRadialGradient(VW/2,VH/2,250,VW/2,VH/2,620); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.45)'); fs(gr); g.fillRect(0,0,VW,VH); }
  drawHUD();
}
function drawPlayer(p){
  const cx=p.x+p.w/2, by=p.y+p.h;
  if(p.down){ g.globalAlpha=.8; fs('rgba(200,240,255,.5)'); circ(cx,p.y+p.h/2,38); g.strokeStyle='#fff'; g.lineWidth=2; g.beginPath(); g.arc(cx,p.y+p.h/2,38,0,PI2); g.stroke();
    drawHero(p.ch,cx,by-6,p.face,t60,'idle',null,.75); g.globalAlpha=1; outlineText(Math.ceil(p.downT/60)+'',cx,p.y-28,'#fff',16); return; }
  if(p.inv>0&&Math.floor(p.inv/5)%2===0&&mode==='play') return;
  if(p.rushT>0){ g.globalAlpha=.35; fs(['#ffd23f','#ff8ec2','#5ad1ff','#7fe08a'][Math.floor(t60/4)%4]); circ(cx,p.y+p.h/2,38); g.globalAlpha=1; }
  if(p.megaT>0){ g.globalAlpha=.25; fs('#ffd23f'); circ(cx,p.y+p.h/2-10,52); g.globalAlpha=1; }
  const sc=p.megaT>0?1.6:1;
  drawHero(p.ch,cx,by,p.face,p.anim,mode==='done'?'happy':p.state,null,sc,{flash:p.rushT>0&&t60%8<4});
  if(p.shield){ g.strokeStyle='rgba(90,209,255,.8)'; g.lineWidth=3; fs('rgba(90,209,255,.18)'); circ(cx,p.y+p.h/2-4,34*sc); g.beginPath(); g.arc(cx,p.y+p.h/2-4,34*sc,0,PI2); g.stroke(); }
  if(G.players.length>1){ fs(p.ch==='ivy'?'#ff7eb6':'#3fae4a'); poly([[cx-6,p.y-26*sc],[cx+6,p.y-26*sc],[cx,p.y-18*sc]]); }
}
function drawGoal(f){
  const cx=f.x+f.w/2, by=f.y+f.h;
  fs('rgba(255,230,120,.35)'); circ(cx,by-50,55+Math.sin(t60*.08)*6);
  fs('#fff'); rr(cx-34,by-14,68,14,6); fs('#d7c9b8'); g.fillRect(cx-6,by-40,12,28); fs('#fff'); ell(cx,by-42,40,9);
  drawCupcake(cx,by-66+Math.sin(t60*.06)*3,2.2,'#ffc1dc','#ff8ec2');
  for(let i=0;i<4;i++){ const a=t60*.03+i*1.57; star(cx+Math.cos(a)*48,by-66+Math.sin(a)*30,6,3,'#ffd23f'); }
  outlineText('MORE DESSERT!',cx,f.y-14,'#fff',16);
}

function drawSky(P){
  const gr=g.createLinearGradient(0,0,0,VH); gr.addColorStop(0,G.cave?'#2a1a14':P.sky[0]); gr.addColorStop(1,G.cave?'#4a3020':P.sky[1]); fs(gr); g.fillRect(0,0,VW,VH);
  const cam=G.cam, par=f=>-cam*f;
  const each=(f,step,fn)=>{ const off=par(f); const first=Math.floor(-off/step)-1; for(let i=first;i<first+Math.ceil(VW/step)+3;i++) fn(off+i*step,i); };
  if(G.cave){
    each(.3,170,(x,i)=>{ fs('#3a2418'); poly([[x,0],[x+60,90+(i*37%60)],[x+120,0]]); fs('#5a3a28'); poly([[x+20,VH],[x+80,VH-120-(i*53%80)],[x+150,VH]]); });
    each(.5,260,(x,i)=>{ fs(['#ff8ec2','#5ad1ff','#ffd23f'][Math.abs(i)%3]); g.globalAlpha=.6; poly([[x,VH-60],[x+10,VH-100],[x+20,VH-60]]); poly([[x+18,VH-60],[x+26,VH-86],[x+34,VH-60]]); g.globalAlpha=1; });
    return;
  }
  const bg=P.bg;
  if(bg==='forest'){
    each(.15,300,(x,i)=>{ fs('#a8e6b0'); ell(x+150,VH-60,220,170); });
    each(.4,220,(x,i)=>{ const h=200+(Math.abs(i)*53%90); fs('#fff'); g.fillRect(x+80,VH-h,8,h); fs(['#ff5d8f','#5ad1ff','#ffd23f','#b47cff'][Math.abs(i)%4]); circ(x+84,VH-h,34); g.strokeStyle='#fff'; g.lineWidth=5; g.beginPath(); g.arc(x+84,VH-h,18,0,5); g.stroke(); });
  } else if(bg==='houses'){
    fs('rgba(255,255,255,.6)'); circ(780,90,46);
    each(.35,200,(x,i)=>{ const h=150+(Math.abs(i)*61%90); fs('#c9763a'); g.fillRect(x+20,VH-h,150,h); fs('#8a4b1f'); poly([[x+5,VH-h],[x+95,VH-h-80],[x+185,VH-h]]);
      g.strokeStyle='#fff'; g.lineWidth=5; g.beginPath(); for(let k=0;k<6;k++){ g.moveTo(x+10+k*30,VH-h); g.quadraticCurveTo(x+25+k*30,VH-h+14,x+40+k*30,VH-h); } g.stroke();
      fs('#ffe9b0'); g.fillRect(x+45,VH-h+40,30,30); g.fillRect(x+115,VH-h+40,30,30); fs('#e8213a'); circ(x+60,VH-h+20,6); fs('#5ee08a'); circ(x+130,VH-h+20,6); });
  } else if(bg==='peaks'){
    each(.2,330,(x,i)=>{ const h=280+(Math.abs(i)*71%120); fs(['#ffd1e6','#c9f2ff','#fff3c4'][Math.abs(i)%3]); poly([[x-40,VH],[x+165,VH-h],[x+370,VH]]);
      fs('#fff'); g.beginPath(); g.moveTo(x+115,VH-h+60); g.lineTo(x+165,VH-h); g.lineTo(x+215,VH-h+60); for(let k=0;k<4;k++) g.quadraticCurveTo(x+202-k*25,VH-h+86,x+190-k*25,VH-h+60); g.fill(); });
    for(let i=0;i<30;i++){ fs(['#ff8ec2','#5ad1ff','#ffd23f','#fff'][i%4]); const x=(i*97-cam*.6)%VW, y=(i*61+t60*(1+i%3))%VH; g.fillRect((x+VW)%VW,y,5,2); }
  } else if(bg==='donuts'){
    each(.2,320,(x,i)=>{ const r=150+(Math.abs(i)*41%60); fs('#e0a35f'); circ(x+160,VH+20,r); fs(['#ff8ec2','#6b3a1e','#fff3c4'][Math.abs(i)%3]); circ(x+160,VH+10,r-12); fs(P.sky[1]); circ(x+160,VH+20,r*.35); });
    each(.45,240,(x,i)=>{ fs('#5ee08a'); g.globalAlpha=.6; ell(x+60,VH-30,70,40); g.globalAlpha=1; });
  } else if(bg==='canecastle'){
    each(.2,600,(x,i)=>{ fs('#f2e6ff'); g.fillRect(x+100,VH-300,400,300); for(let k=0;k<5;k++){ fs('#fff'); g.fillRect(x+90+k*95,VH-360,50,360); fs('#ff8ec2'); poly([[x+80+k*95,VH-360],[x+115+k*95,VH-430],[x+150+k*95,VH-360]]); } });
    each(.45,180,(x,i)=>{ fs('#fff'); g.fillRect(x+60,VH-220,12,220); fs('#e8213a'); for(let k=0;k<8;k++) g.fillRect(x+60,VH-220+k*28,12,10); g.lineWidth=12; g.strokeStyle='#fff'; g.beginPath(); g.arc(x+44,VH-220,16,0,Math.PI,true); g.stroke(); });
  } else if(bg==='volcano'){
    const vx=par(.1)%1400+700; fs('#2a120a'); poly([[vx-420,VH],[vx-80,VH-330],[vx+80,VH-330],[vx+420,VH]]); fs('#ffa83f'); poly([[vx-80,VH-330],[vx+80,VH-330],[vx+50,VH-300],[vx-30,VH-280]]);
    fs('rgba(255,168,63,.25)'); circ(vx,VH-360,90+Math.sin(t60*.05)*10);
    for(let i=0;i<6;i++){ fs('rgba(90,60,60,.35)'); circ(vx+Math.sin(t60*.01+i)*40,VH-400-((t60*.6+i*60)%300),30+i*4); }
    each(.45,250,(x,i)=>{ fs('#3a1d0c'); poly([[x,VH],[x+70,VH-140-(Math.abs(i)*29%60)],[x+140,VH]]); });
  } else if(bg==='darkcastle'){
    fs('#fff7c2'); circ(780,100,44); fs(P.sky[0]); circ(764,90,38);
    each(.2,520,(x,i)=>{ fs('#120a20'); g.fillRect(x+60,VH-330,360,330); for(let k=0;k<4;k++){ g.fillRect(x+40+k*120,VH-400,60,400); poly([[x+30+k*120,VH-400],[x+70+k*120,VH-470],[x+110+k*120,VH-400]]); fs('#ffd23f'); g.fillRect(x+62+k*120,VH-360,16,22); fs('#120a20'); } });
    each(.45,300,(x,i)=>{ fs('#000'); g.globalAlpha=.4; const y=120+(Math.abs(i)*37%100), w=Math.sin(t60*.2+i)*6; poly([[x,y],[x-16,y-6+w],[x-10,y+4]]); poly([[x,y],[x+16,y-6+w],[x+10,y+4]]); g.globalAlpha=1; });
  } else if(bg==='islands'){
    each(.2,360,(x,i)=>{ const y=200+(Math.abs(i)*59%140); fs('#ffe27a'); poly([[x+40,y],[x+220,y],[x+170,y+60],[x+90,y+60]]); fs('#8a4b1a'); ell(x+130,y,92,14); fs('#e8213a'); circ(x+130,y-14,10); });
  } else if(bg==='vault'){
    each(.3,240,(x,i)=>{ fs('#6b4a00'); g.fillRect(x+40,60,40,VH); fs('#c9a227'); g.fillRect(x+34,60,52,16); });
    each(.5,200,(x,i)=>{ for(let k=0;k<6;k++){ fs(k%2?'#ffd23f':'#f2b705'); ell(x+60+k*12-(k>2?30:0),VH-40-(k>2?14:0),12,5); } });
  }
}

function drawTile(P,x,y,ch,near){
  const px=x*TS, py=y*TS;
  const isTop=y>0&&!SOLIDS.includes(G.grid[y-1][x])&&G.grid[y-1][x]!=='f';
  if(ch==='#'||ch==='f'||ch==='I'){
    if(ch==='f'&&near(x,y)) g.globalAlpha=.35;
    const ice=ch==='I';
    fs(ice?'#bfe6ff':P.ground); g.fillRect(px,py,TS+1,TS+1);
    if(ice){ fs('rgba(255,255,255,.5)'); g.fillRect(px+6,py+8,12,3); g.fillRect(px+20,py+24,10,3); }
    else { fs('rgba(0,0,0,.08)'); if((x+y)%2) g.fillRect(px,py,TS,TS); fs('rgba(255,255,255,.08)'); circ(px+10+(x*7%20),py+15+(y*5%15),3); }
    if(ch==='f'){ g.strokeStyle='rgba(0,0,0,.18)'; g.lineWidth=1.5; g.beginPath(); g.moveTo(px+8,py+8); g.lineTo(px+16,py+18); g.lineTo(px+12,py+26); g.stroke(); }
    if(isTop&&y>1){ fs(ice?'#fff':P.top); g.fillRect(px,py,TS,11); circ(px+10,py+11,6.5); circ(px+30,py+11+((x*13)%3)*2,5.5); fs('rgba(255,255,255,.35)'); g.fillRect(px,py+2,TS,3); }
    if(G.cave&&y<=1){ fs('#3a2418'); g.fillRect(px,py,TS+1,TS+1); if(y===1){ fs('#5a3a28'); poly([[px+8,py+TS],[px+16,py+TS+10+(x%3)*4],[px+24,py+TS]]); } }
    g.globalAlpha=1;
  } else if(ch==='='){
    const pal=G.pal.bg;
    if(pal==='peaks'||pal==='islands'){ fs('#fff'); circ(px+10,py+8,10); circ(px+28,py+6,12); g.fillRect(px,py+4,TS,12); fs(P.plat2); g.fillRect(px,py+14,TS,4); }
    else if(pal==='canecastle'||pal==='forest'){ fs('#fff'); rr(px,py,TS,14,6); fs(pal==='forest'?'#ff5d8f':'#e8213a'); for(let i=0;i<3;i++) poly([[px+i*14,py],[px+i*14+8,py],[px+i*14+2,py+14],[px+i*14-6,py+14]]); }
    else if(pal==='houses'){ fs('#d98b4a'); rr(px,py,TS,14,4); fs('#fff'); for(let i=0;i<4;i++) circ(px+5+i*10,py+13,3.5); }
    else { fs(P.plat); g.fillRect(px,py,TS,10); fs(P.plat2); g.fillRect(px,py+10,TS,4); }
  } else if(ch==='M'){
    const w=Math.sin(t60*.15+x)*2; fs('#fff'); rr(px+1-w,py+4+w,TS-2+w*2,TS-4-w,12); fs('#e8b88a'); ell(px+20,py+8+w,16,5); fs('rgba(255,180,200,.6)'); circ(px+12,py+24,3); circ(px+28,py+24,3);
  } else if(ch==='L'){
    fs('#c98e4a'); g.fillRect(px+6,py,5,TS); g.fillRect(px+29,py,5,TS); fs('#e0b070'); for(let k=0;k<3;k++) g.fillRect(px+6,py+6+k*13,28,4);
  } else if(ch==='w'){
    const surf=y>0&&G.grid[y-1][x]!=='w';
    g.globalAlpha=.8; fs(P.water); g.fillRect(px,py+(surf?6:0),TS,TS-(surf?6:0)); fs('rgba(255,255,255,.07)'); g.fillRect(px,py+14+Math.sin(t60*.05+x*.7)*4,TS,4);
    if(surf){ fs('rgba(255,255,255,.35)'); const k=Math.sin(t60*.08+x)*3; ell(px+20,py+7+k*.3,18,3); }
    g.globalAlpha=1;
  } else if(ch==='v'){
    const surf=y>0&&G.grid[y-1][x]!=='v';
    fs('#e07b18'); g.fillRect(px,py+(surf?8:0),TS+1,TS); if(surf){ fs('#ffa83f'); for(let k=0;k<2;k++) circ(px+10+k*20,py+10+Math.sin(t60*.1+x+k)*3,8); fs('#ffd23f'); circ(px+20,py+12+Math.sin(t60*.13+x)*3,3); }
  } else if(ch==='?'||ch==='!'){
    fs(ch==='?'?'#f2b705':'#ff7eb6'); rr(px+1,py+1,TS-2,TS-2,6); fs('rgba(255,255,255,.35)'); g.fillRect(px+4,py+4,TS-8,4);
    outlineText(ch,px+20,py+30+Math.sin(t60*.1)*1.5,'#fff',24,'center','rgba(0,0,0,.35)');
  } else if(ch==='U'){
    fs('#8a5636'); rr(px+1,py+1,TS-2,TS-2,6); fs('#6b3a1e'); circ(px+8,py+8,2); circ(px+32,py+8,2); circ(px+8,py+32,2); circ(px+32,py+32,2);
  } else if(ch==='W'){
    fs(P.wall); g.fillRect(px,py,TS+1,TS+1); fs('rgba(255,255,255,.15)'); g.fillRect(px,py+(y%2?0:20),TS,4); g.fillRect(px+(y%2?10:30),py,4,TS);
  }
}

function abilityKey(p){ if(isTouch&&G.players.length===1) return '★'; if(G.players.length>1) return p.idx===0?'E':'Enter'; return 'X'; }
function drawHUD(){
  // players
  G.players.forEach((p,i)=>{
    const x0=10+i*250;
    fs('rgba(42,24,56,.6)'); rr(x0,8,238,58,16);
    g.save(); g.beginPath(); g.arc(x0+30,37,22,0,PI2); fs(p.ch==='ivy'?'#ffd1e6':'#c8f0cc'); g.fill(); g.clip(); drawHero(p.ch,x0+30,95,1,0,'idle',null,1.35); g.restore();
    for(let k=0;k<Math.max(p.hearts,0);k++) heart(x0+66+k*22,26,8,'#ff4f7b');
    if(p.shield) drawPower('shield',x0+66+Math.max(p.hearts,0)*22+6,26,t60,.55);
    fs('rgba(255,255,255,.25)'); rr(x0+58,44,120,12,6);
    const full=p.meter>=100; fs(full?['#ffd23f','#ff8ec2','#5ad1ff'][Math.floor(t60/6)%3]:(p.ch==='ivy'?'#ff7eb6':'#5ee08a')); rr(x0+58,44,1.2*p.meter,12,6);
    g.font='600 11px Fredoka,sans-serif'; g.textAlign='left'; fs('#fff'); g.fillText(full?'READY! '+abilityKey(p):(p.ch==='ivy'?'Sugar Rush':'Big Bro Boost'),x0+184,54);
    let ix=x0+184; const timers=[['speedT','sugar'],['rainT','rainbow'],['megaT','mega']];
    for(const [k,pw] of timers) if(p[k]>0){ g.globalAlpha=p[k]<120&&t60%10<5?.4:1; drawPower(pw,ix+8,28,t60,.5); g.globalAlpha=1; ix+=22; }
  });
  // middle: cupcakes and coins
  const mx=VW/2+(G.players.length>1?140:0);
  fs('rgba(42,24,56,.6)'); rr(mx-110,8,220,34,14);
  drawCupcake(mx-88,28,.7); outlineText(`${G.cups}/${G.cupsTotal}`,mx-50,33,'#fff',18);
  drawCoin(mx+20,25,t60); outlineText(''+save.coins,mx+58,33,'#ffd23f',18);
  // right: level name + secrets found
  if(G.players.length<2){ outlineText(G.L.name,VW-66,30,'#fff',16,'right'); }
  if(G.L.kind==='level'){
    const has=k=>G.found[k]||(k==='spoon'?save.spoons:k==='star'?save.stars:save.cards)[G.id];
    const bx=VW-150, by=60;
    g.globalAlpha=has('spoon')?1:.25; drawSpoon(bx,by,.7); g.globalAlpha=has('star')?1:.25; drawHiddenStar(bx+34,by,0,.65); g.globalAlpha=has('card')?1:.25; drawCardIcon(bx+66,by,.7); g.globalAlpha=1;
  }
  // boss health
  const B=G.boss;
  if(B&&B.awake&&!B.dying){
    fs('rgba(42,24,56,.7)'); rr(VW/2-200,VH-46,400,36,14);
    outlineText(SPEAKERS[B.id].name,VW/2,VH-34,'#fff',14);
    for(let i=0;i<B.max;i++) heart(VW/2-(B.max-1)*14+i*28,VH-20,8,i<B.hp?'#8bd16a':'rgba(255,255,255,.25)');
  }
  // banner and toast
  if(G.banner>0){ g.globalAlpha=Math.min(1,G.banner/30); fs('rgba(42,24,56,.6)'); rr(VW/2-260,VH/2-70,520,90,22);
    outlineText(G.L.kind==='rematch'?'':G.id.toUpperCase()+'  ·  '+(G.L.W.name||''),VW/2,VH/2-36,'#ffd1e6',18); outlineText(G.L.name,VW/2,VH/2-4,'#fff',30); g.globalAlpha=1; }
  if(G.toast){ g.globalAlpha=Math.min(1,G.toast.t/20); outlineText(G.toast.txt,VW/2,110,G.toast.col,22); g.globalAlpha=1; }
}

function drawMenuBg(){
  const gr=g.createLinearGradient(0,0,0,VH); gr.addColorStop(0,'#b47cff'); gr.addColorStop(1,'#ffb3d6'); fs(gr); g.fillRect(0,0,VW,VH);
  for(let i=0;i<24;i++){ const x=(i*137+t60*.4)%(VW+80)-40, y=(i*91+t60*(.5+i%3*.2))%(VH+80)-40; g.globalAlpha=.5;
    if(i%3===0) drawCupcake(x,y,1.2,CUP_COLORS[i%9]); else if(i%3===1) drawCoin(x,y,t60+i*10); else drawCardArt(i%21,x,y,.8); }
  g.globalAlpha=1;
}
