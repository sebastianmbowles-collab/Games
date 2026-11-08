// ================= Art: everything is drawn with shapes, no pictures needed =================
function circ(x,y,r){ g.beginPath(); g.arc(x,y,r,0,PI2); g.fill(); }
function ell(x,y,rx,ry,rot=0){ g.beginPath(); g.ellipse(x,y,Math.abs(rx),Math.abs(ry),rot,0,PI2); g.fill(); }
function rr(x,y,w,h,r){ g.beginPath(); if(g.roundRect) g.roundRect(x,y,w,h,r); else g.rect(x,y,w,h); g.fill(); }
function poly(pts){ g.beginPath(); pts.forEach(([a,b],i)=>i?g.lineTo(a,b):g.moveTo(a,b)); g.closePath(); g.fill(); }
function fs(c){ g.fillStyle=c; }
function star(x,y,R,r,fill,stroke){ g.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, k=i%2?r:R; g.lineTo(x+Math.cos(a)*k,y+Math.sin(a)*k); } g.closePath(); fs(fill); g.fill(); if(stroke){ g.strokeStyle=stroke; g.lineWidth=2; g.stroke(); } }
function heart(x,y,s,col){ fs(col); g.beginPath(); g.moveTo(x,y+s*.9); g.bezierCurveTo(x-s*1.4,y-s*.1,x-s*.6,y-s*1.1,x,y-s*.35); g.bezierCurveTo(x+s*.6,y-s*1.1,x+s*1.4,y-s*.1,x,y+s*.9); g.fill(); }
function withCtx(ctx,fn){ const o=g; g=ctx; try{ fn(); } finally { g=o; } }
function outlineText(txt,x,y,col='#fff',size=20,align='center',stroke='#3a2416'){
  g.font=`700 ${size}px Fredoka,sans-serif`; g.textAlign=align; g.lineWidth=Math.max(3,size/5); g.strokeStyle=stroke; g.lineJoin='round';
  g.strokeText(txt,x,y); fs(col); g.fillText(txt,x,y);
}

// ---------- Heroes ----------
const HERO={
  ivy:{name:'Ivy',hair:'#5b3418',eye:'#3b1f10',skin:'#ffd3b0',style:'bob',scale:1},
  seb:{name:'Sebastian',hair:'#6b4423',eye:'#8a7a3a',skin:'#f7c9a3',style:'curly',scale:1.13},
};
const COSTUMES={
  ivy:[
    {id:'classic',name:'Adventure Ivy',price:0,top:'#ff7eb6',topStyle:'tee',bottom:'#8a5cd6',bottomStyle:'skirt',shoes:['#ff4f7b','#fff']},
    {id:'princess',name:'Princess Ivy',price:80,top:'#ffb3e1',topStyle:'dress',bottom:'#ffb3e1',bottomStyle:'gown',shoes:['#fff','#ffd23f'],hat:'tiara'},
    {id:'chef',name:'Baker Ivy',price:100,top:'#ffffff',topStyle:'chef',bottom:'#3b3b4f',bottomStyle:'pants',shoes:['#222','#fff'],hat:'chef'},
    {id:'ninja',name:'Ninja Ivy',price:120,top:'#2b2b3a',topStyle:'tee',bottom:'#2b2b3a',bottomStyle:'pants',shoes:['#111','#e8213a'],hat:'ninja'},
    {id:'astro',name:'Astronaut Ivy',price:150,top:'#f2f2f2',topStyle:'suit',bottom:'#f2f2f2',bottomStyle:'pants',shoes:['#9aa6b2','#fff'],hat:'astro'},
    {id:'unicorn',name:'Unicorn Ivy',price:200,top:'#fff1fb',topStyle:'hoodie',bottom:'#fff1fb',bottomStyle:'pants',shoes:['#ffb3e1','#fff'],hat:'unicorn'},
    {id:'hero',name:'Super Ivy',price:250,top:'#ff4f7b',topStyle:'tee',bottom:'#3a5fb0',bottomStyle:'pants',shoes:['#ffd23f','#fff'],hat:'mask',cape:'#ffd23f'},
  ],
  seb:[
    {id:'classic',name:'Hoodie Sebastian',price:0,top:'#3fae4a',topStyle:'hoodie',bottom:'#3a6fc4',bottomStyle:'jeans',shoes:['#151515','#ffffff'],pixel:true},
    {id:'knight',name:'Knight Sebastian',price:100,top:'#a8b0bd',topStyle:'armor',bottom:'#6b7280',bottomStyle:'pants',shoes:['#4b5563','#a8b0bd'],hat:'knight'},
    {id:'pirate',name:'Pirate Sebastian',price:120,top:'#f2ead8',topStyle:'tee',bottom:'#5a3420',bottomStyle:'pants',shoes:['#151515','#8a5636'],hat:'pirate'},
    {id:'chef',name:'Baker Sebastian',price:100,top:'#ffffff',topStyle:'chef',bottom:'#3b3b4f',bottomStyle:'pants',shoes:['#222','#fff'],hat:'chef'},
    {id:'robot',name:'Robot Sebastian',price:150,top:'#9aa6b2',topStyle:'armor',bottom:'#6b7280',bottomStyle:'pants',shoes:['#374151','#ffd23f'],hat:'robot'},
    {id:'explorer',name:'Explorer Sebastian',price:180,top:'#c9a66b',topStyle:'tee',bottom:'#7a5a32',bottomStyle:'shorts',shoes:['#5a3420','#fff'],hat:'explorer'},
    {id:'hero',name:'Super Sebastian',price:250,top:'#3fae4a',topStyle:'tee',bottom:'#151515',bottomStyle:'pants',shoes:['#e8213a','#fff'],hat:'mask',cape:'#e8213a'},
  ],
};
const costumeOf=(ch,id)=>COSTUMES[ch].find(c=>c.id===id)||COSTUMES[ch][0];

function drawHero(ch,x,y,face,t,state,cos,scale=1,opt={}){
  const H=HERO[ch], C=cos||costumeOf(ch,save.wear[ch]);
  const s=scale*H.scale;
  g.save(); g.translate(x,y); g.scale(face*s,s);
  const run=state==='run', air=state==='jump'||state==='fall', climb=state==='climb', swim=state==='swim';
  const sp=run?t*.35:climb?t*.25:swim?t*.2:0;
  const sw=run?Math.sin(sp)*.65:swim?Math.sin(sp)*.5:0;
  const bob=run?Math.abs(Math.sin(sp))*2:(state==='idle'?Math.sin(t*.06)*.8:0);
  g.translate(0,-bob);
  if(climb) g.scale(-1,1); // seen from the back-ish: just flip
  // cape behind everything
  if(C.cape){ fs(C.cape); const fl=run?Math.sin(sp*2)*3:air?-4:0; poly([[-7,-36],[7,-36],[-4+fl*.3,-12],[-20+fl,-10]]); }
  // hair behind the head
  fs(H.hair);
  if(H.style==='bob'&&C.hat!=='astro'&&C.hat!=='unicorn'&&C.hat!=='ninja'&&C.hat!=='knight'&&C.hat!=='robot'){ rr(-14,-58,20,22,6); }
  if(H.style==='curly'&&C.hat!=='astro'&&C.hat!=='knight'&&C.hat!=='robot'){ for(let i=0;i<5;i++) circ(-11+Math.sin(i*1.7)*2,-56+i*4.2,5.5); }
  if(C.hat==='unicorn'||C.topStyle==='hoodie'&&!C.hat&&false){}
  // legs
  const leg=(ang,dx)=>{ g.save(); g.translate(dx,-18);
    g.rotate(climb?Math.sin(sp+(dx>0?Math.PI:0))*.4:air?(dx<0?.55:-.35):ang);
    const long=C.bottomStyle==='jeans'||C.bottomStyle==='pants'||C.bottomStyle==='gown';
    fs(long?C.bottom:H.skin); g.fillRect(-3.5,0,7,14);
    if(C.bottomStyle==='shorts'){ fs(C.bottom); g.fillRect(-3.5,0,7,6); }
    if(C.bottomStyle==='jeans'){ fs('rgba(255,255,255,.18)'); g.fillRect(-3.5,8,7,1.5); }
    // shoes / runners
    fs(C.shoes[0]); rr(-4.5,12,11,6,3); fs(C.shoes[1]); g.fillRect(-4.5,16,11,2); if(ch==='seb'&&C.id==='classic'){ fs('#fff'); g.fillRect(-1,13,5,1.5);}
    g.restore(); };
  leg(sw,-4); leg(-sw,4);
  // body
  const T=C.top;
  if(C.topStyle==='dress'||C.bottomStyle==='gown'){ fs(T); poly([[-8,-36],[8,-36],[14,-12],[-14,-12]]); fs('rgba(255,255,255,.55)'); g.fillRect(-13,-16,26,2.5); fs('#ffd23f'); circ(0,-30,2); }
  else{
    fs(T); rr(-9.5,-37,19,20,5);
    if(C.bottomStyle==='skirt'){ fs(C.bottom); poly([[-10,-21],[10,-21],[13,-12],[-13,-12]]); }
    else if(C.bottomStyle!=='shorts'){ fs(C.bottom); rr(-9.5,-21,19,5,2); }
    else { fs(C.bottom); rr(-9.5,-21,19,7,2); }
    if(C.topStyle==='hoodie'){
      fs('rgba(0,0,0,.12)'); rr(-9.5,-28,19,6,2); // pocket
      if(C.pixel){ // blocky pixel pattern on the hoodie
        fs('#2f8a3a'); [[-8,-35],[0,-33],[4,-29],[-6,-25],[2,-23]].forEach(([a,b])=>g.fillRect(a,b,4,4));
        fs('#6fd27a'); [[-4,-31],[5,-35],[-8,-29]].forEach(([a,b])=>g.fillRect(a,b,3,3));
      }
      fs('#fff'); g.fillRect(2,-36,1.5,7); g.fillRect(6,-36,1.5,6); // hood strings
      fs(T); ell(-9,-37,7,4,-.3); // hood behind neck
    }
    if(C.topStyle==='armor'){ fs('rgba(255,255,255,.35)'); g.fillRect(-9,-35,18,3); fs('rgba(0,0,0,.2)'); g.fillRect(-9,-27,18,2); }
    if(C.topStyle==='chef'){ fs('#ddd'); circ(3,-32,1.5); circ(3,-26,1.5); }
    if(C.topStyle==='suit'){ fs('#5ad1ff'); rr(-3,-33,8,6,2); fs('#e8213a'); circ(-5,-30,1.5); }
  }
  // back arm
  const arm=(ang,dx,front)=>{ g.save(); g.translate(dx,-34);
    let a=ang; if(air) a=-2.5+(front?.35:0); if(climb) a=-2.8+Math.sin(sp+(front?0:Math.PI))*.5; if(swim) a=-1.6+Math.sin(sp+(front?0:2))*.9;
    if(state==='happy') a=-2.7; g.rotate(a);
    fs(T); g.fillRect(-3.2,0,6.4,7); fs(H.skin); g.fillRect(-2.6,6,5.2,8); circ(0,14.5,3.2); g.restore(); };
  arm(-sw*.9,-7,false);
  // head
  fs(H.skin); circ(1,-46,12);
  // hair on top
  fs(H.hair);
  if(H.style==='bob'&&!['astro','unicorn','ninja','knight','robot'].includes(C.hat)){
    g.beginPath(); g.arc(1,-47,12.6,Math.PI*.98,Math.PI*2.02); g.lineTo(13,-50); g.lineTo(13.4,-51); g.closePath(); g.fill();
    g.fillRect(-12,-50,7,13); // straight side at the back
    g.fillRect(-4,-58,17,7.5); // straight bangs
    fs('rgba(255,255,255,.18)'); g.fillRect(-2,-56,10,1.5);
  }
  if(H.style==='curly'&&!['astro','knight','robot'].includes(C.hat)){
    for(let i=0;i<7;i++) circ(-9+i*3.6,-57+Math.sin(i*2.1)*1.6,5);
    circ(11,-52,4); circ(-12,-48,5);
  }
  // face
  if(!['astro','knight','robot'].includes(C.hat)||C.hat==='astro'){
    if(state==='happy'){ g.strokeStyle='#3a2416'; g.lineWidth=2; g.beginPath(); g.arc(5,-46,2.4,Math.PI,0); g.stroke(); g.beginPath(); g.arc(10.5,-46,2.4,Math.PI,0); g.stroke(); }
    else if(state==='hurt'){ fs('#3a2416'); g.font='bold 8px sans-serif'; g.textAlign='center'; g.fillText('x',5,-43); g.fillText('x',10.5,-43); }
    else { fs('#fff'); ell(5,-47,2.6,3.2); ell(10.5,-47,2.3,3.2); fs(H.eye); ell(5.6,-46.6,1.8,2.4); ell(11,-46.6,1.6,2.4); fs('#111'); circ(5.9,-46.4,.9); circ(11.2,-46.4,.9); fs('#fff'); circ(6.3,-47.6,.7); circ(11.6,-47.6,.7); }
    fs('rgba(255,120,140,.4)'); ell(3,-41,3,2); ell(12.5,-41,2,1.8);
    g.strokeStyle='#3a2416'; g.lineWidth=1.6; g.beginPath();
    if(state==='hurt') g.arc(8.5,-36.5,3,Math.PI*1.1,Math.PI*1.9); else if(opt.mouth==='o'){ fs('#3a2416'); circ(8.5,-40,2.4); } else g.arc(8.5,-41.5,3.5,.25,Math.PI-.4);
    g.stroke();
  }
  drawHat(C.hat,H);
  // front arm
  arm(sw*.9,6,true);
  if(opt.flash){ g.globalCompositeOperation='source-atop'; fs('rgba(255,255,255,.6)'); g.fillRect(-30,-80,60,90); g.globalCompositeOperation='source-over'; }
  g.restore();
}
function drawHat(h,H){
  if(!h) return;
  if(h==='tiara'){ fs('#ffd23f'); poly([[-8,-56],[-6,-62],[-3,-57],[1,-64],[5,-57],[8,-62],[10,-56]]); fs('#ff4f7b'); circ(1,-59,1.6); }
  else if(h==='chef'){ fs('#fff'); rr(-10,-62,22,6,2); circ(-5,-66,6); circ(2,-69,7); circ(8,-66,6); }
  else if(h==='ninja'){ fs('#2b2b3a'); g.beginPath(); g.arc(1,-46,12.8,Math.PI,PI2); g.fill(); g.fillRect(-12,-46,26,3); fs('#e8213a'); g.fillRect(-12,-52,26,3.5); poly([[-12,-51],[-20,-55],[-19,-47]]); }
  else if(h==='astro'){ g.strokeStyle='#d0d6dd'; g.lineWidth=3; fs('rgba(190,230,255,.35)'); circ(1,-46,16); g.beginPath(); g.arc(1,-46,16,0,PI2); g.stroke(); fs('#fff'); circ(-6,-55,3); }
  else if(h==='unicorn'){ fs('#fff1fb'); g.beginPath(); g.arc(1,-47,14,Math.PI*.85,Math.PI*2.1); g.fill(); g.fillRect(-13,-50,6,14); fs('#ffd23f'); poly([[0,-60],[5,-60],[3,-74]]); fs('#ff8ec2'); poly([[-9,-57],[-4,-60],[-8,-66]]); fs('#b47cff'); circ(-12,-52,3); circ(-13,-46,3); }
  else if(h==='mask'){ fs('#151515'); g.fillRect(-1,-50,16,5); poly([[-1,-50],[-8,-53],[-7,-46]]); }
  else if(h==='knight'){ fs('#a8b0bd'); g.beginPath(); g.arc(1,-46,14,0,PI2); g.fill(); fs('#4b5563'); g.fillRect(2,-50,13,3); g.fillRect(4,-46,11,2); fs('#e8213a'); poly([[-4,-60],[4,-60],[-8,-72]]); }
  else if(h==='pirate'){ fs('#151515'); poly([[-14,-55],[16,-55],[10,-64],[1,-68],[-8,-64]]); fs('#fff'); circ(1,-61,2.5); fs('#151515'); circ(10.5,-47,3); g.fillRect(-6,-51,18,1.5); }
  else if(h==='robot'){ fs('#9aa6b2'); rr(-12,-60,26,26,4); fs('#5ad1ff'); g.fillRect(2,-52,10,5); fs('#374151'); g.fillRect(1,-44,12,2); g.fillRect(0,-62,2,-8); fs('#ffd23f'); circ(1,-71,3); }
  else if(h==='explorer'){ fs('#c9a66b'); ell(1,-56,18,4); rr(-8,-66,18,11,4); fs('#5a3420'); g.fillRect(-8,-58,18,2.5); }
}

// ---------- Collectibles and power-ups ----------
const CUP_COLORS=['#ffc1dc','#c9f2ff','#fff3a8','#d9c2ff','#c2ffd6','#ffd1a8','#ffb3b3','#fff','#ffe27a'];
function drawCupcake(x,y,s=1,frost='#ffc1dc',wrap='#7fc8ff'){
  g.save(); g.translate(x,y); g.scale(s,s);
  fs(wrap); poly([[-10,0],[10,0],[7,13],[-7,13]]);
  g.strokeStyle='rgba(0,0,0,.18)'; g.lineWidth=1.3; for(let i=-6;i<=6;i+=4){ g.beginPath(); g.moveTo(i,1); g.lineTo(i*.75,12); g.stroke(); }
  fs(frost); circ(-6,-2,6.5); circ(6,-2,6.5); circ(0,-7,7.5); circ(0,-1,7.5);
  fs('#e8213a'); circ(0,-14,3.6); fs('#fff'); circ(-1.3,-15.4,1.1);
  g.restore();
}
function drawCoin(x,y,t){
  const w=Math.abs(Math.cos(t*.06))*11+2;
  fs('#c98e00'); ell(x,y,w,12); fs('#ffd23f'); ell(x,y,w*.8,9.5);
  if(w>6){ fs('#fff3a8'); ell(x-w*.25,y-3,w*.2,3); fs('#c98e00'); g.fillRect(x-1.5,y-5,3,10); }
}
function drawSpoon(x,y,s=1){ g.save(); g.translate(x,y); g.rotate(-.5); g.scale(s,s); fs('#a87d00'); rr(-2.5,-2,5,22,2); ell(0,-10,8,11); fs('#ffd23f'); rr(-1.6,-2,3.2,21,2); ell(0,-10,6.5,9.5); fs('#fff6c2'); ell(-2,-13,2,4); g.restore(); }
function drawHiddenStar(x,y,t,s=1){ g.save(); g.translate(x,y); g.scale(s,s); g.rotate(Math.sin(t*.05)*.2); star(0,0,17,8,'#fff3a8','#f2b705'); fs('#3a2416'); circ(-4,-1,1.8); circ(4,-1,1.8); g.strokeStyle='#3a2416'; g.lineWidth=1.5; g.beginPath(); g.arc(0,2,3,.2,Math.PI-.2); g.stroke(); g.restore(); }
function drawCardIcon(x,y,s=1){ g.save(); g.translate(x,y); g.scale(s,s); g.rotate(.12); fs('#fff'); rr(-12,-16,24,32,4); g.strokeStyle='#c2457f'; g.lineWidth=2.5; g.strokeRect(-10,-14,20,28); fs('#c2457f'); g.font='700 16px Fredoka,sans-serif'; g.textAlign='center'; g.fillText('?',0,6); g.restore(); }
function drawPower(type,x,y,t,s=1){
  g.save(); g.translate(x,y); g.scale(s,s);
  if(type==='sugar'){ drawCupcake(0,2,1,'#fff3a8','#ff8ec2'); fs('#ffd23f'); poly([[2,-22],[-5,-10],[0,-10],[-3,-1],[6,-14],[1,-14]]); }
  else if(type==='shield'){ fs('#5ad1ff'); circ(0,0,14); fs('#fff'); circ(0,0,9); fs('#5ad1ff'); circ(0,0,6); poly([[-14,-4],[-22,-9],[-22,9],[-14,4]]); poly([[14,-4],[22,-9],[22,9],[14,4]]); }
  else if(type==='mega'){ fs('#d99a55'); circ(0,0,16); fs('#4a2614'); [[-7,-5],[5,-8],[-2,6],[8,4],[-9,4],[1,-1]].forEach(([a,b])=>circ(a,b,2.6)); fs('#fff'); g.font='700 11px Fredoka,sans-serif'; g.textAlign='center'; outlineText('MEGA',0,24,'#ffd23f',11); }
  else if(type==='rainbow'){ fs('#fff'); g.fillRect(-1.5,6,3,16); const cols=['#ff4f7b','#ffa83f','#ffd23f','#5ee08a','#5ad1ff','#b47cff']; cols.forEach((c,i)=>{ fs(c); circ(0,-4,13-i*2); }); }
  else if(type==='heart'){ heart(0,0,13,'#ff4f7b'); fs('rgba(255,255,255,.5)'); circ(-5,-4,2.5); }
  g.restore();
}
function drawDoor(x,y,t){ // secret door: x,y = bottom center
  fs('rgba(255,230,120,'+(.25+Math.sin(t*.08)*.1)+')'); circ(x,y-40,48);
  fs('#8a5636'); rr(x-22,y-80,44,80,20); fs('#b47c47'); rr(x-17,y-74,34,74,16); fs('#ffd23f'); circ(x+9,y-36,3.5);
  star(x,y-56,9,4,'#ffd23f');
}

// ---------- Dessert cards (21 desserts) ----------
const CARD_ART={
  cupcake:(c)=>drawCupcake(0,4,1.6,c[0],c[1]),
  lolli:(c)=>{ fs('#fff'); g.fillRect(-2,6,4,22); c.forEach((col,i)=>{ fs(col); circ(0,-6,18-i*5); }); },
  cake:(c)=>{ fs(c[1]); rr(-20,-6,40,26,4); fs(c[0]); rr(-22,-14,44,12,6); for(let i=-18;i<=18;i+=9) circ(i,-2,4); fs('#e8213a'); circ(0,-18,4); },
  ginger:(c)=>{ fs('#b5652d'); circ(0,-14,9); rr(-8,-6,16,20,6); rr(-18,-4,36,7,4); rr(-9,12,7,12,3); rr(2,12,7,12,3); fs('#fff'); circ(-3,-15,1.5); circ(3,-15,1.5); circ(0,0,1.5); circ(0,6,1.5); },
  cookie:(c)=>{ fs('#d99a55'); circ(0,0,20); fs('#4a2614'); [[-8,-6],[6,-9],[-3,8],[9,5],[-11,4],[2,-1]].forEach(([a,b])=>circ(a,b,3)); },
  brownie:(c)=>{ fs('#4a2614'); rr(-18,-10,36,26,4); fs('#c87a2a'); rr(-18,-12,36,8,4); fs('#6b3a1e'); circ(-8,4,3); circ(6,8,3); },
  icecream:(c)=>{ fs('#e8b26a'); poly([[-12,0],[12,0],[0,28]]); fs(c[0]); circ(0,-6,13); fs('#e8213a'); circ(3,-19,4); },
  popsicle:(c)=>{ fs('#d9a873'); g.fillRect(-3,10,6,16); fs(c[0]); rr(-11,-22,22,36,10); fs('rgba(255,255,255,.4)'); rr(-7,-18,5,24,3); },
  sundae:(c)=>{ fs('#cfeaff'); poly([[-16,0],[16,0],[6,16],[-6,16]]); g.fillRect(-2,16,4,6); rr(-10,20,20,4,2); fs('#fff3c4'); circ(-7,-4,9); fs('#ff9ec8'); circ(7,-4,9); fs('#6b3a1e'); circ(0,-13,9); fs('#e8213a'); circ(0,-24,4); },
  donut:(c)=>{ fs('#e0a35f'); circ(0,0,20); fs(c[0]); circ(0,-1,17); fs('#fff6e9'); circ(0,0,6); ['#ffd23f','#5ad1ff','#7fe08a','#fff','#b47cff'].forEach((col,i)=>{ fs(col); g.save(); g.rotate(i*1.25); g.fillRect(9,-2,6,3); g.restore(); }); },
  jar:(c)=>{ fs('rgba(200,240,255,.7)'); rr(-15,-14,30,34,6); fs('#c98e00'); rr(-16,-20,32,7,3); ['#ff4f7b','#ffd23f','#5ee08a','#5ad1ff','#b47cff','#ffa83f'].forEach((col,i)=>{ fs(col); ell(-8+(i%3)*8,10-Math.floor(i/3)*9,4,3,i); }); },
  macaron:(c)=>{ [[-10,6,c[0]],[10,6,c[1]],[0,-10,c[2]||c[0]]].forEach(([a,b,col])=>{ fs(col); ell(a,b-3,11,5); fs('#fff6e9'); g.fillRect(a-10,b-1,20,3); fs(col); ell(a,b+4,11,5); }); },
  cane:(c)=>{ g.lineWidth=9; g.lineCap='round'; g.strokeStyle='#fff'; g.beginPath(); g.moveTo(4,26); g.lineTo(4,-8); g.arc(-6,-8,10,0,Math.PI,true); g.stroke(); g.strokeStyle='#e8213a'; g.lineWidth=3; for(let i=0;i<5;i++){ g.beginPath(); g.moveTo(0,22-i*7); g.lineTo(8,18-i*7); g.stroke(); } g.lineCap='butt'; },
  pavlova:(c)=>{ fs('#fffaf0'); ell(0,8,22,10); circ(-10,0,8); circ(0,-4,9); circ(10,0,8); fs('#e8213a'); circ(-6,-8,4); circ(5,-10,4); fs('#5a6bd6'); circ(0,-14,3); circ(12,-6,3); },
  mug:(c)=>{ fs('#e8213a'); rr(-14,-10,26,30,4); g.strokeStyle='#e8213a'; g.lineWidth=5; g.beginPath(); g.arc(13,4,7,-1.4,1.4); g.stroke(); fs('#6b3a1e'); ell(-1,-10,13,4); fs('#fff'); circ(-6,-14,5); circ(2,-15,5); },
  apple:(c)=>{ fs('#5a3420'); g.fillRect(-2,-30,4,14); fs('#e8213a'); circ(-6,0,14); circ(6,0,14); fs('#c87a2a'); poly([[-19,-2],[19,-2],[18,8],[-18,8]]); fs('rgba(255,255,255,.4)'); circ(-8,-6,3); },
  bar:(c)=>{ fs('#4a2614'); rr(-16,-22,32,44,3); fs('#6b3a1e'); for(let i=0;i<3;i++) for(let j=0;j<2;j++) rr(-13+j*14,-19+i*14,12,12,2); fs('#c2457f'); g.fillRect(-16,6,32,16); },
  pie:(c)=>{ fs('#d9a873'); poly([[-22,4],[22,4],[18,14],[-18,14]]); fs(c[0]); ell(0,2,20,7); fs('#fff'); circ(-6,0,3); circ(6,1,3); },
  pudding:(c)=>{ fs(c[0]); poly([[-16,16],[16,16],[11,-10],[-11,-10]]); fs('#8a4b1a'); ell(0,-10,11,4); poly([[-11,-10],[-9,-4],[-6,-9],[-2,-2],[2,-9],[6,-4],[11,-10]]); fs('#e8213a'); circ(0,-16,4); },
};
const CARDS=[
  ['Strawberry Cupcake','cupcake',['#ffb3d1','#7fc8ff']],['Rainbow Lollipop','lolli',['#ff4f7b','#ffd23f','#5ad1ff','#fff']],['Chocolate Fudge Cake','cake',['#6b3a1e','#4a2614']],
  ['Gingerbread Pal','ginger',[]],['Choc-Chip Cookie','cookie',[]],['Caramel Brownie','brownie',[]],
  ['Vanilla Cone','icecream',['#fff3c4']],['Blue Raspberry Popsicle','popsicle',['#5ad1ff']],['Triple Sundae','sundae',[]],
  ['Sprinkle Donut','donut',['#ff8ec2']],['Chocolate Donut','donut',['#6b3a1e']],['Jellybean Jar','jar',[]],
  ['Rainbow Macarons','macaron',['#ffb3d1','#c2ffd6','#d9c2ff']],['Candy Cane','cane',[]],['Cloud Pavlova','pavlova',[]],
  ['Hot Cocoa','mug',[]],['Caramel Apple','apple',[]],['Chocolate Bar','bar',[]],
  ['Lemon Tart','pie',['#fff06a']],['Royal Pudding','pudding',['#ffe27a']],['Golden Cake Slice','cake',['#ffe27a','#f2b705']],
];
function drawCardArt(i,x,y,s=1){ const c=CARDS[i]; g.save(); g.translate(x,y); g.scale(s,s); CARD_ART[c[1]](c[2]); g.restore(); }

// ---------- Enemies ----------
const ENEMY_ART={
  cookie(e){ const cx=e.x+e.w/2, cy=e.y+e.h/2, f=e.vx>0?1:-1, st=Math.sin(e.t*.25)*3;
    fs('#3a2416'); g.fillRect(cx-8+st,e.y+e.h-6,6,6); g.fillRect(cx+2-st,e.y+e.h-6,6,6);
    fs('#c9853f'); circ(cx,cy-2,14); fs('#e0a35f'); circ(cx,cy-3,12); fs('#4a2614'); [[-6,-8],[5,-9],[-8,2],[7,3]].forEach(([a,b])=>circ(cx+a,cy+b,2.2));
    eyes(cx+f*3,cy-3,f,true); },
  jelly(e){ const cx=e.x+e.w/2, cy=e.y+e.h/2, col=['#ff4f7b','#ffd23f','#5ee08a','#b47cff','#ffa83f'][e.hue||0];
    fs(col); ell(cx,cy,12,9); fs('rgba(255,255,255,.45)'); ell(cx-4,cy-4,4,2);
    g.strokeStyle='#3a2416'; g.lineWidth=1.5; for(let i=-1;i<=1;i++){ g.beginPath(); g.moveTo(cx+i*6,cy+7); g.lineTo(cx+i*8,cy+11+Math.sin(e.t*.5+i)*2); g.stroke(); }
    g.beginPath(); g.moveTo(cx-3,cy-8); g.lineTo(cx-6,cy-15); g.moveTo(cx+3,cy-8); g.lineTo(cx+6,cy-15); g.stroke(); eyes(cx,cy-1,1,false,.8); },
  gummy(e){ const cx=e.x+e.w/2, by=e.y+e.h, sq=e.vy<-2?1.1:e.vy>2?.95:1, col=e.col||'#ff4f7b';
    g.save(); g.translate(cx,by); g.scale(1/sq,sq); g.globalAlpha=.9; fs(col);
    circ(0,-22,11); circ(-8,-31,5); circ(8,-31,5); rr(-11,-16,22,15,6); circ(-12,-12,4); circ(12,-12,4); rr(-10,-5,8,5,3); rr(2,-5,8,5,3);
    fs('rgba(255,255,255,.4)'); circ(-4,-26,3); g.globalAlpha=1; g.restore(); eyes(cx,by-23*sq,e.vx>0?1:-1,false); },
  bat(e){ const cx=e.x+e.w/2, cy=e.y+e.h/2, fl=Math.sin(e.t*.4)*8;
    fs('#4a2614'); poly([[cx-6,cy],[cx-24,cy-8+fl],[cx-18,cy+4],[cx-12,cy+2]]); poly([[cx+6,cy],[cx+24,cy-8+fl],[cx+18,cy+4],[cx+12,cy+2]]);
    fs('#6b3a1e'); circ(cx,cy,10); poly([[cx-8,cy-6],[cx-6,cy-14],[cx-2,cy-8]]); poly([[cx+8,cy-6],[cx+6,cy-14],[cx+2,cy-8]]);
    fs('#ffd23f'); circ(cx-4,cy-1,2.5); circ(cx+4,cy-1,2.5); fs('#fff'); poly([[cx-3,cy+5],[cx-1,cy+9],[cx+1,cy+5]]); },
  hopper(e){ const cx=e.x+e.w/2, by=e.y+e.h, sq=e.vy<-2?1.15:1;
    g.save(); g.translate(cx,by); g.scale(1/sq,sq); fs('#fff'); rr(-15,-30,30,30,9); fs('#ffe7d6'); rr(-15,-12,30,12,6); fs('#f2c9a0'); g.fillRect(-15,-30,30,3); g.restore();
    eyes(cx,by-19*sq,e.vx>0?1:-1,true); },
  spider(e){ const cx=e.x+e.w/2, cy=e.y+e.h/2;
    g.strokeStyle='rgba(255,255,255,.7)'; g.lineWidth=1.5; g.beginPath(); g.moveTo(cx,e.top); g.lineTo(cx,cy); g.stroke();
    g.strokeStyle='#3a2416'; g.lineWidth=2.5; for(let i=0;i<4;i++){ const k=Math.sin(e.t*.3+i)*2; g.beginPath(); g.moveTo(cx-6,cy); g.lineTo(cx-15,cy-6+i*5+k); g.moveTo(cx+6,cy); g.lineTo(cx+15,cy-6+i*5-k); g.stroke(); }
    fs('#3a2416'); circ(cx,cy,10); ['#ff4f7b','#ffd23f','#5ad1ff','#5ee08a','#fff'].forEach((c,i)=>{ fs(c); g.fillRect(cx-7+i*3,cy-7+(i*5%9),3,2); });
    eyes(cx,cy+2,1,true,.8); },
  soldier(e){ const cx=e.x+e.w/2, by=e.y+e.h, f=e.vx>0?1:-1, st=Math.sin(e.t*.25)*3, stun=e.stun>0;
    fs('#3a2416'); g.fillRect(cx-7+st,by-6,5,6); g.fillRect(cx+2-st,by-6,5,6);
    fs('#fff'); poly([[cx-12,by-6],[cx+12,by-6],[cx,by-40]]); fs('#ffa83f'); poly([[cx-9,by-17],[cx+9,by-17],[cx+4.5,by-28],[cx-4.5,by-28]]); fs('#ffd23f'); poly([[cx-12,by-6],[cx+12,by-6],[cx+9,by-17],[cx-9,by-17]]);
    fs('#8a8f9a'); g.fillRect(cx+f*12,by-36,2.5,30); poly([[cx+f*12-3,by-36],[cx+f*12+5,by-36],[cx+f*12+1,by-44]]);
    if(stun){ star(cx,by-46,6,3,'#ffd23f'); } eyes(cx,by-22,f,!stun,.85); },
  donut(e){ const cx=e.x+e.w/2, cy=e.y+e.h/2; g.save(); g.translate(cx,cy); g.rotate(e.rot||0);
    fs('#e0a35f'); circ(0,0,14); fs('#ff8ec2'); circ(0,-1,12); fs('#3a2416'); circ(0,0,4);
    ['#ffd23f','#5ad1ff','#fff'].forEach((c,i)=>{ fs(c); g.save(); g.rotate(i*2.1); g.fillRect(6,-1,4,2); g.restore(); }); g.restore();
    fs('#fff'); circ(cx-5,cy-12,3); circ(cx+5,cy-12,3); fs('#000'); circ(cx-5+Math.sign(e.vx),cy-12,1.5); circ(cx+5+Math.sign(e.vx),cy-12,1.5); },
  cupcake(e){ const cx=e.x+e.w/2, by=e.y+e.h, sh=e.st>110?Math.sin(e.t)*1.5:0;
    fs('#a15de0'); poly([[cx-12,by-14],[cx+12,by-14],[cx+9,by],[cx-9,by]]);
    fs('#7a2fb8'); circ(cx-8+sh,by-17,7); circ(cx+8+sh,by-17,7); circ(cx+sh,by-24,9);
    fs('#3a2416'); circ(cx+sh,by-33,3); g.fillRect(cx+sh-1,by-38,2,5);
    eyes(cx+sh,by-19,(e.face||1),true,.9); },
  minion(e){ const cx=e.x+e.w/2, by=e.y+e.h, f=e.vx>0?1:-1, st=Math.sin(e.t*.35)*4;
    g.strokeStyle='#1a1a1a'; g.lineWidth=5; g.lineCap='round'; g.beginPath(); g.moveTo(cx-4,by-12); g.lineTo(cx-6+st,by-1); g.moveTo(cx+4,by-12); g.lineTo(cx+6-st,by-1); g.stroke(); g.lineCap='butt';
    fs('#1a1a1a'); rr(cx-10,by-36,20,26,8); fs('#e8213a'); for(let i=0;i<4;i++) g.fillRect(cx-10,by-33+i*6,20,1.5);
    eyes(cx+f*2,by-27,f,true,.85); },
  clone(e){ BOSSES.chocobun.draw({x:e.x,y:e.y,w:e.w,h:e.h,t:e.t,vx:e.vx,face:e.vx>0?1:-1,clone:true,hurt:0}); },
};
function eyes(x,y,f,angry,s=1){
  fs('#fff'); circ(x-4*s,y,3.4*s); circ(x+4*s,y,3.4*s); fs('#000'); circ(x-4*s+f*1.2,y,1.7*s); circ(x+4*s+f*1.2,y,1.7*s);
  if(angry){ g.strokeStyle='#000'; g.lineWidth=1.8; g.beginPath(); g.moveTo(x-8*s,y-5*s); g.lineTo(x-2*s,y-3*s); g.moveTo(x+8*s,y-5*s); g.lineTo(x+2*s,y-3*s); g.stroke(); }
}

// ---------- Projectiles ----------
function drawProj(p){
  if(p.kind==='ginger'){ g.save(); g.translate(p.x,p.y); g.rotate(p.t*.2); fs('#b5652d'); circ(0,-6,6); rr(-5,-1,10,12,4); rr(-10,0,20,5,3); fs('#fff'); circ(-2,-7,1.2); circ(2,-7,1.2); g.restore(); }
  else if(p.kind==='frost'||p.kind==='splat'){ fs('#c56bff'); circ(p.x,p.y,p.r); fs('#fff'); circ(p.x-p.r*.3,p.y-p.r*.3,p.r*.3); }
  else if(p.kind==='bomb'){ fs('#ff8ec2'); circ(p.x,p.y,p.r); fs('#fff'); circ(p.x-3,p.y-4,4); fs('#3a2416'); g.fillRect(p.x-1,p.y-p.r-6,2,6); fs(p.t%6<3?'#ffd23f':'#ff4f7b'); circ(p.x,p.y-p.r-7,3); }
  else if(p.kind==='icicle'){ fs('#c9f2ff'); poly([[p.x-9,p.y-18],[p.x+9,p.y-18],[p.x,p.y+16]]); fs('#fff'); poly([[p.x-4,p.y-16],[p.x,p.y-16],[p.x-1,p.y+4]]); }
  else if(p.kind==='magic'){ star(p.x,p.y,p.r,p.r*.45,['#ff4f7b','#ffd23f','#5ad1ff','#b47cff'][Math.floor(p.t/4)%4],'#fff'); }
  else if(p.kind==='crumb'){ fs('#c9853f'); rr(p.x-p.r,p.y-p.r,p.r*2,p.r*2,3); fs('#8a4b1a'); circ(p.x+2,p.y-1,2); }
  else if(p.kind==='custard'){ fs('#ffe27a'); circ(p.x,p.y,p.r); fs('#c98e00'); circ(p.x+3,p.y+3,p.r*.35); }
  else if(p.kind==='jelly'){ fs('rgba(255,79,123,.85)'); circ(p.x,p.y,p.r); }
  else { fs('#fff'); circ(p.x,p.y,p.r); }
}
