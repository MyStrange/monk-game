// scenes/scene2.js — корни / дерево

import { state }         from '../src/state.js';
import { showMsgIn, showLoading, hideLoading, showError, CURSOR_DEF, CURSOR_PTR } from '../src/utils.js';
import { leaveMain, resumeMain } from './main.js';
import { getSelectedItem, addItem, removeItem, makeItem, getItemSlot } from '../src/inventory.js';
import { getZoneMsg }    from '../src/zone-msgs.js';
import { renderHotbar }  from '../src/hotbar.js';
import { SaveManager }   from '../src/save.js';
import { AudioSystem }   from '../src/audio.js';
import { trackZoneClick, trackEmptyClick, trackSpotClick } from '../src/achievements.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('scene2');
S.jarPickedUp  = S.jarPickedUp  ?? false;
S.rockStates   = S.rockStates   ?? { rock1: false, rock2: false, rock3: false };

// ── DOM ────────────────────────────────────────────────────────────────────
let el, canvas, ctx, msgEl;
let W = 0, H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── BG image dims ─────────────────────────────────────────────────────────
const BG_W = 1376, BG_H = 768;

// ── Bottle (jar) sprite ────────────────────────────────────────────────────
const bottleImg = new Image();
bottleImg.src = 'assets/items/bottle.png';

// Bottle position in BG coords — уменьшен до ~60% от нативных 133×165, аспект сохранён
// native 133×165 (0.806) → draw 80×99 (тот же аспект), аккуратно вписан в корни
const BOT_PX = 290, BOT_PY = 340, BOT_PW = 80, BOT_PH = 99;

// ── Rock sprites (glowing symbols, shown when activated) ──────────────────
const rock1Img = new Image(); rock1Img.src = 'assets/items/rock1.png';
const rock2Img = new Image(); rock2Img.src = 'assets/items/rock2.png';
const rock3Img = new Image(); rock3Img.src = 'assets/items/rock3.png';

// Пиксельно-точное позиционирование по реальным каменным плитам в tree.png:
//   Stone 1 (BL)  — TL=(281,619) 238×144 ratio 1.65  → rock1 (sprite 1.39)
//   Stone 3 (MR)  — TL=(855,378) 174×97  ratio 1.79  → rock2 (sprite 1.31)
//   Stone 2 (BR)  — TL=(1233,499) 138×160 ratio 0.86 → rock3 (sprite 0.79)
// Спрайты вписываем по ширине камня, сохраняя нативный аспект:
//   rock1: 369×265 → w=238, h=238/1.39 ≈ 171   (fw 0.173, fh 0.223)
//   rock2: 305×233 → w=174, h=174/1.31 ≈ 133   (fw 0.126, fh 0.173)
//   rock3: 272×345 → w=138, h=138/0.79 ≈ 175   (fw 0.100, fh 0.228)
// Центруем на центре каменной плиты.
const ROCK_DRAW = {
  rock1: { fx: 281/BG_W,        fy: (619 + 144/2 - 171/2)/BG_H, fw: 238/BG_W, fh: 171/BG_H },
  rock2: { fx: 855/BG_W,        fy: (378 +  97/2 - 133/2)/BG_H, fw: 174/BG_W, fh: 133/BG_H },
  rock3: { fx: (1233 + 138/2 - 138/2)/BG_W, fy: (499 + 160/2 - 175/2)/BG_H, fw: 138/BG_W, fh: 175/BG_H },
};

// ── Zones (click-areas совпадают с DRAW, чтобы тапать точно по камню) ────
const ZONES = {
  rock1:  ROCK_DRAW.rock1,
  rock2:  ROCK_DRAW.rock2,
  rock3:  ROCK_DRAW.rock3,
  bottle: { fx: BOT_PX / BG_W, fy: BOT_PY / BG_H,
            fw: BOT_PW / BG_W, fh: BOT_PH / BG_H },
};

function hitZone(cx, cy) {
  for (const [name, z] of Object.entries(ZONES)) {
    if (name === 'bottle' && S.jarPickedUp) continue;
    if (cx >= z.fx * W && cx < (z.fx + z.fw) * W &&
        cy >= z.fy * H && cy < (z.fy + z.fh) * H) return name;
  }
  return null;
}

// ── Rock click counters ────────────────────────────────────────────────────
const rockClicks = { rock1: 0, rock2: 0, rock3: 0 };
const BARE_ROCK_MSGS = ['Холодный камень.', 'Тяжёлый.', 'Не двигается.'];

// ── Jar pickup ─────────────────────────────────────────────────────────────
function pickUpJar() {
  if (S.jarPickedUp) return;
  if (state.selectedSlot >= 0) { showMsg('Руки заняты.'); return; }
  S.jarPickedUp = true;
  addItem(makeItem('jar'));
  AudioSystem.playPickup();
  renderHotbar();
  showMsg('Ты подобрал стеклянную банку. Она пустая.');
}

// ── interactItem ───────────────────────────────────────────────────────────
function interactItem(itemId, zone) {
  const item = getSelectedItem();
  const isRock = zone === 'rock1' || zone === 'rock2' || zone === 'rock3';

  // jar (empty) on rock
  if (itemId === 'jar' && isRock && !item.glowing && !item.released && !item.hasWater && item.caught === 0) {
    const msgs = ['Банка ещё пригодится. Не надо её разбивать.', 'Точно не сюда.', 'Пустая банка камню не поможет.'];
    showMsg(msgs[rockClicks[zone] % 3]); rockClicks[zone]++;
    return;
  }

  // jar_open or jar with hasWater → rock
  if ((itemId === 'jar_open' || (itemId === 'jar' && item.hasWater)) && isRock) {
    S.rockStates[zone] = true;
    const slot = state.inventory.findIndex(i => i?.id === itemId && i === item);
    removeItem(slot >= 0 ? slot : getItemSlot(itemId));
    renderHotbar();
    showMsg('Вода впитывается в камень. Банка трескается от холода — и рассыпается.');
    return;
  }

  // dirt on rock
  if (itemId === 'dirt' && isRock) {
    S.rockStates[zone] = true;
    removeItem(getItemSlot('dirt'));
    renderHotbar();
    showMsg('Земля ложится на камень. Что-то меняется.');
    return;
  }

  // glowstick on rock
  if (itemId === 'glowstick' && isRock) {
    if (S.rockStates[zone]) { showMsg('Этот камень уже впитал свет.'); return; }
    S.rockStates[zone] = true;
    // Свет уходит в камень — палка становится обычной
    const gsSlot = state.inventory.findIndex(i => i === item);
    state.inventory[gsSlot >= 0 ? gsSlot : getItemSlot('glowstick')] = makeItem('stick');
    state.selectedSlot = -1;
    renderHotbar();
    showMsg('Свет из палки переходит в камень. Камень начинает тихо светиться.');
    return;
  }

  // stick on bottle zone (light from jar)
  if (itemId === 'stick' && zone === 'bottle') {
    const jarSlot = state.inventory.findIndex(i => i?.id === 'jar' || i?.id === 'jar_open');
    if (jarSlot < 0) { showMsg('Тут нечем светить.'); return; }
    const jar = state.inventory[jarSlot];
    if (!jar.glowing && !jar.released && jar.caught === 0 && !jar.hasWater) {
      showMsg('В банке ничего нет. Нечем светить.'); return;
    }
    const stickSlot = getItemSlot('stick');
    state.inventory[stickSlot] = makeItem('glowstick');
    state.inventory[jarSlot]   = makeItem('jar_open');
    state.selectedSlot = -1;
    renderHotbar();
    showMsg('Палка коснулась банки — и впитала весь свет. Банка снова пустая.');
    return;
  }

  // Zone flavor
  const msg = getZoneMsg(itemId, zone, item);
  if (msg) showMsg(msg);
}

// ── zoneClick ──────────────────────────────────────────────────────────────
function zoneClick(zone) {
  trackZoneClick(zone);

  if (zone === 'bottle') { pickUpJar(); return; }

  if (zone === 'rock1' || zone === 'rock2' || zone === 'rock3') {
    rockClicks[zone] = (rockClicks[zone] ?? 0) + 1;
    showMsg(BARE_ROCK_MSGS[rockClicks[zone] % 3]);
    return;
  }
}

// ── onTap ──────────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== 'scene2') return;
  trackSpotClick(cx, cy, 'scene2');
  const item = getSelectedItem();
  const zone = hitZone(cx, cy);

  if (item && zone) { interactItem(item.id, zone); return; }
  if (zone)         { zoneClick(zone); return; }
  trackEmptyClick();
}

// ── Keyboard ───────────────────────────────────────────────────────────────
function _onKey(e) {
  if (state.activeScreen !== 'scene2') return;
  if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') pickUpJar();
}

// ── Animation ──────────────────────────────────────────────────────────────
let animId = null;

function animate() {
  if (state.activeScreen !== 'scene2') { animId = null; return; }
  ctx.clearRect(0, 0, W, H);

  // Bottle sprite
  if (!S.jarPickedUp && bottleImg.complete && bottleImg.naturalWidth) {
    const bx = BOT_PX / BG_W * W;
    const by = BOT_PY / BG_H * H;
    const bw = BOT_PW / BG_W * W;
    const bh = BOT_PH / BG_H * H;
    ctx.drawImage(bottleImg, bx, by, bw, bh);
  }

  // Rock sprites (когда активированы) — светящиеся символы на плитах
  const rockImgs = { rock1: rock1Img, rock2: rock2Img, rock3: rock3Img };
  for (const [rock, done] of Object.entries(S.rockStates)) {
    if (!done) continue;
    const img = rockImgs[rock];
    if (!(img.complete && img.naturalWidth)) continue;
    const d = ROCK_DRAW[rock];
    // мягкое мерцание золотого свечения
    const pulse = 0.75 + 0.25 * Math.sin(Date.now() * 0.003 + rock.length);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.drawImage(img, d.fx * W, d.fy * H, d.fw * W, d.fh * H);
    ctx.restore();
  }

  animId = requestAnimationFrame(animate);
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('scene2')) return;

  el = document.createElement('div');
  el.id = 'scene2';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;';

  const bg = document.createElement('img');
  bg.src = 'assets/bg/tree.png';
  bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';

  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:default;';
  ctx = canvas.getContext('2d');

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = closeSceneScene2;
  back.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); closeSceneScene2(); }, { passive: false });

  msgEl = document.createElement('div');
  msgEl.className = 'scene-msg';

  el.appendChild(bg); el.appendChild(canvas);
  el.appendChild(back); el.appendChild(msgEl);
  document.getElementById('wrap').appendChild(el);

  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    onTap(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const r = canvas.getBoundingClientRect();
    onTap(t.clientX - r.left, t.clientY - r.top);
  }, { passive: false });
  canvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== 'scene2') return;
    const r = canvas.getBoundingClientRect();
    canvas.style.cursor = hitZone(e.clientX - r.left, e.clientY - r.top) ? CURSOR_PTR : CURSOR_DEF;
  });
  canvas.addEventListener('mouseleave', () => { canvas.style.cursor = CURSOR_DEF; });

  document.addEventListener('keydown', _onKey);
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
const _waitImg = img => img.complete && img.naturalWidth
  ? Promise.resolve()
  : new Promise(r => { img.onload = r; img.onerror = r; });

export async function openSceneScene2() {
  leaveMain();
  createEl();
  el = document.getElementById('scene2');
  showLoading('дерево');

  const bgImg = el.querySelector('img');
  bgImg.onerror = () => showError('не удалось загрузить сцену');
  await Promise.all([
    _waitImg(bgImg), _waitImg(bottleImg),
    _waitImg(rock1Img), _waitImg(rock2Img), _waitImg(rock3Img),
  ]);
  if (!bgImg.naturalWidth) return;

  hideLoading();
  state.activeScreen = 'scene2';
  el.style.display   = 'block';
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    W = canvas.width  = Math.round(r.width);
    H = canvas.height = Math.round(r.height);
    if (!animId) animate();
  });
}

export function closeSceneScene2() {
  state.activeScreen = 'main';
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('scene2', S);
  resumeMain();
}
window.closeSceneScene2 = closeSceneScene2;
