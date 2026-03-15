// ═══════════════════════════════════════════════════════════════════════════
// MONK GAME — game.js
// ═══════════════════════════════════════════════════════════════════════════

let activeScreen = 'main';

// ── INVENTORY ─────────────────────────────────────────────────────────────────
const SLOTS = 5;
const inventory = Array(SLOTS).fill(null);
let selectedSlot = -1;

function getSelectedItem() { return selectedSlot >= 0 ? inventory[selectedSlot] : null; }
function getItem(id) { return inventory.find(i => i && i.id === id) || null; }

function addItem(item) {
  if (inventory.find(s => s && s.id === item.id)) return false;
  const idx = inventory.findIndex(s => s === null);
  if (idx < 0) return false;
  inventory[idx] = item;
  renderHotbar();
  return true;
}

function renderHotbar() {
  const el = document.getElementById('hotbar');
  el.style.display = inventory.some(s => s !== null) ? 'flex' : 'none';
  el.innerHTML = '';
  inventory.forEach((item, i) => {
    if (!item) return;
    const div = document.createElement('div');
    const glowing = item.id === 'jar' && item.glowing;
    div.className = 'hotbar-slot' + (i === selectedSlot ? ' selected' : '') + (glowing ? ' jar-glowing' : '');
    // Draw jar with fireflies if caught any
    if (item.id === 'jar' && item.caught > 0) {
      div.innerHTML = `<span class="slot-icon">${renderJarIcon(item)}</span><span class="slot-label">${item.label||item.name}</span>`;
    } else {
      div.innerHTML = `<span class="slot-icon">${item.icon}</span><span class="slot-label">${item.label||item.name}</span>`;
    }
    div.onclick = () => {
      selectedSlot = selectedSlot === i ? -1 : i;
      renderHotbar();
      updateItemCursor();
    };
    div.oncontextmenu = (e) => { e.preventDefault(); showItemMenu(item, e.clientX, e.clientY); };
    el.appendChild(div);
  });
}

function renderJarIcon(item) {
  // Build SVG jar with tiny firefly squares inside
  const n = Math.min(item.caught, 9);
  const dots = [];
  // Place dots in 3x3 grid inside jar
  for (let i = 0; i < n; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 8 + col * 8, y = 14 + row * 7;
    dots.push(`<rect x="${x}" y="${y}" width="4" height="4" fill="#aaff66" opacity="0.9"><animate attributeName="opacity" values="0.5;1;0.5" dur="${1+Math.random()*0.8}s" repeatCount="indefinite"/></rect>`);
  }
  return `<svg width="30" height="34" viewBox="0 0 30 34" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="22" height="24" rx="3" fill="rgba(160,220,150,0.18)" stroke="rgba(140,210,130,0.7)" stroke-width="1.5"/>
    <rect x="8" y="3" width="14" height="4" rx="1" fill="rgba(80,130,65,0.9)"/>
    <rect x="6" y="7" width="4" height="18" rx="1" fill="rgba(200,255,180,0.18)"/>
    ${dots.join('')}
  </svg>`;
}

// ── ITEM CURSOR FOLLOWER ──────────────────────────────────────────────────────
const itemCursorEl = document.createElement('div');
itemCursorEl.id = 'item-cursor';
document.body.appendChild(itemCursorEl);

document.addEventListener('mousemove', e => {
  itemCursorEl.style.left = e.clientX + 'px';
  itemCursorEl.style.top  = e.clientY + 'px';
});

function updateItemCursor() {
  const item = getSelectedItem();
  if (item) {
    itemCursorEl.style.display = 'block';
    itemCursorEl.textContent = item.icon;
  } else {
    itemCursorEl.style.display = 'none';
  }
}

// ── ITEM CONTEXT MENU ─────────────────────────────────────────────────────────
const itemMenu = document.getElementById('item-menu');
let itemMenuTimer = null;
function showItemMenu(item, x, y) {
  clearTimeout(itemMenuTimer);
  itemMenu.textContent = item.description || item.name;
  itemMenu.style.left = Math.min(x, window.innerWidth - 260) + 'px';
  itemMenu.style.top  = (y - 60) + 'px';
  itemMenu.style.display = 'block';
  itemMenuTimer = setTimeout(() => itemMenu.style.display = 'none', 3500);
}
document.addEventListener('click', e => {
  if (!e.target.closest('#item-menu') && !e.target.closest('.hotbar-slot'))
    itemMenu.style.display = 'none';
});

// ── IMAGES ────────────────────────────────────────────────────────────────────
const bgEl      = document.getElementById('bg-img');
const gc        = document.getElementById('game-canvas');
const pc        = document.getElementById('prayer-canvas');
const ctx       = gc.getContext('2d');
const pCtx      = pc.getContext('2d');
const msgBox    = document.getElementById('msg-box');

const catImg     = new Image(); catImg.src     = 'assets/sprites/cat.png';
const monkImg    = new Image(); monkImg.src    = 'assets/sprites/monk_red.png';
const heroLImg   = new Image(); heroLImg.src   = 'assets/sprites/hero_left.png';
const heroRImg   = new Image(); heroRImg.src   = 'assets/sprites/hero_right.png';
const heroSitImg = new Image(); heroSitImg.src = 'assets/sprites/hero_sit.png';
const bottleImg  = new Image(); bottleImg.src  = 'assets/items/bottle.png';

// ── SPRITE CONSTANTS ──────────────────────────────────────────────────────────
const CAT_FRAMES=5, CAT_FW=400, CAT_FH=330;
const MONK_FRAMES=5,MONK_FW=400,MONK_FH=464;
const HERO_FRAMES=5,HERO_FW=275,HERO_FH=348;
const HERO_L_CR=317/348, HERO_R_CR=344/348;

const BG_W=2000,BG_H=1116;
let W=0,H=0;
function syncSize(){const r=bgEl.getBoundingClientRect();W=gc.width=pc.width=Math.round(r.width);H=gc.height=pc.height=Math.round(r.height);}
const bx=v=>v/BG_W*W, by=v=>v/BG_H*H, bw=v=>v/BG_W*W, bh=v=>v/BG_H*H, ibx=v=>v/W*BG_W;

const GROUND_Y=920;
const SIT_H=240,HERO_SIT_H=SIT_H,HERO_SIT_W=Math.round(400*(SIT_H/464));
const MONK_H=SIT_H,MONK_W=Math.round(MONK_FW*(MONK_H/MONK_FH));
const HERO_WALK_H=420,HERO_WALK_W=Math.round(HERO_FW*(HERO_WALK_H/HERO_FH));
const HERO_L_H=Math.round(HERO_WALK_H*HERO_L_CR),HERO_R_H=Math.round(HERO_WALK_H*HERO_R_CR);
const CAT_H=145,CAT_W=Math.round(CAT_FW*(CAT_H/CAT_FH));
const cat={x:940,y:GROUND_Y-CAT_H};
const redMonk={x:1120,y:GROUND_Y-MONK_H};

// ── CLICK ZONES ───────────────────────────────────────────────────────────────
const ZONES={
  statue:{x:780,y:260,w:130,h:120},
  tree:  {x:1600,y:300,w:200,h:580},
  cat:   {x:cat.x,y:cat.y,w:CAT_W,h:CAT_H},
  monk:  {x:redMonk.x,y:redMonk.y,w:MONK_W,h:MONK_H},
};
function inZone(cx,cy,z){return cx>=bx(z.x)&&cx<=bx(z.x)+bw(z.w)&&cy>=by(z.y)&&cy<=by(z.y)+bh(z.h);}
function hitZone(cx,cy){for(const[n,z]of Object.entries(ZONES)){if(inZone(cx,cy,z))return n;}return null;}

// ── HERO ──────────────────────────────────────────────────────────────────────
const hero={x:580,facing:1,praying:false,walkFrame:0,sitFrame:0,idle:true,targetX:null,speed:5};
function heroDrawY(){return hero.facing>=0?GROUND_Y-HERO_R_H:GROUND_Y-HERO_L_H;}

function drawHeroIdle(cx,w,h){
  const sy=GROUND_Y-h,sw=bw(w),sh=bh(h),sx=bx(cx);
  const pu=sw/24,pv=sh/48;
  const r=(px,py,pw,ph,col)=>{ctx.fillStyle=col;ctx.fillRect(sx+px*pu,by(sy)+py*pv,pw*pu,ph*pv);};
  r(8,1,8,7,'#d4a070');r(9,0,6,2,'#c09060');r(9,4,2,1,'#3a2010');r(13,4,2,1,'#3a2010');
  r(10,6,4,1,'#9a6040');r(10,8,4,3,'#d4a070');r(5,10,14,18,'#d47800');r(6,9,12,2,'#e08800');
  r(7,12,2,14,'#b86000');r(11,12,2,14,'#b86000');r(15,12,2,14,'#b86000');r(9,10,2,16,'#e89000');
  r(3,12,3,10,'#d47800');r(3,22,3,4,'#c49060');r(18,12,3,10,'#d47800');r(18,22,3,4,'#c49060');
  r(4,28,16,10,'#d47800');r(5,36,14,4,'#c06800');r(3,34,18,6,'#d47800');
  r(7,42,4,4,'#c49060');r(13,42,4,4,'#c49060');r(7,44,4,3,'#b08050');r(13,44,4,3,'#b08050');
}
function drawHero(){
  if(hero.praying){
    if(!heroSitImg.complete||!heroSitImg.naturalWidth)return;
    const f=hero.sitFrame%MONK_FRAMES,sy=GROUND_Y-HERO_SIT_H;
    ctx.save();ctx.drawImage(heroSitImg,f*400,0,400,464,bx(hero.x),by(sy),bw(HERO_SIT_W),bh(HERO_SIT_H));
    ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=0.45;ctx.fillStyle='#d47000';
    ctx.fillRect(bx(hero.x),by(sy),bw(HERO_SIT_W),bh(HERO_SIT_H));ctx.restore();
  } else if(hero.idle&&hero.targetX===null){
    drawHeroIdle(hero.x,HERO_WALK_W,HERO_WALK_H);
  } else {
    const img=hero.facing>=0?heroRImg:heroLImg;
    if(!img.complete||!img.naturalWidth)return;
    ctx.drawImage(img,hero.walkFrame%HERO_FRAMES*HERO_FW,0,HERO_FW,HERO_FH,bx(hero.x),by(heroDrawY()),bw(HERO_WALK_W),bh(HERO_WALK_H));
  }
}
function drawCat(f){if(!catImg.complete)return;ctx.drawImage(catImg,f*CAT_FW,0,CAT_FW,CAT_FH,bx(cat.x),by(cat.y),bw(CAT_W),bh(CAT_H));}
function drawRedMonk(f){if(!monkImg.complete)return;ctx.drawImage(monkImg,f*MONK_FW,0,MONK_FW,MONK_FH,bx(redMonk.x),by(redMonk.y),bw(MONK_W),bh(MONK_H));}

// ── FIREFLIES (main) ──────────────────────────────────────────────────────────
const mainFlies=Array.from({length:50},()=>{const sz=1.5+Math.random()*5;return{x:100+Math.random()*1800,y:60+Math.random()*580,phase:Math.random()*Math.PI*2,dx:(Math.random()-0.5),dy:(Math.random()-0.5)*0.55,sz};});

// ── PRAYER SYMBOLS ────────────────────────────────────────────────────────────
const thaiChars='ธมอนภวตสกรคทยชพระศษสหฬ'.split('');
const golds=['#FFD700','#FFC200','#FFB800','#E8A800','#FFEC80','#FFF0A0','#D4AF37','#C8960C','#FFFACD','#FFE55C'];
let pSyms=[],pTick=0;
function spawnSym(){
  const cx=hero.x+HERO_SIT_W/2,cy=GROUND_Y-HERO_SIT_H*0.7;
  const angle=(Math.random()-0.5)*Math.PI*1.6,speed=0.4+Math.random()*0.7;
  pSyms.push({x:bx(cx+(Math.random()-0.5)*60),y:by(cy),ch:thaiChars[Math.floor(Math.random()*thaiChars.length)],col:golds[Math.floor(Math.random()*golds.length)],vx:Math.sin(angle)*speed*2.5,vy:-(Math.cos(angle)*speed+0.5),life:140+Math.random()*80,age:0,size:(14+Math.random()*14)*Math.min(W/BG_W,H/BG_H)*3,rotV:(Math.random()-0.5)*0.03});
}

// ── GAME LOOP ─────────────────────────────────────────────────────────────────
let tick=0,catFrame=0,monkFrame=0;
const keys={};
let msgTimer=null;
function showMsg(text,dur=2500){msgBox.textContent=text;msgBox.style.display='block';clearTimeout(msgTimer);msgTimer=setTimeout(()=>msgBox.style.display='none',dur);}
function standUp(){hero.praying=false;hero.idle=true;pSyms=[];}

function loop(){
  tick++;
  if(tick%20===0)catFrame=(catFrame+1)%CAT_FRAMES;
  if(tick%44===0)monkFrame=(monkFrame+1)%MONK_FRAMES;
  if(!hero.praying){
    let km=false;
    if(keys['l']){hero.x-=4;hero.facing=-1;km=true;hero.idle=false;hero.targetX=null;if(tick%8===0)hero.walkFrame++;}
    if(keys['r']){hero.x+=4;hero.facing=1;km=true;hero.idle=false;hero.targetX=null;if(tick%8===0)hero.walkFrame++;}
    if(!km&&hero.targetX!==null){
      const dx=hero.targetX-hero.x;
      if(Math.abs(dx)<hero.speed+1){hero.x=hero.targetX;hero.targetX=null;hero.idle=true;hero.walkFrame=0;}
      else{const d=dx>0?1:-1;hero.x+=d*hero.speed;hero.facing=d;if(tick%8===0)hero.walkFrame++;}
    }
    if(!km&&hero.targetX===null&&!hero.idle){hero.walkFrame=0;hero.idle=true;}
    hero.x=Math.max(20,Math.min(BG_W-HERO_WALK_W-20,hero.x));
  } else {if(tick%44===0)hero.sitFrame++;}
  if(hero.praying){pTick++;if(pTick%28===0)spawnSym();}else pTick=0;
  pSyms.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy*=0.995;s.age++;});
  pSyms=pSyms.filter(s=>s.age<s.life);
  ctx.clearRect(0,0,W,H);
  mainFlies.forEach(f=>{
    f.phase+=0.032;f.x+=f.dx;f.y+=f.dy;
    if(f.x<80)f.dx=Math.abs(f.dx);if(f.x>1920)f.dx=-Math.abs(f.dx);
    if(f.y<50)f.dy=Math.abs(f.dy);if(f.y>660)f.dy=-Math.abs(f.dy);
    const a=0.15+0.85*Math.abs(Math.sin(f.phase)),sc=Math.min(W/BG_W,H/BG_H),sz=f.sz*sc;
    ctx.fillStyle=`rgba(255,242,110,${a.toFixed(2)})`;ctx.fillRect(bx(f.x)-sz/2,by(f.y)-sz/2,sz,sz);
    ctx.fillStyle=`rgba(255,235,80,${(a*0.13).toFixed(2)})`;ctx.fillRect(bx(f.x)-sz*2,by(f.y)-sz/2,sz*4,sz);
  });
  drawCat(catFrame);drawRedMonk(monkFrame);drawHero();
  pCtx.clearRect(0,0,W,H);
  pSyms.forEach(s=>{
    const p=s.age/s.life,a=p<0.1?p/0.1:p>0.6?(1-p)/0.4:1;
    pCtx.save();pCtx.globalAlpha=Math.max(0,a);pCtx.font=`bold ${Math.round(s.size)}px monospace`;pCtx.fillStyle=s.col;pCtx.translate(s.x,s.y);pCtx.rotate(s.rotV*s.age*0.4);pCtx.fillText(s.ch,0,0);pCtx.restore();
  });
  requestAnimationFrame(loop);
}
bgEl.onload=()=>{syncSize();window.addEventListener('resize',syncSize);renderHotbar();loop();};
if(bgEl.complete){syncSize();window.addEventListener('resize',syncSize);renderHotbar();loop();}

// ── KEYBOARD ──────────────────────────────────────────────────────────────────
const INTERACT=new Set(['e','E','у','У']);
const SIT_K=new Set(['ArrowDown','ы','Ы','s','S']);
const STAND_K=new Set(['ArrowUp','ц','Ц','w','W']);
const LEFT_K=new Set(['ArrowLeft','ф','Ф','a','A']);
const RIGHT_K=new Set(['ArrowRight','д','Д','d','D']);
document.addEventListener('keydown',e=>{
  if(INTERACT.has(e.key)){if(activeScreen==='scene2'&&!jarPickedUp)pickUpJar();return;}
  if(activeScreen!=='main')return;
  if(SIT_K.has(e.key)){hero.praying=true;return;}
  if(STAND_K.has(e.key)){standUp();return;}
  if(LEFT_K.has(e.key)){keys['l']=true;hero.targetX=null;}
  if(RIGHT_K.has(e.key)){keys['r']=true;hero.targetX=null;}
  if(e.key==='Escape'){closeBuddha();closeScene2();}
});
document.addEventListener('keyup',e=>{
  if(LEFT_K.has(e.key)){keys['l']=false;if(!keys['r'])hero.idle=true;}
  if(RIGHT_K.has(e.key)){keys['r']=false;if(!keys['l'])hero.idle=true;}
});

// ── MAIN CANVAS ───────────────────────────────────────────────────────────────
gc.addEventListener('mousemove',e=>{
  if(activeScreen!=='main')return;
  const r=gc.getBoundingClientRect();
  gc.style.cursor=hitZone(e.clientX-r.left,e.clientY-r.top)?'pointer':'default';
});
function onMainTap(cx,cy){
  if(activeScreen!=='main')return;
  const zone=hitZone(cx,cy);
  if(zone==='statue'){openBuddha();return;}
  if(zone==='tree')  {openScene2();return;}
  if(zone==='cat')   {showMsg('Кот сидит спокойно и наблюдает за статуей.');return;}
  if(zone==='monk')  {showMsg('Монах медитирует. Не стоит мешать.');return;}
  if(!hero.praying){hero.targetX=Math.max(20,Math.min(BG_W-HERO_WALK_W-20,ibx(cx)-HERO_WALK_W/2));hero.idle=false;}
}
gc.addEventListener('click',e=>{const r=gc.getBoundingClientRect();onMainTap(e.clientX-r.left,e.clientY-r.top);});
gc.addEventListener('touchend',e=>{e.preventDefault();if(!e.changedTouches.length)return;const r=gc.getBoundingClientRect();onMainTap(e.changedTouches[0].clientX-r.left,e.changedTouches[0].clientY-r.top);},{passive:false});

// ── SCENE TRANSITIONS ─────────────────────────────────────────────────────────
function openScene2(){
  activeScreen='scene2';
  document.getElementById('scene2').style.display='block';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const r=document.getElementById('scene2').getBoundingClientRect();
    s2W=s2Canvas.width=Math.round(r.width);s2H=s2Canvas.height=Math.round(r.height);
    if(!s2AnimId)animScene2();
  }));
}
function closeScene2(){activeScreen='main';document.getElementById('scene2').style.display='none';if(s2AnimId){cancelAnimationFrame(s2AnimId);s2AnimId=null;}}
window.closeScene2=closeScene2;
function openBuddha(){activeScreen='buddha';document.getElementById('buddha-screen').style.display='flex';initBuddhaScreen();}
function closeBuddha(){activeScreen='main';document.getElementById('buddha-screen').style.display='none';}
window.closeBuddha=closeBuddha;

// ═══ SCENE 2 ═══════════════════════════════════════════════════════════════════
const s2Canvas=document.getElementById('scene2-canvas');
const s2Ctx=s2Canvas.getContext('2d');
const s2MsgEl=document.getElementById('scene2-msg');
let s2W=0,s2H=0,s2AnimId=null,jarPickedUp=false;
const TREE_W=1376,TREE_H=768,BOT_PX=283,BOT_PY=317,BOT_PW=94,BOT_PH=119;
function getBottleRect(){return{x:BOT_PX*(s2W/TREE_W),y:BOT_PY*(s2H/TREE_H),w:BOT_PW*(s2W/TREE_W),h:BOT_PH*(s2H/TREE_H)};}
function bottleHit(cx,cy){if(jarPickedUp)return false;const b=getBottleRect();return cx>=b.x-8&&cx<=b.x+b.w+8&&cy>=b.y-8&&cy<=b.y+b.h+8;}
function animScene2(){s2Ctx.clearRect(0,0,s2W,s2H);if(!jarPickedUp&&bottleImg.complete&&bottleImg.naturalWidth){const b=getBottleRect();s2Ctx.drawImage(bottleImg,b.x,b.y,b.w,b.h);}s2AnimId=requestAnimationFrame(animScene2);}
s2Canvas.addEventListener('mousemove',e=>{const r=s2Canvas.getBoundingClientRect();s2Canvas.style.cursor=bottleHit(e.clientX-r.left,e.clientY-r.top)?'pointer':'default';});
function onS2Tap(cx,cy){if(activeScreen!=='scene2')return;if(bottleHit(cx,cy))pickUpJar();}
s2Canvas.addEventListener('click',e=>{const r=s2Canvas.getBoundingClientRect();onS2Tap(e.clientX-r.left,e.clientY-r.top);});
s2Canvas.addEventListener('touchend',e=>{e.preventDefault();if(!e.changedTouches.length)return;const r=s2Canvas.getBoundingClientRect();onS2Tap(e.changedTouches[0].clientX-r.left,e.changedTouches[0].clientY-r.top);},{passive:false});
function pickUpJar(){
  if(jarPickedUp)return;
  jarPickedUp=true;
  addItem({id:'jar',name:'банка',icon:'🫙',label:'банка',caught:0,glowing:false,description:'Пустая стеклянная банка. Можно поймать что-нибудь.'});
  s2MsgEl.textContent='Ты подобрал стеклянную банку. Она пустая.';
  s2MsgEl.style.display='block';
  setTimeout(()=>s2MsgEl.style.display='none',2800);
}

// ═══ BUDDHA SCREEN ══════════════════════════════════════════════════════════════
const bCanvas=document.getElementById('buddha-canvas');
const bCtx=bCanvas.getContext('2d');
const wishCanvas=document.getElementById('wish-anim');
const wCtx=wishCanvas.getContext('2d');
const bMsgEl=document.getElementById('buddha-msg');
let bFlies=[],wishPlaying=false,bMsgTimer=null,bW=0,bH=0;

function initBuddhaScreen(){
  const rect=document.getElementById('buddha-screen').getBoundingClientRect();
  bW=bCanvas.width=wishCanvas.width=Math.round(rect.width);
  bH=bCanvas.height=wishCanvas.height=Math.round(rect.height);
  if(!bFlies.length)spawnBFlies();
  wishPlaying=false;bMsgEl.style.display='none';wishCanvas.style.display='none';
  bCanvas.style.pointerEvents='auto';
  animBuddha();
}
function spawnBFlies(){
  bFlies=Array.from({length:30},()=>{
    const sz=4+Math.random()*5;
    return{x:60+Math.random()*(bW-120),y:40+Math.random()*(bH*0.75),phase:Math.random()*Math.PI*2,dx:(Math.random()-0.5)*0.9,dy:(Math.random()-0.5)*0.5,sz,alive:true};
  });
}
function showBMsg(text,dur=3200){clearTimeout(bMsgTimer);bMsgEl.textContent=text;bMsgEl.style.display='block';bMsgTimer=setTimeout(()=>bMsgEl.style.display='none',dur);}

bCanvas.addEventListener('mousemove',e=>{
  if(wishPlaying){bCanvas.style.cursor='default';return;}
  const jar=getItem('jar');
  if(!jar){bCanvas.style.cursor='default';return;}
  const r=bCanvas.getBoundingClientRect(),cx=e.clientX-r.left,cy=e.clientY-r.top;
  bCanvas.style.cursor=bFlies.some(f=>f.alive&&Math.sqrt((f.x-cx)**2+(f.y-cy)**2)<f.sz*5+14)?'pointer':'default';
});

function onBuddhaTap(cx,cy){
  if(activeScreen!=='buddha'||wishPlaying)return;
  const jar=getItem('jar');
  if(!jar)return;
  for(const f of bFlies){
    if(!f.alive)continue;
    if(Math.sqrt((f.x-cx)**2+(f.y-cy)**2)<f.sz*5+14){
      f.alive=false;
      jar.caught=(jar.caught||0)+1;
      jar.label='банка '+'·'.repeat(Math.min(jar.caught,9));
      renderHotbar();
      if(jar.caught>=10){
        showBMsg('✦ Загадай желание...',2200);
        setTimeout(()=>startWishAnim(()=>{
          jar.glowing=true;
          jar.icon='🫙';
          jar.label='банка ✦';
          jar.caught=0;
          jar.description='Светляковская жижка. Внутри мерцает мягкий зелёный свет — след от десяти пойманных светлячков.';
          renderHotbar();
          updateItemCursor();
          showBMsg('Они улетели. В банке осталась светляковская жижка.');
        }),2400);
      }
      return;
    }
  }
}
bCanvas.addEventListener('click',e=>{const r=bCanvas.getBoundingClientRect();onBuddhaTap(e.clientX-r.left,e.clientY-r.top);});
bCanvas.addEventListener('touchend',e=>{e.preventDefault();if(!e.changedTouches.length)return;const r=bCanvas.getBoundingClientRect();onBuddhaTap(e.changedTouches[0].clientX-r.left,e.changedTouches[0].clientY-r.top);},{passive:false});

// ── EPIC WISH ANIMATION ────────────────────────────────────────────────────────
function startWishAnim(onDone){
  wishPlaying=true;bCanvas.style.pointerEvents='none';wishCanvas.style.display='block';

  // Collect alive firefly positions as starting points + random others
  const startPositions=bFlies.map(f=>({x:f.x,y:f.y}));
  bFlies.forEach(f=>f.alive=false); // hide them from the regular anim

  // Create 20 large particles with beautiful trajectories
  const particles=Array.from({length:20},(_,i)=>{
    const sp=startPositions[i%startPositions.length]||{x:bW*0.3+Math.random()*bW*0.4,y:bH*0.5+Math.random()*bH*0.3};
    // Spiral/arc trajectory: each firefly curves upward differently
    const angle=-Math.PI*0.5 + (Math.random()-0.5)*Math.PI*0.8;
    const speed=2.5+Math.random()*2;
    return{
      x:sp.x, y:sp.y,
      vx:Math.cos(angle)*speed*(0.6+Math.random()*0.8),
      vy:Math.sin(angle)*speed - 1,
      ax:(Math.random()-0.5)*0.08,  // gentle horizontal drift
      ay:-0.04-Math.random()*0.03,  // gravity upward (floats up)
      phase:Math.random()*Math.PI*2,
      sz:6+Math.random()*8,         // larger particles
      age:0,
      delay:i*6,
      life:180+Math.random()*60,
      // dust trail particles
      trail:[],
    };
  });

  // Extra dust particles pool
  const dust=[];

  let af=0;
  (function aw(){
    af++;
    wCtx.clearRect(0,0,bW,bH);

    particles.forEach(p=>{
      if(af<p.delay)return;
      p.phase+=0.12;
      p.vx+=p.ax;
      p.vy+=p.ay;
      p.x+=p.vx;
      p.y+=p.vy;
      p.age++;

      const t=p.age/p.life;
      const alpha=t<0.1?t/0.1:t>0.75?1-(t-0.75)/0.25:1;
      const glow=0.5+0.5*Math.abs(Math.sin(p.phase));
      const sz=p.sz*(1-t*0.3);

      // Spawn dust at current position
      if(p.age%3===0 && t<0.8){
        dust.push({
          x:p.x+(Math.random()-0.5)*sz,
          y:p.y+(Math.random()-0.5)*sz,
          vx:(Math.random()-0.5)*0.8,
          vy:-(0.3+Math.random()*0.5),
          sz:1.5+Math.random()*2.5,
          age:0,life:30+Math.random()*20,
          col:Math.random()<0.5?'#aaff66':'#ffee88',
        });
      }

      // Draw glow halo
      wCtx.save();
      wCtx.globalAlpha=alpha*glow*0.3;
      const grad=wCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*3);
      grad.addColorStop(0,'rgba(180,255,120,0.8)');
      grad.addColorStop(0.4,'rgba(120,220,80,0.3)');
      grad.addColorStop(1,'rgba(80,160,40,0)');
      wCtx.fillStyle=grad;
      wCtx.beginPath();wCtx.arc(p.x,p.y,sz*3,0,Math.PI*2);wCtx.fill();
      wCtx.restore();

      // Draw core square (pixel art style)
      wCtx.save();
      wCtx.globalAlpha=alpha;
      wCtx.fillStyle=`rgba(200,255,140,${glow.toFixed(2)})`;
      wCtx.fillRect(p.x-sz/2,p.y-sz/2,sz,sz);
      // Bright center
      wCtx.fillStyle=`rgba(255,255,220,${(alpha*glow).toFixed(2)})`;
      wCtx.fillRect(p.x-sz*0.2,p.y-sz*0.2,sz*0.4,sz*0.4);
      wCtx.restore();
    });

    // Draw and update dust
    for(let i=dust.length-1;i>=0;i--){
      const d=dust[i];
      d.x+=d.vx;d.y+=d.vy;d.age++;
      const dt=d.age/d.life;
      if(dt>=1){dust.splice(i,1);continue;}
      const da=dt<0.3?dt/0.3:1-dt;
      wCtx.globalAlpha=da*0.85;
      wCtx.fillStyle=d.col;
      wCtx.fillRect(d.x-d.sz/2,d.y-d.sz/2,d.sz,d.sz);
      wCtx.globalAlpha=1;
    }

    // Screen flash at the start
    if(af<20){
      wCtx.globalAlpha=(1-af/20)*0.25;
      wCtx.fillStyle='rgba(180,255,120,1)';
      wCtx.fillRect(0,0,bW,bH);
      wCtx.globalAlpha=1;
    }

    const allDone=particles.every(p=>p.age>p.life||af<p.delay&&af>p.delay+10);
    const maxAge=Math.max(...particles.map(p=>p.delay+p.life));
    if(af<maxAge+30){
      requestAnimationFrame(aw);
    } else {
      setTimeout(()=>{
        wishCanvas.style.display='none';
        wCtx.clearRect(0,0,bW,bH);
        wishPlaying=false;
        bCanvas.style.pointerEvents='auto';
        // Respawn fireflies
        bFlies=bFlies.map(f=>({...f,alive:true,x:60+Math.random()*(bW-120),y:40+Math.random()*(bH*0.75)}));
        if(onDone)onDone();
      },400);
    }
  })();
}

function animBuddha(){
  if(activeScreen!=='buddha')return;
  bCtx.clearRect(0,0,bW,bH);
  bFlies.forEach(f=>{
    if(!f.alive)return;
    f.phase+=0.03;f.x+=f.dx;f.y+=f.dy;
    if(f.x<20)f.dx=Math.abs(f.dx);if(f.x>bW-20)f.dx=-Math.abs(f.dx);
    if(f.y<20)f.dy=Math.abs(f.dy);if(f.y>bH*0.82)f.dy=-Math.abs(f.dy);
    const a=0.2+0.8*Math.abs(Math.sin(f.phase)),sz=f.sz;
    // Core
    bCtx.fillStyle=`rgba(255,248,120,${a.toFixed(2)})`;bCtx.fillRect(f.x-sz/2,f.y-sz/2,sz,sz);
    // Glow cross
    bCtx.fillStyle=`rgba(255,240,80,${(a*0.25).toFixed(2)})`;
    bCtx.fillRect(f.x-sz*2,f.y-sz/2,sz*4,sz);bCtx.fillRect(f.x-sz/2,f.y-sz*2,sz,sz*4);
  });
  requestAnimationFrame(animBuddha);
}
