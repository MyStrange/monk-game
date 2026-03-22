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
    // Jar and stick use pixel-art SVG
    if (item.id === 'jar' || item.id === 'jar_open') {
      div.innerHTML = `<span class="slot-icon">${renderJarIcon(item)}</span>`;
    } else if (item.id === 'stick' || item.id === 'glowstick') {
      div.innerHTML = `<span class="slot-icon">${renderStickIcon(item.id==='glowstick')}</span>`;
    } else {
      div.innerHTML = `<span class="slot-icon">${item.icon}</span>`;
    }
    div.onclick = () => {
      const prev = getSelectedItem();
      if(prev && prev.id !== item.id) {
        // Item × item interaction
        const result = itemOnItem(prev.id, item.id);
        if(result) { showMsg(result, 2800); return; }
      }
      selectedSlot = selectedSlot === i ? -1 : i;
      renderHotbar();
      updateItemCursor();
    };
    div.oncontextmenu = (e) => { e.preventDefault(); showItemMenu(item, e.clientX, e.clientY); };
    el.appendChild(div);
  });
}

function renderJarIcon(item) {
  const isOpen = item.id === 'jar_open' || item.icon === 'jar_open';
  const n = Math.min(item.caught||0, 9);
  // Pixel-art jar: 48x54 grid, 2px pixel size
  // Chaotic positions inside jar body (cols 10-38, rows 20-44)
  const positions = [
    [12,36],[30,24],[20,40],[10,28],[34,38],[22,22],[8,42],[28,32],[16,26]
  ];
  const dots = [];
  for (let i = 0; i < n; i++) {
    const [x,y] = positions[i];
    const dur = (0.6+(i*0.23)%1.1).toFixed(2);
    // Each dot is 3x3 with 1px bright center
    dots.push(
      `<rect x="${x}" y="${y}" width="3" height="3" fill="#ffe066"><animate attributeName="opacity" values="0.15;1;0.15" dur="${dur}s" repeatCount="indefinite"/></rect>` +
      `<rect x="${x+1}" y="${y+1}" width="1" height="1" fill="#fff8cc"><animate attributeName="opacity" values="0.1;0.9;0.1" dur="${dur}s" repeatCount="indefinite"/></rect>`
    );
  }
  // Pixel-art jar — all hard rectangles, no border-radius
  const lidHtml = isOpen ? '' : '<rect x="12" y="4" width="24" height="2" fill="#3a6b2a"/><rect x="10" y="6" width="28" height="2" fill="#4a8b36"/><rect x="10" y="8" width="28" height="2" fill="#3a6b2a"/>';
  return `<svg width="48" height="54" viewBox="0 0 48 54" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    ${lidHtml}
    <!-- neck -->
    <rect x="12" y="10" width="24" height="4"  fill="#2a4a1e"/>
    <!-- body outline -->
    <rect x="6"  y="14" width="36" height="36" fill="rgba(140,200,130,0.12)"/>
    <!-- body border left/right -->
    <rect x="6"  y="14" width="4"  height="36" fill="rgba(120,180,110,0.25)"/>
    <rect x="38" y="14" width="4"  height="36" fill="rgba(120,180,110,0.18)"/>
    <!-- body border top/bottom -->
    <rect x="6"  y="14" width="36" height="4"  fill="rgba(140,200,130,0.22)"/>
    <rect x="6"  y="46" width="36" height="4"  fill="rgba(100,160,90,0.28)"/>
    <!-- glass highlight -->
    <rect x="10" y="18" width="4"  height="24" fill="rgba(200,255,190,0.18)"/>
    <rect x="12" y="16" width="2"  height="2"  fill="rgba(220,255,210,0.3)"/>
    <!-- fireflies -->
    ${dots.join('')}
  </svg>`;
}

function renderStickIcon(glowing=false) {
  const col1 = glowing ? '#ffe066' : '#8b5e3c';
  const col2 = glowing ? '#fff4aa' : '#a0714f';
  const col3 = glowing ? '#ffcc00' : '#6b4226';
  const glow = glowing ? '<rect x="4" y="4" width="40" height="46" fill="rgba(255,230,80,0.08)"/>' : '';
  const spark = glowing ? `
    <rect x="28" y="6" width="2" height="2" fill="#fff8aa"><animate attributeName="opacity" values="0;1;0" dur="0.7s" repeatCount="indefinite"/></rect>
    <rect x="22" y="10" width="2" height="2" fill="#ffe066"><animate attributeName="opacity" values="0;1;0" dur="1.1s" repeatCount="indefinite"/></rect>
    <rect x="32" y="14" width="2" height="2" fill="#ffffff"><animate attributeName="opacity" values="0;1;0" dur="0.9s" repeatCount="indefinite"/></rect>` : '';
  return `<svg width="48" height="54" viewBox="0 0 48 54" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    ${glow}
    <!-- stick body: diagonal from top-right to bottom-left -->
    <rect x="30" y="4"  width="6" height="6"  fill="${col1}"/>
    <rect x="26" y="8"  width="6" height="4"  fill="${col1}"/>
    <rect x="24" y="10" width="4" height="4"  fill="${col2}"/>
    <rect x="20" y="14" width="6" height="4"  fill="${col1}"/>
    <rect x="18" y="16" width="4" height="4"  fill="${col2}"/>
    <rect x="14" y="20" width="6" height="4"  fill="${col1}"/>
    <rect x="12" y="22" width="4" height="4"  fill="${col2}"/>
    <rect x="8"  y="26" width="6" height="4"  fill="${col1}"/>
    <rect x="6"  y="28" width="4" height="4"  fill="${col2}"/>
    <rect x="4"  y="32" width="6" height="4"  fill="${col3}"/>
    <rect x="4"  y="36" width="4" height="6"  fill="${col3}"/>
    <!-- knot -->
    <rect x="22" y="12" width="2" height="2"  fill="${col3}"/>
    <rect x="16" y="20" width="2" height="2"  fill="${col3}"/>
    ${spark}
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
    if (item.id === 'jar' || item.id === 'jar_open') {
      itemCursorEl.innerHTML = renderJarIcon(item);
      itemCursorEl.style.fontSize = '';
    } else if (item.id === 'stick' || item.id === 'glowstick') {
      itemCursorEl.innerHTML = renderStickIcon(item.id==='glowstick');
      itemCursorEl.style.fontSize = '';
    } else {
      itemCursorEl.innerHTML = '';
      itemCursorEl.textContent = item.icon;
      itemCursorEl.style.fontSize = '32px';
    }
  } else {
    itemCursorEl.style.display = 'none';
    itemCursorEl.innerHTML = '';
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
  statue:{x:700,y:300,w:120,h:130},  // Buddha face
  tree:  {x:1600,y:300,w:200,h:580},
  cat:   {x:cat.x,y:cat.y,w:CAT_W,h:CAT_H},
  monk:  {x:redMonk.x,y:redMonk.y,w:MONK_W,h:MONK_H},
  bush:  {x:30,y:820,w:220,h:180},   // left foreground bush
  water: {x:200,y:950,w:1400,h:140}, // water with reflection
  dirt:  {x:870,y:890,w:100,h:80},    // dirt pile after cat buries
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
  const cx=hero.x+HERO_SIT_W/2, cy=GROUND_Y-HERO_SIT_H*0.85;
  const wobble=(Math.random()-0.5)*1.8;   // wider spread
  const speed=0.25+Math.random()*0.3;     // slower
  const sc=Math.min(W/BG_W,H/BG_H);
  pSyms.push({
    x:bx(cx+(Math.random()-0.5)*80), y:by(cy),  // wider spawn
    ch:thaiChars[Math.floor(Math.random()*thaiChars.length)],
    col:golds[Math.floor(Math.random()*golds.length)],
    vx:wobble,
    vy:-(speed+0.15),  // slower upward
    ax:-wobble*0.025,  // gentler centering
    life:220+Math.random()*100, age:0,  // longer life
    startSize:(18+Math.random()*12)*sc,
    endSize:(44+Math.random()*24)*sc,
    rotV:(Math.random()-0.5)*0.008,  // gentler rotation
  });
}


// ── BUSH / STICK ──────────────────────────────────────────────────────────────
let stickPickedUp = false;
function pickUpStick() {
  if (stickPickedUp && !bushBreadPickedUp) { tryPickupBread(); return; }
  if (stickPickedUp && bushBreadPickedUp) { showMsg('Здесь больше ничего нет.'); return; }
  if (selectedSlot >= 0) { showMsg('Руки заняты.'); return; }
  stickPickedUp = true;
  addItem({id:'stick', name:'палка', icon:'🪵', label:'палка', description:'Обычная палка. Немного влажная. Пахнет листьями.'});
  showMsg('Ты нашёл палку в кустах. Зачем-то взял её.');
}

// Bread — found in bush after stick
let bushBreadPickedUp = false;
function tryPickupBread() {
  if (bushBreadPickedUp) { showMsg('Здесь больше ничего нет.'); return; }
  if (selectedSlot >= 0) { showMsg('Руки заняты.'); return; }
  bushBreadPickedUp = true;
  addItem({id:'bread', name:'сухарик', icon:'🍞', label:'сухарик',
    description:'Старый сухой сухарик. Немного грустный на вид. Коту, может, зайдёт.'});
  showMsg('На дне куста лежал сухарик. Ты взял его, не зная зачем.');
}

// ── CAT & MONK MESSAGES ───────────────────────────────────────────────────────
const catMsgs = [
  'Кот смотрит сквозь тебя.',
  'Моргнул. Это был знак. Ты не понял — какой.',
  'Думает о чём-то своём. Или просто греется.',
  'Чешет ухо. Это лучшее, что ты сегодня видел.',
  'Повернул голову. Посмотрел. Отвернулся.',
  'Ты ему неинтересен. Это освобождает.',
];
let catMsgIdx = 0;
function catMsg() { return catMsgs[catMsgIdx++ % catMsgs.length]; }

// Cat burying mechanic
let catBurying = false, catBuryTimer = 0, dirtReady = false;
let dirtPickedUp = false;
const DIRT_ZONE = {x:870, y:890, w:100, h:80}; // near cat after burying

const monkMsgs = [
  'Монах сидит. Может, слышит тебя. Не подаёт вида.',
  'Не открыл глаза. Это, наверное, хороший знак.',
  'Дышит медленно. Попробуй так же — вдруг поможет.',
  'Сидит здесь уже давно. Три часа или три года — не поймёшь.',
  'Кажется, чуть улыбнулся. Или показалось.',
  'Думает о пустоте. Ты думаешь о нём. Занятная цепочка.',
];
let monkMsgIdx = 0;
function monkMsg() { return monkMsgs[monkMsgIdx++ % monkMsgs.length]; }



// ── ITEM × ITEM INTERACTIONS ──────────────────────────────────────────────────
function itemOnItem(activeId, targetId) {
  // Normalise order: always stick+jar regardless of which was active
  const isStickJar = (activeId==='stick'&&targetId==='jar')||(activeId==='jar'&&targetId==='stick');

  if(isStickJar) {
    const jar  = getItem('jar');
    const stick = inventory.find(i=>i&&i.id==='stick');
    if(!jar || !stick) return null;

    // Jar must have something to give: glowing liquid OR fireflies inside
    const hasLight = jar.glowing || (jar.caught||0) > 0;
    if(!hasLight) {
      return 'В банке ничего нет. Нечем светить.';
    }

    // Transform stick → glowstick
    const stickIdx = inventory.findIndex(i=>i&&i.id==='stick');
    inventory[stickIdx] = {
      id:'glowstick', name:'светящаяся палка', icon:'🪄', label:'светопалка',
      description:'Палка впитала свет из банки. Светится тихо и ровно.'
    };
    if(selectedSlot===stickIdx) selectedSlot=stickIdx;

    // Jar becomes open (lid went with the light)
    jar.id='jar_open'; jar.caught=0; jar.glowing=false; jar.released=false;
    jar.hasWater=false; jar.label='банка'; jar.icon='jar_open';
    jar.description='Банка без крышки. Крышка ушла вместе со светом.';

    renderHotbar(); updateItemCursor();
    showMsg('Палка впитала свет. Крышка куда-то делась — банка теперь открытая.');
    return null; // handled, no extra message needed
  }

  return null;
}

// ── ITEM × ZONE INTERACTION SYSTEM ───────────────────────────────────────────
const interactCounts = {}; // key: "itemId:zone"
function interactKey(itemId, zone){ return itemId+':'+zone; }
function getInteractCount(itemId, zone){ return interactCounts[interactKey(itemId,zone)]||0; }
function bumpInteract(itemId, zone){ const k=interactKey(itemId,zone); interactCounts[k]=(interactCounts[k]||0)+1; }

function itemOnZone(itemId, zone){
  const n = getInteractCount(itemId, zone);
  bumpInteract(itemId, zone);

  // Glowing jar (has firefly liquid) — special messages everywhere
  if(itemId==='jar'||itemId==='jar_open'){
    const jar=getItem(itemId);
    if(jar&&jar.glowing){
      const gm={
        cat:   ['Банка светит коту в лицо. Кот щурится.','Кот смотрит на свет. Долго.','Кот моргнул. Что-то изменилось. Или нет.'],
        monk:  ['Монах открыл один глаз. Посмотрел на свет. Закрыл.','Свет из банки упал на его руки.','Монах улыбнулся. Едва заметно.'],
        statue:['Отражение света на камне. Красиво и бессмысленно.','Будда и банка со светом. Кто кому светит — непонятно.'],
        water: ['Свет из банки упал в воду. Вода стала чуть другой.','Отражение светится. Оба настоящие.'],
        bush:  ['Куст в свете светлячков выглядит иначе. Как будто живёт.'],
        tree:  ['Дерево большое. Банка маленькая. Свет один.'],
        rock1: ['Что-то в камне отзывается на свет.','Камень холодный. Свет тёплый. Баланс.'],
        rock2: ['Что-то в камне отзывается. Или показалось.','Второй камень принимает свет.'],
        rock3: ['Третий камень. Третий свет. Совпадение?'],
      };
      const msgs=gm[zone];
      if(msgs) return msgs[n%msgs.length];
      return 'Свет из банки. Тихо.';
    }
  }

  if(itemId==='jar'){
    if(zone==='cat') return [
      'Коты, конечно, жидкость, но не этот.',
      'Ну нет. Он туда не пойдёт.',
      'Смотрит на банку. Потом на тебя. Моргает.',
      'Ты всё ещё пробуешь? Кот флегматично присутствует.',
      'Он остался. Просто игнорирует.',
    ][Math.min(n,4)];
    if(zone==='monk') return [
      'Ты у него денег просишь? У монаха, серьёзно?',
      'Не реагирует. Вообще.',
      'Он всё уже отпустил. В том числе это.',
      'Тишина — тоже ответ.',
    ][Math.min(n,3)];
    if(zone==='statue') return [
      'Будда смотрит на банку. Банка смотрит на Будду.',
      'Тишина. Очень красноречивая.',
      'Думаешь, он оценил? Вряд ли.',
    ][Math.min(n,2)];
    if(zone==='water') return [
      'В отражении банка выглядит глубже, чем есть.',
      'Вода не удивлена.',
      'Отражение не двигается. Ты двигаешься.',
    ][Math.min(n,2)];
    if(zone==='bush') return [
      'Банка и куст. Ничего не произошло.',
      'Снова ничего. Куст держится.',
    ][Math.min(n,1)];
  }

  if(itemId==='stick'){
    if(zone==='cat') return [
      'Кот посмотрел на палку. Не впечатлился.',
      'Зевнул. Демонстративно.',
      'Перевёл взгляд. Остался.',
      'Нет.',
    ][Math.min(n,3)];
    if(zone==='monk') return [
      'Открыл один глаз. Закрыл.',
      'Больше не откроет. Это было последнее предупреждение.',
      'Глубокое молчание. Ты проиграл.',
    ][Math.min(n,2)];
    if(zone==='statue') return [
      'Ты поднял палку — и сам же убрал. Правильно.',
      'Снова? Нет.',
    ][Math.min(n,1)];
    if(zone==='water') return [
      'Палка и вода. Вода победила, как всегда.',
      'Круги на воде. Красиво, если честно.',
      'Ничего нового.',
    ][Math.min(n,2)];
    if(zone==='bush') return [
      'Поковырял кусты палкой. Там пусто.',
      'Всё так же пусто.',
      'Куст тебя не боится.',
    ][Math.min(n,2)];
  }

  if(zone==='rocks'){
    if(itemId==='jar') return [
      'Камни холодные. Банка тёплая. Вот и всё.',
      'Камни молчат. Банка тоже.',
    ][Math.min(n,1)];
    if(itemId==='stick') return [
      'Постучал палкой по камню. Камень не оценил.',
      'Звук глухой. Как будто камню всё равно.',
      'Ничего.',
    ][Math.min(n,2)];
    return ['Камни. Просто камни.','Ничего не изменилось.'][Math.min(n,1)];
  }

  if(zone==='bottle'){
    if(itemId==='stick'){
      const jar=getItem('jar');
      if(!jar){ return 'Тут нечем светить.'; }
      if(!jar.released && jar.caught===0){ return 'В банке ничего нет. Нечем светить.'; }
      // Transform: stick absorbs light from jar → glowstick
      const stickIdx=inventory.findIndex(i=>i&&i.id==='stick');
      if(stickIdx>=0){
        inventory[stickIdx]={id:'glowstick',name:'светящаяся палка',icon:'🪄',label:'светопалка',
          description:'Палка впитала свет из банки. Светится тихо и ровно.'};
        if(selectedSlot===stickIdx) selectedSlot=stickIdx; // keep selected
      }
      // Jar becomes empty
      jar.caught=0; jar.glowing=false; jar.released=false;
      jar.hasWater=false; jar.label='банка'; jar.icon='🫙';
      jar.description='Пустая банка. Свет ушёл в палку.';
      renderHotbar(); updateItemCursor();
      showS2Msg('Палка коснулась банки — и впитала весь свет. Банка снова пустая.');
      return null;
    }
    if(itemId==='jar') return 'Банка смотрит на банку. Что-то в этом есть.';
  }

  if(zone==='water'){
    if(itemId==='jar_open'||itemId==='jar'){
      const jar=getItem(itemId);
      if(!jar) return null;
      if(jar.id==='jar'&&!jar.glowing&&!jar.released) return 'У банки крышка. Воду не зачерпнёшь.';
      if(jar.hasWater) return 'Банка уже с водой.';
      jar.hasWater=true; jar.label='с водой'; jar.icon='jar_open';
      jar.description='Открытая банка с водой. Холодная. Не расплещи.';
      renderHotbar(); updateItemCursor();
      showMsg('Ты зачерпнул воды. Банка стала тяжелее.');
      return null;
    }
  }

  if(zone==='rock1'||zone==='rock2'||zone==='rock3'){
    const jar=(itemId==='jar'||itemId==='jar_open')?getItem(itemId):null;
    if(itemId==='jar'&&jar&&!jar.hasWater&&!jar.released&&(jar.caught||0)===0){
      return ['Банка ещё пригодится. Не надо её разбивать.','Точно не сюда.','Пустая банка камню не поможет.'][Math.min(getInteractCount(itemId,zone)%3,2)];
    }
    if((itemId==='jar_open'||itemId==='jar')&&jar&&jar.hasWater){
      // Water jar on rock 1 → activate, jar breaks
      rockStates[zone]=true;
      const jarIdx=inventory.findIndex(i=>i&&i.id==='jar');
      if(jarIdx>=0) inventory[jarIdx]=null;
      if(selectedSlot===jarIdx) selectedSlot=-1;
      renderHotbar(); updateItemCursor();
      showS2Msg('Вода впитывается в камень. Банка трескается от холода — и рассыпается.');
      return null;
    }
    if(itemId==='dirt'){
      rockStates[zone]=true;
      const dirtIdx=inventory.findIndex(i=>i&&i.id==='dirt');
      if(dirtIdx>=0) inventory[dirtIdx]=null;
      if(selectedSlot===dirtIdx) selectedSlot=-1;
      renderHotbar(); updateItemCursor();
      showS2Msg('Земля ложится на камень. Что-то меняется.');
      return null;
    }
    if(itemId==='glowstick'){
      rockStates[zone]=true;
      showS2Msg('Свет из палки переходит в камень. Камень начинает тихо светиться.');
      return null;
    }
    // Default: rock with no useful item
    const rockTexts=['Обычный камень. Холодный.','Поверхность шершавая.','Что-то в нём есть.'];
    return rockTexts[getInteractCount(itemId,zone)%3];
  }

  if(zone==='cat'){
    if(itemId==='bread'||itemId==='durian'){
      const foodIdx=inventory.findIndex(i=>i&&i.id===itemId);
      if(foodIdx>=0) inventory[foodIdx]=null;
      if(selectedSlot===foodIdx) selectedSlot=-1;
      catBurying=true; catBuryTimer=0;
      renderHotbar(); updateItemCursor();
      const msg=itemId==='durian'
        ? 'Кот понюхал рис с дурианом. На секунду завис. И начал закапывать — быстро, инстинктивно.'
        : 'Кот понюхал сухарик. Поморщился. И всё равно начал закапывать — инстинкт.';
      showMsg(msg);
      return null;
    }
  }

  // Bread doesn't do anything on other zones
  if(itemId==='bread'){
    return ['Что делать с сухариком здесь?','Нет.',' '][Math.min(getInteractCount(itemId,zone)%3, 2)];
  }

  return null;
}
function tryItemOnZone(zone){
  const item = getSelectedItem();
  if(!item) return false;
  const text = itemOnZone(item.id, zone);
  if(text){ showMsg(text); return true; }
  return false;
}


// ── MEDITATION MODE ────────────────────────────────────────────────────────────
// Visual: canvas gets warm golden overlay + world slows down
// Special: hidden symbols appear, different dialogue texts, energy orbs collectible

let meditationPhase = 0;     // 0-1 transition progress
let meditationEnergy = 0;    // clicks collected in meditation
let meditationOrbs = [];     // floating energy orbs visible only in meditation
let lastMeditationSpawn = 0;

const MEDITATE_MSGS = {
  cat: [
    'Кот тоже медитирует. Вы оба знаете.',
    'В состоянии покоя кот — просто форма, принявшая кота.',
    'Между вами нет разницы. Оба сидите. Оба дышите.',
    'Кот достиг просветления раньше. Он просто не говорит об этом.',
  ],
  monk: [
    'Два монаха. Один знает что делает. Второй — нет.',
    'Вы медитируете вместе, не зная об этом.',
    'Монах чувствует твоё присутствие. Ему это не мешает.',
    'Пустота смотрит на пустоту.',
  ],
  statue: [
    'В медитации статуя кажется ближе.',
    'Ты и Будда сейчас занимаетесь одним и тем же.',
    'Разница между тобой и статуей — только материал.',
    'Улыбка становится яснее. Или это игра света.',
  ],
  tree: [
    'Дерево медитирует тысячу лет. Ты только начал.',
    'За деревом что-то есть. Ты это чувствуешь.',
  ],
  water: [
    'Вода не думает. Ты думаешь о воде. Это твоя проблема.',
    'В медитации отражение точнее оригинала.',
  ],
  bush: [
    'Куст тоже часть этого момента.',
    'Ты взял из него всё что мог.',
  ],
  orb: [
    'Энергия.',
    'Ещё.',
    'Собираешь.',
    'Хорошо.',
  ],
};

function getMeditateMsg(zone) {
  const msgs = MEDITATE_MSGS[zone];
  if (!msgs) return null;
  const n = getInteractCount('meditate', zone);
  bumpInteract('meditate', zone);
  return msgs[n % msgs.length];
}

function spawnMeditationOrb() {
  // Orbs appear at random positions, drift slowly
  meditationOrbs.push({
    x: 100 + Math.random() * (BG_W - 200),
    y: 200 + Math.random() * 500,
    phase: Math.random() * Math.PI * 2,
    sz: 6 + Math.random() * 8,
    dx: (Math.random() - 0.5) * 0.3,
    dy: (Math.random() - 0.5) * 0.2,
    collected: false,
    alpha: 0, // fade in
  });
}

function drawMeditationLayer() {
  if (!hero.praying) {
    if (meditationPhase > 0) meditationPhase = Math.max(0, meditationPhase - 0.02);
    return;
  }
  meditationPhase = Math.min(1, meditationPhase + 0.015);

  // Warm golden overlay on entire scene
  ctx.save();
  ctx.globalAlpha = meditationPhase * 0.22;
  ctx.fillStyle = 'rgba(255, 220, 80, 1)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Vignette — darken edges
  ctx.save();
  ctx.globalAlpha = meditationPhase * 0.35;
  const vg = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,10,0,1)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Spawn orbs periodically
  if (tick - lastMeditationSpawn > 120 && meditationOrbs.length < 8) {
    spawnMeditationOrb();
    lastMeditationSpawn = tick;
  }

  // Hidden inscription on pedestal — visible only in meditation
  // Statue is roughly at BG x:700-820, inscription on base y:750-820
  const inscAlpha = meditationPhase * (0.6 + 0.4*Math.abs(Math.sin(tick*0.02)));
  if(inscAlpha > 0.05){
    ctx.save();
    ctx.globalAlpha = inscAlpha;
    // Glow behind inscription
    const ig2=ctx.createRadialGradient(bx(790),by(820),0,bx(790),by(820),bw(90));
    ig2.addColorStop(0,'rgba(255,200,60,0.5)');
    ig2.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=inscAlpha*0.6;
    ctx.fillStyle=ig2;
    ctx.fillRect(bx(700),by(760),bw(180),bh(110));
    // Main symbol — large Thai OM
    ctx.globalAlpha=inscAlpha;
    ctx.font = `bold ${Math.round(bw(52))}px serif`;
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'center';
    ctx.shadowColor='rgba(255,200,0,0.8)';
    ctx.shadowBlur=12;
    ctx.fillText('ᩮ', bx(790), by(830));
    ctx.shadowBlur=0;
    // Charge indicator dots around symbol
    for(let di=0;di<inscriptionCharge;di++){
      const da=(di/5)*Math.PI*2-Math.PI/2;
      ctx.globalAlpha=inscAlpha;
      ctx.fillStyle='#fff8aa';
      ctx.fillRect(bx(790)+Math.cos(da)*bw(38)-3,by(810)+Math.sin(da)*bh(25)-3,6,6);
    }
    ctx.restore();
  }

  // Aura around cat in meditation
  const catCx = bx(cat.x + CAT_W/2), catCy = by(cat.y + CAT_H/2);
  ctx.save();
  ctx.globalAlpha = meditationPhase * 0.35 * (0.6+0.4*Math.abs(Math.sin(tick*0.03)));
  const catAura = ctx.createRadialGradient(catCx, catCy, 0, catCx, catCy, bw(80));
  catAura.addColorStop(0, 'rgba(255,230,80,0.6)');
  catAura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = catAura;
  ctx.beginPath(); ctx.arc(catCx, catCy, bw(80), 0, Math.PI*2); ctx.fill();
  // OM symbol above cat
  ctx.globalAlpha = meditationPhase * 0.7;
  ctx.font = `bold ${Math.round(bw(24))}px serif`;
  ctx.fillStyle = 'rgba(255,220,60,1)';
  ctx.textAlign = 'center';
  ctx.fillText('ॐ', catCx, by(cat.y - 20));
  ctx.restore();
  ctx.textAlign = 'left';

  // Water reflection glow in meditation
  ctx.save();
  ctx.globalAlpha = meditationPhase * 0.18;
  ctx.fillStyle = 'rgba(100,180,255,1)';
  ctx.fillRect(bx(200), by(950), bw(1400), bh(140));
  ctx.restore();

  // Draw orbs
  meditationOrbs.forEach(orb => {
    if (orb.collected) return;
    orb.phase += 0.04;
    orb.x += orb.dx; orb.y += orb.dy;
    orb.alpha = Math.min(1, orb.alpha + 0.02);
    if (orb.x < 80) orb.dx = Math.abs(orb.dx);
    if (orb.x > BG_W-80) orb.dx = -Math.abs(orb.dx);
    if (orb.y < 100) orb.dy = Math.abs(orb.dy);
    if (orb.y > 700) orb.dy = -Math.abs(orb.dy);

    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(orb.phase));
    const alpha = orb.alpha * meditationPhase * pulse;
    const sz = orb.sz;

    ctx.save();
    // Glow
    ctx.globalAlpha = alpha * 0.4;
    const g = ctx.createRadialGradient(bx(orb.x), by(orb.y), 0, bx(orb.x), by(orb.y), bw(sz*5));
    g.addColorStop(0, 'rgba(255,230,100,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx(orb.x), by(orb.y), bw(sz*5), 0, Math.PI*2); ctx.fill();
    // Core
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(255,240,120,${pulse.toFixed(2)})`;
    ctx.fillRect(bx(orb.x)-bw(sz)/2, by(orb.y)-bh(sz)/2, bw(sz), bh(sz));
    ctx.fillStyle = 'rgba(255,255,200,0.9)';
    ctx.fillRect(bx(orb.x)-bw(sz)*0.2, by(orb.y)-bh(sz)*0.2, bw(sz)*0.4, bh(sz)*0.4);
    ctx.restore();
  });
}

function hitMeditationOrb(cx, cy) {
  if (!hero.praying) return null;
  return meditationOrbs.find(orb => {
    if (orb.collected) return false;
    const dx = cx - bx(orb.x), dy = cy - by(orb.y);
    return Math.sqrt(dx*dx+dy*dy) < bw(orb.sz*5)+10;
  }) || null;
}

function collectOrb(orb) {
  orb.collected = true;
  meditationEnergy++;
  // Spawn a prayer symbol burst
  for (let i = 0; i < 3; i++) spawnSym();
  const msg = MEDITATE_MSGS.orb[Math.min(meditationEnergy-1, MEDITATE_MSGS.orb.length-1)];
  showMsg(msg, 1500);
}



// ── SYMBOL DRAG + INSCRIPTION RESONANCE ───────────────────────────────────────
let draggedSym = null;       // symbol currently held by player
let dragX = 0, dragY = 0;   // current mouse/touch position
let inscriptionCharge = 0;  // 0-5, symbols delivered
let inscriptionReady = false; // true when 5 delivered, click opens scene
let resonanceFlashes = [];  // flash animations on delivery
let inscriptionGlow = 0;    // current glow intensity
let scene4Unlocked = false;

// Hit test for a prayer symbol (pSyms entry) at canvas coords
function symHit(cx, cy, s) {
  const sc = Math.min(W/BG_W, H/BG_H);
  const sz = s.startSize + (s.endSize - s.startSize) * (s.age/s.life);
  return Math.abs(cx - s.x) < sz*1.2 && Math.abs(cy - s.y) < sz*1.2;
}

// Hit test for inscription zone in canvas coords
function inscHitCanvas(cx, cy) {
  return cx >= bx(INSCRIPTION_ZONE.x) &&
         cx <= bx(INSCRIPTION_ZONE.x) + bw(INSCRIPTION_ZONE.w) &&
         cy >= by(INSCRIPTION_ZONE.y) &&
         cy <= by(INSCRIPTION_ZONE.y) + bh(INSCRIPTION_ZONE.h);
}

function deliverSymbol() {
  inscriptionCharge++;
  draggedSym = null;
  // Resonance flash
  resonanceFlashes.push({
    x: INSCRIPTION_ZONE.x + INSCRIPTION_ZONE.w/2,
    y: INSCRIPTION_ZONE.y + INSCRIPTION_ZONE.h/2,
    age: 0, life: 50,
  });
  inscriptionGlow = 1.0;
  if (inscriptionCharge >= 5) {
    // Epic: multiple flashes, then message to click
    inscriptionGlow = 2.0; // over-glow
    for(let i=0;i<3;i++){
      setTimeout(()=>{
        resonanceFlashes.push({
          x:INSCRIPTION_ZONE.x+INSCRIPTION_ZONE.w/2,
          y:INSCRIPTION_ZONE.y+INSCRIPTION_ZONE.h/2,
          age:0,life:60,
        });
        inscriptionGlow=Math.max(inscriptionGlow,1.5);
      }, i*200);
    }
    inscriptionReady = true;
  }
}

function drawDraggedSym() {
  if (!draggedSym) return;
  const sc = Math.min(W/BG_W, H/BG_H);
  const sz = (draggedSym.startSize + draggedSym.endSize) / 2;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.font = `bold ${Math.round(sz * 1.3)}px monospace`;
  ctx.fillStyle = draggedSym.col;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Glow behind dragged symbol
  ctx.shadowColor = '#ffe066';
  ctx.shadowBlur = 16;
  ctx.fillText(draggedSym.ch, dragX, dragY);
  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawResonanceFlashes() {
  // Inscription glow
  if (inscriptionGlow > 0 && hero.praying) {
    const ix = bx(INSCRIPTION_ZONE.x + INSCRIPTION_ZONE.w/2);
    const iy = by(INSCRIPTION_ZONE.y + INSCRIPTION_ZONE.h/2);
    const chargeRatio = inscriptionCharge / 5;
    const glowClamped = Math.min(inscriptionGlow, 1.0);
    ctx.save();
    ctx.globalAlpha = glowClamped * (0.5 + chargeRatio * 0.5) * (inscriptionCharge>=5?1.8:1);
    const ig = ctx.createRadialGradient(ix, iy, 0, ix, iy, bw(80 + chargeRatio*60));
    ig.addColorStop(0, `rgba(255,220,60,0.9)`);
    ig.addColorStop(0.4, `rgba(255,180,0,0.4)`);
    ig.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(ix, iy, bw(80 + chargeRatio*60), 0, Math.PI*2); ctx.fill();
    // Charge dots
    for (let i=0; i<inscriptionCharge; i++) {
      const da = (i/5)*Math.PI*2 - Math.PI/2;
      const dx = ix + Math.cos(da)*bw(30), dy = iy + Math.sin(da)*bh(20);
      ctx.globalAlpha = inscriptionGlow * 0.9;
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(dx-3, dy-3, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dx-1, dy-1, 2, 2);
    }
    ctx.restore();
    inscriptionGlow = Math.max(0, inscriptionGlow - 0.012);
  }

  for (let i = resonanceFlashes.length-1; i >= 0; i--) {
    const f = resonanceFlashes[i];
    const t = f.age / f.life;
    const alpha = t < 0.3 ? t/0.3 : 1-t;
    const r = bw(30 + t*120);
    const fx = bx(f.x), fy = by(f.y);
    // Ring
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 3 * (1-t) + 1;
    ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI*2); ctx.stroke();
    // Second ring
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(fx, fy, r*0.6, 0, Math.PI*2); ctx.stroke();
    // Floating chars
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(bw(20 + t*30))}px monospace`;
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'center';
    ctx.fillText('ธ', fx + Math.cos(t*Math.PI*4)*r*0.5, fy - r*0.3 - t*bh(40));
    ctx.fillText('✦', fx - Math.cos(t*Math.PI*3)*r*0.4, fy + r*0.2 - t*bh(30));
    ctx.textAlign = 'left';
    ctx.restore();
    f.age++;
    if (f.age >= f.life) resonanceFlashes.splice(i, 1);
  }
}

// Inscription zone — only in meditation
const INSCRIPTION_ZONE = {x:700, y:760, w:180, h:110};  // bigger, on pedestal
let scene3Unlocked = false;

function inscriptionHit(cx, cy) {
  return hero.praying &&
    cx >= bx(INSCRIPTION_ZONE.x) && cx <= bx(INSCRIPTION_ZONE.x) + bw(INSCRIPTION_ZONE.w) &&
    cy >= by(INSCRIPTION_ZONE.y) && cy <= by(INSCRIPTION_ZONE.y) + bh(INSCRIPTION_ZONE.h);
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
  // Cat burying animation timer
  if(catBurying){ catBuryTimer++; if(catBuryTimer>180){catBurying=false;dirtReady=true;showMsg('Кот закончил закапывать. Осталась кучка земли.');} }
  pSyms.forEach(s=>{s.vx+=(s.ax||0);s.vx*=0.96;s.x+=s.vx;s.vy*=0.998;s.y+=s.vy;s.age++;});
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
  drawMeditationLayer();
  drawResonanceFlashes();
  pCtx.clearRect(0,0,W,H);
  pSyms.forEach(s=>{
    const p=s.age/s.life;
    const a=p<0.12?p/0.12:p>0.65?(1-p)/0.35:1;
    const sz=s.startSize+(s.endSize-s.startSize)*p;
    pCtx.save();
    pCtx.globalAlpha=Math.max(0,a);
    pCtx.font=`bold ${Math.round(sz)}px monospace`;
    pCtx.fillStyle=s.col;
    pCtx.translate(s.x,s.y);
    pCtx.rotate(s.rotV*s.age*0.3);
    pCtx.fillText(s.ch,0,0);
    pCtx.restore();
  });
  // Draw dragged symbol on top of everything
  if(draggedSym) drawDraggedSym();
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
  if(e.key==='Escape'){closeBuddha();closeScene2();closeScene3();closeScene4();if(hero.praying)standUp();selectedSlot=-1;renderHotbar();updateItemCursor();draggedSym=null;}
});
document.addEventListener('keyup',e=>{
  if(LEFT_K.has(e.key)){keys['l']=false;if(!keys['r'])hero.idle=true;}
  if(RIGHT_K.has(e.key)){keys['r']=false;if(!keys['l'])hero.idle=true;}
});

// ── MAIN CANVAS ───────────────────────────────────────────────────────────────
gc.addEventListener('mousemove',e=>{
  if(activeScreen!=='main')return;
  const r=gc.getBoundingClientRect();
  const cx=e.clientX-r.left, cy=e.clientY-r.top;
  dragX=cx; dragY=cy;
  const zone=hitZone(cx,cy);
  if(hero.praying){
    if(draggedSym){
      gc.style.cursor=inscHitCanvas(cx,cy)?'crosshair':'grabbing';
    } else {
      const onOrb=hitMeditationOrb(cx,cy);
      const onSym=inscriptionCharge<5&&pSyms.some(s=>symHit(cx,cy,s));
      const onInsc=inscHitCanvas(cx,cy);
      gc.style.cursor=(onOrb||onSym||onInsc)?'pointer':'default';
    }
    return;
  }
  if(selectedSlot>=0){
    const interactZones=['cat','monk','bush','water','statue','tree'];
    gc.style.cursor=interactZones.includes(zone)?'pointer':'default';
  } else {
    // Bush: no pointer after both items taken
    const bushDone = stickPickedUp && bushBreadPickedUp;
    const dirtGone = dirtPickedUp || (!dirtReady && !catBurying);
    const noPointer = (zone==='bush'&&bushDone) || (zone==='dirt'&&dirtGone);
    gc.style.cursor=(zone && !noPointer)?'pointer':'default';
  }
});
function onMainTap(cx,cy){
  if(activeScreen!=='main')return;

  // MEDITATION MODE — different behaviour
  if(hero.praying){
    // Collect orb
    const orb=hitMeditationOrb(cx,cy);
    if(orb){collectOrb(orb);return;}
    // In meditation, tap without drag: orbs and zone messages only
    // Symbol drag is handled by mousedown/mouseup
    if(inscHitCanvas(cx,cy)) { openScene4(); return; }
    const orb2=hitMeditationOrb(cx,cy);
    if(orb2){collectOrb(orb2);return;}
    const zone=hitZone(cx,cy);
    if(zone){
      const msg=getMeditateMsg(zone);
      if(msg){showMsg(msg,3000);return;}
    }
    return;
  }

  const zone=hitZone(cx,cy);
  const sel=getSelectedItem();

  // Item × element interaction takes priority
  if(sel && zone){
    const response=itemOnZone(sel.id, zone);
    if(response){showMsg(response);return;}
  }

  if(zone==='dirt' && dirtReady && !dirtPickedUp){
    if(selectedSlot>=0){showMsg('Руки заняты.');return;}
    dirtPickedUp=true; dirtReady=false;
    addItem({id:'dirt',name:'земля',icon:'🫧',label:'земля',
      description:'Свежая земля. Кот постарался.'});
    showMsg('Ты подобрал горстку земли.');
    return;
  }
  if(zone==='bush') {pickUpStick();return;}
  if(zone==='cat')  {showMsg(catMsg());return;}
  if(zone==='monk') {showMsg(monkMsg());return;}

  // Block scene transitions when item selected
  if(sel){
    if(!hero.praying){hero.targetX=Math.max(20,Math.min(BG_W-HERO_WALK_W-20,ibx(cx)-HERO_WALK_W/2));hero.idle=false;}
    return;
  }
  if(zone==='statue'){openBuddha();return;}
  if(zone==='tree')  {openScene2();return;}
  if(!hero.praying){hero.targetX=Math.max(20,Math.min(BG_W-HERO_WALK_W-20,ibx(cx)-HERO_WALK_W/2));hero.idle=false;}
}
gc.addEventListener('click',e=>{const r=gc.getBoundingClientRect();onMainTap(e.clientX-r.left,e.clientY-r.top);});

// ── SYMBOL DRAG — hold LMB to grab symbol, release on inscription ─────────────
gc.addEventListener('mousedown',e=>{
  if(activeScreen!=='main'||!hero.praying||inscriptionCharge>=5)return;
  const r=gc.getBoundingClientRect();
  const cx=e.clientX-r.left,cy=e.clientY-r.top;
  const idx=pSyms.findIndex(s=>symHit(cx,cy,s));
  if(idx>=0){
    e.preventDefault();
    draggedSym=pSyms[idx];
    pSyms.splice(idx,1);
    dragX=cx;dragY=cy;
    gc.style.cursor='grabbing';
  }
});
gc.addEventListener('mouseup',e=>{
  if(activeScreen!=='main'||!hero.praying||!draggedSym)return;
  const r=gc.getBoundingClientRect();
  const cx=e.clientX-r.left,cy=e.clientY-r.top;
  if(inscHitCanvas(cx,cy)){
    if(inscriptionCharge<5) deliverSymbol();
    else { draggedSym=null; openScene4(); }
  } else {
    draggedSym=null;
  }
  gc.style.cursor='default';
});
gc.addEventListener('mouseleave',()=>{
  if(draggedSym){draggedSym=null;gc.style.cursor='default';}
});
gc.addEventListener('touchmove',e=>{
  if(activeScreen!=='main'||!hero.praying)return;
  e.preventDefault();
  if(!e.touches.length)return;
  const r=gc.getBoundingClientRect();
  dragX=e.touches[0].clientX-r.left;
  dragY=e.touches[0].clientY-r.top;
},{passive:false});
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

const ROCKS = [
  {fx:0.04, fy:0.75, fw:0.18, fh:0.20, name:'rock1'},  // left rock — lower
  {fx:0.44, fy:0.62, fw:0.14, fh:0.16, name:'rock2'},  // center rock
  {fx:0.63, fy:0.60, fw:0.18, fh:0.20, name:'rock3'},  // right rock — wider
];
const rockStates = {rock1:false, rock2:false, rock3:false};
function getRockRect(r){ return {x:r.fx*s2W,y:r.fy*s2H,w:r.fw*s2W,h:r.fh*s2H}; }
function hitRock(cx,cy){ return ROCKS.find(r=>{ const rr=getRockRect(r); return cx>=rr.x&&cx<=rr.x+rr.w&&cy>=rr.y&&cy<=rr.y+rr.h; })||null; }

s2Canvas.addEventListener('mousemove',e=>{
  const r=s2Canvas.getBoundingClientRect();
  const cx=e.clientX-r.left,cy=e.clientY-r.top;
  const rock=hitRock(cx,cy);
  const sel=getSelectedItem();
  const canInteract=bottleHit(cx,cy)||rock;
  s2Canvas.style.cursor=canInteract?'pointer':'default';
});
function onS2Tap(cx,cy){
  if(activeScreen!=='scene2')return;
  const sel=getSelectedItem();
  // Rock hit
  const rock=hitRock(cx,cy);
  if(rock){
    if(sel){
      const r=itemOnZone(sel.id, rock.name);
      if(r){showS2Msg(r);}
    } else {
      // No item — show generic rock text
      const n=getInteractCount('none',rock.name);
      bumpInteract('none',rock.name);
      const texts=['Холодный камень.','Тяжёлый.','Не двигается.'];
      showS2Msg(texts[n%3]);
    }
    return;
  }
  // Bottle
  if(bottleHit(cx,cy)){
    if(sel){
      const r=itemOnZone(sel.id,'bottle');
      if(r){showS2Msg(r);return;}
      return;
    }
    pickUpJar();return;
  }
}
s2Canvas.addEventListener('click',e=>{const r=s2Canvas.getBoundingClientRect();onS2Tap(e.clientX-r.left,e.clientY-r.top);});
s2Canvas.addEventListener('touchend',e=>{e.preventDefault();if(!e.changedTouches.length)return;const r=s2Canvas.getBoundingClientRect();onS2Tap(e.changedTouches[0].clientX-r.left,e.changedTouches[0].clientY-r.top);},{passive:false});
function showS2Msg(text,dur=2800){s2MsgEl.textContent=text;s2MsgEl.style.display='block';setTimeout(()=>s2MsgEl.style.display='none',dur);}
function pickUpJar(){
  if(jarPickedUp)return;
  if(selectedSlot>=0){showS2Msg('Руки заняты.');return;}
  jarPickedUp=true;
  addItem({id:'jar',name:'банка',icon:'🫙',label:'банка',caught:0,glowing:false,description:'Пустая стеклянная банка. Поймай в неё что-нибудь.'});
  updateItemCursor();
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


// ── FIREFLY DIALOG SCENE ───────────────────────────────────────────────────────
let earUsed = false;        // stick used on ear
let dialogActive = false;
let dialogStep = 0;
let durianReady = false;
let durianPickedUp = false;

const DIALOG = [
  // block 1
  {s:'А', t:'Если дерево падает в лесу и никто не слышит — это карма?'},
  {s:'Б', t:'Это физика.'},
  {s:'А', t:'А карма?'},
  {s:'Б', t:'Карма — это когда ты был тем деревом в прошлой жизни.'},
  {s:'А', t:'И упал?'},
  {s:'Б', t:'И никто не слышал.'},
  {s:'А', t:'Грустно.'},
  {s:'Б', t:'Зато тихо.'},
  // block 2
  {s:'А', t:'Я думал: если всё иллюзия — этот рис тоже иллюзия?'},
  {s:'Б', t:'Попробуй не есть.'},
  {s:'А', t:'*(пауза)* Нет, буду есть.'},
  {s:'Б', t:'Вот и ответ.'},
  // block 3
  {s:'А', t:'Чего ты хочешь?'},
  {s:'Б', t:'Ничего.'},
  {s:'А', t:'Это нирвана?'},
  {s:'Б', t:'Нет, я просто наелся.'},
  // block 4
  {s:'А', t:'Есть теория: мы живём снова и снова, пока не научимся.'},
  {s:'Б', t:'Чему?'},
  {s:'А', t:'Не знаю. Чему-то важному.'},
  {s:'Б', t:'И сколько жизней уже?'},
  {s:'А', t:'Столько, что мы всё ещё светлячки в ухе Будды.'},
  {s:'Б', t:'*(долгая пауза)* Может, урок простой. Мы просто не смотрим туда.'},
  {s:'А', t:'Я смотрю в миску. Вполне себе красиво.'},
  // block 5
  {s:'А', t:'Смерть — это дверь.'},
  {s:'Б', t:'Куда?'},
  {s:'А', t:'На другую сторону.'},
  {s:'Б', t:'Там есть рис с фруктами?'},
  {s:'А', t:'Не знаю.'},
  {s:'Б', t:'Тогда зачем торопиться.'},
  {s:'А', t:'Ты не торопишься.'},
  {s:'Б', t:'Именно. Я наслаждаюсь процессом.'},
  {s:'А', t:'Это буддизм?'},
  {s:'Б', t:'Это рис. Но иногда разницы нет.'},
  // ending
  {s:'', t:'*(Встают одновременно. Смотрят на миску.)*'},
  {s:'А', t:'Осталось немного.'},
  {s:'Б', t:'Всегда остаётся немного.'},
  {s:'А', t:'Это метафора?'},
  {s:'Б', t:'Нет. Просто не доели.'},
  {s:'', t:'*(Убегают. Миска остаётся.)*'},
  {s:'', t:'В ухе тихо. На столе — почти пустая миска с дурианом. Запах странный.', last:true},
];

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

// Speech bubbles — appear near caught firefly, float up and fade
const bubbles = [];
const bubbleMsgs = [
  'ой', 'держись', 'есть!', 'сюда',
  'попался', 'тихо', 'ещё один', 'лети-лети',
  'не улетай', '...'
];
let bubbleIdx = 0;
function spawnBubble(x, y) {
  const msg = bubbleMsgs[Math.min(bubbleIdx, bubbleMsgs.length-1)];
  bubbleIdx++;
  bubbles.push({ x, y, msg, age:0, life:70 });
}
function drawBubbles() {
  bubbles.forEach(b => {
    const t = b.age / b.life;
    const alpha = t < 0.15 ? t/0.15 : t > 0.65 ? 1-(t-0.65)/0.35 : 1;
    const yOff = -t * 38; // floats up
    bCtx.save();
    bCtx.globalAlpha = alpha;
    bCtx.font = 'bold 13px monospace';
    const tw = bCtx.measureText(b.msg).width;
    const bx2 = b.x - tw/2, by2 = b.y + yOff - 28;
    const pad = 7;
    // Bubble background
    bCtx.fillStyle = 'rgba(0,0,0,0.72)';
    bCtx.beginPath();
    bCtx.roundRect(bx2-pad, by2-16, tw+pad*2, 22, 4);
    bCtx.fill();
    // Bubble border
    bCtx.strokeStyle = 'rgba(240,192,64,0.8)';
    bCtx.lineWidth = 1;
    bCtx.stroke();
    // Tail
    bCtx.fillStyle = 'rgba(0,0,0,0.72)';
    bCtx.beginPath();
    bCtx.moveTo(b.x-4, by2+6);
    bCtx.lineTo(b.x+4, by2+6);
    bCtx.lineTo(b.x, by2+14);
    bCtx.fill();
    // Text
    bCtx.fillStyle = '#f0c040';
    bCtx.fillText(b.msg, bx2, by2);
    bCtx.restore();
    b.age++;
  });
  for(let i=bubbles.length-1;i>=0;i--){if(bubbles[i].age>=bubbles[i].life)bubbles.splice(i,1);}
}

function earHit(cx,cy){ return !earUsed&&cx>bW*0.72&&cx<bW*0.92&&cy>bH*0.38&&cy<bH*0.65; }
function isDurianClickable(cx,cy){ return durianReady&&!durianPickedUp&&cx>bW*0.38&&cx<bW*0.62&&cy>bH*0.38&&cy<bH*0.52; }
bCanvas.addEventListener('mousemove',e=>{
  if(wishPlaying||dialogActive){bCanvas.style.cursor='default';return;}
  const sel=getSelectedItem();
  const r=bCanvas.getBoundingClientRect(),cx=e.clientX-r.left,cy=e.clientY-r.top;
  if(earHit(cx,cy)&&sel&&sel.id==='glowstick'){bCanvas.style.cursor='pointer';return;}
  if(isDurianClickable(cx,cy)&&!sel){bCanvas.style.cursor='pointer';return;}
  if(!sel||sel.id!=='jar'||sel.released){bCanvas.style.cursor='default';return;}
  bCanvas.style.cursor=bFlies.some(f=>f.alive&&Math.sqrt((f.x-cx)**2+(f.y-cy)**2)<f.sz*5+14)?'pointer':'default';
});

function durianHit(cx,cy){
  // Durian is on table in center of screen
  return durianReady&&!durianPickedUp&&
    cx>bW*0.38&&cx<bW*0.62&&cy>bH*0.38&&cy<bH*0.52;
}
function onBuddhaTap(cx,cy){
  if(activeScreen!=='buddha'||wishPlaying||dialogActive)return;
  const sel=getSelectedItem();
  // Glowstick on ear → start dialog
  if(earHit(cx,cy)&&sel&&sel.id==='glowstick'){
    earUsed=true;
    startFireflyDialog();
    return;
  }
  // Pick up durian
  if(durianHit(cx,cy)&&!sel){
    durianPickedUp=true; durianReady=false;
    addItem({id:'durian',name:'дуриан',icon:'🍛',label:'дуриан',
      description:'Рис с кусочками дуриана. Запах невозможный. Кот, наверное, оценит.'});
    showBMsg('Ты взял миску. Запах странный, но терпимо.');
    return;
  }
  if(!sel||sel.id!=='jar')return;
  const jar=sel;
  if(jar.released)return; // already released once
  for(const f of bFlies){
    if(!f.alive)continue;
    if(Math.sqrt((f.x-cx)**2+(f.y-cy)**2)<f.sz*5+14){
      f.alive=false;
      jar.caught=(jar.caught||0)+1;
      spawnBubble(f.x, f.y);
      renderHotbar();
      // Narrative messages — irony → nostalgia → wish
      const catchMsgs = [
        'В детстве это было важно. Не помню почему.',
        'Помню только — темно, трава тёплая, и очень надо поймать.',
        'Сейчас тоже ловлю. Зачем — примерно так же непонятно.',
        'Как и всё, что делаем.',
        'Вот они в банке. Насколько им плохо прямо сейчас?',
        'Если страдают — значит привязаны.',
        'Без боли не было бы облегчения. Без клетки — свободы.',
        'Может, я делаю им одолжение. Может, это и есть буддизм.',
        'Или я просто оправдываю то что поймал их банкой.',
        null
      ];
      if(jar.caught<10){
        const msg=catchMsgs[jar.caught-1];
        if(msg)showBMsg(msg, 3200);
      }
      if(jar.caught>=10){
        showBMsg('Ладно. Летите. Не знаю кому из нас это нужнее.',3200);
        // Get hotbar slot position for animation origin
        const jarSlotEl=document.querySelector('#hotbar .hotbar-slot.selected');
        const jarRect=jarSlotEl?jarSlotEl.getBoundingClientRect():null;
        setTimeout(()=>startWishAnim(jarRect,()=>{
          jar.glowing=true;
          jar.released=true;
          jar.icon='🫙';
          jar.caught=0;
          jar.description='Светляковая жижка. Внутри мерцает тихий свет — след от десяти светлячков.';
          renderHotbar();
          updateItemCursor();
          showBMsg('Они улетели. В банке осталось немного их света.');
        }),2400);
      }
      return;
    }
  }
}
bCanvas.addEventListener('click',e=>{const r=bCanvas.getBoundingClientRect();onBuddhaTap(e.clientX-r.left,e.clientY-r.top);});
bCanvas.addEventListener('touchend',e=>{e.preventDefault();if(!e.changedTouches.length)return;const r=bCanvas.getBoundingClientRect();onBuddhaTap(e.changedTouches[0].clientX-r.left,e.changedTouches[0].clientY-r.top);},{passive:false});


// ── SCENE 3 — FIRE FLOWER FIELD ───────────────────────────────────────────────
// Accessed via inscription on pedestal while meditating
// Procedurally drawn: Thai jungle, plumeria, palms, fire flower

function createScene3El() {
  if(document.getElementById('scene3')) return;
  const el = document.createElement('div');
  el.id = 'scene3';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:45;overflow:hidden;';

  const canvas = document.createElement('canvas');
  canvas.id = 'scene3-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:default;image-rendering:pixelated;';

  const back = document.createElement('button');
  back.id = 'scene3-back';
  back.className = 'back-btn';
  back.textContent = '← Назад';
  back.onclick = closeScene3;

  const msg = document.createElement('div');
  msg.id = 'scene3-msg';
  msg.style.cssText = 'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);border:1.5px solid #f0c040;color:#f0c040;font-family:monospace;font-size:14px;padding:12px 24px;border-radius:3px;text-align:center;max-width:75%;line-height:1.6;display:none;pointer-events:none;z-index:15;';

  el.appendChild(canvas);
  el.appendChild(back);
  el.appendChild(msg);
  document.getElementById('wrap').appendChild(el);
}

let s3W=0, s3H=0, s3AnimId=null, s3Tick=0;
let fireFlowerPicked=false;

function openScene3() {
  createScene3El();
  activeScreen='scene3';
  scene3Unlocked=true;
  const el=document.getElementById('scene3');
  el.style.display='block';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const r=el.getBoundingClientRect();
    s3W=document.getElementById('scene3-canvas').width=Math.round(r.width);
    s3H=document.getElementById('scene3-canvas').height=Math.round(r.height);
    if(!s3AnimId) animScene3();
  }));
}
function closeScene3() {
  activeScreen='main';
  const el=document.getElementById('scene3');
  if(el) el.style.display='none';
  if(s3AnimId){cancelAnimationFrame(s3AnimId);s3AnimId=null;}
}
window.closeScene3=closeScene3;

function drawScene3(c) {
  s3Tick++;
  const t=s3Tick;
  c.clearRect(0,0,s3W,s3H);

  // Sky gradient — dusk, warm
  const sky=c.createLinearGradient(0,0,0,s3H*0.55);
  sky.addColorStop(0,'#1a0a2e');
  sky.addColorStop(0.4,'#4a1060');
  sky.addColorStop(1,'#8b3a20');
  c.fillStyle=sky; c.fillRect(0,0,s3W,s3H*0.6);

  // Ground
  const gnd=c.createLinearGradient(0,s3H*0.55,0,s3H);
  gnd.addColorStop(0,'#1a3a10');
  gnd.addColorStop(1,'#0d2008');
  c.fillStyle=gnd; c.fillRect(0,s3H*0.55,s3W,s3H*0.45);

  // Stars
  for(let i=0;i<40;i++){
    const sx=(i*137.5)%s3W, sy=(i*97.3)%s3H*0.45;
    const sa=0.3+0.7*Math.abs(Math.sin(t*0.02+i));
    c.fillStyle=`rgba(255,255,220,${sa.toFixed(2)})`;
    c.fillRect(sx,sy,1+(i%2),1+(i%2));
  }

  // Palm silhouettes background
  [[s3W*0.05,s3H*0.55],[s3W*0.88,s3H*0.52],[s3W*0.7,s3H*0.58]].forEach(([px,py],pi)=>{
    c.fillStyle='rgba(5,15,5,0.9)';
    // Trunk
    c.fillRect(px-4,py-s3H*0.28,8,s3H*0.28);
    // Fronds
    for(let f=0;f<6;f++){
      const fa=(f/6)*Math.PI*2+(t*0.005*(pi%2?1:-1));
      const fx=px+Math.cos(fa)*s3H*0.12, fy=py-s3H*0.28+Math.sin(fa)*s3H*0.07;
      c.fillRect(fx-3,fy-2,s3H*0.10,3);
    }
  });

  // Plumeria flowers scattered
  const plumerias=[[s3W*0.15,s3H*0.62],[s3W*0.3,s3H*0.65],[s3W*0.55,s3H*0.60],[s3W*0.75,s3H*0.63],[s3W*0.9,s3H*0.61]];
  plumerias.forEach(([fx,fy],fi)=>{
    const sway=Math.sin(t*0.03+fi)*3;
    // Stem
    c.fillStyle='#2a5a18'; c.fillRect(fx-2,fy,4,s3H*0.12);
    // Petals — white/pink
    for(let p=0;p<5;p++){
      const pa=(p/5)*Math.PI*2+sway*0.05;
      const px2=fx+Math.cos(pa)*12, py2=fy-8+Math.sin(pa)*8;
      c.fillStyle=fi%2===0?'rgba(255,240,220,0.9)':'rgba(255,200,220,0.9)';
      c.fillRect(px2-4,py2-4,8,8);
      c.fillStyle='rgba(255,220,100,0.8)';
      c.fillRect(px2-1,py2-1,3,3);
    }
  });

  // Jungle foliage left/right
  for(let i=0;i<12;i++){
    const lx=(i%3)*s3W*0.06, ly=s3H*0.5+i*s3H*0.03;
    c.fillStyle=`rgba(${10+i*2},${40+i*4},${10+i*2},0.85)`;
    c.fillRect(lx,ly,s3W*0.08+i*4,s3H*0.08);
    const rx=s3W-(lx+s3W*0.08+i*4);
    c.fillRect(rx,ly,s3W*0.08+i*4,s3H*0.08);
  }

  // FIRE FLOWER — center, special, glowing
  if(!fireFlowerPicked){
    const ffx=s3W*0.5, ffy=s3H*0.58;
    const flicker=0.6+0.4*Math.abs(Math.sin(t*0.08));
    // Glow
    c.save();
    c.globalAlpha=0.4*flicker;
    const fg=c.createRadialGradient(ffx,ffy,0,ffx,ffy,80);
    fg.addColorStop(0,'rgba(255,140,0,0.9)');
    fg.addColorStop(0.5,'rgba(255,60,0,0.3)');
    fg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=fg; c.beginPath(); c.arc(ffx,ffy,80,0,Math.PI*2); c.fill();
    c.restore();
    // Stem
    c.fillStyle='#3a6a10'; c.fillRect(ffx-3,ffy,6,s3H*0.1);
    // Petals — fire colored
    for(let p=0;p<8;p++){
      const pa=(p/8)*Math.PI*2+t*0.01;
      const px2=ffx+Math.cos(pa)*18, py2=ffy-5+Math.sin(pa)*12;
      const heat=p%3;
      c.fillStyle=heat===0?`rgba(255,${80+flicker*60|0},0,0.95)`:
                  heat===1?`rgba(255,${180+flicker*40|0},0,0.9)`:'rgba(255,240,100,0.85)';
      c.fillRect(px2-5,py2-5,10,10);
    }
    // Center
    c.fillStyle=`rgba(255,255,200,${flicker.toFixed(2)})`;
    c.fillRect(ffx-4,ffy-4,8,8);
    c.fillStyle='rgba(255,255,255,0.9)';
    c.fillRect(ffx-2,ffy-2,4,4);
  }
}

function fireFlowerHit(cx,cy){
  return !fireFlowerPicked && Math.abs(cx-s3W*0.5)<40 && Math.abs(cy-s3H*0.58)<40;
}

function animScene3(){
  const canvas=document.getElementById('scene3-canvas');
  const c=canvas?canvas.getContext('2d'):null;
  if(!c||activeScreen!=='scene3'){s3AnimId=null;return;}
  drawScene3(c);
  s3AnimId=requestAnimationFrame(animScene3);
}

// Scene 3 canvas interactions
document.addEventListener('click',e=>{
  if(activeScreen!=='scene3')return;
  const canvas=document.getElementById('scene3-canvas');
  if(!canvas||!e.target.closest('#scene3'))return;
  const r=canvas.getBoundingClientRect();
  const cx=e.clientX-r.left, cy=e.clientY-r.top;
  if(fireFlowerHit(cx,cy)){
    fireFlowerPicked=true;
    addItem({id:'fireflower',name:'огненный цветок',icon:'🌺',label:'огнецвет',
      description:'Цветок, который светится изнутри. Тёплый на ощупь. Не горит.'});
    const msg=document.getElementById('scene3-msg');
    if(msg){msg.textContent='Ты сорвал огненный цветок. Он тёплый. Почти живой.';msg.style.display='block';setTimeout(()=>msg.style.display='none',2800);}
  }
});
document.addEventListener('mousemove',e=>{
  if(activeScreen!=='scene3')return;
  const canvas=document.getElementById('scene3-canvas');
  if(!canvas)return;
  const r=canvas.getBoundingClientRect();
  canvas.style.cursor=fireFlowerHit(e.clientX-r.left,e.clientY-r.top)?'pointer':'default';
});


// ── SCENE 4 — FLIGHT / AERIAL VIEW ───────────────────────────────────────────
function createScene4El() {
  if(document.getElementById('scene4')) return;
  const el = document.createElement('div');
  el.id = 'scene4';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:60;overflow:hidden;';

  // Background drawn procedurally on canvas

  const canvas = document.createElement('canvas');
  canvas.id = 'scene4-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:default;image-rendering:pixelated;';

  const back = document.createElement('button');
  back.id = 'scene4-back';
  back.className = 'back-btn';
  back.textContent = '← Назад';
  back.onclick = closeScene4;

  const msg = document.createElement('div');
  msg.id = 'scene4-msg';
  msg.style.cssText = 'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);border:1.5px solid #f0c040;color:#f0c040;font-family:monospace;font-size:14px;padding:12px 24px;border-radius:3px;text-align:center;max-width:75%;line-height:1.6;display:none;pointer-events:none;z-index:15;';

  el.appendChild(bg);
  el.appendChild(canvas);
  el.appendChild(back);
  el.appendChild(msg);
  document.getElementById('wrap').appendChild(el);
}

let s4AnimId=null, s4Tick=0;

function openScene4() {
  createScene4El(); // safe — checks internally
  activeScreen='scene4';
  scene4Unlocked=true;
  const el=document.getElementById('scene4');
  el.style.display='block';
  // Immediately set canvas size and draw first frame
  const canvas=document.getElementById('scene4-canvas');
  if(canvas){
    canvas.width=Math.round(el.offsetWidth)||window.innerWidth;
    canvas.height=Math.round(el.offsetHeight)||window.innerHeight;
    s4Tick=0;
    if(!s4AnimId) animScene4();
  }
  // Message
  const msg=document.getElementById('scene4-msg');
  if(msg){
    msg.textContent='Ты поднялся. Сверху всё выглядит иначе.';
    msg.style.display='block';
    setTimeout(()=>msg.style.display='none',3000);
  }
  // Resize canvas properly after layout
  requestAnimationFrame(()=>{
    if(!canvas) return;
    const r=el.getBoundingClientRect();
    if(r.width>0){canvas.width=Math.round(r.width);canvas.height=Math.round(r.height);}
  });
}
function closeScene4() {
  activeScreen='main';
  const el=document.getElementById('scene4');
  if(el) el.style.display='none';
  if(s4AnimId){cancelAnimationFrame(s4AnimId);s4AnimId=null;}
  // Reset so player can go back
}
window.closeScene4=closeScene4;

function drawScene4Bg(c, W4, H4, t) {
  // ── Sky — dark jungle canopy top-down ──────────────────────────
  const sky = c.createRadialGradient(W4*0.5,H4*0.5,H4*0.05, W4*0.5,H4*0.5,H4*0.75);
  sky.addColorStop(0, '#1a2e10');
  sky.addColorStop(0.5, '#0d1e08');
  sky.addColorStop(1, '#060e04');
  c.fillStyle=sky; c.fillRect(0,0,W4,H4);

  // ── Root system — radiating from center ───────────────────────
  const cx=W4*0.5, cy=H4*0.5;
  const rootAngles=[0,0.42,0.9,1.4,1.85,2.3,2.8,3.3,3.8,4.3,4.8,5.4];
  rootAngles.forEach((angle,ri)=>{
    const sway=Math.sin(t*0.008+ri*0.7)*0.04;
    const a=angle+sway;
    const len=H4*(0.38+ri%3*0.06);
    const thick=6+ri%4*3;
    c.save();
    c.strokeStyle=`rgba(${50+ri*3},${28+ri*2},${12},0.85)`;
    c.lineWidth=thick;
    c.lineCap='round';
    c.beginPath();
    c.moveTo(cx,cy);
    // Curved root path
    const mid1x=cx+Math.cos(a-0.15)*len*0.4+Math.sin(t*0.01+ri)*20;
    const mid1y=cy+Math.sin(a-0.15)*len*0.4+Math.cos(t*0.012+ri)*15;
    const mid2x=cx+Math.cos(a+0.1)*len*0.75;
    const mid2y=cy+Math.sin(a+0.1)*len*0.75;
    const ex=cx+Math.cos(a)*len, ey=cy+Math.sin(a)*len;
    c.bezierCurveTo(mid1x,mid1y,mid2x,mid2y,ex,ey);
    c.stroke();
    // Branch off each root
    if(ri%2===0){
      c.lineWidth=thick*0.5;
      c.strokeStyle=`rgba(${45+ri*2},${25+ri},10,0.7)`;
      c.beginPath();
      c.moveTo(mid2x,mid2y);
      const ba=a+(ri%2===0?0.5:-0.5);
      c.lineTo(mid2x+Math.cos(ba)*len*0.2, mid2y+Math.sin(ba)*len*0.2);
      c.stroke();
    }
    c.restore();
  });

  // ── Moss / foliage patches between roots ─────────────────────
  const patches=[
    [0.2,0.25],[0.75,0.2],[0.15,0.7],[0.8,0.72],
    [0.35,0.12],[0.65,0.85],[0.05,0.45],[0.92,0.5],
  ];
  patches.forEach(([px,py],pi)=>{
    const pw=W4*(0.08+pi%3*0.04), ph=H4*(0.06+pi%3*0.03);
    const pulse=0.6+0.4*Math.abs(Math.sin(t*0.015+pi));
    c.fillStyle=`rgba(${20+pi*3},${55+pi*4},${12+pi*2},${(0.7*pulse).toFixed(2)})`;
    c.fillRect(px*W4-pw/2, py*H4-ph/2, pw, ph);
    // Lighter top
    c.fillStyle=`rgba(${40+pi*4},${80+pi*5},${20+pi*3},${(0.4*pulse).toFixed(2)})`;
    c.fillRect(px*W4-pw/2, py*H4-ph/2, pw, ph*0.4);
  });

  // ── Buddha statue — center, top-down view ────────────────────
  const sr=H4*0.11; // statue radius
  // Stone platform
  c.fillStyle='rgba(160,145,115,0.95)';
  c.fillRect(cx-sr*1.1, cy-sr*1.1, sr*2.2, sr*2.2);
  // Platform shadow
  c.fillStyle='rgba(80,70,50,0.5)';
  c.fillRect(cx-sr*1.1, cy+sr*0.7, sr*2.2, sr*0.4);
  // Inner platform
  c.fillStyle='rgba(185,168,130,0.95)';
  c.fillRect(cx-sr*0.85, cy-sr*0.85, sr*1.7, sr*1.7);
  // Statue body (top-down: circular orange form)
  const statueGlow=0.7+0.3*Math.abs(Math.sin(t*0.02));
  c.save();
  c.globalAlpha=statueGlow;
  // Robe — concentric from above
  [[sr*0.72,'#c87820'],[sr*0.55,'#d4891a'],[sr*0.38,'#e09820'],[sr*0.22,'#f0b030']].forEach(([r2,col])=>{
    c.fillStyle=col;
    c.beginPath(); c.arc(cx,cy,r2,0,Math.PI*2); c.fill();
  });
  // Head
  c.fillStyle='#d4a060';
  c.beginPath(); c.arc(cx,cy-sr*0.15,sr*0.16,0,Math.PI*2); c.fill();
  c.fillStyle='#c89040';
  c.beginPath(); c.arc(cx,cy-sr*0.15,sr*0.10,0,Math.PI*2); c.fill();
  // Ushnisha (top knot)
  c.fillStyle='#b87820';
  c.beginPath(); c.arc(cx,cy-sr*0.15,sr*0.055,0,Math.PI*2); c.fill();
  c.restore();
  // Statue inner glow
  c.save();
  c.globalAlpha=0.25*statueGlow;
  const sg=c.createRadialGradient(cx,cy,0,cx,cy,sr*1.2);
  sg.addColorStop(0,'rgba(255,200,60,0.9)');
  sg.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=sg; c.beginPath(); c.arc(cx,cy,sr*1.2,0,Math.PI*2); c.fill();
  c.restore();

  // ── Water pool — bottom left (like in the photo) ──────────────
  c.save();
  const wx=W4*0.12, wy=H4*0.78, ww=W4*0.18, wh=H4*0.14;
  const waterShimmer=0.5+0.5*Math.abs(Math.sin(t*0.03));
  c.fillStyle=`rgba(60,90,130,${(0.75*waterShimmer).toFixed(2)})`;
  c.fillRect(wx,wy,ww,wh);
  c.fillStyle=`rgba(120,160,200,${(0.3*waterShimmer).toFixed(2)})`;
  c.fillRect(wx,wy,ww,wh*0.3);
  c.restore();

  // ── Floating fireflies ────────────────────────────────────────
  for(let i=0;i<25;i++){
    const fx=((i*173.7+t*0.25*(i%2?1:-0.7))%W4+W4)%W4;
    const fy=((i*97.3+t*0.18*(i%3?1:-0.5))%H4+H4)%H4;
    const fa=0.15+0.85*Math.abs(Math.sin(t*0.04+i*0.7));
    // Skip center area (statue)
    if(Math.abs(fx-cx)<sr*1.5&&Math.abs(fy-cy)<sr*1.5) return;
    c.fillStyle=`rgba(255,240,100,${fa.toFixed(2)})`;
    c.fillRect(fx-1,fy-1,3,3);
    c.fillStyle=`rgba(255,235,80,${(fa*0.2).toFixed(2)})`;
    c.fillRect(fx-3,fy-1,7,3);
  }
}

function animScene4() {
  if(activeScreen!=='scene4'){s4AnimId=null;return;}
  s4Tick++;
  const canvas=document.getElementById('scene4-canvas');
  if(!canvas){s4AnimId=null;return;}
  const c=canvas.getContext('2d');
  drawScene4Bg(c, canvas.width, canvas.height, s4Tick);
  s4AnimId=requestAnimationFrame(animScene4);
}

// Back button for scene4
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&activeScreen==='scene4') closeScene4();
});

// ── WISH ANIMATION — fireflies rise from jar to top of screen ───────────────────
function startWishAnim(jarRect, onDone){
  wishPlaying=true; bCanvas.style.pointerEvents='none'; wishCanvas.style.display='block';
  bFlies.forEach(f=>f.alive=false);

  const bRect=wishCanvas.getBoundingClientRect();
  let ox=bW*0.5, oy=bH*0.88;
  if(jarRect){
    ox=jarRect.left+jarRect.width/2-bRect.left;
    oy=jarRect.top+jarRect.height/2-bRect.top;
  }

  // 10 fireflies, emerge one by one from jar, travel all the way to top
  const flies=Array.from({length:10},(_,i)=>{
    const travelH = oy + 40; // full distance from jar to above top
    const baseSpeed = travelH / (260+Math.random()*80); // speed so they reach top in ~300 frames
    // Each has a unique horizontal destiny — spreads wide across screen
    const destX = bW*0.1 + Math.random()*bW*0.8;
    const colRoll=Math.random();
    const cr=colRoll<0.5?255:240+Math.floor(Math.random()*15);
    const cg=colRoll<0.5?220+Math.floor(Math.random()*30):200+Math.floor(Math.random()*50);
    const cb=colRoll<0.5?60+Math.floor(Math.random()*40):80+Math.floor(Math.random()*60);
    return{
      x:ox+(Math.random()-0.5)*10,
      y:oy,
      destX,
      baseSpeed,
      // Winding path: multiple sine waves layered
      wave1Freq:0.012+Math.random()*0.018,
      wave1Amp:18+Math.random()*28,
      wave1Ph:Math.random()*Math.PI*2,
      wave2Freq:0.025+Math.random()*0.025,
      wave2Amp:8+Math.random()*12,
      wave2Ph:Math.random()*Math.PI*2,
      flickPhase:Math.random()*Math.PI*2,
      flickSpeed:0.07+Math.random()*0.05,
      sz:5+Math.random()*4,
      age:0,
      delay:i*20,
      life:320+Math.random()*100,
      cr,cg,cb,
      // Trail: ring buffer of last N positions
      trail:[],
      trailLen:28,
    };
  });

  const dust=[];
  let af=0;

  (function aw(){
    af++;
    wCtx.clearRect(0,0,bW,bH);

    flies.forEach(f=>{
      if(af<f.delay) return;
      f.age++;
      const t=f.age/f.life;
      if(t>=1) return;

      // Position: lerp toward destX horizontally + winding sine waves
      const progress=t; // 0→1 as fly travels up
      const targetX=ox+(f.destX-ox)*progress;
      const windX=Math.sin(f.wave1Ph+f.age*f.wave1Freq)*f.wave1Amp*(1-progress*0.4)
                 +Math.sin(f.wave2Ph+f.age*f.wave2Freq)*f.wave2Amp;
      f.x=targetX+windX;
      f.y=oy-progress*progress*(oy+60); // eased upward

      // Store trail
      f.trail.push({x:f.x,y:f.y});
      if(f.trail.length>f.trailLen) f.trail.shift();

      f.flickPhase+=f.flickSpeed;
      const flicker=0.4+0.6*Math.abs(Math.sin(f.flickPhase));
      const alpha=t<0.08?t/0.08:t>0.85?1-(t-0.85)/0.15:1;
      const {cr,cg,cb,sz}=f;

      // Draw glowing trail
      for(let ti=0;ti<f.trail.length;ti++){
        const tt=ti/f.trail.length;
        const ta=tt*tt*alpha*0.55*flicker;
        const tsz=sz*(0.3+tt*0.7);
        wCtx.globalAlpha=ta;
        wCtx.fillStyle=`rgba(${cr},${cg},${cb},1)`;
        wCtx.fillRect(f.trail[ti].x-tsz/2,f.trail[ti].y-tsz/2,tsz,tsz);
        // Trail glow
        if(ti>f.trail.length*0.5){
          wCtx.globalAlpha=ta*0.3;
          wCtx.fillStyle=`rgba(${cr},${cg},100,0.8)`;
          wCtx.fillRect(f.trail[ti].x-tsz,f.trail[ti].y-tsz,tsz*2,tsz*2);
        }
        wCtx.globalAlpha=1;
      }

      // Soft glow halo around fly
      wCtx.save();
      wCtx.globalAlpha=alpha*flicker*0.45;
      const grad=wCtx.createRadialGradient(f.x,f.y,0,f.x,f.y,sz*4.5);
      grad.addColorStop(0,`rgba(${cr},${cg},${cb},1)`);
      grad.addColorStop(0.4,`rgba(${cr},${cg},100,0.35)`);
      grad.addColorStop(1,'rgba(0,0,0,0)');
      wCtx.fillStyle=grad;
      wCtx.beginPath();wCtx.arc(f.x,f.y,sz*4.5,0,Math.PI*2);wCtx.fill();
      wCtx.restore();

      // Core pixel
      wCtx.save();
      wCtx.globalAlpha=alpha*flicker;
      wCtx.fillStyle=`rgba(${cr},${cg},${cb},1)`;
      wCtx.fillRect(f.x-sz/2,f.y-sz/2,sz,sz);
      wCtx.fillStyle=`rgba(255,255,230,${(alpha*flicker*0.85).toFixed(2)})`;
      wCtx.fillRect(f.x-sz*0.22,f.y-sz*0.22,sz*0.44,sz*0.44);
      wCtx.restore();

      // Sparse dust from trail
      if(Math.random()<0.1 && t<0.9){
        dust.push({
          x:f.x+(Math.random()-0.5)*sz*1.5,
          y:f.y+(Math.random()-0.5)*sz*1.5,
          vx:(Math.random()-0.5)*0.5,
          vy:-(0.05+Math.random()*0.2),
          sz:0.8+Math.random()*1.8,
          age:0,life:35+Math.random()*25,
          cr,cg,cb,
        });
      }
    });

    // Dust
    for(let i=dust.length-1;i>=0;i--){
      const d=dust[i];d.x+=d.vx;d.y+=d.vy;d.age++;
      const dt=d.age/d.life;if(dt>=1){dust.splice(i,1);continue;}
      const da=(dt<0.25?dt/0.25:1-dt)*0.7;
      wCtx.globalAlpha=da;
      wCtx.fillStyle=`rgba(${d.cr},${d.cg},${d.cb},1)`;
      wCtx.fillRect(d.x-d.sz/2,d.y-d.sz/2,d.sz,d.sz);
      wCtx.globalAlpha=1;
    }

    const maxAge=Math.max(...flies.map(f=>f.delay+f.life));
    if(af<maxAge){
      requestAnimationFrame(aw);
    } else {
      setTimeout(()=>{
        wishCanvas.style.display='none';wCtx.clearRect(0,0,bW,bH);
        wishPlaying=false;bCanvas.style.pointerEvents='auto';
        bFlies=bFlies.map(f=>({...f,alive:true,x:60+Math.random()*(bW-120),y:40+Math.random()*(bH*0.75)}));
        if(onDone)onDone();
      },400);
    }
  })();
}


// ── FIREFLY DIALOG ─────────────────────────────────────────────────────────────
function startFireflyDialog(){
  dialogActive=true;
  dialogStep=0;
  bCanvas.style.pointerEvents='auto';
  // Create dialog overlay div
  let dlg=document.getElementById('fly-dialog');
  if(!dlg){
    dlg=document.createElement('div');
    dlg.id='fly-dialog';
    dlg.style.cssText=`
      position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;
      align-items:center;justify-content:flex-end;padding-bottom:90px;
      cursor:pointer;`;
    document.getElementById('buddha-screen').appendChild(dlg);
  }
  dlg.style.display='flex';
  advanceDialog();
  dlg.addEventListener('click', advanceDialog);
  dlg.addEventListener('touchend', e=>{e.preventDefault();advanceDialog();},{passive:false});
}

function advanceDialog(){
  const dlg=document.getElementById('fly-dialog');
  if(!dlg||!dialogActive)return;
  if(dialogStep>=DIALOG.length){
    // End dialog
    dialogActive=false;
    dlg.style.display='none';
    dlg.replaceWith(dlg.cloneNode(false)); // remove listeners
    // Remove glowstick — it lit the way in, stayed inside
    const gi=inventory.findIndex(i=>i&&i.id==='glowstick');
    if(gi>=0){inventory[gi]=null; if(selectedSlot===gi)selectedSlot=-1;}
    renderHotbar(); updateItemCursor();
    durianReady=true;
    showBMsg('Палка осталась там — она была нужна им, не тебе. На столе стоит миска. Запах странный.');
    // Draw durian on canvas
    drawDurianOnTable();
    return;
  }
  const line=DIALOG[dialogStep];
  dialogStep++;
  // Render line
  const isNarr=line.s==='';
  const isA=line.s==='А';
  const borderCol = isNarr ? 'rgba(240,192,64,0.4)' : '#f0c040';
  const textCol   = isNarr ? 'rgba(240,192,64,0.7)' : '#f0c040';
  const alignStr  = isNarr ? 'center' : 'left';
  const speakerCol = isA ? '#ffe066' : '#aaddff';
  const speakerHtml = line.s
    ? '<span style="color:'+speakerCol+';font-weight:bold;margin-right:8px">'+line.s+':</span>'
    : '';
  const hintHtml = line.last ? '' : '<div style="text-align:right;margin-top:8px;font-size:11px;opacity:0.5">нажми чтобы продолжить</div>';
  dlg.innerHTML =
    '<div style="background:rgba(0,0,0,0.88);border:1.5px solid '+borderCol+';border-radius:4px;padding:14px 22px;max-width:72%;font-family:monospace;font-size:15px;line-height:1.7;color:'+textCol+';text-align:'+alignStr+';">'+
      speakerHtml + line.t + hintHtml +
    '</div>'+
    '<canvas id="fly-canvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></canvas>';  // Draw two fireflies at table on the fly-canvas
  requestAnimationFrame(drawFlyTable);
}

let flyTableAnim=null;
function drawFlyTable(){
  const c=document.getElementById('fly-canvas');
  if(!c||!dialogActive)return;
  c.width=c.offsetWidth; c.height=c.offsetHeight;
  const cx=c.getContext('2d');
  const W=c.width,H=c.height;
  const t=Date.now()/1000;

  // Table — center of screen
  const tx=W*0.5,ty=H*0.45;
  // Table surface
  cx.fillStyle='rgba(60,35,15,0.85)';
  cx.fillRect(tx-90,ty,180,8);
  cx.fillRect(tx-80,ty,160,40);
  // Table legs
  cx.fillRect(tx-80,ty+40,10,30);
  cx.fillRect(tx+70,ty+40,10,30);

  // Bowl of rice
  cx.fillStyle='rgba(200,190,160,0.9)';
  cx.beginPath(); cx.ellipse(tx,ty-4,28,10,0,0,Math.PI*2); cx.fill();
  cx.fillStyle='rgba(230,220,190,0.95)';
  cx.beginPath(); cx.ellipse(tx,ty-6,20,7,0,0,Math.PI*2); cx.fill();
  // Rice dots
  for(let i=0;i<12;i++){
    const rx=tx-14+Math.cos(i*0.8+1)*12,ry=ty-6+Math.sin(i*1.1)*4;
    cx.fillStyle='rgba(255,250,235,0.9)';
    cx.fillRect(rx-1.5,ry-1,3,2);
  }
  // Fruit bits (durian chunks — yellowish)
  [[tx-8,ty-9],[tx+5,ty-11],[tx-2,ty-8]].forEach(([fx,fy])=>{
    cx.fillStyle='rgba(210,190,80,0.85)';
    cx.fillRect(fx-3,fy-3,6,6);
    cx.fillStyle='rgba(180,155,40,0.7)';
    cx.fillRect(fx-2,fy-2,4,4);
  });

  // Firefly А — left of table
  const fax=tx-55, fay=ty-22+Math.sin(t*1.1)*2;
  const fbx=tx+55, fby=ty-22+Math.sin(t*0.9+1)*2;
  [[fax,fay,'А'],[fbx,fby,'Б']].forEach(([fx,fy,label],idx)=>{
    const glow=0.5+0.5*Math.abs(Math.sin(t*2+idx));
    // Body glow
    cx.save();
    cx.globalAlpha=glow*0.4;
    const g=cx.createRadialGradient(fx,fy,0,fx,fy,18);
    g.addColorStop(0,'rgba(255,240,100,0.9)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=g; cx.beginPath(); cx.arc(fx,fy,18,0,Math.PI*2); cx.fill();
    cx.restore();
    // Core
    cx.fillStyle=`rgba(255,245,120,${glow.toFixed(2)})`;
    cx.fillRect(fx-4,fy-4,8,8);
    cx.fillStyle='rgba(255,255,220,0.9)';
    cx.fillRect(fx-2,fy-2,4,4);
    // Eyes
    cx.fillStyle='rgba(0,0,0,0.8)';
    if(idx===0){cx.fillRect(fx+2,fy-2,2,2);cx.fillRect(fx+2,fy+1,2,1);}
    else{cx.fillRect(fx-4,fy-2,2,2);cx.fillRect(fx-4,fy+1,2,1);}
    // Label
    cx.font='bold 10px monospace';
    cx.fillStyle='rgba(240,192,64,0.7)';
    cx.textAlign='center';
    cx.fillText(label,fx,fy-12);
    cx.textAlign='left';
  });

  if(dialogActive) flyTableAnim=requestAnimationFrame(drawFlyTable);
}

function drawDurianOnTable(){
  // Just show a message — durian appears as clickable item on buddha screen
  // handled via durianReady flag in onBuddhaTap
}

function animBuddha(){
  if(activeScreen!=='buddha')return;
  if(wishPlaying){requestAnimationFrame(animBuddha);return;}
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
