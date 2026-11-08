// ================= Level builder =================
// Levels are glued together from small pieces ("segments"). Each piece always starts
// and ends on normal ground, so any order of pieces can be played.
// Tiles:  # ground  I ice  = ledge (jump up through it)  M marshmallow  L ladder
//         w chocolate/water (swim)  v caramel lava  ? coin block  ! power-up block
//         f fake wall (secret!)  W boss room wall
// Things: @ start  > goal  C checkpoint  o coin  u cupcake  G golden spoon  R hidden star
//         Y dessert card  H heart  D secret door  K boss   E J F S T X = enemy slots
const SEG={
  start(A,x){ A.gnd(x,x+9); A.ent(x+1,11,'@'); A.ent(x+5,10,'o'); A.ent(x+7,10,'o'); return 10; },
  flat(A,x,d,r){ const w=ri(r,10,14); A.gnd(x,x+w-1); const n=1+(r()<d+.25?1:0);
    for(let i=0;i<n;i++) A.ent(x+3+i*4+ri(r,0,2),11,'E');
    for(let i=0;i<3;i++) A.ent(x+2+i*2,9,'o'); A.ent(x+w-2,11,'u'); return w; },
  gap(A,x,d,r){ const a=3+ri(r,0,2), gw=2+(r()<d?1:0)+(d>.6&&r()<.4?1:0), b=4;
    A.gnd(x,x+a-1); A.gnd(x+a+gw,x+a+gw+b-1);
    for(let i=0;i<=gw+1;i++) A.ent(x+a-1+i,(i>0&&i<=gw)?8:9,'o');
    if(r()<.5) A.ent(x+a+gw+2,11,'J'); A.ent(x+a+gw+b-1,11,'u'); return a+gw+b; },
  plat(A,x,d,r){ A.gnd(x,x+11); A.plat(x+3,9,5); A.ent(x+3,8,'o'); A.ent(x+5,8,'u'); A.ent(x+7,8,'o'); A.ent(x+9,11,'E');
    if(r()<.5){ A.plat(x+7,6,3); A.ent(x+8,5,'u'); } return 12; },
  stairs(A,x,d,r){ A.gnd(x,x+14); for(let k=0;k<4;k++) A.fill(x+3+k,11-k,x+11-k,11-k,'#');
    A.ent(x+7,7,'u'); A.ent(x+5,8,'o'); A.ent(x+9,8,'o'); A.ent(x+13,11,'E'); return 15; },
  floaters(A,x,d,r){ A.gnd(x,x+1); A.plat(x+2,10,3); A.plat(x+6,11,3); A.plat(x+10,9,3); A.gnd(x+17,x+18);
    A.ent(x+3,9,'o'); A.ent(x+7,10,'u'); A.ent(x+10,8,'o'); A.ent(x+12,8,'o'); A.ent(x+14,7,'o');
    if(r()<d+.3) A.ent(x+9,5,'F'); return 19; },
  prize(A,x,d,r){ A.gnd(x,x+12); A.set(x+3,8,'?'); A.set(x+5,8,r()<.6?'!':'?'); A.set(x+7,8,'?'); A.set(x+9,8,r()<.3?'!':'?');
    A.ent(x+11,11,'E'); A.ent(x+1,11,'u'); return 13; },
  turret(A,x,d,r){ A.gnd(x,x+13); A.fill(x+6,9,x+8,11,'#'); A.ent(x+7,8,'T'); A.ent(x+6,8,'u');
    [2,3,11,12].forEach(k=>A.ent(x+k,11,'o')); return 14; },
  bats(A,x,d,r){ A.gnd(x,x+13); A.ent(x+5,6,'F'); if(r()<d+.2) A.ent(x+10,7,'F');
    for(let k=3;k<=11;k+=2) A.ent(x+k,9,'o'); if(r()<.5) A.ent(x+12,11,'J'); return 14; },
  hoppers(A,x,d,r){ A.gnd(x,x+5); A.gnd(x+8,x+13); A.ent(x+3,11,'J'); A.ent(x+11,11,'J'); A.ent(x+6,8,'o'); A.ent(x+7,8,'o'); A.ent(x+12,11,'u'); return 14; },
  spiderHall(A,x,d,r){ A.gnd(x,x+13); A.fill(x,0,x+13,5,'#'); A.ent(x+4,6,'S'); A.ent(x+10,6,'S');
    for(let k=2;k<=12;k+=2) A.ent(x+k,10,'o'); A.ent(x+7,11,'u'); return 14; },
  chase(A,x,d,r){ A.gnd(x,x+15); A.ent(x+13,11,'X'); for(let k=2;k<=10;k+=2) A.ent(x+k,10,'o'); A.ent(x+8,11,'u'); return 16; },
  water(A,x,d,r){ const P=ri(r,8,12);
    A.gnd(x,x,11); A.gnd(x+1,x+1,10); A.gnd(x+2,x+3,9);
    A.fill(x+4,9,x+3+P,12,'w'); A.fill(x+4,13,x+3+P,13,'#');
    A.gnd(x+4+P,x+5+P,9); A.gnd(x+6+P,x+6+P,10); A.gnd(x+7+P,x+7+P,11);
    A.ent(x+4+(P>>1),12,'u'); for(let k=5;k<P+3;k+=2) A.ent(x+k,10+(k%4?1:0),'o'); return P+8; },
  marsh(A,x,d,r){ A.gnd(x,x+4); A.set(x+4,11,'M'); A.plat(x+5,5,4); A.plat(x+7,10,2); A.plat(x+10,8,2); A.gnd(x+12,x+15);
    A.ent(x+5,4,'o'); A.ent(x+6,4,'u'); A.ent(x+7,4,'o'); A.ent(x+8,4,'o'); A.ent(x+7,9,'o'); if(r()<d) A.ent(x+14,11,'J'); return 16; },
  ladder(A,x,d,r){ A.gnd(x,x+11); A.fill(x+4,5,x+7,11,'#'); for(let y=4;y<=11;y++) A.set(x+3,y,'L');
    A.ent(x+4,4,'o'); A.ent(x+5,4,'o'); A.ent(x+6,4,'u'); A.ent(x+7,4,'o'); A.ent(x+10,11,'E'); return 12; },
  lava(A,x,d,r){ const P=ri(r,9,10); A.gnd(x,x+2); A.fill(x+3,12,x+2+P,13,'v');
    for(let k=4;k<=P-1;k+=4){ A.plat(x+k,10,2); A.ent(x+k,8,'o'); A.ent(x+k+1,8,'o'); }
    A.gnd(x+3+P,x+5+P); if(r()<d) A.ent(x+6,5,'F'); return P+6; },
  secretWall(A,x,d,r,thing){ A.gnd(x,x+11); A.fill(x+3,9,x+9,9,'#'); A.fill(x+3,10,x+9,11,'f'); A.ent(x+6,11,thing);
    A.ent(x+4,8,'o'); A.ent(x+6,8,'o'); A.ent(x+8,8,'o'); return 12; },
  star(A,x,d,r){ const v=ri(r,0,2);
    if(v===0){ A.gnd(x,x+11); A.fill(x+5,8,x+6,11,'#'); A.plat(x+4,4,4); A.ent(x+6,3,'R'); A.ent(x+2,11,'o'); return 12; }
    if(v===1){ A.gnd(x,x+9); A.set(x+4,11,'M'); A.ent(x+4,2,'R'); A.ent(x+7,11,'u'); return 10; }
    return SEG.secretWall(A,x,d,r,'R'); },
  card(A,x,d,r){ A.gnd(x,x+13); A.plat(x+3,9,3); A.plat(x+7,7,3); A.plat(x+10,4,2); A.ent(x+10,3,'Y'); A.ent(x+4,8,'o'); A.ent(x+8,6,'o'); A.ent(x+12,11,'E'); return 14; },
  check(A,x){ A.gnd(x,x+7); A.ent(x+3,11,'C'); A.ent(x+1,10,'o'); A.ent(x+6,10,'o'); return 8; },
  goal(A,x){ A.gnd(x,x+13); A.ent(x+9,11,'>'); A.ent(x+3,11,'u'); A.ent(x+5,11,'u'); return 14; },
  arena(A,x,d,r,boss){ A.gnd(x,x+25); A.fill(x+2,0,x+2,7,'W'); A.fill(x+25,0,x+25,11,'W');
    A.plat(x+6,8,4); A.plat(x+17,8,4);
    if(boss==='melt') A.fill(x+3,12,x+24,12,'I');
    A.ent(x+18,11,'K');
    A.arena={x0:(x+3)*TS,x1:(x+25)*TS,wall:x+2,plats:[[(x+6)*TS,(x+10)*TS,8*TS],[(x+17)*TS,(x+21)*TS,8*TS]],floor:12*TS};
    return 26; },
};
const CORE=['flat','gap','plat','stairs','floaters','prize','bats','hoppers'];
const FEAT={marsh:['marsh','marsh'],water:['water','water','water'],cave:['spiderHall'],ladder:['ladder','ladder'],lava:['lava','lava'],
  turret:['turret','turret'],prize:['prize','prize'],spider:['spiderHall','spiderHall'],gaps:['gap','gap','floaters','floaters'],jungle:['bats','hoppers','bats'],ice:['flat','gap']};

function buildLevel(L){
  const r=mulberry(hashStr(L.id+'!'));
  const d=L.wi>=7?.75:L.wi/6;
  const grid=Array.from({length:ROWS},()=>[]);
  const ents=[];
  const A={
    arena:null,
    set(x,y,ch){ if(y>=0&&y<ROWS&&x>=0) grid[y][x]=ch; },
    gnd(a,b,top=12){ for(let x=a;x<=b;x++) for(let y=top;y<ROWS;y++) A.set(x,y,'#'); },
    fill(x0,y0,x1,y1,ch){ for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) A.set(x,y,ch); },
    plat(x,y,n){ for(let i=0;i<n;i++) A.set(x+i,y,'='); },
    ent(x,y,ch){ ents.push({x,y,ch}); },
  };
  let segs=[];
  if(L.kind==='rematch') segs=['start','arena'];
  else if(L.kind==='boss') segs=['start',pick(r,CORE),pick(r,CORE),'check','arena'];
  else if(L.kind==='secret') segs=['start','prize','marsh','floaters','prize','spoon','marsh','prize','goal'];
  else {
    let pool=[...CORE]; L.feats.forEach(f=>pool.push(...(FEAT[f]||[])));
    if(L.wi>=5) pool.push('chase','chase');
    if(L.feats.includes('water')) pool=pool.filter(s=>s!=='floaters').concat(['water','water']);
    const n=6+Math.round(d*4);
    const mid=[]; let last='';
    for(let i=0;i<n;i++){ let s; do{ s=pick(r,pool); }while(s===last); mid.push(s); last=s; }
    const ins=(s)=>mid.splice(ri(r,1,mid.length-1),0,s);
    ins('spoon'); ins('star'); ins('card'); if(L.id.endsWith('-2')) ins('door');
    mid.splice(Math.floor(mid.length/2),0,'check');
    segs=['start',...mid,'goal'];
  }
  let x=0;
  for(const s of segs){
    if(s==='spoon') x+=SEG.secretWall(A,x,d,r,'G');
    else if(s==='door') x+=SEG.secretWall(A,x,d,r,'D');
    else if(s==='arena') x+=SEG.arena(A,x,d,r,L.boss);
    else x+=SEG[s](A,x,d,r);
  }
  const w=x;
  for(let y=0;y<ROWS;y++) for(let i=0;i<w;i++) if(!grid[y][i]) grid[y][i]='.';
  const cave=L.feats.includes('cave');
  if(cave) for(let i=0;i<w;i++){ grid[0][i]='#'; grid[1][i]='#'; }
  if(L.feats.includes('ice')) for(let y=2;y<ROWS;y++) for(let i=0;i<w;i++) if(grid[y][i]==='#') grid[y][i]='I';
  if(L.kind==='secret'){ for(let i=3;i<w-3;i+=2) if(grid[12][i]==='#') ents.push({x:i,y:7,ch:'o'}); }
  // fill enemy slots with this world's enemies
  const E=L.W.enemies;
  for(const e of ents){
    if('EJFSTX'.includes(e.ch)){
      let list=E[e.ch]; if(!list||!list.length) list=e.ch==='S'||e.ch==='F'?[]:E.E;
      e.type=list.length?pick(r,list):null;
    }
  }
  return {grid,w,ents:ents.filter(e=>!('EJFSTX'.includes(e.ch))||e.type),arena:A.arena,cave,pal:L.W.pal};
}
