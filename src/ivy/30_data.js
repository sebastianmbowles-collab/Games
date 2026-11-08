// ================= Data: worlds, levels, villains, story, shop =================
const WORLDS=[
  {key:'1',name:'Candy Forest',pal:'forest',color:'#4fb06a',
   enemies:{E:['cookie'],J:['jelly','gummy'],F:['bat'],S:['spider'],T:[],X:[]},
   levels:[['Sweet Beginnings',[]],['Lollipop Woods',['marsh']],['The Chocolate River',['water']]],
   boss:['Boss: Ginger Grim','ginger'],secret:'Secret Sugar Stash'},
  {key:'2',name:'Gingerbread Kingdom',pal:'ginger',color:'#c87a2a',
   enemies:{E:['cookie'],J:['gummy','jelly'],F:['bat'],S:['spider'],T:['cupcake'],X:[]},
   levels:[['Biscuit Village',['prize']],['Cookie Caves',['cave','ladder']],['The Crumb Mines',['cave','ladder','spider']]],
   boss:['Boss: Crumb Goblin','crumb'],secret:'Secret Biscuit Barrel'},
  {key:'3',name:'Frosting Peaks',pal:'frost',color:'#5ab8e8',
   enemies:{E:['donut','cookie'],J:['hopper'],F:['bat'],S:['spider'],T:['cupcake'],X:[]},
   levels:[['Ice Cream Slopes',['ice']],['Frozen Sprinkle Lake',['ice','water']],['The Melting Glacier',['ice','water','marsh']]],
   boss:['Boss: Meltmaster','melt'],secret:'Secret Sprinkle Cave'},
  {key:'4',name:'Donut Mountains',pal:'donut',color:'#e2639f',
   enemies:{E:['donut'],J:['jelly','gummy'],F:['bat'],S:[],T:['cupcake'],X:[]},
   levels:[['Sprinkle Valley',['marsh']],['Donut Hills',['gaps']],['Jellybean Jungle',['jungle','marsh','ladder']]],
   boss:['Boss: Donut Doom','donut'],secret:'Secret Glaze Grotto'},
  {key:'5',name:'The Sugar Kingdom',pal:'sugar',color:'#a77be0',
   enemies:{E:['soldier','cookie'],J:['gummy','hopper'],F:['bat'],S:['spider'],T:['cupcake'],X:[]},
   levels:[['Sugar Gardens',['prize','marsh']],['Candy Cane Castle',['ladder','turret']],['The Magical Bakery',['prize','turret']]],
   boss:['Boss: The Candy Wizard','wizard'],secret:'Secret Sugar Tower'},
  {key:'6',name:'Chocolate Volcano',pal:'volcano',color:'#a0441f',
   enemies:{E:['soldier','donut'],J:['hopper'],F:['bat'],S:['spider'],T:['cupcake'],X:['minion']},
   levels:[['Cocoa Caverns',['cave','lava']],['Caramel Lava',['lava']],['The Chocolate Factory',['ladder','lava','turret']]],
   boss:['Boss: The Cake Eater','cakeeater'],secret:'Secret Cocoa Vault'},
  {key:'7',name:'Licorice Castle',pal:'castle',color:'#5b2a7a',
   enemies:{E:['soldier'],J:['hopper','jelly'],F:['bat'],S:['spider'],T:['cupcake'],X:['minion']},
   levels:[['The Dark Bakery',['cave','turret']],['The Royal Kitchen',['ladder','lava']],['The Dessert Vault',['prize','cave','water']]],
   boss:['FINAL BOSS: Lord Licorice','licorice'],secret:'Secret Licorice Library'},
];
const BONUS=[
  {key:'A',name:'Bonus: Pudding Isles',pal:'pudding',color:'#e8b04a',need:10,
   enemies:{E:['cookie','donut'],J:['gummy','jelly'],F:['bat'],S:[],T:['cupcake'],X:[]},
   stages:[["Chocobun's Burrow",'chocobun'],["Cupcake Chaos's Bakery",'chaos'],["Jelly Jaws's Wobble Pit",'jaws']]},
  {key:'B',name:'Bonus: Royal Pudding Vault',pal:'vault',color:'#b58a10',need:20,
   enemies:{E:['soldier'],J:['hopper'],F:['bat'],S:['spider'],T:['cupcake'],X:['minion']},
   stages:[["Marshmallow Max's Fluff Dome",'max'],['The Royal Pudding Vault','custard']]},
];

// Build one big list of every level.
const LEVELS={}; const ORDER=[];
WORLDS.forEach((W,wi)=>{
  W.levels.forEach(([name,feats],i)=>{ const id=`${W.key}-${i+1}`; LEVELS[id]={id,wi,W,name,feats,kind:'level',card:wi*3+i}; ORDER.push(id); });
  const bid=`${W.key}-4`; LEVELS[bid]={id:bid,wi,W,name:W.boss[0],feats:[],kind:'boss',boss:W.boss[1]}; ORDER.push(bid);
  const sid=`${W.key}-S`; LEVELS[sid]={id:sid,wi,W,name:W.secret,feats:['marsh'],kind:'secret'};
});
BONUS.forEach((W,bi)=>W.stages.forEach(([name,boss],i)=>{ const id=`${W.key}-${i+1}`; LEVELS[id]={id,wi:7+bi,W,name,feats:[],kind:'boss',boss,bonus:true}; }));
function prevLevel(id){ const L=LEVELS[id]; if(L.bonus){ const n=+id.split('-')[1]; return n>1?`${id[0]}-${n-1}`:null; } const i=ORDER.indexOf(id); return i>0?ORDER[i-1]:null; }
function isUnlocked(id){
  const L=LEVELS[id]; if(!L) return false;
  if(L.kind==='secret') return !!save.secrets[L.W.key];
  if(L.bonus){ if(count(save.spoons)<L.W.need) return false; const p=prevLevel(id); return !p||!!save.done[p]; }
  const p=prevLevel(id); return !p||!!save.done[p];
}
function worldUnlocked(wi){ return isUnlocked(`${WORLDS[wi].key}-1`); }

// ---------- Who talks in cutscenes ----------
const SPEAKERS={
  narr:{name:''}, ivy:{name:'Ivy'}, seb:{name:'Sebastian'},
  licorice:{name:'Lord Licorice'}, ginger:{name:'Ginger Grim'}, chocobun:{name:'Chocobun'}, chaos:{name:'Cupcake Chaos'},
  jaws:{name:'Jelly Jaws'}, melt:{name:'Meltmaster'}, donut:{name:'Donut Doom'}, custard:{name:'Captain Custard'},
  max:{name:'Marshmallow Max'}, wizard:{name:'The Candy Wizard'}, crumb:{name:'Crumb Goblin'}, cakeeater:{name:'The Cake Eater'},
};
const VILLAINS=[
  ['licorice','The ruler of the Dessert Kingdom. Wants every dessert for himself. Lives in Licorice Castle.'],
  ['ginger','A giant gingerbread warrior. Guards the Gingerbread Kingdom and throws gingerbread cookies.'],
  ['chocobun','A chocolate rabbit who creates chocolate clones of himself.'],
  ['chaos','A mischievous cupcake who launches frosting bombs.'],
  ['jaws','A giant jelly monster who bounces around the battlefield.'],
  ['melt','An ice cream villain who controls frozen platforms and slippery floors.'],
  ['donut','A rolling donut villain who guards the Donut Mountains.'],
  ['custard','A dessert guardian with a giant spoon. Protects the Royal Pudding Vault.'],
  ['max','A gigantic marshmallow who can change his size.'],
  ['wizard','A magical villain who creates candy obstacles and enchanted enemies.'],
  ['crumb','A tiny thief who commands an army of biscuit minions.'],
  ['cakeeater','A mysterious giant creature who eats entire dessert buildings. Nobody knows where it came from.'],
];

// ---------- Story ----------
const STORY={
  intro:[
    ['narr','Ivy was having a perfectly normal afternoon.'],
    ['narr','She had eaten lunch, played around and finished her dessert.'],
    ['narr','But there was one problem.'],
    ['ivy','I WANT MORE.'],
    ['narr','Suddenly, the sky turned purple. A giant castle appeared in the distance, and every dessert in the neighbourhood disappeared!'],
    ['licorice','Mwahahaha! I am LORD LICORICE! Every dessert in the world belongs to ME now!'],
    ['narr','Ivy immediately grabbed her adventure shoes.'],
    ['seb','Ivy, wait! I\'m coming too!'],
    ['narr','Sebastian followed her. Together, they must travel across seven kingdoms, defeat ridiculous villains, collect magical desserts and stop Lord Licorice.'],
  ],
  boss:{
    ginger:[['ginger','HALT! None shall pass the Gingerbread Gate!'],['ivy','You smell like cookies.'],['ginger','...THANK YOU. NOW PREPARE TO CRUMBLE!']],
    crumb:[['crumb','Hee hee! Crumbs! Shinies! All MINE!'],['seb','Is that a goblin made of... crumbs?'],['crumb','Biscuit minions! ATTAAACK!']],
    melt:[['melt','Chill out, kids. Permanently.'],['ivy','You\'re ice cream! Can I lick you?'],['melt','ABSOLUTELY NOT.']],
    donut:[['donut','I am DONUT DOOM! Nobody rolls past the Donut Mountains!'],['seb','Donut worry, Ivy. I\'ve got this.'],['ivy','...That joke was terrible.']],
    wizard:[['wizard','Abra-candabra! Your desserts shall become my enchanted army!'],['ivy','Can you magic me a cake?'],['wizard','FOCUS, child!']],
    cakeeater:[['narr','The ground shakes. Something HUGE is eating the Chocolate Factory...'],['cakeeater','NOM. NOM. NOM.'],['seb','It just ate a whole BUILDING!'],['ivy','...Lucky.']],
    licorice:[['licorice','So. The dessert-hungry girl and her big brother. You are too late!'],['ivy','Give. Back. The. Desserts.'],['licorice','NEVER! The Dessert Vault is MINE! Licorice minions, GET THEM!']],
    chocobun:[['chocobun','Hop hop! Which one is the real me? You\'ll never know!'],['seb','The real one is the shiny one. Probably.']],
    chaos:[['chaos','FROSTING BOMBS AWAAAY!'],['ivy','Frosting? Throw some in my mouth!']],
    jaws:[['jaws','WOBBLE. WOBBLE. CHOMP!'],['seb','Jump on him when he lands!']],
    max:[['max','Am I big? Am I small? I\'m MARSHMALLOW MAX!'],['ivy','Wait until he\'s small, then squish him!']],
    custard:[['custard','HALT! Captain Custard protects the Royal Pudding Vault!'],['custard','Taste... my... SPOON!'],['seb','Don\'t jump on him while his spoon is up!']],
  },
  cakeEscape:[['cakeeater','BUUURRRP.'],['narr','The Cake Eater burrows into a tunnel and escapes toward Licorice Castle...'],['seb','Where is it going?'],['ivy','Wherever it is... there\'s probably cake.']],
  twist:[
    ['narr','Ivy rushed into the Dessert Vault...'],
    ['narr','It was EMPTY.'],
    ['licorice','Heh... heh... YOU FOOLS! THE DESSERTS WERE NEVER HERE!'],
    ['narr','A giant rumbling begins beneath the castle.'],
    ['narr','A huge shadow rises.'],
    ['narr','THE CAKE EATER WAS THE ONE STEALING EVERYTHING!'],
    ['cakeeater','NOM.'],
  ],
  ending:[
    ['narr','The Cake Eater rolled over and spat out every dessert it had ever eaten. The Dessert Kingdom was saved!'],
    ['narr','And there, at the very bottom of the pile, Ivy finally found the Ultimate Dessert.'],
    ['narr','It\'s a gigantic cake with 100 layers.'],
    ['ivy','Finally.'],
    ['seb','You\'re sharing that, right?'],
    ['ivy','…'],
    ['seb','IVY?'],
    ['narr','THE END. Or perhaps… the beginning of the next dessert adventure.'],
  ],
  secret:[
    ['narr','SECRET ENDING: Who created the Dessert Kingdom?'],
    ['narr','Behind the 100-layer cake, Ivy found a crumpled old piece of paper.'],
    ['narr','It was a drawing. A castle made of cake, rivers of chocolate, mountains of donuts... and a little girl with a big smile.'],
    ['seb','Ivy... that\'s YOUR drawing. You made it when you were little. I stuck it on the fridge!'],
    ['narr','The Dessert Kingdom came from Ivy\'s imagination. She had created it all along.'],
    ['seb','So this whole adventure is YOUR fault?'],
    ['ivy','...Want some cake?'],
    ['narr','THE TRUE END.'],
  ],
};

// ---------- Dessert Shop ----------
const BOOSTS=[
  {id:'shield',name:'Candy Shield',price:30,desc:'Start your next level with a shield that blocks one hit.'},
  {id:'heart',name:'Extra Heart',price:40,desc:'Start your next level with one more heart.'},
  {id:'sugar',name:'Sugar Cupcake',price:25,desc:'Start your next level with a speed boost.'},
  {id:'charge',name:'Power Sprinkles',price:35,desc:'Start your next level with your ability ready (Sugar Rush or Big Brother Boost).'},
  {id:'rainbow',name:'Rainbow Lollipop',price:40,desc:'Start your next level with rainbow jumps.'},
  {id:'mega',name:'Mega Cookie',price:60,desc:'Start your next level GIANT.'},
];
const POWER_INFO={sugar:'Sugar Cupcake: zoom!',shield:'Candy Shield!',mega:'MEGA COOKIE!',rainbow:'Rainbow Lollipop: jump in the air!',heart:'+1 heart'};
